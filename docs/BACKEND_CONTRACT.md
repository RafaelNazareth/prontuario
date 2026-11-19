# Contrato do Backend — API do servidor Node (PEP)

Rotas da API servida por `server/index.mjs`. O modo demonstração (`assets/js/infrastructure/servidorDemo.js`) simula as mesmas rotas no navegador, com as mesmas regras. Formato dos corpos e das respostas em [API_DTOS.md](./API_DTOS.md).

## Convenções

- **Base:** `/api/...`, no mesmo endereço que serve a aplicação. Não há versão na URL.
- **Sessão:** cookie `pep_sid` (HttpOnly, SameSite=Strict, `Secure` atrás de HTTPS), criado no login. Encerrada após 15 min sem atividade ou 12 h de duração, e vinculada ao navegador e ao IP de origem.
- **Anti-CSRF:** toda requisição que não seja `GET` precisa do cabeçalho `X-PEP-Request: 1`; sem ele, `403`.
- **Corpo:** JSON, até 25 MB (`413` acima disso).
- **Erros:** `{ "erro": "mensagem em português" }`, com o código HTTP adequado. Em `401`, vem também `motivo` (`sem_sessao`, `sessao_invalida`, `inatividade`, `expirada`, `usuario_inativo`, `acesso_expirado`) e o cookie é apagado.
- **Troca de senha pendente:** enquanto `trocaObrigatoria` estiver pendente, toda rota exceto `GET /api/auth/me`, `POST /api/auth/termo`, `POST /api/auth/senha` e `POST /api/auth/logout` responde `403` com `motivo: "troca_senha"`.
- **Acesso temporário do paciente:** vencido `acessoExpiraEm` (ou sem data), o login é recusado (`401`, "acesso temporário expirou", auditado como `login_falha`) e a sessão aberta cai com `motivo: "acesso_expirado"`.
- **Fila:** as requisições à API são atendidas uma de cada vez (o corpo é lido antes de entrar na fila). Rode uma instância do servidor por banco.
- **Datas:** ISO 8601. Datas de agenda em `AAAA-MM-DD` e horários em `HH:mm`.
- **Banco:** as rotas são as mesmas com `PEP_BANCO=json` ou `PEP_BANCO=mongodb`.

---

## Autenticação e sessão

| Rota | Quem | O que faz |
|---|---|---|
| `POST /api/auth/login` | público | `{ login, senha }`. Mensagem genérica em erro (`401`); conta bloqueada por tentativas responde `423`. Sucesso: cookie de sessão + `RespostaSessao` com `acesso` (último acesso e falhas desde então). |
| `POST /api/auth/logout` | qualquer | Encerra a sessão e apaga o cookie. |
| `GET /api/auth/me` | logado | `RespostaSessao`: usuário, termo pendente, troca de senha obrigatória, configuração de inatividade e senha, dados institucionais. |
| `POST /api/auth/termo` | logado | `{ versao }`. Registra o aceite do aviso e do termo da versão atual; versão diferente responde `409`. |
| `POST /api/auth/senha` | logado | `{ senhaAtual, novaSenha }`. Confere a senha atual e a política; a nova precisa ser diferente da atual e da anterior. É a única forma de sair da troca obrigatória (fora o logout). |

## Usuários

Todas só para o técnico (`403` para os demais). As marcadas com **R** exigem `senhaAdmin` (a senha do técnico) no corpo; senha errada responde `403`.

| Rota | O que faz |
|---|---|
| `POST /api/usuarios` **R** | Cadastra membro da equipe (`papel` técnico, supervisor ou estudante; CRP obrigatório para técnico e supervisor, matrícula para estudante). O técnico escolhe qualquer senha inicial com pelo menos 4 caracteres (`SEGURANCA.senhaProvisoriaMinimo`), e a troca por uma senha própria, dentro da política, é obrigatória no primeiro acesso. `papel: "paciente"` é recusado (`400`): o acesso do paciente é gerado por `POST /api/pacientes/:pid/acesso-temporario`. Login repetido: `409`. Resposta `201`. |
| `PUT /api/usuarios/:id` **R** | Edita nome, login, papel, CRP e matrícula. No acesso de paciente, só o login. A troca de papel é recusada (`409`) se o usuário estiver vinculado a casos ou se o sistema ficar sem técnico ativo. Mudar papel ou login encerra as sessões do usuário. Resposta com `alterados` (lista de campos). |
| `POST /api/usuarios/:id/senha` **R** | Redefine a senha com uma senha provisória (mínimo de 4 caracteres; troca obrigatória no próximo acesso), desbloqueia a conta e encerra as sessões. Não vale para a própria senha nem para paciente (`400`; no paciente, renove o acesso temporário). |
| `POST /api/pacientes/:pid/acesso-temporario` **R** | `{ senhaAdmin }`. Gera ou renova o acesso temporário do paciente ao próprio prontuário: login `pac<id do caso>` e senha aleatória de 10 caracteres (sem caracteres ambíguos), devolvida uma única vez, válida por `acessoPortal.validadeDias` (7 dias provisórios enquanto a instituição não definir). Renovar gera nova senha, invalida a anterior e encerra as sessões do paciente. Não há troca obrigatória de senha. Registra `acesso_temporario_gerado`. Resposta `200` com `usuario`, `login`, `senha`, `expiraEm`, `validadeDias` e `validadeDefinida`. Para encerrar o acesso antes do prazo, use a inativação. |
| `POST /api/usuarios/:id/desbloquear` | Desbloqueia a conta antes do fim do bloqueio. |
| `POST /api/usuarios/:id/ativo` **R** | `{ ativo }`. Inativa ou reativa; nunca exclui. Não inativa o último técnico ativo (`409`). |

## Dados do prontuário

| Rota | Quem | O que faz |
|---|---|---|
| `GET /api/data` | logado | Devolve o conjunto de dados **no escopo do papel** (ver [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md)). A trilha de auditoria vem sempre vazia. |
| `PUT /api/data` | logado | Recebe o conjunto (ou parte dele) e aplica só as diferenças, conferindo item a item (`aplicarAlteracoes` em `shared/politica.js`). Se qualquer item violar as regras, nada é gravado e a resposta é `403` com o motivo. Sucesso: `{ ok: true, data }` com o escopo atualizado, já com autoria, horários e assinaturas carimbados pelo servidor. |

Regras aplicadas em `PUT /api/data` (resumo; detalhes em [DOMAIN_MODEL.md](./DOMAIN_MODEL.md)):

- Nada é excluído; registro ausente continua no banco.
- Pacientes: só o técnico cadastra e altera; o supervisor do caso pode registrar o encerramento. Supervisor e estagiários precisam existir com o papel certo.
- Avaliação de demanda finalizada não muda (exceto a co-assinatura). Evolução: criação, co-assinatura e retificação pelo próprio autor com justificativa.
- Documentos: só inclusão; depois, só co-assinatura, devolutiva e entrega. O campo `arquivo` vindo do navegador é descartado.
- Agenda: só o técnico cria, remarca e cancela; supervisor e estudante do caso só mudam "confirmado" para "faltou". Conflito de horário do paciente ou do estagiário, estagiário fora do grupo e caso encerrado são recusados.
- Faltas: a equipe registra; só técnico ou supervisor justifica.
- Usuário paciente: nenhuma gravação é aceita (o acesso dele é só de consulta).
- Pedidos de agendamento (`SOLICITACOES_AGENDAMENTO`): o paciente pede presencialmente, por telefone ou e-mail; só o técnico registra o pedido (`canal` obrigatório: `presencial`, `telefone` ou `email`) e responde, como `atendida` ou `recusada` (recusa com motivo).
- Solicitações do titular (`ACESSO_PACIENTE`): só o técnico registra (com `canal`) e responde.
- `USERS` e `AUDITORIA` não são gravados por esta rota.

## Arquivos anexados

| Rota | Quem | O que faz |
|---|---|---|
| `POST /api/pacientes/:pid/documentos` | equipe do caso | Corpo JSON com `documento` (categoria, título, origem e resumo) e `arquivo` (`nome` e `conteudoBase64`). O servidor confere o tipo pelo conteúdo (PDF, PNG, JPEG ou .docx) e o limite de 10 MB (`400` se não passar), limpa o nome, cria o registro pelas mesmas regras de `PUT /api/data`, grava o arquivo cifrado (AES-256-GCM) e carimba `arquivo` com tamanho real e SHA-256. Categoria `material_teste` vai para o compartimento restrito. Resposta `201` com `documento` e `data`. |
| `GET /api/pacientes/:pid/documentos/:docId/arquivo` | quem vê o documento | Entrega o arquivo (`Content-Disposition: attachment`) depois de decifrar e conferir o SHA-256, e registra `arquivo_baixado`. Usa o escopo da leitura: o paciente baixa os próprios documentos, mas não o material de teste. `404` para documento fora do escopo ou sem arquivo digital; `410` se o arquivo sumiu do armazenamento; `500` se o conteúdo não confere (adulteração ou chave errada). |

## Auditoria

| Rota | Quem | O que faz |
|---|---|---|
| `POST /api/audit/evento` | logado | `{ tipo, pacienteId?, registroId?, complemento? }`. Só aceita eventos de leitura que acontecem na tela (consulta de prontuário, documento ou registro documental, impressão, exportação). Paciente fora do escopo: `403`. |
| `GET /api/audit` | técnico | Filtros `de`, `ate`, `tipo`, `userId`, `pacienteId`; paginação `pagina` e `porPagina` (padrão 50). Resposta com a página, o total e a verificação de integridade da trilha. Toda consulta é auditada, com os filtros e a página. |
| `GET /api/audit/csv` | técnico | Exportação CSV com os mesmos filtros, auditada. |

Vocabulário de eventos em [AUDIT_LOG_SPEC.md](./AUDIT_LOG_SPEC.md).

## Informações públicas

| Rota | Quem | O que faz |
|---|---|---|
| `GET /api/institucional` | público | Dados do aviso de privacidade: controlador, serviço, endereço, horário, contato, encarregado, responsável técnico (técnico ativo com CRP), versão do software e do termo, prazo de resposta ao titular, prazo de guarda e `pendencias` (campos ainda `[definir]`, inclusive `acessoPortal.validadeDias`), além de `acessoPortalDias`. A tela também usa esta rota para detectar se há servidor (senão, entra no modo demonstração). |

## O que a API ainda não tem

- Rotas por recurso com paginação no servidor (hoje `GET /api/data` devolve todo o escopo; só a auditoria é paginada). Ver [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md), item 15.
- Notificações calculadas no servidor: a de evolução pendente é calculada na tela.
- MFA.
