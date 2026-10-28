// ============================================================
// repositories/absenceRepository.js
// ------------------------------------------------------------
// Faltas de pacientes em atendimentos agendados. A regra de negócio
// "2 faltas injustificadas → sugerir troca de paciente" permanece em
// pages/notificacoes.js (orquestra faltas + notificações + agenda);
// este repositório cuida só da coleção FALTAS.
// ============================================================

import { FALTAS, saveData, logAudit } from "../core/store.js";
import { generateId } from "../core/idService.js";
import { AuditActionType } from "../core/enums.js";

/** @param {number} patientId @returns {import("../domain/models.js").Absence[]} */
export function listByPatient(patientId) {
  return FALTAS.filter((f) => f.pacienteId === patientId);
}

/** @param {number} patientId @returns {number} Faltas injustificadas do paciente. */
export function countUnjustified(patientId) {
  return listByPatient(patientId).filter((f) => !f.justificada).length;
}

/** @param {string} id */
export function findById(id) {
  return FALTAS.find((f) => f.id === id);
}

/**
 * @param {{agId:number, pacienteId:number, data:string, hora:string, estudantesIds:number[], registradoPor:string}} data
 * @param {string} patientName
 */
export function register(data, patientName) {
  const absence = { ...data, id: "falta_" + generateId(), justificada: false, ts: new Date().toISOString() };
  FALTAS.push(absence);
  logAudit(AuditActionType.FALTA, "Registrou falta do paciente", patientName || "");
  saveData();
  return absence;
}

/** @param {string} id @param {string} patientName */
export function justify(id, patientName) {
  const absence = findById(id);
  if (!absence) return null;
  absence.justificada = true;
  logAudit(AuditActionType.FALTA, "Justificou falta", patientName || "");
  saveData();
  return absence;
}

export const absenceRepository = { listByPatient, countUnjustified, findById, register, justify };
