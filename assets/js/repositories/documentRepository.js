// ============================================================
// repositories/documentRepository.js
// ------------------------------------------------------------
// O upload de documentos hoje é 100% simulado: nenhum arquivo real
// é lido ou armazenado, apenas metadados. Ver Fase 10 do plano de
// refatoração e docs/FUTURE_IMPROVEMENTS.md — o backend deverá usar
// um armazenamento de binários apropriado (ex.: object storage), não
// necessariamente o MongoDB, para os arquivos em si.
// ============================================================

import { DOCUMENTOS, saveData, logAudit } from "../core/store.js";
import { generateId } from "../core/idService.js";
import { AuditActionType } from "../core/enums.js";

/** @param {number} patientId @returns {import("../domain/models.js").DocumentMeta[]} */
export function listByPatient(patientId) {
  return DOCUMENTOS[patientId] || [];
}

/**
 * Deriva um tamanho de arquivo determinístico a partir do nome, apenas
 * para fins de demonstração (não há arquivo real por trás do upload
 * simulado). Antes este valor era `Math.random()`, o que fazia o mesmo
 * documento "mudar de tamanho" a cada re-renderização de tela — um
 * dado simulado não deveria ser aleatório a cada leitura.
 * @param {string} fileName
 * @returns {string}
 */
function deterministicSize(fileName) {
  let hash = 0;
  for (let i = 0; i < fileName.length; i++) {
    hash = (hash * 31 + fileName.charCodeAt(i)) >>> 0;
  }
  const kb = 40 + (hash % 900); // 40 KB a 939 KB, estável para o mesmo nome
  return `${kb} KB`;
}

/**
 * Registra o metadado de um documento "enviado". Sem arquivo real por
 * trás — ver aviso acima.
 * @param {number} patientId
 * @param {{nome:string, tipo:string, categoria?:string, titulo?:string, origem?:object, resumo?:string}} data
 * @param {string} authorName
 * @returns {import("../domain/models.js").DocumentMeta}
 */
export function create(patientId, data, authorName) {
  if (!DOCUMENTOS[patientId]) DOCUMENTOS[patientId] = [];
  const doc = {
    id: `d${generateId()}`,
    nome: data.nome,
    tipo: data.tipo,
    tamanho: deterministicSize(data.nome),
    data: new Date().toISOString().split("T")[0],
    autor: authorName,
  };
  // Metadados opcionais (ex.: diagnóstico emitido por outro profissional)
  for (const k of ["categoria", "compartimento", "titulo", "origem", "resumo"]) if (data[k]) doc[k] = data[k];
  DOCUMENTOS[patientId].push(doc);
  logAudit(AuditActionType.EXPORT, "Fez upload de documento", doc.nome);
  saveData();
  return doc;
}

export const documentRepository = { listByPatient, create };
