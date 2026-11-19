# Especificação da Trilha de Auditoria — PEP (FCMSCSP)

Como a trilha de auditoria funciona hoje. Ela é gravada **só pelo servidor** (`server/index.mjs`, com as regras de `assets/js/shared/auditoria.js`); no modo demonstração, o servidor simulado no navegador usa as mesmas regras. Requisitos atendidos: SBIS NGS1.07 e LGPD arts. 6º X e 37 (ver [CONFORMIDADE.md](./CONFORMIDADE.md), seção 8).

## Princípios

- **Contínua e só no servidor.** O navegador não grava nem apaga registros: a rota `PUT /api/data` ignora `AUDITORIA` e o escopo devolvido ao navegador vem sempre com a trilha vazia.
- **Quem fez é decidido pelo servidor.** Usuário, papel, IP e horário vêm da sessão e da conexão, nunca do corpo da requisição.
- **Sem dado clínico nem nome de paciente.** Só IDs. A tela de auditoria resolve os nomes para o técnico.
- **Encadeada por hash.** Cada registro guarda o SHA-256 do anterior; `verificarTrilha()` recalcula a cadeia e aponta o primeiro registro adulterado ou removido.
- **Nunca apagada.** Não existe rota para alterar ou excluir registros, nem expiração automática.

## Estrutura de um registro

```js
{
  id: "aud_000123",          // sequencial
  seq: 123,
  ts: "2026-11-19T14:02:11.512Z", // ISO 8601 com fuso (UTC)
  tipo: "arquivo_baixado",   // vocabulário fechado, ver abaixo
  userId: 1,                 // null em login de usuário inexistente e em eventos do servidor
  papel: "tecnico",
  ip: "127.0.0.1",           // IP da conexão; "servidor" em backup/restauração
  pacienteId: 200,           // quando o evento é sobre um paciente
  registroId: "d_...",       // registro afetado (texto)
  complemento: "...",        // até 200 caracteres, sem dado clínico
  anterior: "<sha-256 do registro anterior>",
  hash: "<sha-256 deste registro>"
}
```

A trilha fica em `AUDITORIA` (mais recente primeiro) no banco JSON, ou na coleção `auditoria` do MongoDB, um documento por registro (ver [DATABASE_MONGODB.md](./DATABASE_MONGODB.md)).

**Atrás de proxy:** o IP é o da conexão que chega ao Node, ou seja, o do proxy. Ver [IMPLANTACAO.md](./IMPLANTACAO.md#6-proxy-reverso-com-https).

## Eventos

Lista completa em `EVENTOS` (`assets/js/shared/auditoria.js`). Registrar um tipo fora dela gera erro.

**Sessão e conta**
- `login_sucesso`, `login_falha` (inclui login inexistente, inativo, bloqueado ou acesso temporário do paciente vencido, com complemento `acesso temporário vencido`), `login_bloqueado`
- `logout`, `sessao_expirada`
- `senha_alterada` (o próprio usuário), `termo_aceito` (com a versão)

**Gestão de usuários (técnico, com reautenticação)**
- `usuario_criado` (complemento: papel; só equipe, pois o paciente não é cadastrado por `POST /api/usuarios`)
- `acesso_temporario_gerado` (acesso do paciente ao prontuário gerado ou renovado; `registroId` e `pacienteId` = id do caso; complemento: `novo` ou `renovado` e a data de validade, ex.: `novo, válido até 2026-11-26`). A senha gerada nunca vai para a trilha.
- `usuario_atualizado` (complemento: campos alterados, ex.: `nome,papel`)
- `senha_redefinida`
- `usuario_desbloqueado`, `usuario_inativado`, `usuario_reativado`

**Leitura e saída de dados**
- `consulta_prontuario`, `consulta_documento`, `consulta_registro_documental`
- `arquivo_baixado` (download do arquivo anexado; gravado pelo servidor ao entregar o arquivo)
- `impressao`, `exportacao`
- `consulta_auditoria` (registrado em toda consulta, com os filtros e a página vista), `exportacao_auditoria`

Os eventos de consulta, impressão e exportação do prontuário são informados pela tela (`POST /api/audit/evento`), porque acontecem no navegador; o servidor só aceita esses tipos (`EVENTOS_INFORMADOS_PELO_CLIENTE`), confere que o paciente está no escopo do usuário e carimba usuário, IP e horário.

**Prontuário**
- `paciente_criado`, `paciente_atualizado` (complemento: campos alterados), `caso_encerrado`
- `consentimento_registrado`, `consentimento_revogado`
- `anamnese_salva`, `anamnese_finalizada`
- `evolucao_criada`, `evolucao_validada` (também usado na co-assinatura da avaliação de demanda), `evolucao_retificada`
- `documento_anexado`, `documento_emitido`, `documento_validado`, `documento_atualizado` (devolutiva ou entrega)
- `registro_documental_criado`, `compartilhamento_registrado`

**Agenda**
- `agendamento_criado` (complemento: data e hora), `agendamento_atualizado` (complemento: campos alterados, `cancelado` ou `faltou`)
- `falta_registrada`, `falta_atualizada` (justificativa)
- `solicitacao_agendamento_criada` (registrada pelo técnico; complemento: `agendar`, `remarcar` ou `cancelar`), `solicitacao_agendamento_respondida` (complemento: `atendida` ou `recusada`)
- `notificacao_criada` (`notificacao_atualizada` está na lista, mas hoje marcar uma notificação como lida não gera evento)

**Direitos do titular**
- `solicitacao_titular_criada` (registrada pelo técnico), `solicitacao_titular_respondida`

**Backup**
- `backup_criado`, `backup_restaurado`

## Consulta e exportação

- `GET /api/audit` (só técnico): filtros `de`, `ate` (datas `AAAA-MM-DD`), `tipo`, `userId`, `pacienteId`; paginação `pagina` e `porPagina` (padrão 50, entre 10 e 500). A resposta traz também o resultado de `verificarTrilha()` sobre a trilha inteira.
- `GET /api/audit/csv` (só técnico): mesmos filtros, sem paginação. O CSV leva o nome e a versão do software, a instituição, a data da exportação e o ID de quem exportou (SBIS NGS1.07.08).

## Retenção

A trilha faz parte da guarda do prontuário e segue o mesmo prazo (20 anos após o último registro, `GUARDA` em `shared/configuracao.js`). Não usar índice TTL nem coleção *capped*: apagar registros antigos quebraria o encadeamento por hash. Um eventual arquivamento precisa ser definido com o jurídico e o encarregado.

## O que ainda não é registrado

- **Recusas de autorização** (`403`): o servidor recusa a gravação e responde com a mensagem, mas não grava um evento. Registrar tentativas negadas ajudaria a detectar uso indevido.
- **User agent** do navegador.
