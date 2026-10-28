// ============================================================
// core/idService.js
// ------------------------------------------------------------
// Geração centralizada de identificadores para registros criados
// em tempo de execução (mock local, sem backend).
//
// POR QUE ISTO EXISTE:
//   Antes, cada arquivo gerava IDs à sua própria maneira
//   (`Date.now()`, `"d" + Date.now()`, `"troca_" + Date.now()`),
//   o que é uma estratégia frágil: duas chamadas na mesma
//   millisegundo colidem, e não há garantia de unicidade.
//   Centralizar aqui permite trocar a estratégia em um único
//   lugar (ex.: ao integrar com o backend Java).
//
// IMPORTANTE — ESCOPO DESTA MUDANÇA:
//   Os IDs numéricos sequenciais dos dados semeados (USERS,
//   PACIENTES, AGENDAMENTOS, EVOLUCOES) são usados em comparações
//   diretas (`p.id === pid`) e embutidos em atributos
//   `onclick="fn(${id})"` sem aspas em dezenas de pontos do
//   código. Trocar esse formato para string (UUID) exigiria
//   revisar cada um desses pontos (alto risco de quebra, baixo
//   benefício, já que o ID definitivo virá do backend). Por isso,
//   `generateId()` (UUID) é usado apenas para coleções cujos IDs
//   já são tratados como strings opacas (documentos, notificações,
//   faltas, solicitações de acesso, auditoria). Para as coleções
//   com IDs numéricos legados, use `generateSequentialId()`, que
//   preserva o tipo numérico mas com uma fonte única e monotônica.
//   Ver docs/FRONTEND_AUDIT.md (achado sobre IDs) e
//   docs/MIGRATION_GUIDE.md.
// ============================================================

/**
 * Gera um identificador único como string (UUID v4 quando disponível).
 * Use para novas entidades cujo ID já é tratado como string opaca:
 * documentos, notificações, faltas, solicitações de acesso, auditoria.
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback apenas para ambientes sem crypto.randomUUID (não usado em navegadores modernos).
  return "id-" + Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2);
}

let _sequentialCounter = Date.now();

/**
 * Gera um identificador numérico monotonicamente crescente.
 * Mantido apenas para compatibilidade com coleções legadas cujos
 * IDs numéricos são comparados/embutidos em várias partes do código
 * (USERS, PACIENTES, AGENDAMENTOS, EVOLUCOES). Diferente de um
 * `Date.now()` solto, garante unicidade mesmo em chamadas na mesma
 * millisegundo.
 * @returns {number}
 */
export function generateSequentialId() {
  _sequentialCounter += 1;
  return _sequentialCounter;
}
