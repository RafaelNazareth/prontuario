# Banco MongoDB — PEP (FCMSCSP)

O servidor Node do PEP grava em um de dois bancos, escolhidos pela variável `PEP_BANCO` (`server/banco/index.mjs`):

- `json` (padrão): `data/db.json` + `data/arquivos/*.bin` (`server/banco/json.mjs`).
- `mongodb`: MongoDB (`server/banco/mongodb.mjs`), com `PEP_MONGODB_URI` e `PEP_MONGODB_BANCO` (padrão `pep`).

Os dois têm a mesma interface (`ler`, `gravar`, `restaurarSeed`, `fechar`, `arquivos.salvar`, `arquivos.ler`), então o restante do servidor não sabe qual está em uso. O driver oficial (`mongodb` ^6) está em `optionalDependencies` e só é carregado quando `PEP_BANCO=mongodb`. Como configurar e migrar: [IMPLANTACAO.md](./IMPLANTACAO.md) e [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

> **Situação:** o adaptador está implementado e coberto por testes automatizados (com um banco simulado em memória, em `tests/mongodb.test.mjs`). Nenhum ambiente de produção foi migrado ainda.

## Como o servidor usa o banco

1. A cada requisição, o servidor lê o conjunto de dados inteiro (`ler()`), aplica as regras de `shared/politica.js` e chama `gravar()`.
2. `gravar()` compara cada documento com o que foi lido por último e envia **só os documentos que mudaram** (`bulkWrite` com `replaceOne`/`upsert`; documentos que sumiram do conjunto recebem `deleteOne`, mas as regras do servidor nunca removem registros do prontuário).
3. Com replica set (padrão no MongoDB Atlas), as gravações de uma requisição vão numa **transação**. Em servidor standalone, sem transações, grava sem elas. `PEP_MONGODB_TRANSACOES=0` desliga as transações.
4. As requisições à API são atendidas em fila pelo servidor. Por isso, **uma única instância do servidor por banco**.
5. Banco vazio (sem usuários) começa com `data/seed.json`, como o banco JSON.

**Limitação honesta:** ler o conjunto inteiro a cada requisição é o mesmo modelo do banco JSON. Serve para o volume de um serviço-escola, mas não aproveita as consultas do MongoDB. Ler só o necessário por consulta (e paginar no servidor) é um passo futuro; ver [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md), item 15.

## Coleções

Um documento por registro, nunca um documento gigante com tudo.

| Coleção | Conteúdo (chave no conjunto de dados) | `_id` |
|---|---|---|
| `usuarios` | `USERS` | id do usuário (texto) |
| `pacientes` | `PACIENTES` | id do paciente |
| `anamneses` | `ANAMNESES` (uma por paciente) | id do paciente; também `pacienteRef` |
| `evolucoes` | `EVOLUCOES` | `<pacienteId>:<id>`; com `pacienteRef` e `_ordem` |
| `documentos` | `DOCUMENTOS` (metadados, inclusive `arquivo`) | `<pacienteId>:<id>`; com `pacienteRef` e `_ordem` |
| `registro_documental` | `REGISTRO_DOCUMENTAL` | `<pacienteId>:<id>`; com `pacienteRef` e `_ordem` |
| `compartilhamentos` | `COMPARTILHAMENTOS` | `<pacienteId>:<id>`; com `pacienteRef` e `_ordem` |
| `agendamentos` | `AGENDAMENTOS` | id do agendamento; com `_ordem` |
| `faltas` | `FALTAS` | id da falta; com `_ordem` |
| `notificacoes` | `NOTIFICACOES` | id; com `_ordem` |
| `solicitacoes_titular` | `ACESSO_PACIENTE` | id; com `_ordem` |
| `solicitacoes_agendamento` | `SOLICITACOES_AGENDAMENTO` | id; com `_ordem` |
| `auditoria` | `AUDITORIA` | id do registro (`aud_000123`); ordenada por `seq` |
| `arquivos` | conteúdo dos arquivos anexados, **já cifrado** (AES-256-GCM) | `a_<uuid>` (o `arquivo.id` do documento) |

- `pacienteRef` liga os registros clínicos ao paciente; `_ordem` guarda a ordem da lista original. Os dois são campos internos: são retirados na leitura e não aparecem na API.
- Os campos de cada registro são os do [DOMAIN_MODEL.md](./DOMAIN_MODEL.md), sem tradução nem renomeação. A conversão está em `paraDocumentos()` e `deDocumentos()` e é testada ida e volta, sem perda, para todas as coleções.
- **Arquivos anexados ficam no próprio MongoDB**, na coleção `arquivos`: `{ _id, conteudo (binário cifrado), tamanhoCifrado, criadoEm }`. Como o limite é de 10 MB por arquivo, cabem no limite de 16 MB por documento sem GridFS. O conteúdo é cifrado pelo servidor antes de chegar ao banco; quem lê a coleção sem `PEP_ARQUIVOS_KEY` não abre os arquivos. Um arquivo nunca é sobrescrito (`insertOne`).

## Índices

Criados (se não existirem) toda vez que o servidor inicia:

| Coleção | Índice | Para quê |
|---|---|---|
| `usuarios` | `{ login: 1 }` único | Login único também no banco |
| `pacientes` | `{ supervisorId: 1 }` | Casos de um supervisor |
| `pacientes` | `{ estudantesIds: 1 }` | Casos de um estudante (multikey) |
| `agendamentos` | `{ pacienteId: 1, data: 1 }` | Agenda do paciente e conflito de horário |
| `agendamentos` | `{ estudanteId: 1, data: 1 }` | Agenda do estagiário e conflito de horário |
| `evolucoes`, `documentos`, `registro_documental`, `compartilhamentos` | `{ pacienteRef: 1, _ordem: 1 }` | Registros de um paciente, em ordem |
| `auditoria` | `{ seq: -1 }` único | Ordem da trilha e sequência sem repetição |
| `auditoria` | `{ pacienteId: 1, ts: -1 }` | Trilha de um paciente |
| `solicitacoes_agendamento` | `{ pacienteId: 1, status: 1 }` | Pedidos pendentes de um paciente |

Hoje o servidor lê as coleções inteiras, então a maioria desses índices ainda não é usada nas leituras; eles já estão prontos para a leitura por consulta.

## Decisões de modelagem

- **Registros clínicos em coleções próprias, ligados ao paciente** (não embutidos em `pacientes`): evoluções, documentos e agenda crescem sem limite ao longo dos anos. Embutir faria o documento do paciente crescer até o limite de 16 MB e pesaria em toda leitura do cadastro.
- **Avaliação de demanda em coleção própria**, uma por paciente (`_id` = id do paciente): a regra de imutabilidade fica isolada e o cadastro do paciente continua enxuto.
- **Usuários referenciados por id** (`supervisorId`, `estudantesIds`, `autorId`): o mesmo usuário aparece em muitos casos. O nome do autor é guardado também no registro (`autor`), de propósito: o prontuário mostra quem assinou na época, mesmo que o nome mude depois.
- **Trilha de auditoria sem TTL e sem coleção *capped*:** ela faz parte da guarda de 20 anos e é encadeada por hash; apagar os registros mais antigos quebraria a verificação.
- **Arquivos no MongoDB, não em object storage externo:** com o limite de 10 MB e o volume de um serviço-escola, a coleção `arquivos` mantém tudo num lugar só, no mesmo backup (`mongodump`) e sob a mesma cifragem do servidor. Se o volume crescer muito, a interface `arquivos.salvar/ler` permite trocar o armazenamento sem mexer no resto.

## Backup

- O servidor continua gerando o backup cifrado do conjunto de dados em `data/backups/*.bkp`, também com MongoDB, e `npm run data:restaurar` restaura no banco em uso.
- Os arquivos anexados **não** entram nesse backup com MongoDB (a cópia incremental para `data/backups/arquivos/` é só do banco JSON). Use `mongodump` ou o backup do provedor, que cobre todas as coleções, inclusive `arquivos`. Detalhes em [IMPLANTACAO.md](./IMPLANTACAO.md#9-backups).
