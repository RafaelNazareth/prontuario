// ============================================================
// repositories/documentRepository.js
// ------------------------------------------------------------
// Leitura dos documentos do prontuário em memória.
//
// O ENVIO de arquivos não passa por aqui: vai direto ao servidor
// (servidor.enviarDocumento em infrastructure/jsonDataSource.js), que
// confere o tipo real e o tamanho, grava o conteúdo cifrado e devolve
// o registro com autoria, tamanho e SHA-256 carimbados por ele.
// ============================================================

import { DOCUMENTOS } from "../core/store.js";

/** @param {number} patientId @returns {import("../domain/models.js").DocumentMeta[]} */
export function listByPatient(patientId) {
  return DOCUMENTOS[patientId] || [];
}

/** Documentos do paciente que têm arquivo digital anexado. */
export function listWithFile(patientId) {
  return listByPatient(patientId).filter((d) => d.arquivo);
}

export const documentRepository = { listByPatient, listWithFile };
