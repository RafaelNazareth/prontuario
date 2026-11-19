// ============================================================
// scripts/migrar-para-mongodb.mjs
// ------------------------------------------------------------
// Copia os dados do banco em arquivo (data/db.json) e os arquivos
// anexados (data/arquivos/*.bin, já cifrados) para o MongoDB.
//
//   PEP_MONGODB_URI="mongodb://..." npm run data:migrar-mongodb
//   (opcional: PEP_MONGODB_BANCO, padrão "pep")
//
// - Pare o servidor antes de migrar.
// - Se o banco MongoDB já tiver dados, o script para, a menos que
//   receba --substituir.
// - Os arquivos continuam cifrados com a MESMA chave (PEP_ARQUIVOS_KEY
//   ou data/.arquivos-key): leve a chave para o novo servidor.
// - Ao terminar, inicie o servidor com PEP_BANCO=mongodb.
// ============================================================

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createJsonDb } from "../server/jsonDb.mjs";
import { criarBancoMongo } from "../server/banco/mongodb.mjs";
import { verificarTrilha } from "../server/audit.mjs";

const DATA = process.env.PEP_DATA_DIR || resolve(fileURLToPath(new URL("../data", import.meta.url)));
const substituir = process.argv.includes("--substituir");

const origem = createJsonDb(DATA);
if (!existsSync(origem.dbPath)) {
  console.error(`Não encontrei ${origem.dbPath}. Nada a migrar.`);
  process.exit(1);
}
const dados = origem.ler();
const trilha = verificarTrilha(dados.AUDITORIA);
if (!trilha.integra) console.warn(`Atenção: a trilha de auditoria de origem falha a partir de ${trilha.falhaEm}. Ela será copiada como está.`);

const destino = await criarBancoMongo({
  uri: process.env.PEP_MONGODB_URI,
  nomeBanco: process.env.PEP_MONGODB_BANCO || "pep",
  seedPath: join(DATA, "seed.json"),
  semearSeVazio: false,
});
try {
  const existente = await destino.ler();
  if (existente.USERS.length > 0 && !substituir) {
    console.error("O banco MongoDB já tem dados próprios. Rode de novo com --substituir para sobrescrevê-los.");
    process.exit(1);
  }
  await destino.importar(dados);

  const pastaArquivos = join(DATA, "arquivos");
  let copiados = 0;
  let jaExistiam = 0;
  if (existsSync(pastaArquivos)) {
    for (const f of readdirSync(pastaArquivos).filter((x) => x.endsWith(".bin"))) {
      const id = f.slice(0, -4);
      if (await destino.arquivos.ler(id)) {
        jaExistiam++;
        continue;
      }
      await destino.arquivos.salvar(id, readFileSync(join(pastaArquivos, f)));
      copiados++;
    }
  }
  const conferido = await destino.ler();
  const contagem = (d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Array.isArray(v) ? v.length : Object.values(v).flat().length]));
  const a = contagem(dados);
  const b = contagem(conferido);
  const divergentes = Object.keys(a).filter((k) => a[k] !== b[k]);
  if (divergentes.length) throw new Error(`Contagem diferente após a migração em: ${divergentes.join(", ")}.`);
  console.log(`Migração concluída para ${destino.descricao}.`);
  console.log(Object.entries(b).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
  console.log(`  Arquivos anexados: ${copiados} copiados${jaExistiam ? `, ${jaExistiam} já existiam` : ""}.`);
  console.log("Inicie o servidor com PEP_BANCO=mongodb e a mesma chave de arquivos.");
} finally {
  await destino.fechar();
}
