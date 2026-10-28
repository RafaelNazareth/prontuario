// ============================================================
// scripts/restaurar-backup.mjs
// ------------------------------------------------------------
// Restaura data/db.json a partir de um backup cifrado (data/backups).
//
//   node scripts/restaurar-backup.mjs                 → lista os backups
//   node scripts/restaurar-backup.mjs <arquivo.bkp>   → restaura
//
// Antes de substituir o banco: decifra (AES-256-GCM detecta qualquer
// adulteração), confere o SHA-256 do conteúdo e valida a estrutura.
// O banco atual é guardado como data/db.antes-da-restauracao-<data>.json
// para desfazer (SBIS NGS1.04.04/05). Pare o servidor antes de restaurar.
// ============================================================

import { copyFileSync, existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decifrar, obterChave } from "../server/backup.mjs";
import { validarDataset } from "../server/jsonDb.mjs";
import { registrarEvento, verificarTrilha } from "../server/audit.mjs";

const DATA = process.env.PEP_DATA_DIR || resolve(fileURLToPath(new URL("../data", import.meta.url)));
const pasta = join(DATA, "backups");
const arg = process.argv[2];

if (!arg) {
  const lista = existsSync(pasta) ? readdirSync(pasta).filter((f) => f.endsWith(".bkp")).sort() : [];
  console.log(lista.length ? `Backups em ${pasta}:\n` + lista.map((f) => "  " + f).join("\n") : "Nenhum backup encontrado.");
  process.exit(0);
}

const arquivo = existsSync(arg) ? arg : join(pasta, arg);
const { cabecalho, texto } = decifrar(readFileSync(arquivo), obterChave(DATA));
const dados = JSON.parse(texto);
const erro = validarDataset(dados);
if (erro) throw new Error(`Backup com estrutura inválida: ${erro}`);
const trilha = verificarTrilha(dados.AUDITORIA);
if (!trilha.integra) console.warn(`Atenção: a trilha de auditoria do backup falha a partir de ${trilha.falhaEm}.`);

const db = join(DATA, "db.json");
if (existsSync(db)) copyFileSync(db, join(DATA, `db.antes-da-restauracao-${new Date().toISOString().replace(/[:.]/g, "-")}.json`));
registrarEvento(dados, { tipo: "backup_restaurado", ip: "servidor", complemento: `${arquivo.split(/[\\/]/).pop()} (criado em ${cabecalho.criadoEm})` });
const tmp = `${db}.restaurando.tmp`;
writeFileSync(tmp, JSON.stringify(dados, null, 2) + "\n", "utf8");
renameSync(tmp, db);
console.log(`Banco restaurado a partir de ${arquivo} (backup de ${cabecalho.criadoEm}, integridade conferida).`);
