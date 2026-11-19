// ============================================================
// server/cofreArquivos.mjs
// ------------------------------------------------------------
// Cifragem dos ARQUIVOS anexados ao prontuário (laudos, termos
// assinados, material de teste). Cada arquivo é gravado cifrado com
// AES-256-GCM, que também detecta qualquer alteração do conteúdo
// (LGPD art. 46; SBIS NGS1.04). O SHA-256 do original fica no
// prontuário e é conferido a cada download.
//
// A chave vem de PEP_ARQUIVOS_KEY (64 caracteres hex) ou do arquivo
// data/.arquivos-key, gerado na primeira execução. Sem essa chave os
// arquivos NÃO podem ser lidos: guarde uma cópia dela fora do
// servidor (ver docs/IMPLANTACAO.md).
// ============================================================

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const MAGICO = Buffer.from("PEPARQ1\n", "utf8");

export function obterChaveArquivos(dataDir) {
  if (process.env.PEP_ARQUIVOS_KEY) {
    const k = Buffer.from(process.env.PEP_ARQUIVOS_KEY, "hex");
    if (k.length !== 32) throw new Error("PEP_ARQUIVOS_KEY precisa ter 64 caracteres hexadecimais (256 bits).");
    return k;
  }
  const arq = join(dataDir, ".arquivos-key");
  if (!existsSync(arq)) {
    mkdirSync(dirname(arq), { recursive: true });
    writeFileSync(arq, randomBytes(32).toString("hex"), { encoding: "utf8", mode: 0o600 });
  }
  return Buffer.from(readFileSync(arq, "utf8").trim(), "hex");
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** @returns {Buffer} cabeçalho | iv (12) | tag (16) | conteúdo cifrado */
export function cifrarArquivo(bytes, chave) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave, iv);
  const dados = Buffer.concat([c.update(bytes), c.final()]);
  return Buffer.concat([MAGICO, iv, c.getAuthTag(), dados]);
}

/** Lança erro se o arquivo foi alterado ou a chave não confere. */
export function decifrarArquivo(buf, chave) {
  if (!buf.subarray(0, MAGICO.length).equals(MAGICO)) throw new Error("Arquivo armazenado em formato desconhecido.");
  const ini = MAGICO.length;
  const d = createDecipheriv("aes-256-gcm", chave, buf.subarray(ini, ini + 12));
  d.setAuthTag(buf.subarray(ini + 12, ini + 28));
  return Buffer.concat([d.update(buf.subarray(ini + 28)), d.final()]);
}

/** Identificador aceito para nome de arquivo e chave no banco. */
export function idArquivoValido(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(id);
}
