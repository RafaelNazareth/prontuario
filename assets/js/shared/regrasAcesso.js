// ============================================================
// shared/regrasAcesso.js
// ------------------------------------------------------------
// Política de senha e bloqueio por tentativas (SBIS NGS1.02.03/04/13/15),
// usadas pelo servidor Node e pelo modo demonstração.
// ============================================================

import { SEGURANCA } from "./configuracao.js";

/**
 * Valida a política de senha para senhas NOVAS. Retorna a mensagem de
 * erro ou null. `usuario` é usado para recusar senhas derivadas do nome
 * ou do login (NGS1.02.04).
 */
export function validarPoliticaSenha(senha, usuario = {}) {
  const p = SEGURANCA.senha;
  const s = String(senha || "");
  if (s.length < p.minimo) return `A senha precisa ter pelo menos ${p.minimo} caracteres.`;
  if (p.exigeLetra && !/[A-Za-zÀ-ÿ]/.test(s)) return "A senha precisa ter pelo menos uma letra.";
  if (p.exigeNumero && !/\d/.test(s)) return "A senha precisa ter pelo menos um número.";
  if (p.exigeEspecial && !/[^A-Za-z0-9À-ÿ]/.test(s)) return "A senha precisa ter pelo menos um caractere especial.";
  const baixa = s.toLowerCase();
  const partes = [usuario.login, ...(usuario.nome || "").split(" ")]
    .filter((x) => x && x.length >= 3)
    .map((x) => x.toLowerCase());
  if (partes.some((x) => baixa.includes(x))) return "A senha não pode conter seu nome ou login.";
  return null;
}

// ── Bloqueio por tentativas ──────────────────────────────────
/** Atualiza o usuário após falha de login. Retorna true se bloqueou agora. */
export function registrarFalhaLogin(usuario) {
  usuario.seguranca ||= {};
  const seg = usuario.seguranca;
  seg.tentativasFalhas = (seg.tentativasFalhas || 0) + 1;
  seg.falhasDesdeUltimoAcesso = (seg.falhasDesdeUltimoAcesso || 0) + 1;
  if (seg.tentativasFalhas >= SEGURANCA.maxTentativasLogin) {
    seg.bloqueadoAte = new Date(Date.now() + SEGURANCA.bloqueioMinutos * 60000).toISOString();
    seg.tentativasFalhas = 0;
    return true;
  }
  return false;
}

export function estaBloqueado(usuario) {
  const ate = usuario.seguranca?.bloqueadoAte;
  return Boolean(ate && new Date(ate).getTime() > Date.now());
}

/** Após login bem-sucedido: devolve o resumo para exibir e zera contadores. */
export function registrarSucessoLogin(usuario) {
  usuario.seguranca ||= {};
  const seg = usuario.seguranca;
  const resumo = { ultimoAcesso: seg.ultimoAcesso || null, falhasDesdeUltimoAcesso: seg.falhasDesdeUltimoAcesso || 0 };
  seg.ultimoAcesso = new Date().toISOString();
  seg.tentativasFalhas = 0;
  seg.falhasDesdeUltimoAcesso = 0;
  delete seg.bloqueadoAte;
  return resumo;
}
