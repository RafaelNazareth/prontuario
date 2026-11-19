// ============================================================
// server/banco/index.mjs
// ------------------------------------------------------------
// Escolhe o banco de dados pela variável de ambiente PEP_BANCO:
//
//   PEP_BANCO=json     (padrão) data/db.json + data/arquivos/
//   PEP_BANCO=mongodb  MongoDB; exige PEP_MONGODB_URI e, opcionalmente,
//                      PEP_MONGODB_BANCO (padrão "pep")
//
// Interface comum (todas assíncronas):
//   ler() → dataset completo          gravar(dataset)
//   restaurarSeed()                   fechar()
//   arquivos.salvar(id, cifrado)      arquivos.ler(id) → Buffer | null
// ============================================================

import { join } from "node:path";
import { criarBancoJson } from "./json.mjs";

export async function criarBanco({ dataDir, tipo = process.env.PEP_BANCO || "json" } = {}) {
  if (tipo === "json") return criarBancoJson(dataDir);
  if (tipo === "mongodb") {
    const { criarBancoMongo } = await import("./mongodb.mjs");
    return criarBancoMongo({
      uri: process.env.PEP_MONGODB_URI,
      nomeBanco: process.env.PEP_MONGODB_BANCO || "pep",
      seedPath: join(dataDir, "seed.json"),
    });
  }
  throw new Error(`PEP_BANCO inválido: "${tipo}". Use "json" ou "mongodb".`);
}
