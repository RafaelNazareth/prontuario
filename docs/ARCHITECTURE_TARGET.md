# Arquitetura Alvo — PEP (FCMSCSP)

Este documento descreve para onde a arquitetura deve evoluir, e explica as decisões conscientes de **não** fazer certas mudanças agora.

## Direção geral

O backend é e continua sendo o servidor **Node.js** do repositório. Não há plano de trocá-lo por outra linguagem: ele já concentra autenticação, autorização, auditoria, cifragem e backup, e compartilha as regras com o modo demonstração (`assets/js/shared/`).

**Hoje:**
```
Navegador (pages, modals, repositories, store)
 ↓  GET /api/data (todo o escopo) · PUT /api/data (conferido item a item)
Servidor Node (server/index.mjs + assets/js/shared/)
 ↓  ler() o conjunto inteiro · gravar() só o que mudou
Banco: data/db.json (padrão) ou MongoDB (PEP_BANCO=mongodb)
```

**Próximo passo:**
```
Navegador (pages, modals)                ← muda pouco
 ↓
repositories/*.js                        ← passam a chamar rotas por recurso
 ↓  ex.: prontuário de um paciente, agenda de uma semana, lista paginada
Servidor Node                            ← regras de shared/ continuam as mesmas
 ↓  consultas pelo índice, só os documentos necessários
MongoDB
```

O que muda no próximo passo:

1. **Leitura por consulta.** Trocar o "lê tudo, filtra pelo escopo" por consultas no MongoDB que já trazem só o que o papel pode ver (os índices de `supervisorId`, `estudantesIds`, `pacienteRef` e agenda já existem). Paginação no servidor para todas as listas, como já acontece na auditoria.
2. **Gravação por recurso.** A conferência de `aplicarAlteracoes()` passa a receber só os registros envolvidos na operação, em vez do conjunto inteiro.
3. **Concorrência.** Com as duas mudanças acima, dá para trocar a fila local por controle de concorrência no banco e guardar as sessões fora da memória, o que permite mais de uma instância do servidor.

O banco JSON continua útil para desenvolvimento e para o modo demonstração. Detalhes do banco em [DATABASE_MONGODB.md](./DATABASE_MONGODB.md) e da migração em [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

## Camadas do frontend

```
UI (pages/*.js, modals/*.js)
 ↓
core/permissions.js (o que aparece na tela)
 ↓
repositories/*.js (vocabulário de domínio: list/getById/create/update)
 ↓
core/store.js (estado em memória)
 ↓
infrastructure/jsonDataSource.js (API) ou servidorDemo.js (modo demonstração)
```

A camada de repositório (`repositories/*.js`) continua sendo o ponto de corte: quando existirem rotas por recurso, só o interior dos repositórios e do `jsonDataSource.js` precisa mudar.

## Por que não migramos para React (ou outro framework) agora

Avaliado e descartado nesta etapa, pelos seguintes motivos:

1. **O problema real não era a ausência de componentização — era a mistura de dados de demonstração com lógica**, resolvida com a camada de repositórios e, depois, com o servidor, sem trocar de stack.
2. **Risco/benefício desfavorável agora:** o cliente (Serviço-Escola de Psicologia) ainda precisa aprovar o frontend atual. Uma reescrita para React mudaria a identidade visual/comportamental de formas sutis (mesmo mantendo o CSS, o ciclo de vida de re-render de um framework é diferente de `innerHTML` direto) exatamente na fase em que menos se quer risco de regressão.
3. **Não há build step hoje** (o servidor Node entrega os arquivos como estão). Adotar React exigiria Vite/Webpack/Babel — uma mudança de infraestrutura de desenvolvimento, não só de código.
4. A arquitetura em camadas já isola a **regra de negócio e o acesso a dados** da camada de UI. Se uma migração para componentes for decidida no futuro, o trabalho será "trocar a camada de UI", reaproveitando `core/`, `shared/` e `repositories/` — o que só é possível porque essas camadas já não fazem manipulação de DOM.

**Recomendação:** reavaliar a necessidade de um framework de componentes somente se e quando o volume de UI crescer a ponto de a manutenção de template strings se tornar o gargalo real. Registrado como decisão em aberto em [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md).

## Por que não removemos todo `onclick` inline agora

O sistema tem dezenas de pontos com `onclick`/`oninput`/`onchange` (ver [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md), item 12), a grande maioria dentro de HTML **gerado dinamicamente** via template strings (`pages/*.js`, `modals/*.js`).

Removê-los exigiria, para cada função `render*`:
1. Trocar `onclick="fn(${id})"` por `data-action="fn" data-id="${id}"`;
2. Anexar um único `addEventListener("click", ...)` delegado no container pai, com um `switch` sobre `data-action`;
3. Repetir para `oninput`/`onchange`/`onkeydown`.

Isso toca **essencialmente 100% do HTML do sistema** de uma vez — o maior raio de impacto possível numa única mudança, para um sistema que ainda não tem testes end-to-end de UI (Playwright/Cypress) que deem confiança de que nenhum clique quebrou.

**Decisão:** fazer essa migração **incrementalmente**, uma tela por vez, cada uma acompanhada de um teste manual completo (ou, idealmente, um teste E2E), em vez de uma reescrita única. Os handlers **estáticos** de `index.html` (login, menu, logout, busca, modal) já foram migrados, por serem de baixo risco e servirem de prova de conceito do padrão de delegação. Enquanto isso, a CSP do servidor precisa permitir `'unsafe-inline'` em scripts.

## Por que não dividimos `styles.css` em múltiplos arquivos agora

`styles.css` já tem:
- um bloco `:root` único com todos os tokens de cor, espaçamento, raio, sombra e transição;
- seções comentadas e agrupadas por tela;
- breakpoints agrupados ao final do arquivo.

Ou seja, o problema que a divisão em `tokens.css`/`layout.css`/`components.css`/etc. resolveria (tokens espalhados, duplicação de valores) **já não existe**. Dividir o arquivo agora:
- aumentaria de 1 para ~10 requisições HTTP (sem um bundler para remontar em produção, isso é uma regressão real de performance);
- introduziria risco de ordem de `<link>` incorreta quebrar cascata CSS.

**Decisão:** manter um único arquivo por ora; revisitar a divisão física quando (e se) um build step for introduzido. Documentado em [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md).

## Por que não migramos para TypeScript agora

`domain/models.js` documenta as entidades como JSDoc typedefs, que dão autocomplete e checagem leve em editores sem exigir um compilador. TypeScript traria checagem mais forte, mas exigiria um build step (o projeto hoje não tem nenhum) — desproporcional ao tamanho atual do código. Se a superfície da API crescer muito (rotas por recurso), reavaliar introduzir TypeScript, ou ao menos `tsc --checkJs`, **junto** com a adoção de um bundler.

## Estrutura de diretórios

A estrutura atual já reflete o alvo (ver [ARCHITECTURE_CURRENT.md](./ARCHITECTURE_CURRENT.md)). Não há necessidade de mover pastas: as rotas por recurso entram em `server/index.mjs` (ou em módulos de rota dentro de `server/`), as consultas em `server/banco/`, e o navegador continua chamando a API por `infrastructure/jsonDataSource.js`.
