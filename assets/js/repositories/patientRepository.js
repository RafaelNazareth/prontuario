// ============================================================
// repositories/patientRepository.js
// ------------------------------------------------------------
// Camada de repositório para Pacientes.
//
// PADRÃO ADOTADO NESTE PROJETO (ver docs/ARCHITECTURE_TARGET.md):
//   UI → Controllers/Handlers → Application Services → Domain
//     → Repository → [mockPatientRepository hoje | apiPatientRepository no futuro]
//
// Hoje este repositório lê e escreve no array em memória PACIENTES
// (carregado de data/db.json e gravado de volta pelo core/store.js). Quando o backend Java existir,
// a MESMA interface (getById, list, create, update) passará a fazer
// fetch() para /api/v1/patients — nenhuma tela precisará mudar,
// apenas o import de quem a chama.
//
// getPacientesPermitidos() continua sendo a fonte de verdade do
// controle de acesso por papel (RBAC) — ela vive em core/store.js
// porque é usada por muitas telas há tempo; list() aqui delega a ela
// para não duplicar a regra.
// ============================================================

import {
  PACIENTES,
  EVOLUCOES,
  DOCUMENTOS,
  getPacientesPermitidos,
  saveData,
  logAudit,
} from "../core/store.js";
import { generateSequentialId } from "../core/idService.js";
import { AuditActionType } from "../core/enums.js";

/**
 * Lista os pacientes visíveis para o usuário logado (RBAC por papel).
 * @returns {import("../domain/models.js").Patient[]}
 */
export function list() {
  return getPacientesPermitidos();
}

/**
 * Busca um paciente pelo ID, sem aplicar RBAC (uso interno/administrativo).
 * Para checagem de acesso, combine com core/permissions.js `can("patient.read", paciente)`.
 * @param {number} id
 * @returns {import("../domain/models.js").Patient|undefined}
 */
export function getById(id) {
  return PACIENTES.find((p) => p.id === id);
}

/**
 * Cria um novo paciente e inicializa suas coleções relacionadas
 * (evoluções e documentos vazios), replicando o comportamento que
 * já existia em modals.js::salvarNovoPaciente.
 * @param {Omit<import("../domain/models.js").Patient, "id">} data
 * @returns {import("../domain/models.js").Patient}
 */
export function create(data) {
  const patient = { ...data, id: generateSequentialId() };
  PACIENTES.push(patient);
  EVOLUCOES[patient.id] = [];
  DOCUMENTOS[patient.id] = [];
  logAudit(AuditActionType.CADASTRO, "Cadastrou paciente", patient.nome);
  saveData();
  return patient;
}

/**
 * Atualiza campos de um paciente existente.
 * @param {number} id
 * @param {Partial<import("../domain/models.js").Patient>} changes
 * @returns {import("../domain/models.js").Patient|null}
 */
export function update(id, changes) {
  const patient = getById(id);
  if (!patient) return null;
  Object.assign(patient, changes);
  logAudit(AuditActionType.CADASTRO, "Atualizou dados do paciente", patient.nome);
  saveData();
  return patient;
}

export const patientRepository = { list, getById, create, update };
