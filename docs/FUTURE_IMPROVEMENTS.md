# Melhorias Futuras — PEP (FCMSCSP)

Oportunidades identificadas durante a refatoração, deliberadamente **não implementadas agora** por não fazerem parte do escopo (profissionalizar o frontend existente sem backend) ou por terem uma relação custo/risco desfavorável para serem feitas de uma vez.

| # | Feature | Benefício | Complexidade | Dependências | Prioridade |
|---|---|---|---|---|---|
| 1 | Remover `onclick`/`oninput` inline do HTML gerado dinamicamente, migrando para delegação de eventos (`data-action`) | Prepara para CSP estrita; reduz superfície de funções globais em `window` | Alta — toca ~15 funções `render*` em 6 arquivos | Idealmente, testes E2E antes de começar (item 5) | P1 |
| 2 | Restringir `can("appointment.manage")` para não incluir o papel `paciente` | Remove uma inconsistência de modelagem (ver [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md), item 7) | Baixa | Confirmar com o time que não há caso de uso legítimo primeiro | P2 |
| 3 | Migrar UUID também para pacientes/usuários/agendamentos (não só documentos/notificações/faltas) | Consistência total de estratégia de ID | Média-alta — exige aspas em toda embedding de ID em `onclick` | Fica natural de fazer junto do item 1 (quando IDs migram para `data-id`) | P2 (combinar com #1) |
| 4 | Dividir `styles.css` em arquivos por domínio (`tokens.css`, `layout.css`, `components.css`...) | Organização para times maiores | Baixa, mas exige um build step para não regredir performance (mais requisições) | Introdução de um bundler | P3 |
| 5 | Testes E2E (Playwright ou Cypress) cobrindo os fluxos principais de cada papel | Rede de segurança para permitir mudanças maiores (como o item 1) com confiança | Média | Nenhuma — pode ser adicionado agora como dependência de desenvolvimento | P1 |
| 6 | Fluxo de edição/desativação de usuário (hoje só existe criação) | Completa o CRUD de usuários | Baixa | — | P2 |
| 7 | Paginação real na UI (hoje todas as listas carregam tudo de uma vez do mock) | Necessário antes de conectar a um backend com volume real (10k+ pacientes) | Média | Precisa existir o backend com paginação (ver [BACKEND_CONTRACT.md](./BACKEND_CONTRACT.md)) | P1 (bloqueante para produção) |
| 8 | Cache de dados de referência (perfil do usuário logado, permissões) no frontend | Reduz chamadas repetidas à futura API | Baixa | Depende de haver API | P3 |
| 9 | Suporte a mais de um documento por upload / drag-and-drop | UX | Baixa | Backend de upload real (ver [DATABASE_MONGODB.md](./DATABASE_MONGODB.md)) | P3 |
| 10 | TypeScript (ou ao menos checagem JSDoc automatizada via `tsc --checkJs`) | Detecção de erros de tipo em tempo de desenvolvimento | Média | Preferencialmente junto com a introdução de um bundler | P3 |
| 11 | Reduzir a duplicação de `saveData()` após `logAudit()` no código legado de `modals.js` | Pequena limpeza de código | Baixa | Nenhuma | P3 |
| 12 | Auto-logout configurável (hoje fixo em 10 minutos) via `core/config.js` | Flexibilidade operacional | Baixa | Nenhuma | P3 |
| 13 | Decidir e implementar se a notificação "evolução pendente" deve ser suprimida quando a anamnese já está finalizada (ver [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md), item 7b) | Corrige uma provável lacuna de UX (comentário no código sugeria essa intenção) | Baixa, mas exige decisão de produto antes | Confirmar com o time se é o comportamento desejado | P2 |
| 14 | Mostrar histórico de evoluções na tela `renderMeuProntuario()` do paciente (hoje mostra só a anamnese) | Completa a visão do paciente sobre o próprio prontuário | Baixa | Nenhuma | P3 |

## Não recomendado (avaliado e descartado)

- **Migrar para React/Vue agora:** ver justificativa completa em [ARCHITECTURE_TARGET.md](./ARCHITECTURE_TARGET.md).
- **Index TTL na coleção de auditoria do MongoDB:** dado de auditoria clínica tipicamente exige retenção longa — ver [DATABASE_MONGODB.md](./DATABASE_MONGODB.md) e [SECURITY_BACKEND_REQUIREMENTS.md](./SECURITY_BACKEND_REQUIREMENTS.md).
- **GridFS para armazenar documentos anexados:** um object storage dedicado é mais adequado — ver [DATABASE_MONGODB.md](./DATABASE_MONGODB.md).
