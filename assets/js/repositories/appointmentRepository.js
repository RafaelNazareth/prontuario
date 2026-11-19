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
 * Verifica conflito de horário, com a mesma regra do servidor
 * (shared/politica.js): no mesmo dia e hora não pode haver dois
 * atendimentos confirmados do MESMO paciente nem do MESMO estagiário.
 * Estagiários diferentes, com pacientes diferentes, podem atender no
 * mesmo horário.
 * @param {{pacienteId:number, estudanteId:number|null, data:string, hora:string, excludeId?:number}} params
 */
export function hasConflict({ pacienteId, estudanteId, data, hora, excludeId }) {
  return AGENDAMENTOS.some(
    (a) =>
      a.id !== excludeId &&
      a.status === AppointmentStatus.CONFIRMADO &&
      a.data === data &&
      a.hora === hora &&
      (a.pacienteId === pacienteId || (estudanteId != null && a.estudanteId === estudanteId)),
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
