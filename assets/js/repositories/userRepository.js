// ============================================================
// repositories/userRepository.js — ver patientRepository.js para o
// racional da camada de repositório (mock hoje, API Java amanhã).
// ============================================================

import { USERS, saveData, logAudit } from "../core/store.js";
import { generateSequentialId } from "../core/idService.js";
import { AuditActionType } from "../core/enums.js";

/** @returns {import("../domain/models.js").User[]} */
export function list() {
  return USERS;
}

/** @returns {import("../domain/models.js").User[]} Usuários de staff (exclui a conta de paciente). */
export function listStaff() {
  return USERS.filter((u) => u.papel !== "paciente");
}

/** @param {number} id @returns {import("../domain/models.js").User|undefined} */
export function getById(id) {
  return USERS.find((u) => u.id === id);
}

/** @param {string} login @returns {import("../domain/models.js").User|undefined} */
export function findByLogin(login) {
  return USERS.find((u) => u.login === login);
}

/**
 * @param {Omit<import("../domain/models.js").User, "id">} data
 * @returns {{ok: true, user: import("../domain/models.js").User}|{ok: false, error: string}}
 */
export function create(data) {
  if (findByLogin(data.login)) {
    return { ok: false, error: "Este login já está em uso!" };
  }
  const user = { ...data, id: generateSequentialId() };
  USERS.push(user);
  logAudit(AuditActionType.CADASTRO, "Cadastrou usuário", user.nome);
  saveData();
  return { ok: true, user };
}

export const userRepository = { list, listStaff, getById, findByLogin, create };
