# Matriz de Permissões — PEP (FCMSCSP)

⚠️ **Isto documenta autorização de experiência do usuário (UX) no frontend, implementada em `assets/js/core/permissions.js`. NÃO é segurança real.** Todo o estado do sistema (quem está logado, quais pacientes existem) vive no navegador do próprio usuário; qualquer pessoa com o DevTools aberto pode alterar variáveis em memória e contornar qualquer checagem descrita aqui. A autorização que realmente protege os dados só existirá quando o backend Java validar, no servidor, cada requisição de forma independente do que o frontend envia. Ver [SECURITY_BACKEND_REQUIREMENTS.md](./SECURITY_BACKEND_REQUIREMENTS.md) — **toda linha desta matriz deve ser reimplementada e re-validada no backend antes de qualquer dado real trafegar.**

Legenda: `C` create · `R` read · `U` update · `D` delete · `A` approve · `X` export · `—` sem acesso.

| Recurso | Técnico | Supervisor | Estudante | Paciente |
|---|---|---|---|---|
| Paciente (lista) | R (todos) | R (só onde é supervisor) | R (só onde é estudante) | R (só o próprio) |
| Paciente (cadastro) | C, U | — | — | — |
| Anamnese | C, U (enquanto rascunho) | C, U (enquanto rascunho) | C, U (enquanto rascunho, só seu caso) | R (só a própria, se acesso liberado) |
| Evolução | C (nunca U/D) | C (nunca U/D) | C (nunca U/D, só seu caso) | R (só a própria, via PDF/resumo) |
| Documento | C | C | C (só seu caso) | R (só o próprio, se acesso liberado) |
| Agendamento | C, U, D (cancelar) | C, U, D (cancelar) | C, U, D (cancelar, só seu caso) | R (só o próprio)¹ |
| Faltas | C (registrar), U (justificar) | C (registrar), U (justificar) | C (registrar) | — |
| Usuários | C, R | — | — | — |
| Acesso do Paciente (solicitações) | C, R, A | — | — | — |
| Auditoria | R | — | — | — |
| Notificações | R (próprias) | R (próprias) | R (próprias) | — (sem sininho na UI atual) |
| Exportar PDF do prontuário | X | — (não exposto na UI atual) | — (não exposto na UI atual) | — |

¹ **Achado documentado, não corrigido:** a implementação atual (`can("appointment.manage")`) tecnicamente permite que o papel "paciente" veja os mesmos botões de editar/cancelar/registrar falta que a equipe clínica, na aba de agenda do prontuário. Isso é inatingível pela navegação normal da UI (a tela do paciente nunca chega a essa aba), mas é uma inconsistência de modelagem. Ver [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md), item 7. Recomendação: restringir para leitura (`R`) apenas, quando o time validar que não há caso de uso legítimo para o paciente cancelar/reportar falta em seu próprio atendimento.

## O que precisa ser validado pelo backend

Para cada linha acima, o backend deve, no mínimo:

1. **Nunca confiar no `papel` enviado pelo cliente.** O papel deve ser resolvido no servidor a partir do token de autenticação (JWT/sessão), nunca de um campo no corpo da requisição.
2. **Escopo de paciente por relação, não por lista enviada pelo cliente.** Ex.: `GET /api/v1/patients/{id}` para um estudante deve checar no banco se aquele estudante está em `estudantesIds` do paciente — nunca confiar em uma lista de IDs "permitidos" vinda do frontend.
3. **Reforçar as regras de imutabilidade no servidor**, não só no frontend:
   - Anamnese `finalizada` → servidor rejeita qualquer `PATCH`/`PUT` subsequente, independente do que o cliente envie.
   - Evolução → não deve existir endpoint de update/delete no backend, ponto.
4. **Paciente só vê o próprio prontuário se `AccessRequest.status === "liberado"`** — essa checagem hoje é feita no frontend (`renderMeuProntuario`) e deve ser replicada no backend antes de retornar qualquer dado clínico.

Ver [AUDIT_LOG_SPEC.md](./AUDIT_LOG_SPEC.md) para o que deve ser logado a cada decisão de autorização (especialmente as negadas).
