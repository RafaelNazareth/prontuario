// ============================================================
// server/security.mjs
// ------------------------------------------------------------
// Senhas, sessões e bloqueio de login.
//
//   - Senhas: scrypt com salt aleatório único por senha e chave de
//     512 bits (SBIS NGS1.02.02 e NGS1.02.19: hash ≥ 160 bits + salt).
//     A senha em texto puro nunca é gravada nem enviada ao navegador.
//   - Sessão: token aleatório de 256 bits em cookie HttpOnly e
//     SameSite=Strict; encerrada por inatividade e por tempo máximo,
//     e vinculada ao IP e navegador de origem (NGS1.02.20/23).
//   - Login: mensagem de erro genérica (NGS1.02.16) e bloqueio após
//     tentativas consecutivas inválidas (NGS1.02.13).
// ============================================================

import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { SEGURANCA } from "./config.mjs";
export { validarPoliticaSenha, registrarFalhaLogin, estaBloqueado, registrarSucessoLogin } from "../assets/js/shared/regrasAcesso.js";

// ── Senhas ───────────────────────────────────────────────────
const SCRYPT = { N: 16384, r: 8, p: 1 };

export function gerarHashSenha(senha) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(senha), salt, 64, SCRYPT);
  return { alg: "scrypt", salt: salt.toString("base64"), hash: hash.toString("base64") };
}

export function conferirSenha(senha, registro) {
  if (!registro || registro.alg !== "scrypt") return false;
  const esperado = Buffer.from(registro.hash, "base64");
  const obtido = scryptSync(String(senha), Buffer.from(registro.salt, "base64"), esperado.length, SCRYPT);
  return timingSafeEqual(esperado, obtido);
}

// ── Sessões (em memória: reiniciar o servidor encerra todas) ─
const sessoes = new Map();

export function hashCurto(texto) {
  return createHash("sha256").update(String(texto)).digest("hex").slice(0, 16);
}

export function criarSessao(usuario, req) {
  const token = randomBytes(32).toString("base64url");
  const agora = Date.now();
  sessoes.set(token, {
    userId: usuario.id,
    criadaEm: agora,
    ultimaAtividade: agora,
    ip: ipDe(req),
    agente: hashCurto(req.headers["user-agent"] || ""),
  });
  return token;
}

/** Retorna a sessão válida (e renova a atividade) ou um motivo de recusa. */
export function lerSessao(req, { renovar = true } = {}) {
  const token = lerCookie(req, "pep_sid");
  if (!token) return { erro: "sem_sessao" };
  const s = sessoes.get(token);
  if (!s) return { erro: "sessao_invalida" };
  const agora = Date.now();
  if (agora - s.ultimaAtividade > SEGURANCA.inatividadeMinutos * 60000) {
    sessoes.delete(token);
    return { erro: "inatividade", userId: s.userId };
  }
  if (agora - s.criadaEm > SEGURANCA.sessaoMaximaHoras * 3600000) {
    sessoes.delete(token);
    return { erro: "expirada", userId: s.userId };
  }
  // Token só vale no navegador/IP que fez o login (proteção contra roubo de sessão)
  if (s.ip !== ipDe(req) || s.agente !== hashCurto(req.headers["user-agent"] || "")) {
    sessoes.delete(token);
    return { erro: "sessao_invalida", userId: s.userId };
  }
  if (renovar) s.ultimaAtividade = agora;
  return { token, sessao: s };
}

export function encerrarSessao(req) {
  const token = lerCookie(req, "pep_sid");
  const s = token && sessoes.get(token);
  if (token) sessoes.delete(token);
  return s || null;
}

export function encerrarSessoesDoUsuario(userId) {
  for (const [t, s] of sessoes) if (s.userId === userId) sessoes.delete(t);
}

export function cookieSessao(token, req) {
  const seguro = req.headers["x-forwarded-proto"] === "https" || req.socket.encrypted ? "; Secure" : "";
  return `pep_sid=${token}; HttpOnly; SameSite=Strict; Path=/${seguro}`;
}

export const COOKIE_LIMPO = "pep_sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";

// ── Utilidades HTTP ──────────────────────────────────────────
export function ipDe(req) {
  return req.socket.remoteAddress || "desconhecido";
}

function lerCookie(req, nome) {
  const c = req.headers.cookie || "";
  for (const parte of c.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nome) return v.join("=");
  }
  return null;
}
