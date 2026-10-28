# Arquitetura Alvo — PEP (FCMSCSP)

Este documento descreve para onde a arquitetura do frontend deve evoluir, e explica as decisões conscientes de **não** fazer certas mudanças agora.

## Direção geral

```
Frontend
    ↓
REST API (Java, /api/v1)
    ↓
Camada de aplicação (Java)
    ↓
MongoDB
```

O frontend não deve conhecer detalhes internos do MongoDB — apenas contratos de API (DTOs), documentados em [BACKEND_CONTRACT.md](./BACKEND_CONTRACT.md) e [API_DTOS.md](./API_DTOS.md).

## Camadas do frontend (hoje e no futuro)

**Hoje:**
```
UI (pages/*.js, modals/*.js)
 ↓
core/permissions.js (autorização de UX)
 ↓
repositories/*.js (vocabulário de domínio: list/getById/create/update)
 ↓
core/store.js (estado em memória + persistência)
 ↓
infrastructure/mock/mockData.js (dataset de demonstração)
 ↓
localStorage
```

**Futuro (quando o backend Java existir):**
```
UI (pages/*.js, modals/*.js)          ← NÃO MUDA
 ↓
core/permissions.js                    ← NÃO MUDA (mas deixa de ser a única autorização real)
 ↓
repositories/*.js                       ← MESMA INTERFACE, implementação troca
 ↓
infrastructure/api/*ApiClient.js        ← NOVO: fetch() para /api/v1/...
 ↓
API Java REST
 ↓
MongoDB
```

A camada de repositório (`repositories/*.js`) foi desenhada exatamente para ser o ponto de corte: hoje ela lê/escreve em `core/store.js` (mock + `localStorage`); no futuro, a mesma função `patientRepository.create(data)` fará um `POST /api/v1/patients` em vez de um `push()` num array. **Nenhuma tela precisa mudar** — só o interior de cada arquivo em `repositories/`. Ver [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) para o plano passo a passo.

## Por que não migramos para React (ou outro framework) agora

Avaliado e descartado nesta etapa, pelos seguintes motivos:

1. **O problema real não é a ausência de componentização — é a mistura de mock com lógica**, que já foi resolvida com a camada de repositórios sem trocar de stack.
2. **Risco/benefício desfavorável agora:** o cliente (Serviço-Escola de Psicologia) ainda precisa aprovar o frontend atual. Uma reescrita para React mudaria a identidade visual/comportamental de formas sutis (mesmo mantendo o CSS, o ciclo de vida de re-render de um framework é diferente de `innerHTML` direto) exatamente na fase em que menos se quer risco de regressão.
3. **Não há build step hoje** (o projeto roda com um simples `serve` estático). Adotar React exigiria Vite/Webpack/Babel — uma mudança de infraestrutura de desenvolvimento, não só de código.
4. A arquitetura em camadas já isola a **regra de negócio e o acesso a dados** da camada de UI. Se uma migração para componentes for decidida no futuro, o trabalho será "trocar a camada de UI", reaproveitando `core/`, `domain/`, `repositories/` sem tocar neles — o que só é possível porque essas camadas já não fazem manipulação de DOM.

**Recomendação:** reavaliar a necessidade de um framework de componentes somente se e quando o volume de UI crescer a ponto de a manutenção de template strings se tornar o gargalo real (não é o caso hoje, com 5 páginas). Registrado como decisão em aberto em [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md).

## Por que não removemos todo `onclick` inline agora

O sistema tem ~75 pontos com `onclick`/`oninput`/`onchange` (ver [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md), item 12), a grande maioria dentro de HTML **gerado dinamicamente** via template strings (`pages/*.js`, `modals/*.js`).

Removê-los exigiria, para cada uma dessas ~15 funções `render*`:
1. Trocar `onclick="fn(${id})"` por `data-action="fn" data-id="${id}"`;
2. Anexar um único `addEventListener("click", ...)` delegado no container pai, com um `switch` sobre `data-action`;
3. Repetir para `oninput`/`onchange`/`onkeydown`.

Isso toca **essencialmente 100% do HTML do sistema** de uma vez — o maior raio de impacto possível numa única mudança, para um sistema que:
- ainda não tinha testes automatizados antes desta refatoração;
- não tem testes end-to-end de UI (Playwright/Cypress) que dessem confiança de que nenhum clique quebrou.

**Decisão:** fazer essa migração **incrementalmente**, uma tela por vez, cada uma acompanhada de um teste manual completo (ou, idealmente, um teste E2E), em vez de uma reescrita única. Os handlers **estáticos** de `index.html` (que não são regenerados a cada render — login, menu, logout, busca, modal) já foram migrados nesta refatoração, por serem de baixo risco e servirem de prova de conceito do padrão de delegação a ser usado depois. Plano completo em [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

## Por que não dividimos `styles.css` em múltiplos arquivos agora

`styles.css` (3.199 linhas) já tem:
- um bloco `:root` único com todos os tokens de cor, espaçamento, raio, sombra e transição;
- seções comentadas e agrupadas por tela;
- breakpoints agrupados ao final do arquivo.

Ou seja, o problema que a divisão em `tokens.css`/`layout.css`/`components.css`/etc. resolveria (tokens espalhados, duplicação de valores) **já não existe** — os tokens já estão centralizados. Dividir o arquivo agora:
- aumentaria de 1 para ~10 requisições HTTP (sem um bundler para remontar em produção, isso é uma regressão real de performance, indo contra a prioridade máxima desta refatoração);
- introduziria risco de ordem de `<link>` incorreta quebrar cascata CSS (ex.: um seletor mais específico definido num arquivo carregado antes de um mais genérico).

**Decisão:** manter um único arquivo por ora; revisitar a divisão física quando (e se) um build step for introduzido, que pode dividir para organização durante o desenvolvimento e re-concatenar para produção sem custo de performance. Documentado em [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md).

## Por que não migramos para TypeScript agora

`domain/models.js` já documenta as entidades como JSDoc typedefs, que dão autocomplete e checagem leve em editores (VS Code, por exemplo) sem exigir um compilador. TypeScript traria checagem mais forte, mas exigiria um build step (o projeto hoje não tem nenhum) só para isso — desproporcional ao tamanho atual do código (~10 módulos). Se o backend Java + a superfície de DTOs crescer muito, reavaliar introduzir TypeScript **junto** com a adoção de um bundler (não isoladamente).

## Estrutura de diretórios alvo (incremento sobre a atual)

```
src/                              ← nome sugerido se um dia houver bundler; hoje continua assets/js
  core/         (existe)
  domain/       (existe — hoje só typedefs; no futuro, também validadores de invariantes)
  infrastructure/
    mock/        (existe)
    api/          ← NOVO quando o backend existir: patientApiClient.js, etc.
  repositories/  (existe)
  pages/         (existe)
  modals/        (existe)
```

Não há necessidade de mover pastas — a estrutura atual já reflete o alvo; falta apenas adicionar `infrastructure/api/` quando o backend estiver pronto.
