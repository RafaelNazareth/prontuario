# Requisitos de Segurança do Servidor — PEP (FCMSCSP)

Requisitos de segurança do servidor Node do PEP (`server/`), com o que já está implementado e o que falta. A correspondência com as normas (SBIS, LGPD, ANPD) está em [CONFORMIDADE.md](./CONFORMIDADE.md); o que a implantação precisa fazer está em [IMPLANTACAO.md](./IMPLANTACAO.md).

Legenda: **✅ implementado** · **🟡 parcial** · **⛔ falta** (no software ou na implantação).

## Autenticação e sessão

| Requisito | Status | Onde / observação |
|---|---|---|
| Senha com hash forte e salt único | ✅ | scrypt (N=16384, r=8, p=1), salt aleatório, chave de 512 bits (`server/security.mjs`). Nenhuma senha em texto no banco; senhas antigas em texto são convertidas ao iniciar. |
| Política de senha | ✅ | Mínimo de 8, letra e número, sem nome ou login; diferente da atual e da anterior (`shared/regrasAcesso.js`). Vale para a senha que a pessoa cria; a senha inicial ou provisória definida pelo técnico só exige 4 caracteres (`SEGURANCA.senhaProvisoriaMinimo`). |
| Troca obrigatória da senha inicial ou provisória | ✅ | Tela bloqueante no primeiro acesso da equipe (ou após redefinição). O servidor também garante: com `trocaObrigatoria` pendente, toda rota exceto `GET /api/auth/me`, `POST /api/auth/termo`, `POST /api/auth/senha` e logout responde `403` (`motivo: "troca_senha"`). |
| Acesso do paciente temporário | ✅ | Login `pac<caso>` e senha aleatória de 10 caracteres gerados pelo sistema (`POST /api/pacientes/:pid/acesso-temporario`, com reautenticação), mostrada uma única vez e válida por `acessoPortal.validadeDias` (7 provisórios). Renovar invalida a senha anterior e encerra as sessões. Vencido o prazo, ou sem data de validade, o login é recusado e a sessão aberta cai (`acesso_expirado`). O usuário paciente não grava nada. |
| Bloqueio por tentativas | ✅ | 5 erros seguidos → 15 min de bloqueio, ou desbloqueio pelo técnico. Mensagem genérica. |
| Sessão revogável no servidor | ✅ | Token aleatório em cookie HttpOnly, SameSite=Strict, `Secure` atrás de HTTPS; sessão guardada no servidor e encerrada no logout. |
| Encerramento por inatividade e duração máxima | ✅ | 15 min sem atividade (aviso de 60 s), 12 h no máximo. |
| Sessão vinculada ao navegador e ao IP | ✅ | `server/security.mjs`. |
| Senha esquecida | ✅ | O técnico redefine com senha provisória (`POST /api/usuarios/:id/senha`); troca obrigatória no próximo acesso. Para o paciente, o técnico renova o acesso temporário. Não há recuperação por e-mail. |
| Sessões encerradas quando muda papel, login ou senha | ✅ | Edição de papel/login, redefinição de senha e renovação do acesso temporário do paciente encerram as sessões do usuário. |
| Sessões persistentes entre reinícios | ⛔ | As sessões ficam em memória: reiniciar o servidor encerra todas. Também é o motivo de rodar uma instância só. |
| MFA | ⛔ | Fora do escopo desta etapa. Recomendado ao menos para o técnico. |

## Autorização

| Requisito | Status | Onde / observação |
|---|---|---|
| Papel decidido pelo servidor, nunca pelo cliente | ✅ | O usuário vem da sessão; o corpo da requisição não escolhe papel nem autor. |
| Escopo por relação com o caso | ✅ | `pacientesPermitidos()` e `escopo()` em `shared/politica.js`: o navegador só recebe o permitido. |
| Cada gravação conferida item a item | ✅ | `aplicarAlteracoes()`: um item fora da regra recusa a gravação inteira (`403`). Matriz em [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md). |
| Regras de imutabilidade no servidor | ✅ | Nada é excluído; avaliação finalizada não muda; evolução só é retificada pelo autor, com versão anterior guardada. |
| Agenda só pelo técnico | ✅ | `mesclarAgendamentos`; equipe do caso só marca falta; o paciente não grava nada, e os pedidos de agendamento são registrados pelo técnico (`mesclarSolicitacoesAgendamento`). |
| Reautenticação para gerir usuários | ✅ | Senha do técnico em cada cadastro, edição, redefinição de senha e inativação. |
| Ids de registro seguros | ✅ | Ids novos só com letras, números, `_` e `-` (evita XSS armazenado por id em atributos da tela). |

## Requisições, CSRF, CORS e cabeçalhos

| Requisito | Status | Onde / observação |
|---|---|---|
| Proteção contra CSRF | ✅ | Cookie SameSite=Strict + cabeçalho obrigatório `X-PEP-Request: 1` em toda requisição que altera estado. |
| CORS | ✅ | O servidor não envia cabeçalhos CORS: só a própria origem usa a API. |
| Limite de corpo | ✅ | 25 MB por requisição (`413`). |
| Cabeçalhos de segurança | 🟡 | CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`. A CSP ainda permite `'unsafe-inline'` em scripts por causa dos `onclick` gerados nas telas ([FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md), item 12). |
| HTTPS e HSTS | ⛔ | O Node fala HTTP. Na implantação, proxy com TLS e HSTS ([IMPLANTACAO.md](./IMPLANTACAO.md)). |
| Limite de requisições por IP | ⛔ | Só há bloqueio por conta. Limitar requisições por IP fica para o proxy ou para uma melhoria futura. |
| Pasta de dados fora do servidor de arquivos | ✅ | `data/`, `server/`, `scripts/`, `tests/`, `docs/`, arquivos ocultos e `package*.json` não são servidos. |

## Validação de entrada

| Requisito | Status | Onde / observação |
|---|---|---|
| Regras de negócio validadas no servidor | ✅ | Estrutura do conjunto de dados, papéis da equipe do caso, CPF repetido, conflito de agenda, campos obrigatórios de documentos e compartilhamentos, login, CRP e matrícula. |
| Dígito verificador do CPF no servidor | ⛔ | Hoje conferido só na tela; o servidor confere apenas se o CPF já existe. |
| Injeção no MongoDB | ✅ | O servidor não monta filtros de consulta a partir do que o cliente envia: lê as coleções e grava por `_id`. |

## Arquivos anexados

| Requisito | Status | Onde / observação |
|---|---|---|
| Lista branca de tipos pelo conteúdo | ✅ | PDF, PNG, JPEG e .docx, decididos pelos primeiros bytes, não pela extensão nem pelo tipo informado (`shared/arquivos.js`). |
| Limite de tamanho | ✅ | 10 MB por arquivo. |
| Nome seguro | ✅ | Sem caminho, caracteres de controle ou reservados; extensão do tipo real. |
| Cifrado em repouso | ✅ | AES-256-GCM com chave própria (`PEP_ARQUIVOS_KEY`), em `server/cofreArquivos.mjs`. |
| Integridade | ✅ | SHA-256 do original no registro, conferido a cada download; a tag do GCM também detecta alteração. |
| Download só para quem vê o registro, auditado | ✅ | Mesmo escopo da leitura; evento `arquivo_baixado`. |
| Vínculo arquivo ↔ registro só pelo servidor | ✅ | `PUT /api/data` descarta o campo `arquivo`. |
| Antivírus | ⛔ | Não há verificação antivírus. |
| Limite de volume por paciente | ⛔ | Só o limite por arquivo. |

## Auditoria e logs

- Trilha encadeada por hash, gravada só pelo servidor, sem dado clínico. Ver [AUDIT_LOG_SPEC.md](./AUDIT_LOG_SPEC.md). ✅
- Logs do console do servidor não registram conteúdo clínico (só mensagens de erro e avisos de inicialização). ✅
- Recusas de autorização (`403`) não entram na trilha. ⛔
- Atrás de proxy, o IP registrado é o do proxy. ⛔

## Segredos e configuração

| Item | Onde | Observação |
|---|---|---|
| Chave dos backups | `PEP_BACKUP_KEY` ou `data/.backup-key` | Em produção, variável de ambiente e cópia fora do servidor. |
| Chave dos arquivos anexados | `PEP_ARQUIVOS_KEY` ou `data/.arquivos-key` | Idem; sem ela os arquivos não abrem. Não trocar depois que houver arquivos. |
| Conexão com o MongoDB | `PEP_MONGODB_URI` | Nunca no código; usuário do banco só com acesso ao banco do PEP. |
| Dados institucionais | `data/instituicao.json` | Fora do git. |
| Parâmetros de segurança | `assets/js/shared/configuracao.js` | Tentativas, bloqueio, inatividade, política de senha, guarda, backup. |

Os arquivos de chave e de dados estão no `.gitignore`.

## Backup e recuperação

- Backup cifrado (AES-256-GCM + SHA-256) ao iniciar e a cada 24 h, 30 mantidos; arquivos anexados copiados de forma incremental (banco JSON). ✅
- Restauração verificada, com cópia do estado anterior, para os dois bancos. ✅
- Cópia para outro local físico, `mongodump` com MongoDB e teste periódico de restauração: tarefas da implantação. ⛔
- RPO/RTO a definir com o responsável técnico do Serviço-Escola.

## LGPD e privacidade

> Este documento **não é aconselhamento jurídico**. Os pontos abaixo precisam ser validados com o jurídico e o encarregado antes de qualquer dado clínico real ser processado.

- **Minimização:** cada papel recebe só o seu escopo; CPF completo só para o técnico; hash de senha nunca sai do servidor.
- **Acesso do titular:** quando o paciente pede, o técnico imprime o prontuário ou gera um acesso temporário, só de consulta, com o qual o paciente vê o próprio prontuário (exceto registro documental e material de teste). Solicitações do titular, com prazo de 15 dias, chegam presencialmente, por telefone ou e-mail e são registradas pelo técnico. Ver [CONFORMIDADE.md](./CONFORMIDADE.md).
- **Retenção:** 20 anos após o último registro (`GUARDA`); não há exclusão. O fluxo de descarte ao fim do prazo ainda não existe (nenhum prontuário chega ao prazo antes de 2046).
- **Encarregado:** dados preenchidos pela instituição em `data/instituicao.json`.
- **Rastreabilidade:** trilha de auditoria com leituras, impressões, exportações e downloads.
