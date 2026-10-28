// ============================================================
// repositories/clinicalRepository.js
// ------------------------------------------------------------
// Repositório para os dois registros clínicos do prontuário:
// Anamnese (1 por paciente, mutável só enquanto rascunho) e
// Evolução (lista append-only por paciente, nunca editável).
//
// Mantidos juntos porque ambos leem/escrevem sob a mesma chave
// (pacienteId) das mesmas duas coleções pequenas — separar em dois
// arquivos de poucas linhas cada não ganharia clareza. Ver
// patientRepository.js para o racional geral da camada.
// ============================================================

import { ANAMNESES, EVOLUCOES, saveData, logAudit } from "../core/store.js";
import { generateSequentialId } from "../core/idService.js";
import { AnamnesisStatus, AuditActionType } from "../core/enums.js";

/** @param {number} patientId @returns {import("../domain/models.js").Anamnesis|undefined} */
export function getAnamnesis(patientId) {
  return ANAMNESES[patientId];
}

/**
 * Cria ou atualiza a anamnese de um paciente. Aplica a regra do CRP:
 * uma anamnese já "finalizada" não pode ser finalizada novamente
 * (é imutável a partir desse ponto).
 * @param {number} patientId
 * @param {Omit<import("../domain/models.js").Anamnesis, "rascunho">} data
 * @param {string} authorName   Autor do registro (preenche/preserva `criadoPor`).
 * @param {string} patientName  Nome do paciente, só para a trilha de auditoria.
 * @returns {{ok:true, anamnesis: import("../domain/models.js").Anamnesis}|{ok:false, error:string}}
 */
export function saveAnamnesis(patientId, data, authorName, patientName) {
  const existing = ANAMNESES[patientId];
  if (existing?.status === AnamnesisStatus.FINALIZADA && data.status === AnamnesisStatus.FINALIZADA) {
    return { ok: false, error: "Esta anamnese já foi finalizada e não pode ser alterada (CRP)." };
  }
  const anamnesis = {
    ...data,
    rascunho: data.status === AnamnesisStatus.RASCUNHO,
    criadoPor: existing?.criadoPor || authorName,
    criadoEm: existing?.criadoEm || new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  ANAMNESES[patientId] = anamnesis;
  logAudit(AuditActionType.ANAMNESE, "Atualizou anamnese", patientName || "");
  saveData();
  return { ok: true, anamnesis };
}

/** @param {number} patientId @returns {import("../domain/models.js").Evolution[]} */
export function listEvolutions(patientId) {
  return EVOLUCOES[patientId] || [];
}

/**
 * Adiciona uma evolução ao prontuário do paciente. Evoluções nunca
 * são editadas nem removidas (exigência do CRP) — só há create().
 * @param {number} patientId
 * @param {Omit<import("../domain/models.js").Evolution, "id"|"num">} data
 * @param {string} patientName
 * @returns {import("../domain/models.js").Evolution}
 */
export function addEvolution(patientId, data, patientName) {
  if (!EVOLUCOES[patientId]) EVOLUCOES[patientId] = [];
  const num = EVOLUCOES[patientId].length + 1;
  const evolution = { ...data, id: generateSequentialId(), num };
  EVOLUCOES[patientId].push(evolution);
  logAudit(AuditActionType.EVOLUCAO, `Registrou evolução #${num}`, patientName || "Desconhecido");
  saveData();
  return evolution;
}

export const clinicalRepository = { getAnamnesis, saveAnamnesis, listEvolutions, addEvolution };
