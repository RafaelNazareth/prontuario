# Relatório de Refatoração — PEP (FCMSCSP)

## 1. Resumo

Esta refatoração profissionalizou o frontend do PEP sem alterar sua identidade visual, seus fluxos de usuário ou suas credenciais de demonstração. O trabalho teve três frentes:

1. **Isolar o mock da lógica de aplicação** — os ~2.500 linhas de dados de demonstração que viviam dentro de `core/store.js` foram extraídos para `infrastructure/mock/mockData.js`, e uma camada de repositórios (`repositories/*.js`) foi introduzida como o vocabulário de domínio que, no futuro, falará com uma API Java em vez de arrays em memória.
2. **Centralizar decisões espalhadas** — autorização por papel, formatação de data, geração de ID e status viravam módulos únicos (`core/permissions.js`, `core/dateService.js`, `core/idService.js`, `core/enums.js`) em vez de lógica duplicada em 4 a 8 arquivos.
3. **Documentar exaustivamente o caminho até um backend Java + MongoDB** — 12 documentos em `docs/` cobrindo auditoria, arquitetura, modelo de domínio, contrato de API, modelagem MongoDB, matriz de permissões, especificação de auditoria, requisitos de segurança/LGPD, guia do backend Java, melhorias futuras e o plano de migração fase a fase.

Nenhuma funcionalidade foi removida. Nenhuma credencial de demonstração foi alterada. Toda mudança de comportamento potencial foi ou evitada deliberadamente (documentada como decisão de escopo) ou verificada em um navegador real antes de ser aceita.

**Nota importante sobre o escopo do diff:** `assets/css/styles.css` e `assets/js/core/utils.js` já apareciam modificados no `git status` **antes** desta sessão começar (trabalho pré-existente, não commitado, do próprio usuário). Esta refatoração não tocou em nenhum dos dois arquivos — o conteúdo permanece exatamente como estava quando a sessão começou.

## 2. Problemas encontrados (antes/depois)

Ver o detalhamento completo, com severidade e status, em [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md). Resumo dos itens corrigidos:

| Problema | Antes | Depois |
|---|---|---|
| Mock misturado com lógica | 2.733 linhas em `store.js`, dados e persistência juntos | `store.js`: 205 linhas (lógica); `mockData.js`: dados isolados |
| IDs via `Date.now()` | Colisão possível em chamadas na mesma ms | `idService.js` (UUID para coleções string; contador monotônico para numéricas) |
| Sem guarda de rota real | `navigate('acesso')` renderizava para qualquer papel | `canAccessPage()` bloqueia e redireciona |
| Regra de papel duplicada em 8+ lugares | `["tecnico","supervisor","estudante"].includes(...)` copiado | `core/permissions.js::can()` |
| Tamanho de documento aleatório | `Math.random()` a cada leitura | Hash determinístico do nome do arquivo |
| Lógica de data duplicada em 4 arquivos | `.split("-").reverse().join("/")` repetido | `core/dateService.js` |
| Efeito colateral no load de `auth.js` | `addEventListener` solto no topo do módulo | Movido para `wireLoginKeydownShortcuts()`, chamado por `boot()` |
| `setInterval` solto no load de `notificacoes.js` | Rodava antes do login, impedia testes automatizados | Movido para `startNotifBadgePolling()`, chamado por `initApp()` |
| Imports/variáveis mortas | ~25 ocorrências (confirmadas pelo ESLint introduzido) | Removidas |
| Sem lint/testes | Nenhuma ferramenta configurada | ESLint + Prettier + `node:test` (38 testes) |

## 3. Arquivos alterados

```
index.html
assets/js/core/auth.js
assets/js/core/store.js
assets/js/main.js
assets/js/modals/modals.js
assets/js/pages/acesso.js
assets/js/pages/agenda.js
assets/js/pages/dashboard.js
assets/js/pages/notificacoes.js
assets/js/pages/pacientes.js
package.json
README.md
```

(`assets/css/styles.css` e `assets/js/core/utils.js` — ver nota na seção 1, não alterados por esta refatoração apesar de aparecerem no diff geral do repositório.)

## 4. Arquivos criados

```
assets/js/core/config.js
assets/js/core/dateService.js
assets/js/core/enums.js
assets/js/core/idService.js
assets/js/core/logger.js
assets/js/core/permissions.js
assets/js/domain/models.js
assets/js/infrastructure/mock/mockData.js
assets/js/repositories/patientRepository.js
assets/js/repositories/userRepository.js
assets/js/repositories/appointmentRepository.js
assets/js/repositories/clinicalRepository.js
assets/js/repositories/documentRepository.js
assets/js/repositories/notificationRepository.js
assets/js/repositories/accessRequestRepository.js
assets/js/repositories/absenceRepository.js
assets/js/repositories/auditRepository.js
tests/helpers/testEnv.mjs
tests/idService.test.mjs
tests/dateService.test.mjs
tests/permissions.test.mjs
tests/repositories.test.mjs
tests/validators.test.mjs
eslint.config.js
.prettierrc.json
.gitignore
docs/FRONTEND_AUDIT.md
docs/ARCHITECTURE_CURRENT.md
docs/ARCHITECTURE_TARGET.md
docs/DOMAIN_MODEL.md
docs/BACKEND_CONTRACT.md
docs/API_DTOS.md
docs/DATABASE_MONGODB.md
docs/PERMISSIONS_MATRIX.md
docs/AUDIT_LOG_SPEC.md
docs/SECURITY_BACKEND_REQUIREMENTS.md
docs/JAVA_BACKEND_GUIDE.md
docs/FUTURE_IMPROVEMENTS.md
docs/MIGRATION_GUIDE.md
docs/REFACTORING_REPORT.md
```

## 5. Problemas não corrigidos (e por quê)

- **~75 pontos de `onclick`/`oninput` inline no HTML gerado dinamicamente** (`pages/*.js`, `modals/*.js`): removê-los exigiria reescrever a função de renderização de praticamente todas as telas do sistema numa única mudança, sem uma suíte de testes E2E que desse confiança de que nada quebrou. Migrados apenas os handlers **estáticos** de `index.html` (baixo risco, servem de prova de conceito do padrão a seguir). Plano completo em [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) e [ARCHITECTURE_TARGET.md](./ARCHITECTURE_TARGET.md).
- **IDs de pacientes/usuários/agendamentos continuam numéricos** (não UUID): mudar o tipo exigiria colocar aspas em cada `onclick="fn(${id})"` que os embute sem aspas — mesma razão de risco do item acima. Ver [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md), item 2.
- **`can("appointment.manage")` ainda inclui o papel "paciente"** por preservar comportamento pré-existente (inatingível pela navegação normal, mas presente na regra). Ver [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md), item 7, e [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md).
- **Notificação "evolução pendente" não verifica se a anamnese já foi finalizada**, apesar de um comentário no código sugerir essa intenção original — a variável morta foi removida, mas adicionar o comportamento seria uma mudança funcional não autorizada. Ver [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md), item 7b.
- **`styles.css` não foi dividido em múltiplos arquivos** — já tem tokens centralizados; dividir aumentaria requisições HTTP sem um bundler. Ver [ARCHITECTURE_TARGET.md](./ARCHITECTURE_TARGET.md).
- **`npm run format` não foi executado sobre o código-fonte existente** — geraria um diff cosmético enorme, obscurecendo esta revisão. A ferramenta fica disponível para quando o time decidir adotá-la.

## 6. Dívida técnica restante

Ver [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md) para a lista completa priorizada. Resumo por severidade:

- **P1:** remoção incremental de `onclick` inline (item acima); testes E2E antes dessa remoção; paginação real antes de qualquer volume de produção.
- **P2:** decidir o comportamento de `appointment.manage` e da notificação de evolução pendente; migrar UUID para as entidades numéricas restantes (idealmente junto da remoção de `onclick`); CRUD completo de usuários (hoje só há criação).
- **P3:** dividir `styles.css`; TypeScript/JSDoc-checking; cache de dados de referência.

Nenhum item P0 restante.

## 7. Melhorias de performance (antes/depois)

- `store.js` caiu de 2.733 para 205 linhas — menos código para o parser/engine avaliar a cada carregamento do módulo, e o dataset mock (`mockData.js`) só precisa ser parseado uma vez por `buildMockDataset()`.
- Tamanho de documento deixou de ser recalculado aleatoriamente a cada leitura (agora determinístico), eliminando uma fonte de re-render inconsistente.
- Nenhuma micro-otimização cosmética foi feita sem impacto mensurável (ex.: não foi introduzido memoization/cache prematuro) — coerente com a prioridade "não otimize sem necessidade real" do escopo desta etapa. O documento [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md) e [ARCHITECTURE_TARGET.md](./ARCHITECTURE_TARGET.md) tratam de performance em escala (paginação, sharding) para quando o backend existir — o mock atual (17 pacientes, 50 estudantes) não tem gargalo real de performance hoje.

## 8. Melhorias arquiteturais (antes/depois)

| Aspecto | Antes | Depois |
|---|---|---|
| Camadas | UI lendo arrays globais diretamente | UI → `permissions.js` → `repositories/*.js` → `store.js` → mock |
| Autorização | Espalhada, ad-hoc | Centralizada em `core/permissions.js`, com guarda de rota real |
| Geração de ID | `Date.now()` solto | `core/idService.js` |
| Datas | Duplicada em 4 arquivos | `core/dateService.js` |
| Efeitos de módulo | 2 casos de side-effect no carregamento (`auth.js`, `notificacoes.js`) | Movidos para funções chamadas explicitamente no boot |
| Preparação para backend | Nenhuma | Camada de repositório pronta para trocar mock por API sem tocar telas |

## 9. Segurança

- Guarda de rota real (`canAccessPage`) impedindo renderização de páginas administrativas para papéis sem permissão, mesmo via chamada direta a `navigate()`.
- `can()` centraliza toda checagem de "quem pode o quê", eliminando o risco de uma nova tela esquecer de replicar uma regra de permissão.
- Confirmado (auditoria + testes): nenhum uso de `eval()`/`new Function()`; `escapeHTML()` aplicado consistentemente; senha nunca persiste em `currentUser` após login.
- **Nada disto é segurança real** — é autorização de UX, documentada exaustivamente como tal em [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md) e [SECURITY_BACKEND_REQUIREMENTS.md](./SECURITY_BACKEND_REQUIREMENTS.md), que especifica o que o backend Java deve implementar (autenticação, rate limiting, CORS/CSRF/CSP, validação server-side, upload seguro, LGPD) antes de qualquer dado clínico real trafegar pelo sistema.

## 10. Backend

**O que está preparado:** contrato completo de API (endpoints, DTOs, paginação, erros) em [BACKEND_CONTRACT.md](./BACKEND_CONTRACT.md) e [API_DTOS.md](./API_DTOS.md); guia de arquitetura Java (camadas, pacotes) em [JAVA_BACKEND_GUIDE.md](./JAVA_BACKEND_GUIDE.md); requisitos de segurança e LGPD (com aviso de que precisam de validação jurídica) em [SECURITY_BACKEND_REQUIREMENTS.md](./SECURITY_BACKEND_REQUIREMENTS.md); especificação de auditoria em [AUDIT_LOG_SPEC.md](./AUDIT_LOG_SPEC.md); e a camada de repositório no frontend já pronta para trocar de implementação (mock → API) sem tocar em nenhuma tela. **Nada do backend foi implementado** — é 100% especificação para a próxima etapa.

## 11. MongoDB

**O que está especificado:** 9 collections (`users`, `patients`, `anamneses`, `evolutions`, `appointments`, `absences`, `documents`, `access_requests`, `audit_log`, `notifications`) com campos, índices, estratégia de crescimento e a justificativa de embedding vs. referencing para cada relacionamento — nenhuma modelagem foi copiada de um esquema relacional sem análise. Ver [DATABASE_MONGODB.md](./DATABASE_MONGODB.md). **Nenhum banco foi criado** — é especificação.

## 12. Próximos passos (ordenados por prioridade)

1. Validar com o time/cliente se o comportamento de `appointment.manage` (item 5, seção 5) e a ausência de gate por anamnese finalizada na notificação de evolução pendente (item 4) são intencionais ou lacunas a corrigir.
2. Adicionar testes E2E (Playwright/Cypress) cobrindo os fluxos principais de cada papel — pré-requisito para começar a remoção incremental de `onclick` inline com segurança.
3. Iniciar a Fase 2 do [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md): esqueleto da API Java com autenticação e o endpoint de pacientes, validando a integração ponta a ponta antes de migrar o restante.
4. Obter validação jurídica/compliance dos pontos de LGPD listados em [SECURITY_BACKEND_REQUIREMENTS.md](./SECURITY_BACKEND_REQUIREMENTS.md) antes de qualquer dado clínico real ser processado.
5. Continuar a remoção incremental de `onclick` inline, tela por tela, uma vez que os testes E2E existam.

---

## Resumo da execução

```
Arquivos modificados: 10 (+2 pré-existentes do usuário, não tocados por esta refatoração)
Arquivos criados: 37
Testes criados: 38 (100% passando)
Testes executados: 38 automatizados (node:test) + verificação manual em navegador real
                    (Chrome headless via CDP) cobrindo login/logout dos 4 papéis, guarda de
                    rota, CRUD de paciente/agendamento/evolução/anamnese/documento, faltas,
                    solicitação de acesso, e todos os handlers de UI migrados de onclick
                    inline para addEventListener — sem erros de console em nenhum cenário
Bugs corrigidos: 6 reais (P1/P2) + ~25 imports/variáveis mortas (ESLint)
Problemas P0 restantes: 0
Problemas P1 restantes: 2 (documentados em FUTURE_IMPROVEMENTS.md)

Arquitetura atual:
  UI → core/permissions.js → repositories/*.js → core/store.js → infrastructure/mock → localStorage

Arquitetura futura:
  UI → core/permissions.js → repositories/*.js → infrastructure/api/*ApiClient.js → API Java → MongoDB

Backend preparado: SIM (contrato de API, DTOs, guia de arquitetura Java — nada implementado)
MongoDB especificado: SIM (9 collections, índices, embedding vs. referencing justificado — nenhum banco criado)

Principais riscos restantes:
  - ~75 pontos de onclick inline ainda no HTML gerado dinamicamente (alto esforço para remover
    com segurança sem testes E2E prévios)
  - Autorização é só de UX — dado real não deve trafegar até o backend existir
  - Duas decisões de comportamento (appointment.manage, gate de anamnese) precisam de validação
    de produto, não de engenharia

Próximo passo recomendado:
  Validar as duas decisões de comportamento pendentes com o time, depois iniciar testes E2E
  como pré-requisito para a remoção incremental de onclick inline.
```
