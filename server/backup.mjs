// ============================================================
// server/backup.mjs
// ------------------------------------------------------------
// Cópias de segurança CIFRADAS do banco (data/db.json).
//
//   - AES-256-GCM: confidencialidade + detecção de adulteração
//     (SBIS NGS1.04.01/03; Guia de Segurança ANPD, item 49).
//   - Cada arquivo guarda o SHA-256 do conteúdo original; a
//     restauração confere a integridade antes de substituir o banco
//     e mantém o banco anterior para desfazer (NGS1.04.04/05).
//   - A chave vem de PEP_BACKUP_KEY (64 caracteres hex) ou do arquivo
//     data/.backup-key, gerado na primeira execução. Em produção, a
//     chave deve ficar FORA da máquina que guarda os backups e os
//     backups devem ser copiados para outro local físico (NGS1.08.07).
// ============================================================

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MAGICO = "PEPBKP1";

export function obterChave(dir) {
  if (process.env.PEP_BACKUP_KEY) {
    const k = Buffer.from(process.env.PEP_BACKUP_KEY, "hex");
    if (k.length !== 32) throw new Error("PEP_BACKUP_KEY precisa ter 64 caracteres hexadecimais (256 bits).");
    return k;
  }
  const arq = join(dir, ".backup-key");
  if (!existsSync(arq)) writeFileSync(arq, randomBytes(32).toString("hex"), { encoding: "utf8", mode: 0o600 });
  return Buffer.from(readFileSync(arq, "utf8").trim(), "hex");
}

export function cifrar(texto, chave) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave, iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  const sha = createHash("sha256").update(texto, "utf8").digest("hex");
  const cab = Buffer.from(JSON.stringify({ formato: MAGICO, criadoEm: new Date().toISOString(), sha256: sha }) + "\n", "utf8");
  return Buffer.concat([cab, iv, c.getAuthTag(), dados]);
}

export function decifrar(buf, chave) {
  const fim = buf.indexOf(0x0a);
  const cab = JSON.parse(buf.subarray(0, fim).toString("utf8"));
  if (cab.formato !== MAGICO) throw new Error("Arquivo não é um backup do PEP.");
  const iv = buf.subarray(fim + 1, fim + 13);
  const tag = buf.subarray(fim + 13, fim + 29);
  const d = createDecipheriv("aes-256-gcm", chave, iv);
  d.setAuthTag(tag);
  const texto = Buffer.concat([d.update(buf.subarray(fim + 29)), d.final()]).toString("utf8");
  if (createHash("sha256").update(texto, "utf8").digest("hex") !== cab.sha256) throw new Error("Falha na verificação de integridade do backup.");
  return { cabecalho: cab, texto };
}

/** Gera um backup de db.json em data/backups e apaga os mais antigos. */
export function criarBackup(dir, { manterUltimos = 30 } = {}) {
  const pasta = join(dir, "backups");
  mkdirSync(pasta, { recursive: true });
  const texto = readFileSync(join(dir, "db.json"), "utf8");
  const nome = `pep-${new Date().toISOString().replace(/[:.]/g, "-")}.bkp`;
  writeFileSync(join(pasta, nome), cifrar(texto, obterChave(dir)), { mode: 0o600 });
  const todos = readdirSync(pasta).filter((f) => f.endsWith(".bkp")).sort();
  todos.slice(0, Math.max(0, todos.length - manterUltimos)).forEach((f) => rmSync(join(pasta, f)));
  return join(pasta, nome);
}
