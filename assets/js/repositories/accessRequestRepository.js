// ============================================================
// repositories/accessRequestRepository.js
// ------------------------------------------------------------
// Solicitações de acesso do paciente ao próprio prontuário digital
// (tela "Acesso do Paciente"). Ver docs/PERMISSIONS_MATRIX.md.
// ============================================================

import { ACESSO_PACIENTE, saveData, logAudit } from "../core/store.js";
import { generateId } from "../core/idService.js";
import { AccessRequestStatus, AuditActionType } from "../core/enums.js";
import { today } from "../core/dateService.js";

/** @returns {import("../domain/models.js").AccessRequest[]} */
export function list() {
  return ACESSO_PACIENTE;
}

/** @param {string} id */
export function findById(id) {
  return ACESSO_PACIENTE.find((r) => r.id === id);
}

/**
 * @param {{pacienteId:number, nome:string}} data
 * @returns {import("../domain/models.js").AccessRequest}
 */
export function create(data) {
  const request = {
    id: generateId(),
    pacienteId: data.pacienteId,
    nome: data.nome,
    status: AccessRequestStatus.PENDENTE,
    solicitacao: today(),
    protocolo: "PROT-" + new Date().getFullYear() + "-" + generateId().slice(0, 8).toUpperCase(),
  };
  ACESSO_PACIENTE.push(request);
  logAudit(AuditActionType.CADASTRO, "Registrou solicitação", request.nome);
  saveData();
  return request;
}

/** @param {string} id */
export function approve(id) {
  const request = findById(id);
  if (!request) return null;
  request.status = AccessRequestStatus.LIBERADO;
  request.liberacao = today();
  logAudit(AuditActionType.CADASTRO, "Liberou acesso ao prontuário", request.nome);
  saveData();
  return request;
}

export const accessRequestRepository = { list, findById, create, approve };
