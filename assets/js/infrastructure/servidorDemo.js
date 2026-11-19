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
//     cada visitante; os arquivos anexados ficam no IndexedDB do
//     navegador. Nada sai do navegador.
//   - Senhas: as contas de demonstração usam "1234"; contas criadas
//     na demonstração guardam SHA-256 com salt.
//
// ATENÇÃO: não há segurança real neste modo — qualquer pessoa com
// acesso ao navegador lê os dados. Use só com dados fictícios.
// ============================================================

import { sha256Hex } from "../shared/sha256.js";
import { ACESSO_PORTAL, GUARDA, INSTITUICAO, PRIVACIDADE, SEGURANCA, SOFTWARE } from "../shared/configuracao.js";
import { EVENTOS, EVENTOS_INFORMADOS_PELO_CLIENTE, filtrarTrilha, registrarEvento, trilhaCsv, verificarTrilha } from "../shared/auditoria.js";
import { aplicarAlteracoes, escopo, pacientesPermitidos, usuarioPublico } from "../shared/politica.js";
import { estaBloqueado, registrarFalhaLogin, registrarSucessoLogin, validarPoliticaSenha } from "../shared/regrasAcesso.js";
import { validarArquivo } from "../shared/arquivos.js";
import {
  ErroUsuario,
  acessoExpirado,
  aplicarEdicaoUsuario,
  aplicarRedefinicaoSenha,
  gerarAcessoTemporario,
  montarNovoUsuario,
} from "../shared/usuarios.js";

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
    salvar();
  }
  for (const k of ["REGISTRO_DOCUMENTAL", "COMPARTILHAMENTOS", "ANAMNESES", "EVOLUCOES", "DOCUMENTOS"]) _db[k] ||= {};
  for (const k of ["SOLICITACOES_AGENDAMENTO", "NOTIFICACOES", "FALTAS", "ACESSO_PACIENTE"]) _db[k] ||= [];
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
export async function restaurarDemonstracao() {
  try {
    localStorage.removeItem(CHAVE_DB);
    sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // armazenamento indisponível: nada a limpar
  }
  _db = null;
  await apagarArquivosDemo();
}

// ── Arquivos anexados (IndexedDB; em memória se indisponível) ──
const BANCO_ARQUIVOS = "pep_demo_arquivos";
const _arquivosMemoria = new Map();

function abrirIndexedDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((ok) => {
    try {
      const r = indexedDB.open(BANCO_ARQUIVOS, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("arquivos");
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    } catch {
      ok(null);
    }
  });
}

async function operarArquivos(modo, fn) {
  const idb = await abrirIndexedDb();
  if (!idb) return undefined;
  return new Promise((ok, falha) => {
    const tx = idb.transaction("arquivos", modo);
    const req = fn(tx.objectStore("arquivos"));
    tx.oncomplete = () => {
      idb.close();
      ok(req?.result);
    };
    tx.onerror = () => falha(tx.error);
  });
}

async function guardarArquivoDemo(id, bytes) {
  _arquivosMemoria.set(id, bytes);
  try {
    await operarArquivos("readwrite", (st) => st.put(bytes, id));
  } catch (e) {
    console.warn("[PEP demo] Arquivo guardado só até fechar a página:", e.message);
  }
}

async function lerArquivoDemo(id) {
  if (_arquivosMemoria.has(id)) return _arquivosMemoria.get(id);
  try {
    const r = await operarArquivos("readonly", (st) => st.get(id));
    return r ? new Uint8Array(r) : null;
  } catch {
    return null;
  }
}

async function apagarArquivosDemo() {
  _arquivosMemoria.clear();
  try {
    await operarArquivos("readwrite", (st) => st.clear());
  } catch {
    // nada a apagar
  }
}

async function sha256Bytes(bytes) {
  const h = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const novoId = (prefixo) =>
  `${prefixo}_${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)}`;

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

function exigirSessao(d, { permitirTrocaPendente = false } = {}) {
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
  if (acessoExpirado(user)) {
    gravarSessao(null);
    throw new ErroDemo(401, "Seu acesso temporário ao prontuário expirou.", "acesso_expirado");
  }
  // Troca de senha obrigatória pendente: só sessão, termo e a própria troca.
  if (user.seguranca?.trocaObrigatoria && !permitirTrocaPendente)
    throw new ErroDemo(403, "Defina a sua senha pessoal para continuar.", "troca_senha");
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
    pendencias: ACESSO_PORTAL.definido ? [] : ["acessoPortal.validadeDias"],
    acessoPortalDias: ACESSO_PORTAL.validadeDias,
    modoDemonstracao: true,
  };
}

function respostaSessao(d, user, extra = {}) {
  return {
    usuario: { ...usuarioPublico(user), login: user.login, acessoExpiraEm: user.papel === "paciente" ? user.acessoExpiraEm : undefined },
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
    if (acessoExpirado(user)) {
      auditar(d, user, "login_falha", { complemento: "acesso temporário vencido" });
      throw new ErroDemo(401, "Seu acesso temporário ao prontuário expirou. Procure o Serviço-Escola para pedir um novo acesso.");
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

  "GET /api/auth/me": (d) => respostaSessao(d, exigirSessao(d, { permitirTrocaPendente: true })),

  "POST /api/auth/termo": (d, { versao }) => {
    const user = exigirSessao(d, { permitirTrocaPendente: true });
    if (versao !== PRIVACIDADE.versaoTermo) throw new ErroDemo(409, "Versão do termo desatualizada. Recarregue a página.");
    user.termos ||= {};
    user.termos[versao] = new Date().toISOString();
    auditar(d, user, "termo_aceito", { complemento: `versão ${versao}` });
    return { ok: true };
  },

  "POST /api/auth/senha": (d, { senhaAtual, novaSenha }) => {
    const user = exigirSessao(d, { permitirTrocaPendente: true });
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
    const novo = montarNovoUsuario(d, b, { adminId: admin.id, senha: (s) => ({ senhaDemo: novaSenhaDemo(s) }) });
    d.USERS.push(novo);
    auditar(d, admin, "usuario_criado", {
      registroId: novo.id,
      complemento: novo.papel,
      pacienteId: novo.papel === "paciente" ? novo.id : null,
    });
    return { usuario: usuarioPublico(novo, { completo: true }) };
  },

  "PUT /api/usuarios/:id": (d, b, { id }) => {
    const admin = exigirSessao(d);
    exigirTecnico(admin);
    reautenticar(admin, b.senhaAdmin);
    const alvo = d.USERS.find((u) => u.id === Number(id));
    if (!alvo) throw new ErroDemo(404, "Usuário não encontrado.");
    const { campos } = aplicarEdicaoUsuario(d, alvo, b);
    if (campos.length) auditar(d, admin, "usuario_atualizado", { registroId: alvo.id, complemento: campos.join(",") });
    return { usuario: usuarioPublico(alvo, { completo: true }), alterados: campos };
  },

  "POST /api/usuarios/:id/senha": (d, b, { id }) => {
    const admin = exigirSessao(d);
    exigirTecnico(admin);
    reautenticar(admin, b.senhaAdmin);
    const alvo = d.USERS.find((u) => u.id === Number(id));
    if (!alvo) throw new ErroDemo(404, "Usuário não encontrado.");
    if (alvo.id === admin.id) throw new ErroDemo(400, 'Para trocar a sua própria senha, use "Alterar senha" no menu.');
    aplicarRedefinicaoSenha(alvo, b.senhaProvisoria, (s) => ({ senhaDemo: novaSenhaDemo(s) }));
    auditar(d, admin, "senha_redefinida", { registroId: alvo.id });
    return { usuario: usuarioPublico(alvo, { completo: true }) };
  },

  "POST /api/pacientes/:pid/acesso-temporario": (d, b, { pid }) => {
    const admin = exigirSessao(d);
    exigirTecnico(admin);
    reautenticar(admin, b.senhaAdmin);
    const { usuario, novo, senhaGerada } = gerarAcessoTemporario(d, pid, {
      adminId: admin.id,
      senha: (s) => ({ senhaDemo: novaSenhaDemo(s) }),
    });
    auditar(d, admin, "acesso_temporario_gerado", {
      registroId: usuario.id,
      pacienteId: usuario.id,
      complemento: `${novo ? "novo" : "renovado"}, válido até ${usuario.acessoExpiraEm.slice(0, 10)}`,
    });
    return {
      usuario: usuarioPublico(usuario, { completo: true }),
      login: usuario.login,
      senha: senhaGerada,
      expiraEm: usuario.acessoExpiraEm,
      validadeDias: ACESSO_PORTAL.validadeDias,
      validadeDefinida: ACESSO_PORTAL.definido,
    };
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
    const { pagina, porPagina, ...filtros } = q;
    const verificacao = verificarTrilha(d.AUDITORIA);
    const entradas = filtrarTrilha(d.AUDITORIA, filtros);
    const tam = Math.min(Math.max(Number(porPagina) || 50, 10), 500);
    const paginas = Math.max(1, Math.ceil(entradas.length / tam));
    const atual = Math.min(Math.max(Number(pagina) || 1, 1), paginas);
    // Toda consulta à trilha é auditada, com os filtros e a página vista.
    auditar(d, user, "consulta_auditoria", { complemento: `${new URLSearchParams(filtros).toString() || "sem filtros"} · página ${atual}` });
    return {
      total: entradas.length,
      pagina: atual,
      paginas,
      porPagina: tam,
      entradas: entradas.slice((atual - 1) * tam, atual * tam),
      verificacao,
      eventos: EVENTOS,
    };
  },

  "GET /api/institucional": (d) => institucional(d),
};

const CATEGORIAS_ANEXO = ["outro", "termo", "diagnostico_externo", "material_teste"];

/**
 * Envio de arquivo (no servidor real: POST /api/pacientes/:pid/documentos).
 * Recebe os bytes direto, sem passar por base64.
 */
export async function enviarDocumentoDemo(pid, meta = {}, { nome, bytes }) {
  const d = await db();
  const user = exigirSessao(d);
  const pacienteId = Number(pid);
  if (!pacientesPermitidos(user, d).includes(pacienteId)) throw new ErroDemo(403, "Sem permissão para este paciente.");
  const v = validarArquivo({ nome, bytes });
  if (!v.ok) throw new ErroDemo(400, v.erro);
  const categoria = CATEGORIAS_ANEXO.includes(meta.categoria) ? meta.categoria : "outro";
  const documento = {
    id: novoId("d"),
    nome: v.nome,
    tipo: v.tipo,
    categoria,
    compartimento: categoria === "material_teste" ? "restrito" : "prontuario",
    data: new Date().toISOString().slice(0, 10),
  };
  if (String(meta.titulo || "").trim()) documento.titulo = String(meta.titulo).trim().slice(0, 200);
  if (categoria === "diagnostico_externo") {
    const o = meta.origem || {};
    if (!String(o.profissional || "").trim() || !String(o.crp || "").trim())
      throw new ErroDemo(400, "Informe o profissional e o registro de quem emitiu o diagnóstico.");
    documento.titulo ||= "Diagnóstico de outro profissional";
    documento.origem = Object.fromEntries(["profissional", "crp", "instituicao", "emitidoEm"].map((k) => [k, String(o[k] || "").trim().slice(0, 200)]));
    documento.resumo = String(meta.resumo || "").slice(0, 2000);
  }
  const r = aplicarAlteracoes(d, user, { DOCUMENTOS: { [pacienteId]: [documento] } }, { prazoRespostaTitularDias: PRIVACIDADE.prazoRespostaTitularDias });
  if (!r.ok) throw new ErroDemo(403, r.erro);
  const salvo = r.db.DOCUMENTOS[pacienteId].find((x) => x.id === documento.id);
  const arquivoId = novoId("a");
  await guardarArquivoDemo(arquivoId, bytes);
  salvo.arquivo = { id: arquivoId, nome: v.nome, mime: v.mime, tamanho: v.tamanho, sha256: await sha256Bytes(bytes), enviadoEm: new Date().toISOString() };
  for (const ev of r.eventos) auditar(r.db, user, ev.tipo, ev);
  Object.keys(d).forEach((k) => delete d[k]);
  Object.assign(d, r.db);
  salvar();
  return copia({ documento: salvo, data: escopo(user, d) });
}

/** Download (no servidor real: GET /api/pacientes/:pid/documentos/:docId/arquivo). */
export async function baixarArquivoDemo(pid, docId) {
  const d = await db();
  const user = exigirSessao(d);
  const doc = (escopo(user, d).DOCUMENTOS[Number(pid)] || []).find((x) => String(x.id) === String(docId));
  if (!doc) throw new ErroDemo(404, "Documento não encontrado.");
  if (!doc.arquivo) throw new ErroDemo(404, "Este registro não tem arquivo digital anexado.");
  const bytes = await lerArquivoDemo(doc.arquivo.id);
  if (!bytes) throw new ErroDemo(410, "O arquivo não está mais guardado neste navegador.");
  if ((await sha256Bytes(bytes)) !== doc.arquivo.sha256) throw new ErroDemo(500, "O arquivo não confere com o registrado no prontuário (integridade).");
  auditar(d, user, "arquivo_baixado", { pacienteId: Number(pid), registroId: doc.id });
  salvar();
  return { bytes, nome: doc.arquivo.nome, mime: doc.arquivo.mime };
}

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
    } catch (e) {
      if (e instanceof ErroUsuario) throw new ErroDemo(e.status, e.message);
      throw e;
    } finally {
      salvar();
    }
  }
  throw new ErroDemo(404, "Rota não encontrada.");
}

