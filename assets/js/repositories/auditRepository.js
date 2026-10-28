// ============================================================
// repositories/auditRepository.js
// ------------------------------------------------------------
// Leitura da trilha de auditoria. A ESCRITA continua centralizada em
// core/store.js::logAudit(), pois é importada por praticamente todo
// o código de negócio (auth, modais, páginas) e mover a implementação
// para cá sem mover os ~10 pontos de chamada não traria benefício —
// apenas indireção. Ver docs/AUDIT_LOG_SPEC.md para o que o backend
// deverá auditar de fato.
// ============================================================

import { AUDITORIA } from "../core/store.js";

/** @returns {import("../domain/models.js").AuditEntry[]} Mais recente primeiro. */
export function list() {
  return AUDITORIA;
}

export const auditRepository = { list };
