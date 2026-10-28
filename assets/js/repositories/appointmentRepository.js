// ============================================================
// repositories/appointmentRepository.js — ver patientRepository.js
// para o racional da camada de repositório.
// ============================================================

import { AGENDAMENTOS, saveData, logAudit } from "../core/store.js";
import { generateSequentialId } from "../core/idService.js";
import { AppointmentStatus, AuditActionType } from "../core/enums.js";

/** @param {number} patientId @returns {import("../domain/models.js").Appointment[]} */
export function listByPatient(patientId) {
  return AGENDAMENTOS.filter((a) => a.pacienteId === patientId);
}

/** @param {number[]} patientIds @returns {import("../domain/models.js").Appointment[]} */
export function listByPatientIds(patientIds) {
  return AGENDAMENTOS.filter((a) => patientIds.includes(a.pacienteId));
}

/** @param {number} id @returns {import("../domain/models.js").Appointment|undefined} */
export function getById(id) {
  return AGENDAMENTOS.find((a) => a.id === id);
}

/**
 * Verifica conflito de horário: mesmo paciente + mesmo estudante + mesmo
 * slot, ignorando agendamentos já cancelados. Réplica da regra que já
 * existia duplicada em modals.js (criação e edição de agendamento).
 * @param {{pacienteId:number, estudanteId:number, data:string, hora:string, excludeId?:number}} params
 */
export function hasConflict({ pacienteId, estudanteId, data, hora, excludeId }) {
  return AGENDAMENTOS.some(
    (a) =>
      a.id !== excludeId &&
      a.pacienteId === pacienteId &&
      a.estudanteId === estudanteId &&
      a.data === data &&
      a.hora === hora &&
      a.status !== AppointmentStatus.CANCELADO,
  );
}

/**
 * @param {Omit<import("../domain/models.js").Appointment, "id"|"status">} data
 * @returns {import("../domain/models.js").Appointment}
 */
export function create(data) {
  const appointment = { ...data, id: generateSequentialId(), status: AppointmentStatus.CONFIRMADO };
  AGENDAMENTOS.push(appointment);
  saveData();
  return appointment;
}

/** @param {number} id @param {Partial<import("../domain/models.js").Appointment>} changes */
export function update(id, changes) {
  const appointment = getById(id);
  if (!appointment) return null;
  Object.assign(appointment, changes);
  saveData();
  return appointment;
}

/** @param {number} id @param {string} patientName */
export function cancel(id, patientName) {
  const appointment = getById(id);
  if (!appointment) return null;
  appointment.status = AppointmentStatus.CANCELADO;
  logAudit(AuditActionType.AGENDA, "Cancelou agendamento", patientName || "");
  saveData();
  return appointment;
}

export const appointmentRepository = {
  listByPatient,
  listByPatientIds,
  getById,
  hasConflict,
  create,
  update,
  cancel,
};
