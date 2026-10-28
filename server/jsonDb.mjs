// ============================================================
// server/jsonDb.mjs
// ------------------------------------------------------------
// Leitura e gravação do banco de dados em arquivo JSON.
//
//   data/seed.json → dados de demonstração (versionado, só leitura)
//   data/db.json   → dados em uso, lidos e gravados pelo sistema
//
// Se db.json não existir, é criado como cópia do seed. A gravação
// é atômica (escreve num arquivo temporário e renomeia), para que
// uma queda no meio da escrita nunca deixe o JSON corrompido.
// ============================================================

import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const COLECOES = [
  "USERS",
  "PACIENTES",
  "ANAMNESES",
  "EVOLUCOES",
  "AGENDAMENTOS",
  "DOCUMENTOS",
  "AUDITORIA",
  "ACESSO_PACIENTE",
  "NOTIFICACOES",
  "FALTAS",
  "REGISTRO_DOCUMENTAL",
  "COMPARTILHAMENTOS",
];

const LISTAS = ["USERS", "PACIENTES", "AGENDAMENTOS", "AUDITORIA", "ACESSO_PACIENTE", "NOTIFICACOES", "FALTAS"];
const MAPAS = ["ANAMNESES", "EVOLUCOES", "DOCUMENTOS", "REGISTRO_DOCUMENTAL", "COMPARTILHAMENTOS"];

/** Valida a estrutura mínima; retorna a mensagem de erro ou null. */
export function validarDataset(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "O corpo precisa ser um objeto JSON.";
  data = normalizar(data);
  for (const k of LISTAS) if (!Array.isArray(data[k])) return `"${k}" precisa ser uma lista.`;
  for (const k of MAPAS)
    if (!data[k] || typeof data[k] !== "object" || Array.isArray(data[k])) return `"${k}" precisa ser um objeto.`;
  if (data.USERS.length === 0) return '"USERS" não pode ficar vazio.';
  return null;
}

/** Mantém só as coleções conhecidas, na ordem canônica (coleções novas começam vazias). */
function normalizar(data) {
  return Object.fromEntries(COLECOES.map((k) => [k, data[k] ?? (MAPAS.includes(k) ? {} : [])]));
}

export function createJsonDb(dir) {
  const dbPath = join(dir, "db.json");
  const seedPath = join(dir, "seed.json");

  function garantirArquivo() {
    if (!existsSync(dbPath)) copyFileSync(seedPath, dbPath);
  }

  return {
    dbPath,
    seedPath,

    ler() {
      garantirArquivo();
      return normalizar(JSON.parse(readFileSync(dbPath, "utf8")));
    },

    gravar(data) {
      const erro = validarDataset(data);
      if (erro) throw Object.assign(new Error(erro), { status: 400 });
      const tmp = `${dbPath}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify(normalizar(data), null, 2) + "\n", "utf8");
      renameSync(tmp, dbPath);
    },

    restaurarSeed() {
      copyFileSync(seedPath, dbPath);
    },
  };
}
