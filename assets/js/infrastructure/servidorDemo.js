// ============================================================
// infrastructure/servidorDemo.js
// ------------------------------------------------------------
// MODO DEMONSTRAÇÃO: simula a API do servidor (server/index.mjs)
// dentro do navegador, para o sistema rodar em hospedagem estática
// (GitHub Pages, Live Server) sem o servidor Node.
//
//   - As regras são as MESMAS do servidor real (assets/js/shared/):
//     escopo por papel, gravação conferida item a item, co-assinatura,
//     retificação versionada, trilha de auditoria encadeada.
//   - Os dados partem de data/seed.json e ficam no localStorage de
//     cada visitante. Nada sai do navegador.
//   - Senhas: as contas de demonstração usam "1234"; contas criadas
//     na demonstração guardam SHA-256 com salt.
//
// ATENÇÃO: não há segurança real neste modo — qualquer pessoa com
// acesso ao navegador lê os dados. Use só com dados fictícios.
// ============================================================

import { sha256Hex } from "../shared/sha256.js";
import { GUARDA, INSTITUICAO, PRIVACIDADE, SEGURANCA, SOFTWARE } from "../shared/configuracao.js";
import { EVENTOS, EVENTOS_INFORMADOS_PELO_CLIENTE, filtrarTrilha, registrarEvento, trilhaCsv, verificarTrilha } from "../shared/auditoria.js";
import { aplicarAlteracoes, escopo, pacientesPermitidos, usuarioPublico } from "../shared/politica.js";
import { estaBloqueado, registrarFalhaLogin, registrarSucessoLogin, validarPoliticaSenha } from "../shared/regrasAcesso.js";

const CHAVE_DB = "pep_demo_db_v1";
const CHAVE_SESSAO = "pep_demo_sessao";
const IP = "navegador (demonstração)";

let _db = null;

class ErroDemo extends Error {
  constructor(status, mensagem, motivo) {
    super(mensagem);
    this.status = status;
    this.motivo = motivo;
  }
}

const copia = (x) => JSON.parse(JSON.stringify(x));

async function db() {
  if (_db) return _db;
  try {
    const salvo = localStorage.getItem(CHAVE_DB);
    if (salvo) _db = JSON.parse(salvo);
  } catch {
    _db = null;
  }
  if (!_db) {
    const r = await fetch("./data/seed.json", { cache: "no-store" });
    if (!r.ok) throw new ErroDemo(500, "Não foi possível carregar os dados de demonstração (data/seed.json).");
    _db = await r.json();
    for (const k of ["REGISTRO_DOCUMENTAL", "COMPARTILHAMENTOS", "ANAMNESES", "EVOLUCOES", "DOCUMENTOS"]) _db[k] ||= {};
    salvar();
  }
  return _db;
}

function salvar() {
  try {
    localStorage.setItem(CHAVE_DB, JSON.stringify(_db));
  } catch (e) {
    console.warn("[PEP demo] Não foi possível salvar no navegador:", e.message);
  }
}

/** Apaga as alterações feitas na demonstração e volta aos dados de exemplo. */
export function restaurarDemonstracao() {
  try {
    localStorage.removeItem(CHAVE_DB);
    sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // armazenamento indisponível: nada a limpar
  }
  _db = null;
}

// ── Senhas da demonstração ───────────────────────────────────
function hashDemo(senha, salt) {
  return sha256Hex(`${salt}:${senha}`);
}
function senhaConfere(u, senha) {
  if (u.senhaDemo) return hashDemo(senha, u.senhaDemo.salt) === u.senhaDemo.hash;
  return senha === "1234"; // contas de demonstração do seed
}
function novaSenhaDemo(senha) {
  const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return { salt, hash: hashDemo(senha, salt) };
}

// ── Sessão ───────────────────────────────────────────────────
function lerSessao() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || "null");
  } catch {
    return null;
  }
}
function gravarSessao(s) {
  try {
    if (s) sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(s));
    else sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // sem sessionStorage a sessão vale só enquanto a página estiver aberta
  }
}

function auditar(d, user, tipo, extra = {}) {
  registrarEvento(d, { tipo, userId: user?.id ?? null, papel: user?.papel ?? null, ip: IP, ...extra });
}

function exigirSessao(d) {
  const s = lerSessao();
  if (!s) throw new ErroDemo(401, "Faça login para continuar.", "sem_sessao");
  if (Date.now() - s.ultimaAtividade > SEGURANCA.inatividadeMinutos * 60000) {
    gravarSessao(null);
    auditar(d, d.USERS.find((u) => u.id === s.userId), "sessao_expirada");
    salvar();
    throw new ErroDemo(401, "Sessão encerrada por inatividade.", "inatividade");
  }
  const user = d.USERS.find((u) => u.id === s.userId);
  if (!user || user.ativo === false) throw new ErroDemo(401, "Faça login para continuar.", "usuario_inativo");
  s.ultimaAtividade = Date.now();
  gravarSessao(s);
  return user;
}

function exigirTecnico(user) {
  if (user.papel !== "tecnico") throw new ErroDemo(403, "Operação restrita ao técnico responsável.");
}

function reautenticar(user, senha) {
  if (!senhaConfere(user, senha || "")) throw new ErroDemo(403, "Senha atual incorreta. Confirme sua senha para continuar.");
}

function institucional(d) {
  const rt = d.USERS.find((u) => u.papel === "tecnico" && u.ativo !== false && u.crp);
  return {
    ...INSTITUICAO,
    responsavelTecnico: rt ? { nome: rt.nome, crp: rt.crp } : null,
    software: SOFTWARE,
    versaoTermo: PRIVACIDADE.versaoTermo,
    prazoRespostaTitularDias: PRIVACIDADE.prazoRespostaTitularDias,
    guardaAnos: GUARDA.anosAposUltimoRegistro,
    modoDemonstracao: true,
  };
}

function respostaSessao(d, user, extra = {}) {
  return {
    usuario: { ...usuarioPublico(user), login: user.login },
    termoPendente: !user.termos?.[PRIVACIDADE.versaoTermo],
    trocaObrigatoria: Boolean(user.seguranca?.trocaObrigatoria),
    config: {
      inatividadeMinutos: SEGURANCA.inatividadeMinutos,
      avisoInatividadeSegundos: SEGURANCA.avisoInatividadeSegundos,
      senha: SEGURANCA.senha,
    },
    institucional: institucional(d),
    ...extra,
  };
}

// ── Rotas (mesmo contrato do server/index.mjs) ───────────────
const rotas = {
  "POST /api/auth/login": (d, { login, senha }) => {
    const user = d.USERS.find((u) => u.login === String(login || "").trim());
    const generico = "Usuário ou senha incorretos.";
    if (!user || user.ativo === false) {
      auditar(d, null, "login_falha", { complemento: "login inexistente ou inativo" });
      throw new ErroDemo(401, generico);
    }
    if (estaBloqueado(user)) {
      auditar(d, user, "login_falha", { complemento: "conta bloqueada" });
      throw new ErroDemo(423, "Acesso bloqueado temporariamente por tentativas inválidas. Tente mais tarde ou procure o técnico responsável.");
    }
    if (!senhaConfere(user, senha || "")) {
      auditar(d, user, registrarFalhaLogin(user) ? "login_bloqueado" : "login_falha");
      throw new ErroDemo(401, generico);
    }
    const resumo = registrarSucessoLogin(user);
    auditar(d, user, "login_sucesso");
    gravarSessao({ userId: user.id, criadaEm: Date.now(), ultimaAtividade: Date.now() });
    return respostaSessao(d, user, { acesso: resumo });
  },

  "POST /api/auth/logout": (d) => {
    const s = lerSessao();
    if (s) auditar(d, d.USERS.find((u) => u.id === s.userId), "logout");
    gravarSessao(null);
    return { ok: true };
  },

  "GET /api/auth/me": (d) => respostaSessao(d, exigirSessao(d)),

  "POST /api/auth/termo": (d, { versao }) => {
    const user = exigirSessao(d);
    if (versao !== PRIVACIDADE.versaoTermo) throw new ErroDemo(409, "Versão do termo desatualizada. Recarregue a página.");
    user.termos ||= {};
    user.termos[versao] = new Date().toISOString();
    auditar(d, user, "termo_aceito", { complemento: `versão ${versao}` });
    return { ok: true };
  },

  "POST /api/auth/senha": (d, { senhaAtual, novaSenha }) => {
    const user = exigirSessao(d);
    reautenticar(user, senhaAtual);
    const erro = validarPoliticaSenha(novaSenha, user);
    if (erro) throw new ErroDemo(400, erro);
    if (senhaConfere(user, novaSenha)) throw new ErroDemo(400, "A nova senha precisa ser diferente da atual.");
    user.senhaDemo = novaSenhaDemo(novaSenha);
    user.seguranca ||= {};
    user.seguranca.trocaObrigatoria = false;
    auditar(d, user, "senha_alterada");
    return { ok: true };
  },

  "POST /api/usuarios": (d, b) => {
    const admin = exigirSessao(d);
    exigirTecnico(admin);
    reautenticar(admin, b.senhaAdmin);
    const nome = String(b.nome || "").trim();
    const login = String(b.login || "").trim();
    if (!nome || !login) throw new ErroDemo(400, "Informe nome e login.");
    if (!/^[a-z0-9._-]{3,40}$/i.test(login)) throw new ErroDemo(400, "Login: 3 a 40 letras, números, ponto, hífen ou sublinhado.");
    if (!["tecnico", "supervisor", "estudante"].includes(b.papel)) throw new ErroDemo(400, "Papel inválido.");
    if (d.USERS.some((u) => u.login.toLowerCase() === login.toLowerCase())) throw new ErroDemo(409, "Já existe usuário com este login.");
    if (b.papel !== "estudante" && !/^CRP \d{2}\/\d{4,6}$/.test(String(b.crp || "").trim()))
      throw new ErroDemo(400, "Informe o CRP no formato CRP 06/123456.");
    if (b.papel === "estudante" && !String(b.matricula || "").trim()) throw new ErroDemo(400, "Informe a matrícula do estudante.");
    const erro = validarPoliticaSenha(b.senhaInicial, { nome, login });
    if (erro) throw new ErroDemo(400, erro);
    const id = Math.max(...d.USERS.filter((u) => u.papel !== "paciente").map((u) => u.id)) + 1;
    const novo = {
      id,
      login,
      nome,
      papel: b.papel,
      avatar: nome.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
      color: "#1a6b2e",
      crp: b.papel !== "estudante" ? String(b.crp).trim() : null,
      matricula: b.papel === "estudante" ? String(b.matricula).trim() : null,
      ativo: true,
      senhaDemo: novaSenhaDemo(b.senhaInicial),
      seguranca: { trocaObrigatoria: true },
      criadoEm: new Date().toISOString(),
      criadoPorId: admin.id,
    };
    d.USERS.push(novo);
    auditar(d, admin, "usuario_criado", { registroId: id, complemento: novo.papel });
    return { usuario: usuarioPublico(novo, { completo: true }) };
  },

  "POST /api/usuarios/:id/desbloquear": (d, _b, { id }) => {
    const admin = exigirSessao(d);
    exigirTecnico(admin);
    const alvo = d.USERS.find((u) => u.id === Number(id));
    if (!alvo) throw new ErroDemo(404, "Usuário não encontrado.");
    alvo.seguranca ||= {};
    delete alvo.seguranca.bloqueadoAte;
    alvo.seguranca.tentativasFalhas = 0;
    auditar(d, admin, "usuario_desbloqueado", { registroId: alvo.id });
    return { usuario: usuarioPublico(alvo, { completo: true }) };
  },

  "POST /api/usuarios/:id/ativo": (d, { ativo, senhaAdmin }, { id }) => {
    const admin = exigirSessao(d);
    exigirTecnico(admin);
    reautenticar(admin, senhaAdmin);
    const alvo = d.USERS.find((u) => u.id === Number(id));
    if (!alvo) throw new ErroDemo(404, "Usuário não encontrado.");
    if (!ativo && alvo.papel === "tecnico" && d.USERS.filter((u) => u.papel === "tecnico" && u.ativo !== false).length <= 1)
      throw new ErroDemo(409, "O sistema precisa ter ao menos um técnico (administrador) ativo.");
    alvo.ativo = Boolean(ativo);
    auditar(d, admin, ativo ? "usuario_reativado" : "usuario_inativado", { registroId: alvo.id });
    return { usuario: usuarioPublico(alvo, { completo: true }) };
  },

  "GET /api/data": (d) => escopo(exigirSessao(d), d),

  "PUT /api/data": (d, corpo) => {
    const user = exigirSessao(d);
    const r = aplicarAlteracoes(d, user, corpo, { prazoRespostaTitularDias: PRIVACIDADE.prazoRespostaTitularDias });
    if (!r.ok) throw new ErroDemo(403, r.erro);
    for (const ev of r.eventos) auditar(r.db, user, ev.tipo, ev);
    Object.keys(d).forEach((k) => delete d[k]);
    Object.assign(d, r.db);
    return { ok: true, data: escopo(user, d) };
  },

  "POST /api/audit/evento": (d, b) => {
    const user = exigirSessao(d);
    if (!EVENTOS_INFORMADOS_PELO_CLIENTE.has(b.tipo)) throw new ErroDemo(400, "Tipo de evento não aceito.");
    if (b.pacienteId != null && !pacientesPermitidos(user, d).includes(Number(b.pacienteId)))
      throw new ErroDemo(403, "Sem permissão para este paciente.");
    auditar(d, user, b.tipo, {
      pacienteId: b.pacienteId != null ? Number(b.pacienteId) : null,
      registroId: b.registroId ?? null,
      complemento: b.complemento,
    });
    return { ok: true };
  },

  "GET /api/audit": (d, _b, _p, q) => {
    const user = exigirSessao(d);
    exigirTecnico(user);
    const verificacao = verificarTrilha(d.AUDITORIA);
    const entradas = filtrarTrilha(d.AUDITORIA, q);
    auditar(d, user, "consulta_auditoria", { complemento: new URLSearchParams(q).toString() || "sem filtros" });
    return { total: entradas.length, entradas: entradas.slice(0, 1000), verificacao, eventos: EVENTOS };
  },

  "GET /api/institucional": (d) => institucional(d),
};

/** Exportação CSV da trilha (no servidor real é um download por URL). */
export async function csvAuditoriaDemo(filtros = {}) {
  const d = await db();
  const user = exigirSessao(d);
  exigirTecnico(user);
  const entradas = filtrarTrilha(d.AUDITORIA, filtros);
  auditar(d, user, "exportacao_auditoria", { complemento: `${entradas.length} registros` });
  salvar();
  return trilhaCsv(entradas, { software: SOFTWARE, instituicao: INSTITUICAO.controlador, geradoPor: user.id });
}

/**
 * Atende uma chamada como o servidor real atenderia.
 * @returns {Promise<object>} corpo da resposta (cópia)
 */
export async function atenderDemo(caminho, metodo = "GET", corpo) {
  const d = await db();
  const url = new URL(caminho, "http://demo");
  const q = Object.fromEntries(url.searchParams);
  for (const [chave, fn] of Object.entries(rotas)) {
    const [m, padrao] = chave.split(" ");
    if (m !== metodo) continue;
    const nomes = [];
    const re = new RegExp("^" + padrao.replace(/:(\w+)/g, (_, n) => (nomes.push(n), "([^/]+)")) + "$");
    const achou = url.pathname.match(re);
    if (!achou) continue;
    const params = Object.fromEntries(nomes.map((n, i) => [n, achou[i + 1]]));
    try {
      const resp = fn(d, copia(corpo || {}), params, q);
      return copia(resp);
    } finally {
      salvar();
    }
  }
  throw new ErroDemo(404, "Rota não encontrada.");
}

