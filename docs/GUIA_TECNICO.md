# Guia técnico do PEP — Prontuário Eletrônico Psicológico (FCMSCSP)

## Projeto

Sistema de prontuário eletrônico para o Serviço-Escola do Curso de Psicologia da Faculdade de Ciências Médicas da Santa Casa de São Paulo (FCMSCSP). Suporta 4 papéis — psicólogo técnico, supervisor, estudante e paciente — com controle de acesso por escopo, agenda com pedidos do paciente, anamnese, evolução clínica (append-only, conforme normas do CRP), envio e download de documentos com arquivos cifrados e trilha de auditoria.

## Status

**MVP acadêmico, versão 1.2.0.** O servidor é Node.js (`server/`). Os dados de demonstração ficam em JSON (`data/seed.json`) e os dados em uso ficam, por padrão, em `data/db.json`; com `PEP_BANCO=mongodb` o servidor usa o MongoDB. O sistema segue as normas do CFP para registro documental e serviço-escola, a LGPD e as boas práticas de segurança da SBIS. Detalhes em [docs/CONFORMIDADE.md](CONFORMIDADE.md). **Antes de usar com dados reais**, siga o [guia de implantação](IMPLANTACAO.md) e o checklist da instituição: HTTPS, dados do encarregado, troca das senhas de demonstração, chaves guardadas fora do servidor, backup fora da máquina etc.

## Stack

- HTML + CSS + JavaScript (ES Modules nativos — sem framework, sem bundler, sem build step)
- Servidor Node.js 20+ (`server/`), sem framework. Banco em arquivo JSON (`data/seed.json` → `data/db.json`, padrão) ou MongoDB (driver oficial `mongodb`, em `optionalDependencies`, carregado só quando `PEP_BANCO=mongodb`)
- Sessão em cookie HttpOnly; `sessionStorage` só lembra a página aberta (e guarda a sessão simulada no modo demonstração)
- [Chart.js](https://www.chartjs.org/) (CDN) para os gráficos do dashboard
- Bootstrap Icons + Google Fonts (CDN)
- [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) para qualidade de código (devDependencies)
- [`node:test`](https://nodejs.org/api/test.html) (nativo do Node.js) para testes automatizados — nenhuma dependência extra de teste

## ⚠️ Como rodar o projeto (leia antes de tudo)

Este projeto usa **ES Modules** (`<script type="module">`). Por política de
segurança dos navegadores, módulos ES **não carregam** quando o arquivo é
aberto direto com duplo clique (endereço `file:///...`) — o navegador bloqueia
o `fetch` dos módulos por CORS, silenciosamente. Quando isso acontece, **nenhum
botão da aplicação funciona** (login, logins de teste, menu, etc.), porque o
JavaScript inteiro nunca chega a executar.

**Solução:** inicie o servidor do projeto (requer Node.js 20 ou superior):

```bash
npm install
npm run dev
```

O servidor entrega a aplicação **e** é quem lê e grava os dados (em
`data/db.json` ou no MongoDB), além de autenticar os usuários. Outros servidores estáticos
(Live Server, `python -m http.server`) **não funcionam**: sem o servidor do
projeto, o sistema abre em **modo demonstração** (ver "Publicar no GitHub Pages").

Depois, acesse **http://localhost:5500** (ou a porta indicada no terminal) —
nunca abra `index.html` direto pelo Explorer/Finder.

> Se você esquecer e abrir via `file://` mesmo assim, o próprio sistema agora
> exibe um aviso explicando o problema, em vez de ficar com botões "mudos"
> sem explicação nenhuma.

Para rodar com MongoDB: `PEP_BANCO=mongodb PEP_MONGODB_URI="mongodb://..." npm run dev` (ver "Banco MongoDB" abaixo).

## Publicar no GitHub Pages (modo demonstração)

O sistema roda em hospedagem estática (GitHub Pages, Live Server do VS Code) sem configuração extra. Ao abrir, ele verifica se o servidor Node existe:

- **Com servidor** (`npm run dev`): modo completo, com login, permissões e auditoria no servidor e dados em `data/db.json` ou no MongoDB.
- **Sem servidor** (GitHub Pages): **modo demonstração**. A API é simulada no navegador (`assets/js/infrastructure/servidorDemo.js`) com as **mesmas regras** do servidor (`assets/js/shared/`). Os dados partem de `data/seed.json` e ficam salvos só no navegador de cada visitante (`localStorage`); os arquivos anexados ficam no IndexedDB do navegador. A tela mostra o selo "Demonstração", com a opção de restaurar os dados de exemplo.

Para publicar:

1. Envie o projeto para um repositório no GitHub (o `data/seed.json` vai junto; os dados são fictícios).
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**, a branch `main` e a pasta **`/ (root)`**. Salve.
4. Em um ou dois minutos o endereço aparece no topo da página (ex.: `https://seu-usuario.github.io/prontuario-pep/`).

O arquivo `.nojekyll` na raiz faz o GitHub publicar os arquivos como estão.

> **O modo demonstração não tem segurança real:** qualquer pessoa com acesso ao navegador lê os dados, e o `seed.json` é público. Use só com dados fictícios. Para uso real, rode o servidor Node atrás de HTTPS (ver [docs/IMPLANTACAO.md](IMPLANTACAO.md)).

## Credenciais DEMO (dados mockados — não removidas de propósito)

Contas de demonstração. As senhas ficam guardadas com hash scrypt e salt (nunca em texto puro). A senha `1234` só existe nos dados de demonstração. Para a equipe, o técnico define qualquer senha inicial com pelo menos 4 caracteres, e a pessoa é obrigada a criar a própria senha no primeiro acesso (no mínimo 8 caracteres, com letras e números). O paciente de demonstração tem acesso temporário já liberado; pacientes reais recebem login e senha gerados pelo sistema, com prazo de validade.

| Papel             | Usuário     | Senha |
|-------------------|-------------|-------|
| Psicólogo Técnico | `tecnico`   | 1234  |
| Supervisor        | `supervisor`| 1234  |
| Estudante         | `estudante` | 1234  |
| Paciente          | `paciente`  | 1234  |

No primeiro acesso, cada conta precisa aceitar o aviso de privacidade e, no caso da equipe, o termo de responsabilidade e sigilo. Cinco senhas erradas seguidas bloqueiam a conta por 15 minutos; o técnico pode desbloquear em "Usuários e permissões". Quem esqueceu a senha pede ao técnico, que define uma senha provisória ("Redefinir senha"); a pessoa troca no próximo acesso, numa tela que só sai depois da troca. Para o paciente não há redefinição: o técnico renova o acesso temporário, e o sistema gera uma nova senha.

## Conformidade (CFP, LGPD, SBIS)

Resumo do que o sistema garante. A matriz completa, com fontes e o arquivo de cada requisito, está em [docs/CONFORMIDADE.md](CONFORMIDADE.md).

- **Autorização no servidor:** cada papel recebe só os pacientes que pode ver, e cada gravação é conferida item a item (`assets/js/shared/politica.js`, usado pelo servidor e pelo modo demonstração).
- **Prontuário com as seções do CFP:**
  - identificação;
  - avaliação de demanda e objetivos;
  - evoluções;
  - encaminhamento ou encerramento;
  - cópias dos documentos emitidos.
- **Registro documental separado:** supervisão, anotações e material de testes, fora do acesso do paciente.
- **Co-assinatura do supervisor:** obrigatória em evoluções, avaliações e documentos de estagiários.
- **Nada é apagado:** correções são retificações com justificativa e a versão anterior continua visível.
- **Documentos conforme a Res. CFP 06/2019:**
  - declaração, atestado, relatório, laudo e parecer;
  - validade, laudas numeradas, protocolo de entrega e devolutiva.
- **Arquivos anexados:** PDF, PNG, JPEG ou .docx de até 10 MB, com o tipo conferido pelo conteúdo, gravados cifrados (AES-256-GCM); o SHA-256 é conferido a cada download, e o download é auditado.
- **Agenda:** só o técnico responsável cria, remarca e cancela atendimentos; supervisor e estagiários do caso registram falta; justificar falta é do técnico ou do supervisor. O paciente não agenda nem pede pelo sistema: pede agendamento, remarcação ou cancelamento presencialmente, por telefone ou e-mail; o técnico registra o pedido ("Registrar pedido", com o canal) e atende ou recusa com motivo.
- **Consentimentos versionados e revogáveis:**
  - TCLE com ciência de atendimento por estagiário;
  - autorização do responsável para menores;
  - pesquisa e gravação.
- **Comunicações a terceiros registradas:** inclui notificação compulsória e quebra de sigilo com fundamento.
- **Acesso do paciente:** quando o paciente pede o prontuário, o técnico imprime ou gera um acesso temporário, só de consulta (login `pac<caso>`, senha aleatória mostrada uma única vez, prazo em `acessoPortal.validadeDias`). Com ele, o paciente vê o prontuário integral, os próximos atendimentos e baixa os próprios documentos. Solicitações LGPD, com prazo de 15 dias, são feitas presencialmente, por telefone ou e-mail e registradas pelo técnico.
- **Trilha de auditoria no servidor:**
  - inclui leituras, impressões e downloads;
  - encadeada por hash, sem nome de paciente;
  - filtros, paginação e exportação CSV.
- **Segurança de acesso:**
  - senhas com hash e salt, bloqueio por tentativas;
  - sessão HttpOnly com encerramento por inatividade;
  - gestão de usuários (cadastro, edição, redefinição de senha, acesso temporário do paciente, inativação) com a senha do técnico confirmada a cada operação;
  - troca obrigatória da senha inicial ou provisória da equipe, garantida também no servidor;
  - backups cifrados (AES-256-GCM).

## Arquitetura

```
index.html
assets/
  css/styles.css              # design tokens + todas as telas
  js/
    main.js                   # entry point — importa tudo, expõe funções em window, faz boot()
    core/
      auth.js                 # sessão, login/logout, router SPA
      store.js                # estado em memória, sincronizado com a API
      permissions.js          # autorização de UX (can/canAccessPage)
      paginacao.js            # paginação das listas na tela
      clinico.js              # regras clínicas usadas pelas telas
      idService.js, dateService.js, enums.js, config.js, logger.js, utils.js
    domain/models.js          # JSDoc typedefs das entidades
    shared/                   # regras usadas pelo servidor E pelo modo demonstração
      politica.js             # escopo por papel e conferência de cada gravação
      auditoria.js            # trilha encadeada por hash
      usuarios.js             # cadastro, edição e redefinição de senha
      arquivos.js             # tipo real, tamanho e nome dos arquivos anexados
      configuracao.js         # parâmetros de segurança, guarda e dados institucionais
      regrasAcesso.js, sha256.js
    infrastructure/
      jsonDataSource.js       # chamadas à API (/api/...)
      servidorDemo.js         # API simulada no navegador (modo demonstração)
    repositories/             # patientRepository, appointmentRepository, documentRepository...
    pages/                    # dashboard, pacientes, agenda, acesso, notificacoes, privacidade
    modals/                   # modals.js, registros.js, agendamentos.js
server/
  index.mjs                   # servidor: arquivos estáticos + API
  security.mjs                # senhas (scrypt), sessões, bloqueio
  backup.mjs                  # backups cifrados
  cofreArquivos.mjs           # cifragem dos arquivos anexados
  jsonDb.mjs                  # leitura/gravação atômica de data/db.json
  banco/                      # index.mjs escolhe json.mjs ou mongodb.mjs (PEP_BANCO)
scripts/                      # gerar-agenda, restaurar-backup, migrar-para-mongodb
data/
  seed.json                   # dados de demonstração (versionado)
  instituicao.exemplo.json    # modelo dos dados reais da instituição
  db.json, arquivos/, backups/  # dados em uso, anexos e backups (fora do git)
tests/                        # node:test
docs/                         # conformidade, implantação, arquitetura, API, MongoDB...
```

Detalhes completos em [docs/ARCHITECTURE_CURRENT.md](ARCHITECTURE_CURRENT.md).

## Scripts disponíveis

```bash
npm run dev          # sobe o servidor em http://localhost:5500 (app + API); npm start faz o mesmo
npm run data:reset   # descarta data/db.json e volta aos dados de data/seed.json
npm run data:agenda  # gera agenda semanal no seed (padrão: 28/10 a 31/12/2026)
npm run data:restaurar [arquivo.bkp]  # lista ou restaura um backup cifrado (com o servidor parado)
npm run data:migrar-mongodb           # copia data/db.json e data/arquivos/ para o MongoDB (com o servidor parado)
npm test         # roda a suíte de testes automatizados (node --test)
npm run lint     # roda o ESLint
npm run format   # aplica o Prettier (assets/js, tests, server, scripts, HTML, CSS)
```

Não há `npm run build`: o projeto não usa bundler — os arquivos são servidos como estão. Ver [docs/ARCHITECTURE_TARGET.md](ARCHITECTURE_TARGET.md) para a análise de por que um bundler não foi introduzido nesta etapa.

`npm run format` não foi rodado sobre o código-fonte existente nesta refatoração — reformatar tudo de uma vez geraria um diff enorme e cosmético, dificultando a revisão desta mudança. Fica disponível para quando o time decidir adotar formatação automática de forma consciente.

## Dados

| Arquivo | Papel |
|---|---|
| `data/seed.json` | Dados de demonstração (usuários, pacientes, anamneses, evoluções, agenda, pedidos de agendamento, auditoria...). Versionado; o sistema nunca escreve nele. |
| `data/db.json` | Dados em uso (banco JSON). Criado automaticamente como cópia do seed na primeira vez que o servidor sobe; toda alteração feita no sistema é gravada aqui. Fica fora do git. |
| `data/arquivos/*.bin` | Arquivos anexados ao prontuário, cifrados (banco JSON). Fora do git. |
| `data/instituicao.json` | Dados reais da instituição e do encarregado, preenchidos na implantação a partir de `data/instituicao.exemplo.json`. Fora do git. |

- **Leitura:** ao abrir a página, `store.initData()` busca `GET /api/data`.
- **Gravação:** cada `saveData()` envia o estado em `PUT /api/data`. Alterações feitas em sequência viram uma única escrita. O servidor confere cada item, carimba autoria e horário e devolve o estado atualizado. No banco JSON, a gravação é atômica (arquivo temporário + renomear), então o JSON nunca fica pela metade.
- **Arquivos anexados:** o envio vai por `POST /api/pacientes/:pid/documentos` (JSON com o conteúdo em base64) e o download por `GET /api/pacientes/:pid/documentos/:docId/arquivo`. O conteúdo é cifrado com AES-256-GCM; a chave fica em `data/.arquivos-key` ou na variável `PEP_ARQUIVOS_KEY`. Os documentos do seed não têm arquivo digital e aparecem como "sem arquivo digital".
- **Backup:** ao iniciar e a cada 24 h, uma cópia cifrada do banco vai para `data/backups/`, e os arquivos anexados novos são copiados para `data/backups/arquivos/` (banco JSON). A chave fica em `data/.backup-key` ou na variável `PEP_BACKUP_KEY`.
- **Sem acesso direto:** a pasta `data/` não é servida pelo navegador; os dados só saem pela API autenticada.
- O servidor recusa um corpo sem a estrutura mínima (`USERS`, `PACIENTES` etc.) e, por padrão, escuta só em `127.0.0.1` (`PEP_HOST` muda isso).

### Banco MongoDB

Com `PEP_BANCO=mongodb` e `PEP_MONGODB_URI`, o servidor usa o MongoDB no lugar do `db.json` (nome do banco em `PEP_MONGODB_BANCO`, padrão `pep`). Cada registro vira um documento, os índices são criados ao iniciar e só os documentos alterados são gravados. Um banco vazio começa com o `seed.json`. Para levar os dados do JSON para o MongoDB: `npm run data:migrar-mongodb`. Detalhes em [DATABASE_MONGODB.md](DATABASE_MONGODB.md) e [IMPLANTACAO.md](IMPLANTACAO.md).

### Dados da instituição

Os textos do aviso de privacidade e das impressões usam os valores de `assets/js/shared/configuracao.js`, marcados `[definir]` na demonstração. Na implantação, a instituição preenche `data/instituicao.json` (modelo em `data/instituicao.exemplo.json`; outro caminho com `PEP_INSTITUICAO_ARQUIVO`). O servidor aplica o arquivo ao iniciar e avisa no console enquanto algum campo continuar `[definir]`. Isso inclui o prazo do acesso temporário do paciente (`"acessoPortal": { "validadeDias": N }`, de 1 a 365, constante `ACESSO_PORTAL`): enquanto não for informado, vale 7 dias provisórios e `acessoPortal.validadeDias` aparece nas pendências.

### Conteúdo dos dados de demonstração

Todos os dados são fictícios.

- **17 pacientes**, cada um com um caso clínico próprio: TAG, depressão, uso nocivo de álcool, luto, pânico, TOC, burnout, fobia social, TDAH, compulsão alimentar, TEPT, insônia, entre outros. O caso de Roberto Nobre envolve um adolescente de 17 anos, com participação da responsável legal.
- **Anamnese finalizada** para todos, com os seis campos preenchidos e a hipótese diagnóstica com CID.
- **320 evoluções** de junho a outubro de 2026, uma para cada sessão realizada, escritas pelo estudante que atendeu, e **68 registros documentais** com as supervisões mensais registradas pelo supervisor do caso. As sessões do dia atual (27/10) ficam sem evolução de propósito, para mostrar o aviso de evolução pendente.
- **Documentos:** termo de consentimento para todos os pacientes e, em 6 casos, de 1 a 2 diagnósticos emitidos por outros psicólogos (laudos, relatórios e pareceres), com profissional, CRP, instituição e resumo da conclusão. São só registros, sem arquivo digital.
- **Agenda** do 1º semestre (junho e julho), do 2º semestre (03/08 a 27/10) e futura, com faltas e cancelamentos registrados.
- **Pedido de agendamento:** um pedido de remarcação da paciente de teste aguardando o técnico.

### Agenda de atendimentos

`data/seed.json` traz a agenda de **28/10/2026 a 31/12/2026** (último dia útil de dezembro), gerada por `scripts/gerar-agenda.mjs`. São 149 atendimentos, um por semana para cada um dos 17 casos ativos, no mesmo dia, horário e sala do histórico do caso. O estudante responsável alterna semana a semana dentro do grupo do paciente. Sábados, domingos e os feriados nacionais do período (02/11, 20/11 e 25/12) ficam de fora.

Para gerar outro período: `node scripts/gerar-agenda.mjs data/seed.json AAAA-MM-DD AAAA-MM-DD` e depois `npm run data:reset`. O script não duplica atendimentos que já existem.

No sistema, só o técnico responsável cria, remarca e cancela atendimentos. O servidor recusa horário já ocupado pelo mesmo paciente ou pelo mesmo estagiário, estagiário fora do grupo do caso e agendamento em caso encerrado. Os pedidos dos pacientes aparecem para o técnico na página Agenda ("Pedidos dos pacientes") e no sininho de notificações.

## Testes

```bash
npm test
```

Roda com `node:test`, sem dependência extra, e roda também no GitHub Actions a cada envio. Cobre, entre outros:

- autorização por papel na tela (`core/permissions.js`) e no servidor (`shared/politica.js`): estudante não acessa paciente de outro grupo, paciente não acessa outro paciente mesmo forjando o ID, página administrativa só para o técnico;
- regras da agenda (só o técnico agenda, conflito de horário, estagiário fora do grupo, caso encerrado, falta e justificativa) e dos pedidos de agendamento;
- arquivos anexados (tipo pelo conteúdo, limite de tamanho, nome limpo, cifragem, integridade, escopo do download) e gestão de usuários (edição, troca de papel, redefinição de senha, acesso temporário do paciente e troca obrigatória de senha);
- banco MongoDB, testado com um banco simulado em memória, e banco JSON;
- conformidade (política de senha, auditoria encadeada, backup cifrado), modo demonstração, repositórios, dados do seed e validadores.

Não há testes de ponta a ponta no navegador (E2E) nem de renderização de UI (DOM completo) — ver [docs/FRONTEND_AUDIT.md](FRONTEND_AUDIT.md).

## Limitações atuais

- O servidor carrega o conjunto inteiro de dados a cada requisição (nos dois bancos) e atende a API uma requisição de cada vez. Serve para um serviço-escola, não para muitos usuários simultâneos. Ler só o necessário por consulta no MongoDB é um passo futuro.
- Uma única instância do servidor por banco: as sessões ficam em memória e as gravações passam por uma fila local.
- No banco JSON, o arquivo inteiro é regravado a cada alteração. Duas abas gravando ao mesmo tempo valem pela última gravação.
- O servidor fala HTTP e o `db.json` não é cifrado em disco: em produção, publique atrás de um proxy com HTTPS e em disco cifrado (ver [IMPLANTACAO.md](IMPLANTACAO.md)). Os arquivos anexados e os backups já são cifrados.
- Assinatura eletrônica sem certificado ICP-Brasil (login individual + hash do conteúdo). Sem MFA.
- Paginação só na tela, exceto na trilha de auditoria, que é paginada pelo servidor. O navegador ainda recebe todos os registros do escopo do usuário.

## Servidor e banco de dados

O backend é o servidor **Node.js** deste repositório. As rotas estão em [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md), o banco MongoDB em [DATABASE_MONGODB.md](DATABASE_MONGODB.md) e a migração do JSON para o MongoDB em [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [IMPLANTACAO.md](IMPLANTACAO.md) | Como implantar: Node 20+, HTTPS, variáveis, chaves, banco, backups |
| [CONFORMIDADE.md](CONFORMIDADE.md) | Requisitos do CFP, da LGPD e da SBIS e onde cada um está no código |
| [FRONTEND_AUDIT.md](FRONTEND_AUDIT.md) | Auditoria completa: bugs, duplicação, decisões de escopo |
| [ARCHITECTURE_CURRENT.md](ARCHITECTURE_CURRENT.md) | Arquitetura atual, com diagramas |
| [ARCHITECTURE_TARGET.md](ARCHITECTURE_TARGET.md) | Para onde a arquitetura evolui, e por que certas mudanças foram adiadas |
| [DOMAIN_MODEL.md](DOMAIN_MODEL.md) | Entidades, campos, regras de negócio |
| [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md) | Rotas da API do servidor Node |
| [API_DTOS.md](API_DTOS.md) | Formato dos dados trocados com a API |
| [DATABASE_MONGODB.md](DATABASE_MONGODB.md) | Coleções e índices do banco MongoDB |
| [PERMISSIONS_MATRIX.md](PERMISSIONS_MATRIX.md) | Matriz de permissões por papel |
| [AUDIT_LOG_SPEC.md](AUDIT_LOG_SPEC.md) | Eventos e formato da trilha de auditoria |
| [SECURITY_BACKEND_REQUIREMENTS.md](SECURITY_BACKEND_REQUIREMENTS.md) | Requisitos de segurança do servidor: o que existe e o que falta |
| [FUTURE_IMPROVEMENTS.md](FUTURE_IMPROVEMENTS.md) | Melhorias identificadas e conscientemente adiadas |
| [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) | Migração do banco JSON para o MongoDB |
| [REFACTORING_REPORT.md](REFACTORING_REPORT.md) | Relatório da refatoração e das rodadas seguintes |
