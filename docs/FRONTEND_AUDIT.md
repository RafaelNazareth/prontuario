# Auditoria do Frontend — PEP (FCMSCSP)

Auditoria completa do frontend do sistema de Prontuário Eletrônico Psicológico, realizada antes da refatoração descrita em [REFACTORING_REPORT.md](./REFACTORING_REPORT.md). Cobre todos os arquivos de `assets/js/`, `assets/css/styles.css` e `index.html`.

Severidade: **P0** crítico · **P1** alto · **P2** médio · **P3** baixo.
Status: **Corrigido nesta refatoração** · **Documentado (ação futura)** · **Aceito (risco reconhecido)**.

---

## P0 — Crítico

Nenhum problema P0 foi encontrado. Não há uso de `eval()`/`new Function()`, não há injeção de HTML não-escapado com dados do usuário (todo texto dinâmico passa por `escapeHTML()`), e não há vazamento de senha em memória fora do momento do login (`sanitizarUsuario()` já remove `pass` do objeto `currentUser`).

---

## P1 — Alto

### 1. `store.js` concentrava ~2.530 linhas de dados mock dentro do módulo de persistência
- **Arquivo:** `assets/js/core/store.js` (antes da refatoração: 2.733 linhas)
- **Causa:** os dados de demonstração (50 estudantes, 17 pacientes, ~150 agendamentos, anamneses, evoluções) foram escritos diretamente dentro da função `mockData()`, no mesmo arquivo que contém `saveData()`, `logAudit()` e `getPacientesPermitidos()` — a lógica de persistência e a regra de RBAC mais importante do sistema.
- **Impacto:** violava diretamente o princípio "mock ≠ lógica da aplicação". Tornava `store.js` difícil de revisar, e qualquer futura substituição do mock por uma API teria que "escavar" a lógica no meio de milhares de linhas de dados.
- **Status:** **Corrigido.** Dados movidos para `assets/js/infrastructure/mock/mockData.js` (`buildMockDataset()`), uma factory pura. `store.js` caiu para ~205 linhas. Ver [ARCHITECTURE_TARGET.md](./ARCHITECTURE_TARGET.md).

### 2. IDs de entidades gerados com `Date.now()`
- **Arquivos:** `modals.js` (paciente, usuário, documento), `acesso.js` (solicitação de acesso), `notificacoes.js` (faltas, notificações de troca), `store.js` (`logAudit`)
- **Causa:** `Date.now()` não garante unicidade entre duas chamadas na mesma millisegundo (ex.: dois cliques rápidos, ou dois usuários salvando "ao mesmo tempo" em sessões diferentes que depois sincronizassem).
- **Impacto:** colisão de ID levaria a dados sobrescritos silenciosamente.
- **Status:** **Corrigido parcialmente, por decisão de escopo.** Criado `core/idService.js` com `generateId()` (UUID) e `generateSequentialId()` (contador monotônico). Aplicado a:
  - Documentos, auditoria, notificações, faltas e solicitações de acesso → `generateId()` (UUID), pois esses IDs já eram tratados como strings opacas em todo o código.
  - Pacientes, usuários e agendamentos → `generateSequentialId()` (continua numérico), **não** UUID.
  **Por quê não UUID para pacientes/usuários/agendamentos:** esses IDs são comparados diretamente (`p.id === pid`) e embutidos sem aspas em dezenas de atributos `onclick="fn(${id})"` gerados dinamicamente (ex.: `onclick="openProntuario(${p.id})"`). Trocar para string exigiria colocar aspas em cada um desses pontos — uma mudança de dezenas de linhas espalhadas por `dashboard.js`, `pacientes.js`, `agenda.js`, `modals.js`, com alto risco de quebrar a aplicação (um UUID sem aspas em `onclick="openProntuario(550e8400-...)"` é JavaScript inválido) para um ganho que desaparece assim que o backend passar a emitir os IDs reais. Documentado como dívida técnica em [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md) — a correção completa faz mais sentido junto com a Fase 8 (remoção de `onclick` inline via delegação de eventos), quando os IDs passam a viver em `data-id` em vez de dentro do atributo.

### 3. Sem guarda de rota real — a ocultação de menu não é controle de acesso
- **Arquivo:** `assets/js/core/auth.js` (`navigate()`)
- **Causa:** `NAV_CONFIG` decide o que aparece no menu lateral por papel, mas `navigate(page)` renderizava qualquer página para qualquer papel logado, sem checar se o papel tinha permissão. Um estudante que chamasse `navigate('acesso')` pelo console via `window.navigate('acesso')` (a função já era exposta em `window` para os `onclick`) via a tela completa de administração de usuários.
- **Impacto:** autorização de UX inconsistente — o menu escondia a opção, mas a rota em si não se protegia.
- **Status:** **Corrigido.** `navigate()` agora chama `canAccessPage(page)` (`core/permissions.js`) antes de renderizar; se não autorizado, mostra toast de erro e redireciona para a home do papel. Validado com teste automatizado (ver seção de testes do relatório final).

### 4. Regra de papéis (`["tecnico","supervisor","estudante"].includes(...)`) duplicada em 8+ pontos
- **Arquivos:** `pages/pacientes.js` (4x), `pages/agenda.js` (1x), `pages/dashboard.js`, `modals.js` (2x)
- **Causa:** a mesma checagem de "é membro da equipe clínica" foi copiada em cada arquivo que precisava decidir se mostrava um botão de ação.
- **Impacto:** manutenção arriscada — mudar a regra de permissão exige encontrar e editar todas as cópias; fácil esquecer uma.
- **Status:** **Corrigido.** Centralizado em `core/permissions.js` (`can(action, resource)`). Todos os pontos identificados foram migrados.

### 5. Tamanho de documento simulado com `Math.random()`
- **Arquivo:** `assets/js/modals/modals.js` (`salvarUploadDocumento`)
- **Causa:** `Math.floor(Math.random() * 900 + 50) + " KB"` — um dado de demonstração não deveria ser aleatório a cada chamada.
- **Impacto:** nenhum funcional direto, mas é uma prática ruim para dados mock (viola a orientação explícita de que metadado simulado deve ser determinístico).
- **Status:** **Corrigido.** `documentRepository.js` agora deriva um tamanho determinístico a partir do nome do arquivo (hash simples), sempre igual para o mesmo nome.

---

## P2 — Médio

### 5b. Efeito colateral no carregamento do módulo `auth.js`, contradizendo seu próprio comentário
- **Arquivo:** `assets/js/core/auth.js`
- **Causa:** logo acima de `boot()`, um comentário explica que a antiga IIFE auto-executada foi removida "para evitar efeitos colaterais no carregamento do módulo" — mas duas linhas abaixo de `doLogin()`, o próprio arquivo tinha `document.getElementById("login-pass").addEventListener(...)` e o mesmo para `"login-user"` **soltos no nível superior do módulo**, executando assim que o módulo era importado, exatamente o padrão que o comentário dizia evitar.
- **Impacto:** funcionalmente inofensivo no navegador (o `<script type="module">` só é executado depois do HTML estar parseado), mas tornava impossível importar `auth.js` — e por consequência `core/permissions.js`, que depende dele — em um ambiente sem `document` (como os testes automatizados em Node desta refatoração).
- **Status:** **Corrigido.** Extraído para `wireLoginKeydownShortcuts()`, chamada explicitamente por `boot()`, no mesmo espírito do resto do arquivo.

### 6. Lógica de data duplicada em 4 arquivos
- **Arquivos:** `dashboard.js` (`_dashFmtData`, `_dashFmtDataLonga`, `_dashDiaSemana`, `calcIdade`), `agenda.js` (`fmtDia`, array `MESES` duplicado), `pacientes.js`, `acesso.js` — todos reimplementavam formatação de data ISO → BR ou extração de "hoje".
- **Status:** **Corrigido.** Centralizado em `core/dateService.js`. Os wrappers antigos (`_dashFmtData` etc.) foram mantidos como aliases finos, pois são `export`ados (compatibilidade), mas agora delegam ao serviço único.

### 7. `renderTabAgendaPaciente` inclui o papel "paciente" em `canManage`
- **Arquivo:** `assets/js/pages/pacientes.js`
- **Causa:** `["tecnico","supervisor","estudante","paciente"].includes(currentUser.papel)` controla a exibição dos botões Editar/Cancelar/Faltou na aba de agenda do prontuário — incluir "paciente" nessa lista permitiria (na aparência da UI) que o próprio paciente cancelasse ou reportasse falta em seu atendimento.
- **Impacto:** na prática **inatingível pela navegação normal**: a tela do paciente usa `renderMeuProntuario()` (bem mais simples, sem abas), que nunca chama `openProntuario()`. Só seria explorável se um paciente chamasse `window.openProntuario(seuPropriId)` manualmente pelo console — e mesmo assim só afeta o próprio caso do paciente, não o de terceiros.
- **Status:** **Documentado, comportamento preservado.** Centralizado como `can("appointment.manage")` com o comentário explicando o motivo. Não foi alterado porque mudar comportamento exigiria confirmação de que isso não é intencional — recomendação registrada em [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md) para restringir a `STAFF_ROLES` quando o time validar.

### 7b. Comentário indica uma checagem de anamnese que nunca chegou a ser usada
- **Arquivo:** `assets/js/pages/notificacoes.js` (`getNotificacoesAtivas`)
- **Causa:** o código calcula `temEv` (há evolução registrada após a consulta?) e usa `if (temEv) return;` para não gerar a notificação de "evolução pendente". Logo abaixo, havia um comentário "Verifica se já há anamnese finalizada (idem)" calculando `temAnamnese` — mas **nenhum `if (temAnamnese) return;` correspondente existia**. A variável era calculada e nunca lida (confirmado pelo ESLint introduzido nesta refatoração, ver Fase 49).
- **Impacto:** hoje a notificação de "evolução pendente" dispara independente do status da anamnese — o comentário sugere que a intenção original era não incomodar o estudante com essa notificação se a anamnese já estivesse finalizada, mas essa parte nunca foi implementada (ou foi removida e o comentário ficou órfão).
- **Status:** **Documentado, comportamento preservado.** Remover a variável morta é seguro (feito); adicionar o `if (temAnamnese) return;` que falta seria uma **mudança de comportamento**, não uma refatoração, e por isso não foi feita sem confirmação do time sobre qual era a intenção correta. Registrado em [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md).

### 8. `saveData()` chamado duas vezes em sequência em vários fluxos de escrita
- **Arquivos:** `modals.js` (várias funções `salvar*`)
- **Causa:** `logAudit()` já termina com `saveData()` internamente; várias funções chamavam `logAudit(...)` e, na linha seguinte, `saveData()` de novo.
- **Impacto:** nenhum funcional (idempotente), apenas uma escrita a mais em `localStorage` por operação — no volume atual (mock, poucos KBs), irrelevante; documentado para não ser reintroduzido em código novo.
- **Status:** **Aceito.** Não removido nos pontos pré-existentes para manter o diff desta refatoração focado; qualquer novo código de repositório (`repositories/*.js`) já não tem essa duplicação.

### 9. `CORES` array de 7 entradas idênticas em `salvarNovoPaciente`
- **Arquivo:** `assets/js/modals/modals.js`
- **Causa:** `const CORES = ["#1b5e20","#1b5e20", ...]` (7x o mesmo valor) usado só para `CORES[PACIENTES.length % CORES.length]`, que sempre resolve para `"#1b5e20"`.
- **Impacto:** nenhum (dead complexity) — mas confunde um leitor novo, que pode achar que há rotação de cores.
- **Status:** **Corrigido.** Substituído pelo literal `"#1b5e20"` diretamente, ao migrar a função para `patientRepository.create()`.

### 10. Bloco de comentário órfão ao final de `modals.js`
- **Arquivo:** `assets/js/modals/modals.js`
- **Causa:** um cabeçalho de seção ("SISTEMA DE NOTIFICAÇÕES") documentando funções (`getNotificacoesAtivas`, `renderNotifPanel`, `marcarNotifLida`) que na verdade vivem em `pages/notificacoes.js` — sobra de um refactor anterior que moveu o código mas não o comentário.
- **Status:** **Corrigido.** Removido.

### 11. Imports não utilizados
- **Arquivos:** `modals.js` importava `ANAMNESES`, `DOCUMENTOS`, `EVOLUCOES`, `getNotificacoesAtivas`, `marcarNotifLida`, `renderNotifPanel` sem uso real no arquivo (além da própria linha de import).
- **Status:** **Corrigido** como consequência da migração para os repositórios.

### 12. Inline event handlers (`onclick`, `oninput`, `onchange`, `onerror`) em ~75 pontos
- **Arquivos:** `index.html` (~15 ocorrências estáticas) e todo HTML gerado dinamicamente em `dashboard.js`, `pacientes.js`, `agenda.js`, `acesso.js`, `notificacoes.js`, `modals.js` (~60 ocorrências).
- **Causa:** o sistema é renderizado via *template strings* concatenando HTML, e cada botão precisa de um disparador de ação; a solução mais direta nesse padrão é `onclick="fn(...)"` embutido na string.
- **Impacto real:** nenhuma vulnerabilidade de XSS adicional (os argumentos embutidos são sempre IDs numéricos internos ou texto que já passou por `escapeHTML()`), mas é uma prática desalinhada com CSP estritas e dificulta uma futura migração para um framework baseado em componentes.
- **Decisão de escopo:** **Não removido nesta etapa** para o HTML gerado dinamicamente. Ver justificativa detalhada em [ARCHITECTURE_TARGET.md](./ARCHITECTURE_TARGET.md#por-que-não-removemos-todo-onclick-inline-agora) — remover exigiria reescrever a função de renderização de **todas** as telas (praticamente 100% do HTML do sistema) para usar delegação de eventos com `data-action`/`data-id`, uma mudança de altíssimo raio de impacto para um sistema que ainda não tem cobertura de testes end-to-end. Feito **apenas** para os handlers estáticos de `index.html` (login, menu, logout, busca, modal), que são de baixo risco por não serem regenerados a cada render. Ver item 13.
- **Status:** **Parcialmente corrigido + documentado.** Plano completo de remoção incremental em [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) e [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md).

### 13. `window.__PEP_BOOTED__` e ~40 funções expostas globalmente em `window`
- **Arquivo:** `assets/js/main.js`
- **Causa:** necessário para que os `onclick` inline no HTML gerado (item 12) encontrem as funções — módulos ES não colocam nada em `window` por padrão.
- **Impacto:** qualquer script de terceiros (ex.: uma extensão de navegador maliciosa) tem acesso direto a `window.doLogin`, `window.salvarNovoPaciente` etc. Isso é uma superfície maior do que o necessário, mas é **consequência direta** do item 12, não um problema independente — resolve-se junto.
- **Status:** **Documentado.** Não há correção segura possível sem antes resolver o item 12.

---

## P3 — Baixo

### 14. `styles.css` em um único arquivo de 3.199 linhas
- Já é internamente bem organizado (tokens em `:root`, seções comentadas, breakpoints agrupados no fim), então o ganho de dividir em `tokens.css`/`layout.css`/etc. é principalmente organizacional, não funcional.
- **Status:** **Não dividido nesta etapa** (ver justificativa em [ARCHITECTURE_TARGET.md](./ARCHITECTURE_TARGET.md)) — dividir aumentaria o número de requisições HTTP e o risco de ordem de cascata incorreta, para um ganho pequeno já que o arquivo tem tokens centralizados. Registrado em FUTURE_IMPROVEMENTS.md como melhoria de baixo risco para quando houver um build step (bundler) que possa remontar os arquivos em um único CSS de produção.

### 14b. `setInterval` solto no carregamento do módulo `pages/notificacoes.js`
- **Causa:** `setInterval(_updateNotifBadge, 60000)` estava no nível superior do módulo, rodando assim que o arquivo era importado — antes mesmo de qualquer login. Mesmo problema de fundo do item 5b (efeito colateral no carregamento do módulo), com um agravante: um `setInterval` sem `clearInterval` correspondente torna **impossível** rodar testes automatizados que importem esse módulo (o processo Node nunca termina, pois o timer mantém o event loop vivo).
- **Status:** **Corrigido.** Extraído para `startNotifBadgePolling()`, chamada por `initApp()` (que já roda uma vez por login/restauração de sessão), com uma guarda para não criar um segundo interval em logins subsequentes na mesma aba.

### 14c. `document.addEventListener` solto no carregamento do módulo `pages/acesso.js`
- **Causa:** um listener de clique global (fecha a lista de autocomplete de pacientes ao clicar fora) é registrado no nível superior do módulo.
- **Impacto:** nenhum problema funcional (diferente do `setInterval` acima, não trava testes nem tem efeito visível antes do elemento existir), mas é o mesmo padrão desalinhado com o restante do código.
- **Status:** **Documentado, não corrigido.** Baixo risco e baixo benefício de mudar isoladamente; considerar junto de uma futura passada geral de "nenhum listener fora de uma função" (ver [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md)).

### 15. `console.warn` direto em `store.js` (dado corrompido no localStorage)
- **Status:** **Corrigido.** Substituído por `logger.warn()` (`core/logger.js`), que respeita `config.ENVIRONMENT`.

### 16. Nenhum teste automatizado existia antes desta refatoração
- **Status:** **Corrigido parcialmente.** Testes unitários adicionados para `permissions.js`, `idService.js`, `dateService.js`, `validarCPF`/`validarEmail`, e os repositórios de leitura/escrita mais críticos (`patientRepository`, `appointmentRepository`). Ver `tests/` e o relatório final para escopo e limitações (não há testes de integração de UI/DOM — decisão registrada para não adicionar jsdom como dependência nesta etapa).

---

## Não encontrado (verificado explicitamente)

- **`eval()` / `new Function()`:** nenhuma ocorrência real (o único match de "eval" no código é um comentário dizendo "sem uso de eval()").
- **Dependência circular problemática:** existem ciclos de import intencionais e seguros (`auth.js` ↔ `store.js`, `auth.js` ↔ `dashboard.js`, `auth.js` ↔ `permissions.js`) — todos seguem o mesmo padrão seguro: a referência circular só é lida dentro do corpo de funções, nunca durante a avaliação de topo do módulo, o que o ESM resolve corretamente. Validado em teste de fumaça end-to-end (login com os 4 papéis, sem erros de console).
- **Vazamento de memória em gráficos Chart.js:** `dashboard.js` já usa `_destroyChart(id)` antes de recriar cada gráfico — padrão correto.
- **CPF validado incorretamente:** o algoritmo de dígito verificador em `validarCPF()` foi conferido e está correto.
