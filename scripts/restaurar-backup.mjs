// ============================================================
// scripts/restaurar-backup.mjs
// ------------------------------------------------------------
// Restaura o banco a partir de um backup cifrado (data/backups).
// Funciona com o banco em uso (PEP_BANCO=json ou mongodb).
//
//   node scripts/restaurar-backup.mjs                 → lista os backups
//   node scripts/restaurar-backup.mjs <arquivo.bkp>   → restaura
//
// Antes de substituir o banco: decifra (AES-256-GCM detecta qualquer
// adulteração), confere o SHA-256 do conteúdo e valida a estrutura.
// O conteúdo atual é guardado em data/db.antes-da-restauracao-<data>.json
// para desfazer (SBIS NGS1.04.04/05). Os arquivos anexados que faltarem
// em data/arquivos são trazidos de data/backups/arquivos (banco JSON).
// Pare o servidor antes de restaurar.
// ============================================================

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decifrar, obterChave } from "../server/backup.mjs";
import { validarDataset } from "../server/jsonDb.mjs";
import { registrarEvento, verificarTrilha } from "../server/audit.mjs";
import { criarBanco } from "../server/banco/index.mjs";

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

const banco = await criarBanco({ dataDir: DATA });
try {
  // Cópia do estado atual, para desfazer.
  const atual = await banco.ler();
  const copia = join(DATA, `db.antes-da-restauracao-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(copia, JSON.stringify(atual, null, 2) + "\n", "utf8");

  registrarEvento(dados, { tipo: "backup_restaurado", ip: "servidor", complemento: `${arquivo.split(/[\\/]/).pop()} (criado em ${cabecalho.criadoEm})` });
  if (banco.importar) await banco.importar(dados);
  else await banco.gravar(dados);

  // Arquivos anexados (banco JSON): traz da cópia os que faltarem.
  const copiaArquivos = join(pasta, "arquivos");
  let trazidos = 0;
  if (banco.tipo === "json" && existsSync(copiaArquivos)) {
    const destino = join(DATA, "arquivos");
    mkdirSync(destino, { recursive: true });
    for (const f of readdirSync(copiaArquivos).filter((x) => x.endsWith(".bin"))) {
      if (existsSync(join(destino, f))) continue;
      copyFileSync(join(copiaArquivos, f), join(destino, f));
      trazidos++;
    }
  }
  console.log(`Banco (${banco.descricao}) restaurado a partir de ${arquivo} (backup de ${cabecalho.criadoEm}, integridade conferida).`);
  console.log(`Estado anterior guardado em ${copia}.${trazidos ? ` ${trazidos} arquivo(s) anexado(s) recuperado(s) da cópia.` : ""}`);
} finally {
  await banco.fechar();
}
