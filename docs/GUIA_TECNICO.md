# Guia técnico do PEP — Prontuário Eletrônico Psicológico (FCMSCSP)

## Projeto

Sistema de prontuário eletrônico para o Serviço-Escola do Curso de Psicologia da Faculdade de Ciências Médicas da Santa Casa de São Paulo (FCMSCSP). Suporta 4 papéis — psicólogo técnico, supervisor, estudante e paciente — com controle de acesso por escopo, agenda, anamnese, evolução clínica (append-only, conforme normas do CRP), upload simulado de documentos e trilha de auditoria.

## Status

**MVP acadêmico.** Os dados de demonstração ficam em JSON (`data/seed.json`) e o sistema lê e grava os dados em uso em `data/db.json`, através de um servidor Node local sem dependências (`server/`). O sistema segue as normas do CFP para registro documental e serviço-escola, a LGPD e as boas práticas de segurança da SBIS. Detalhes em [docs/CONFORMIDADE.md](CONFORMIDADE.md). **Antes de usar com dados reais**, cumpra o checklist da instituição desse documento: HTTPS, encarregado de dados, troca das senhas de demonstração, backup fora da máquina etc. O plano de evolução para um backend Java + MongoDB está documentado em [docs/](#documentação).

## Stack

- HTML + CSS + JavaScript (ES Modules nativos — sem framework, sem bundler, sem build step)
- Dados em JSON (`data/seed.json` → `data/db.json`), lidos e gravados por um servidor Node.js sem dependências (`server/`)
- `sessionStorage` só para a sessão de login
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

**Solução:** inicie o servidor do projeto (requer Node.js 18 ou superior):

```bash
npm run dev
```

O servidor entrega a aplicação **e** é quem lê e grava os dados em
`data/db.json`, além de autenticar os usuários. Outros servidores estáticos
(Live Server, `python -m http.server`) **não funcionam**: sem o servidor do
projeto, o sistema abre em **modo demonstração** (ver "Publicar no GitHub Pages").

Depois, acesse **http://localhost:5500** (ou a porta indicada no terminal) —
nunca abra `index.html` direto pelo Explorer/Finder.

> Se você esquecer e abrir via `file://` mesmo assim, o próprio sistema agora
> exibe um aviso explicando o problema, em vez de ficar com botões "mudos"
> sem explicação nenhuma.

## Publicar no GitHub Pages (modo demonstração)

O sistema roda em hospedagem estática (GitHub Pages, Live Server do VS Code) sem configuração extra. Ao abrir, ele verifica se o servidor Node existe:

- **Com servidor** (`npm run dev`): modo completo, com login, permissões e auditoria no servidor e dados em `data/db.json`.
- **Sem servidor** (GitHub Pages): **modo demonstração**. A API é simulada no navegador (`assets/js/infrastructure/servidorDemo.js`) com as **mesmas regras** do servidor (`assets/js/shared/`). Os dados partem de `data/seed.json` e ficam salvos só no navegador de cada visitante. A tela mostra o selo "Demonstração", com a opção de restaurar os dados de exemplo.

Para publicar:

1. Envie o projeto para um repositório no GitHub (o `data/seed.json` vai junto; os dados são fictícios).
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**, a branch `main` e a pasta **`/ (root)`**. Salve.
4. Em um ou dois minutos o endereço aparece no topo da página (ex.: `https://seu-usuario.github.io/prontuario-pep/`).

O arquivo `.nojekyll` na raiz faz o GitHub publicar os arquivos como estão.

> **O modo demonstração não tem segurança real:** qualquer pessoa com acesso ao navegador lê os dados, e o `seed.json` é público. Use só com dados fictícios. Para uso real, rode o servidor Node com HTTPS (ver [docs/CONFORMIDADE.md](CONFORMIDADE.md)).

## Credenciais DEMO (dados mockados — não removidas de propósito)

Contas de demonstração. As senhas ficam guardadas com hash scrypt e salt (nunca em texto puro). A senha `1234` só existe nos dados de demonstração: usuários novos precisam de no mínimo 8 caracteres, com letras e números, e trocam a senha no primeiro acesso.

| Papel             | Usuário     | Senha |
|-------------------|-------------|-------|
| Psicólogo Técnico | `tecnico`   | 1234  |
| Supervisor        | `supervisor`| 1234  |
| Estudante         | `estudante` | 1234  |
| Paciente          | `paciente`  | 1234  |

No primeiro acesso, cada conta precisa aceitar o aviso de privacidade e, no caso da equipe, o termo de responsabilidade e sigilo. Cinco senhas erradas seguidas bloqueiam a conta por 15 minutos; o técnico pode desbloquear em "Usuários e permissões".

## Conformidade (CFP, LGPD, SBIS)

Resumo do que o sistema garante. A matriz completa, com fontes e o arquivo de cada requisito, está em [docs/CONFORMIDADE.md](CONFORMIDADE.md).

- **Autorização no servidor:** cada papel recebe só os pacientes que pode ver, e cada gravação é conferida item a item (`server/policy.mjs`).
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
- **Consentimentos versionados e revogáveis:**
  - TCLE com ciência de atendimento por estagiário;
  - autorização do responsável para menores;
  - pesquisa e gravação.
- **Comunicações a terceiros registradas:** inclui notificação compulsória e quebra de sigilo com fundamento.
- **Portal do paciente:** acesso integral ao próprio prontuário e solicitações LGPD com prazo de 15 dias.
- **Trilha de auditoria no servidor:**
  - inclui leituras e impressões;
  - encadeada por hash, sem nome de paciente;
  - filtros e exportação CSV.
- **Segurança de acesso:**
  - senhas com hash e salt, bloqueio por tentativas;
  - sessão HttpOnly com encerramento por inatividade;
  - backups cifrados (AES-256-GCM).

## Arquitetura

```
index.html
assets/
  css/styles.css              # design tokens + todas as telas
  js/
    main.js                    # entry point — importa tudo, expõe funções em window, faz boot()
    core/
      auth.js                   # sessão, login/logout, router SPA
      store.js                   # estado em memória + persistência localStorage
      permissions.js              # autorização de UX (can/canAccessPage)
      idService.js                 # geração de IDs
      dateService.js                # formatação/cálculo de datas
      enums.js                       # constantes de status/papéis
      config.js                       # configuração (API_BASE_URL, feature flags)
      logger.js                        # abstração sobre console.*
      utils.js                          # toast, busca global, auto-logout
    domain/models.js                     # JSDoc typedefs das entidades
    infrastructure/jsonDataSource.js      # lê/grava os dados via /api/data (data/db.json)
    repositories/                          # patientRepository, appointmentRepository, etc.
    pages/                                  # dashboard, pacientes, agenda, acesso, notificacoes
    modals/modals.js
server/
  index.mjs                                  # servidor local: arquivos estáticos + GET/PUT /api/data
  jsonDb.mjs                                  # leitura/gravação atômica de data/db.json
scripts/gerar-agenda.mjs                       # gera a agenda semanal de um período
data/
  seed.json                                    # dados de demonstração (versionado)
  db.json                                      # dados em uso, gravados pelo sistema (fora do git)
tests/                                       # node:test — permissões, repositórios, validadores, JSON, agenda
docs/                                         # auditoria, arquitetura, contratos de backend, MongoDB...
```

Detalhes completos em [docs/ARCHITECTURE_CURRENT.md](ARCHITECTURE_CURRENT.md).

## Scripts disponíveis

```bash
npm run dev          # sobe o servidor em http://localhost:5500 (app + API de dados)
npm run data:reset   # descarta data/db.json e volta aos dados de data/seed.json
npm run data:agenda  # gera agenda semanal no seed (padrão: 28/10 a 31/12/2026)
npm run data:restaurar [arquivo.bkp]  # lista ou restaura um backup cifrado (com o servidor parado)
npm test         # roda a suíte de testes automatizados (node --test)
npm run lint     # roda o ESLint
npm run format   # aplica o Prettier (assets/js, tests, HTML, CSS)
```

Não há `npm run build`: o projeto não usa bundler — os arquivos são servidos como estão. Ver [docs/ARCHITECTURE_TARGET.md](ARCHITECTURE_TARGET.md) para a análise de por que um bundler não foi introduzido nesta etapa.

`npm run format` não foi rodado sobre o código-fonte existente nesta refatoração — reformatar tudo de uma vez geraria um diff enorme e cosmético, dificultando a revisão desta mudança. Fica disponível para quando o time decidir adotar formatação automática de forma consciente.

## Dados em JSON

| Arquivo | Papel |
|---|---|
| `data/seed.json` | Dados de demonstração (usuários, pacientes, anamneses, evoluções, agenda, auditoria...). Versionado; o sistema nunca escreve nele. |
| `data/db.json` | Dados em uso. Criado automaticamente como cópia do seed na primeira vez que o servidor sobe; toda alteração feita no sistema é gravada aqui. Fica fora do git. |

- **Leitura:** ao abrir a página, `store.initData()` busca `GET /api/data`.
- **Gravação:** cada `saveData()` envia o estado em `PUT /api/data`. Alterações feitas em sequência viram uma única escrita. O servidor confere cada item, carimba autoria e horário e devolve o estado atualizado. A gravação é atômica (arquivo temporário + renomear), então o JSON nunca fica pela metade.
- **Backup:** ao iniciar e a cada 24 h, uma cópia cifrada vai para `data/backups/`. A chave fica em `data/.backup-key` ou na variável `PEP_BACKUP_KEY`.
- **Sem acesso direto:** a pasta `data/` não é servida pelo navegador; os dados só saem pela API autenticada.
- O servidor recusa um corpo sem a estrutura mínima (`USERS`, `PACIENTES` etc.) e responde só em `127.0.0.1`.

### Conteúdo dos dados de demonstração

Todos os dados são fictícios.

- **17 pacientes**, cada um com um caso clínico próprio: TAG, depressão, uso nocivo de álcool, luto, pânico, TOC, burnout, fobia social, TDAH, compulsão alimentar, TEPT, insônia, entre outros. O caso de Roberto Nobre envolve um adolescente de 17 anos, com participação da responsável legal.
- **Anamnese finalizada** para todos, com os seis campos preenchidos e a hipótese diagnóstica com CID.
- **388 evoluções** de junho a outubro de 2026: uma para cada sessão realizada, escrita pelo estudante que atendeu, mais supervisões mensais registradas pelo supervisor do caso. As sessões do dia atual (27/10) ficam sem evolução de propósito, para mostrar o aviso de evolução pendente.
- **Documentos:** termo de consentimento para todos os pacientes e, em 6 casos, de 1 a 2 diagnósticos emitidos por outros psicólogos (laudos, relatórios e pareceres), com profissional, CRP, instituição e resumo da conclusão.
- **Agenda** do 1º semestre (junho e julho), do 2º semestre (03/08 a 27/10) e futura, com faltas e cancelamentos registrados.

### Agenda de atendimentos

`data/seed.json` traz a agenda de **28/10/2026 a 31/12/2026** (último dia útil de dezembro), gerada por `scripts/gerar-agenda.mjs`. São 149 atendimentos, um por semana para cada um dos 17 casos ativos, no mesmo dia, horário e sala do histórico do caso. O estudante responsável alterna semana a semana dentro do grupo do paciente. Sábados, domingos e os feriados nacionais do período (02/11, 20/11 e 25/12) ficam de fora.

Para gerar outro período: `node scripts/gerar-agenda.mjs data/seed.json AAAA-MM-DD AAAA-MM-DD` e depois `npm run data:reset`. O script não duplica atendimentos que já existem.

## Testes

```bash
npm test
```

Cobre (ver [docs/REFACTORING_REPORT.md](REFACTORING_REPORT.md) para o detalhamento): autorização por papel (`core/permissions.js`), incluindo os casos de segurança "estudante não acessa paciente de outro grupo", "paciente não acessa outro paciente mesmo forjando o ID" e "página administrativa bloqueada para quem não é técnico"; os repositórios de paciente, agendamento (conflito de horário), prontuário clínico (imutabilidade de anamnese finalizada e numeração de evolução), documento (tamanho determinístico), falta e notificação; e os validadores de CPF/e-mail. Testes de renderização de UI (DOM completo) não foram adicionados — ver justificativa em [docs/FRONTEND_AUDIT.md](FRONTEND_AUDIT.md).

## Limitações atuais

- Persistência em um único arquivo JSON local, regravado inteiro a cada alteração: serve para demonstração e poucos usuários, não para uso concorrente. Duas abas gravando ao mesmo tempo valem pela última gravação.
- Upload de documentos é 100% simulado (apenas metadado, sem arquivo real).
- O servidor local usa HTTP em 127.0.0.1 e o `db.json` não é cifrado em disco: em produção, publique com HTTPS e disco cifrado (ver checklist em [docs/CONFORMIDADE.md](CONFORMIDADE.md)).
- Assinatura eletrônica sem certificado ICP-Brasil (login individual + hash do conteúdo).
- Sem paginação real (todas as listas carregam o dataset mock inteiro) — ver [docs/FUTURE_IMPROVEMENTS.md](FUTURE_IMPROVEMENTS.md).

## Arquitetura futura: backend planejado

O backend será **Java + API REST + MongoDB**. Nada disso está implementado — a documentação completa do plano está em [docs/](#documentação), especialmente [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md), [DATABASE_MONGODB.md](DATABASE_MONGODB.md) e [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [FRONTEND_AUDIT.md](FRONTEND_AUDIT.md) | Auditoria completa: bugs, duplicação, decisões de escopo |
| [ARCHITECTURE_CURRENT.md](ARCHITECTURE_CURRENT.md) | Arquitetura atual, com diagramas |
| [ARCHITECTURE_TARGET.md](ARCHITECTURE_TARGET.md) | Para onde a arquitetura evolui, e por que certas mudanças foram adiadas |
| [DOMAIN_MODEL.md](DOMAIN_MODEL.md) | Entidades, campos, regras de negócio |
| [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md) | Endpoints da futura API Java |
| [API_DTOS.md](API_DTOS.md) | Contratos de dados da API |
| [DATABASE_MONGODB.md](DATABASE_MONGODB.md) | Modelagem de collections, índices, embedding vs. referencing |
| [PERMISSIONS_MATRIX.md](PERMISSIONS_MATRIX.md) | Matriz de permissões por papel |
| [AUDIT_LOG_SPEC.md](AUDIT_LOG_SPEC.md) | O que o backend deve auditar |
| [SECURITY_BACKEND_REQUIREMENTS.md](SECURITY_BACKEND_REQUIREMENTS.md) | Requisitos de segurança do backend, incl. LGPD |
| [JAVA_BACKEND_GUIDE.md](JAVA_BACKEND_GUIDE.md) | Sugestão de arquitetura do backend Java |
| [FUTURE_IMPROVEMENTS.md](FUTURE_IMPROVEMENTS.md) | Melhorias identificadas e conscientemente adiadas |
| [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) | Plano de migração mock → backend real, fase a fase |
| [REFACTORING_REPORT.md](REFACTORING_REPORT.md) | Relatório desta refatoração |
