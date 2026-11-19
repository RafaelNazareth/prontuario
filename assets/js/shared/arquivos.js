// ============================================================
// shared/arquivos.js
// ------------------------------------------------------------
// Regras dos ARQUIVOS anexados ao prontuário, usadas pelo servidor
// (server/index.mjs) e pelo modo demonstração (servidorDemo.js).
//
//   - Só PDF, PNG, JPEG e Word (.docx). O tipo é decidido pelos
//     primeiros bytes do arquivo (assinatura), não pela extensão nem
//     pelo que o navegador informa: um executável renomeado para
//     .pdf é recusado (SBIS NGS1.05; OWASP File Upload).
//   - Tamanho máximo de 10 MB por arquivo.
//   - O nome é limpo antes de ser gravado e devolvido no download.
// ============================================================

export const LIMITE_ARQUIVO_BYTES = 10 * 1024 * 1024;

export const TIPOS_ARQUIVO = {
  pdf: { mime: "application/pdf", extensao: "pdf", rotulo: "PDF" },
  png: { mime: "image/png", extensao: "png", rotulo: "Imagem PNG" },
  jpg: { mime: "image/jpeg", extensao: "jpg", rotulo: "Imagem JPEG" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensao: "docx",
    rotulo: "Documento Word",
  },
};

/** Valor do atributo accept do campo de arquivo. */
export const ACEITE_ARQUIVO = ".pdf,.png,.jpg,.jpeg,.docx";

const comeca = (bytes, assinatura) => assinatura.every((b, i) => bytes[i] === b);

/**
 * Identifica o tipo pelo conteúdo.
 * @param {Uint8Array} bytes
 * @returns {"pdf"|"png"|"jpg"|"docx"|null}
 */
export function detectarTipoArquivo(bytes) {
  if (!bytes || bytes.length < 8) return null;
  if (comeca(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf"; // %PDF-
  if (comeca(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (comeca(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  // .docx é um pacote ZIP que contém "word/" na lista de arquivos.
  if (comeca(bytes, [0x50, 0x4b, 0x03, 0x04]) && contemTexto(bytes, "word/")) return "docx";
  return null;
}

function contemTexto(bytes, texto) {
  const alvo = [...texto].map((c) => c.charCodeAt(0));
  const limite = Math.min(bytes.length, 2 * 1024 * 1024) - alvo.length;
  for (let i = 0; i <= limite; i++) {
    let j = 0;
    while (j < alvo.length && bytes[i + j] === alvo[j]) j++;
    if (j === alvo.length) return true;
  }
  return false;
}

/**
 * Nome seguro para gravar e devolver no download: sem caminho, sem
 * caracteres de controle ou reservados, com a extensão do tipo real.
 */
export function nomeArquivoSeguro(nome, tipo) {
  const ext = TIPOS_ARQUIVO[tipo]?.extensao || "bin";
  let base = String(nome || "")
    .split(/[\\/]/)
    .pop()
    .replace(/\.[^.]*$/, "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  if (!base || /^\.+$/.test(base)) base = "documento";
  return `${base}.${ext}`;
}

/**
 * Confere um arquivo recebido.
 * @param {{nome:string, bytes:Uint8Array}} arquivo
 * @returns {{ok:true, tipo:string, mime:string, nome:string, tamanho:number} | {ok:false, erro:string}}
 */
export function validarArquivo({ nome, bytes }) {
  if (!bytes || bytes.length === 0) return { ok: false, erro: "Selecione um arquivo." };
  if (bytes.length > LIMITE_ARQUIVO_BYTES) return { ok: false, erro: "O arquivo passa do limite de 10 MB." };
  const tipo = detectarTipoArquivo(bytes);
  if (!tipo) return { ok: false, erro: "Formato não aceito. Envie PDF, imagem PNG ou JPEG, ou documento Word (.docx)." };
  return { ok: true, tipo, mime: TIPOS_ARQUIVO[tipo].mime, nome: nomeArquivoSeguro(nome, tipo), tamanho: bytes.length };
}

/** "1,4 MB", "820 KB". */
export function formatarTamanho(bytes) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

// ── Base64 sem depender de Buffer (roda no navegador e no Node) ──
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64ParaBytes(b64) {
  const limpo = String(b64 || "").replace(/^data:[^,]*,/, "").replace(/[^A-Za-z0-9+/]/g, "");
  const tam = Math.floor((limpo.length * 3) / 4);
  const out = new Uint8Array(tam);
  let o = 0;
  for (let i = 0; i < limpo.length; i += 4) {
    const n =
      (ALFABETO.indexOf(limpo[i]) << 18) |
      (ALFABETO.indexOf(limpo[i + 1]) << 12) |
      ((ALFABETO.indexOf(limpo[i + 2] ?? "A") & 63) << 6) |
      (ALFABETO.indexOf(limpo[i + 3] ?? "A") & 63);
    if (o < tam) out[o++] = (n >> 16) & 255;
    if (o < tam && i + 2 < limpo.length) out[o++] = (n >> 8) & 255;
    if (o < tam && i + 3 < limpo.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

export function bytesParaBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    s += ALFABETO[(n >> 18) & 63] + ALFABETO[(n >> 12) & 63];
    s += i + 1 < bytes.length ? ALFABETO[(n >> 6) & 63] : "=";
    s += i + 2 < bytes.length ? ALFABETO[n & 63] : "=";
  }
  return s;
}
