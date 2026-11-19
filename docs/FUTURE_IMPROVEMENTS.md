# Melhorias Futuras — PEP (FCMSCSP)

Oportunidades identificadas durante a refatoração e as rodadas seguintes, deliberadamente **não implementadas ainda** por estarem fora do escopo da etapa ou por terem uma relação custo/risco desfavorável para serem feitas de uma vez. Revisado em novembro de 2026; os itens já resolvidos estão no fim, para manter a numeração.

## Em aberto

| # | Feature | Benefício | Complexidade | Dependências | Prioridade |
|---|---|---|---|---|---|
| 1 | Remover `onclick`/`oninput` inline do HTML gerado dinamicamente, migrando para delegação de eventos (`data-action`) | Prepara para CSP estrita; reduz superfície de funções globais em `window` | Alta — toca as funções `render*` de todas as telas | Idealmente, testes E2E antes de começar (item 5) | P1 |
| 3 | Migrar UUID também para pacientes/usuários/agendamentos (não só documentos/notificações/faltas) | Consistência total de estratégia de ID | Média-alta — exige aspas em toda embedding de ID em `onclick` | Fica natural de fazer junto do item 1 (quando IDs migram para `data-id`) | P2 (combinar com #1) |
| 4 | Dividir `styles.css` em arquivos por domínio (`tokens.css`, `layout.css`, `components.css`...) | Organização para times maiores | Baixa, mas exige um build step para não regredir performance (mais requisições) | Introdução de um bundler | P3 |
| 5 | Testes E2E (Playwright ou Cypress) cobrindo os fluxos principais de cada papel | Rede de segurança para permitir mudanças maiores (como o item 1) com confiança | Média | Nenhuma — pode ser adicionado como dependência de desenvolvimento | P1 |
| 8 | Cache de dados de referência (perfil do usuário logado, permissões) no frontend | Reduz chamadas repetidas à API | Baixa | — | P3 |
| 9 | Suporte a mais de um documento por upload / drag-and-drop | UX | Baixa | O envio real já existe (`POST /api/pacientes/:pid/documentos`) | P3 |
| 10 | TypeScript (ou ao menos checagem JSDoc automatizada via `tsc --checkJs`) | Detecção de erros de tipo em tempo de desenvolvimento | Média | Preferencialmente junto com a introdução de um bundler | P3 |
| 13 | Decidir e implementar se a notificação "evolução pendente" deve ser suprimida quando a anamnese já está finalizada (ver [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md), item 7b) | Corrige uma provável lacuna de UX (comentário no código sugeria essa intenção) | Baixa, mas exige decisão de produto antes | Confirmar com o time se é o comportamento desejado | P2 |
| 15 | Leitura por consulta no MongoDB e paginação no servidor para todas as listas | Hoje o servidor carrega o conjunto inteiro de dados a cada requisição e o navegador recebe todo o escopo do usuário; só a trilha de auditoria é paginada no servidor. Necessário para volume grande. | Alta — troca `GET /api/data` por rotas por recurso e muda a gravação conferida item a item | Adaptador MongoDB (já existe) | P2 |
| 16 | Mais de uma instância do servidor | Disponibilidade | Alta — sessões fora da memória e controle de concorrência no banco | Item 15 | P3 |
| 17 | Verificação antivírus dos arquivos enviados | Defesa adicional além da lista branca por conteúdo | Média | Serviço de antivírus na implantação | P2 |
| 18 | IP de origem na auditoria atrás de proxy (`X-Forwarded-For` de proxy confiável) | Hoje, atrás de proxy, a trilha grava o IP do proxy | Baixa | Definição do proxy na implantação | P2 |

Fora do escopo por decisão do responsável pelo projeto, e por isso ainda não existem: publicação para uso real (hospedagem com HTTPS), assinatura com certificado ICP-Brasil, MFA e migração da produção para banco de dados. O que a implantação precisa está em [IMPLANTACAO.md](./IMPLANTACAO.md).

## Concluídos

| # | Feature | Como ficou |
|---|---|---|
| 2 | Restringir `can("appointment.manage")` para não incluir o papel `paciente` | Feito em novembro de 2026. A agenda é só do técnico; o paciente não pede pelo sistema (pede presencialmente, por telefone ou e-mail, e o técnico registra o pedido). Ver [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md). |
| 6 | Fluxo de edição/desativação de usuário | Edição de nome, login, papel, CRP e matrícula (`PUT /api/usuarios/:id`), redefinição de senha (`POST /api/usuarios/:id/senha`, com troca obrigatória garantida no servidor) e inativação/reativação, com reautenticação do técnico. Acesso do paciente gerado pelo sistema e temporário (`POST /api/pacientes/:pid/acesso-temporario`). |
| 7 | Paginação na UI | Pacientes (20 por página), equipe (12, com busca), acesso temporário dos pacientes (10) e auditoria (50, paginada no servidor). As demais listas continuam paginadas só na tela; ver item 15. |
| 11 | Reduzir a duplicação de `saveData()` após `logAudit()` | Deixou de existir: a auditoria é gravada pelo servidor e `logAudit()` só informa eventos de leitura. |
| 12 | Auto-logout configurável | O tempo de inatividade (15 min) e o aviso (60 s) ficam em `assets/js/shared/configuracao.js` (`SEGURANCA`), aplicados no servidor e na tela. |
| 14 | Histórico de evoluções no portal do paciente | O portal ("Meu prontuário", só de consulta, com acesso temporário) mostra as evoluções validadas, além da avaliação, documentos, termos e compartilhamentos. |

## Não recomendado (avaliado e descartado)

- **Migrar para React/Vue agora:** ver justificativa completa em [ARCHITECTURE_TARGET.md](./ARCHITECTURE_TARGET.md).
- **Index TTL na coleção de auditoria do MongoDB:** a trilha faz parte da guarda do prontuário (20 anos) e é encadeada por hash; apagar registros antigos quebraria a verificação. Ver [DATABASE_MONGODB.md](./DATABASE_MONGODB.md).
