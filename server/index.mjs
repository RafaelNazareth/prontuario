// ============================================================
// server/index.mjs
// ------------------------------------------------------------
// Servidor do PEP (Node.js puro; o driver do MongoDB só é carregado
// quando PEP_BANCO=mongodb).
//
//   Autenticação e sessão
//     POST /api/auth/login      login + senha → cookie de sessão
//     POST /api/auth/logout
//     GET  /api/auth/me         usuário da sessão, configuração e dados institucionais
//     POST /api/auth/termo      aceite do aviso de privacidade/termo de uso (por versão)
//     POST /api/auth/senha      troca da própria senha (exige a senha atual)
//   Usuários (só técnico, com reautenticação)
//     POST /api/usuarios                    cadastrar equipe ou acesso de paciente ao portal
//     PUT  /api/usuarios/:id                editar nome, login, papel, CRP e matrícula
//     POST /api/usuarios/:id/senha          redefinir senha (provisória, troca obrigatória)
//     POST /api/pacientes/:pid/acesso-temporario  gera/renova login e senha temporários do paciente
//     POST /api/usuarios/:id/desbloquear
//     POST /api/usuarios/:id/ativo          inativar/reativar (nunca excluir)
//   Dados do prontuário (escopo e regras em policy.mjs)
//     GET  /api/data            só o que o papel pode ver
//     PUT  /api/data            grava alterações conferidas item a item
//   Arquivos anexados (conteúdo conferido e cifrado)
//     POST /api/pacientes/:pid/documentos                 envia arquivo + dados do documento
//     GET  /api/pacientes/:pid/documentos/:docId/arquivo  baixa o arquivo (auditado)
//   Auditoria (gravada só pelo servidor)
//     POST /api/audit/evento    leitura/impressão informada pela tela
//     GET  /api/audit           consulta com filtros e paginação (só técnico)
//     GET  /api/audit/csv       exportação (só técnico)
//   Informações públicas
//     GET  /api/institucional   aviso de privacidade, encarregado, responsável técnico
//
// Banco: PEP_BANCO=json (padrão, data/db.json) ou PEP_BANCO=mongodb
// (ver server/banco/ e docs/IMPLANTACAO.md). As requisições à API são
// atendidas uma de cada vez (fila), o que evita gravações cruzadas.
//
// Uso: npm run dev   (ou: node server/index.mjs [porta])
// Escuta em 127.0.0.1 (PEP_HOST muda isso). Em produção, publique
// atrás de um proxy com HTTPS (SBIS NGS1.05.01); o cookie passa a ser Secure.
// ============================================================

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { criarBanco } from "./banco/index.mjs";
import { cifrarArquivo, decifrarArquivo, obterChaveArquivos, sha256 } from "./cofreArquivos.mjs";
import {
  ACESSO_PORTAL,
  BACKUP,
  GUARDA,
  INSTITUICAO,
  PRIVACIDADE,
  SEGURANCA,
  SOFTWARE,
  aplicarDadosInstitucionais,
  pendenciasInstitucionais,
} from "./config.mjs";
import {
  COOKIE_LIMPO,
  conferirSenha,
  cookieSessao,
  criarSessao,
  encerrarSessao,
  encerrarSessoesDoUsuario,
  estaBloqueado,
  gerarHashSenha,
  ipDe,
  lerSessao,
  registrarFalhaLogin,
  registrarSucessoLogin,
  validarPoliticaSenha,
} from "./security.mjs";
import { EVENTOS, EVENTOS_INFORMADOS_PELO_CLIENTE, filtrarTrilha, registrarEvento, trilhaCsv, verificarTrilha } from "./audit.mjs";
import { aplicarAlteracoes, escopo, pacientesPermitidos, usuarioPublico } from "./policy.mjs";
import { criarBackup } from "./backup.mjs";
import { validarArquivo } from "../assets/js/shared/arquivos.js";
import {
  ErroUsuario,
  acessoExpirado,
  aplicarEdicaoUsuario,
  aplicarRedefinicaoSenha,
  gerarAcessoTemporario,
  montarNovoUsuario,
} from "../assets/js/shared/usuarios.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DATA_DIR = process.env.PEP_DATA_DIR || join(ROOT, "data");
const PORT = Number(process.argv[2] || process.env.PORT || 5500);
const HOST = process.env.PEP_HOST || "127.0.0.1";
const LIMITE_BYTES = 25 * 1024 * 1024;

// Dados institucionais reais, informados na implantação (sem mexer no código).
const ARQ_INSTITUICAO = process.env.PEP_INSTITUICAO_ARQUIVO || join(DATA_DIR, "instituicao.json");
if (existsSync(ARQ_INSTITUICAO)) aplicarDadosInstitucionais(JSON.parse(readFileSync(ARQ_INSTITUICAO, "utf8")));

const db = await criarBanco({ dataDir: DATA_DIR });
const CHAVE_ARQUIVOS = obterChaveArquivos(DATA_DIR);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".csv": "text/csv; charset=utf-8",
};

// Cabeçalhos de segurança em todas as respostas
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https://fcmsantacasasp.edu.br",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function cabecalhosSeguranca(res) {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function enviarJson(res, status, corpo, extras = {}) {
  res.writeHead(status, { "Content-Type": MIME[".json"], "Cache-Control": "no-store", ...extras });
  res.end(JSON.stringify(corpo));
}

class ErroHttp extends Error {
  constructor(status, mensagem, extra = {}) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
  }
}

function lerCorpo(req) {
  return new Promise((ok, falha) => {
    let tamanho = 0;
    const partes = [];
    req.on("data", (c) => {
      tamanho += c.length;
      if (tamanho > LIMITE_BYTES) {
        falha(new ErroHttp(413, "Corpo maior que o limite de 25 MB."));
        req.destroy();
      } else partes.push(c);
    });
    req.on("end", () => {
      const txt = Buffer.concat(partes).toString("utf8");
      try {
        ok(txt ? JSON.parse(txt) : {});
      } catch {
        falha(new ErroHttp(400, "JSON inválido."));
      }
    });
    req.on("error", falha);
  });
}

// Fila: uma requisição da API por vez (ler → conferir → gravar sem que
// outra requisição grave no meio). Atende bem um serviço-escola; para
// várias instâncias do servidor seria preciso trava no banco.
let _fila = Promise.resolve();
function emFila(fn) {
  const r = _fila.then(fn, fn);
  _fila = r.catch(() => {});
  return r;
}

// ── Migração: senhas antigas em texto puro viram hash ───────
await (async function migrarSenhas() {
  const dados = await db.ler();
  let mudou = false;
  for (const u of dados.USERS) {
    if (u.pass !== undefined) {
      u.senha = gerarHashSenha(u.pass);
      delete u.pass;
      mudou = true;
    }
  }
  if (mudou) {
    await db.gravar(dados);
    console.log("[PEP] Senhas em texto puro convertidas para hash scrypt.");
  }
})();

// ── Helpers de sessão/auditoria ──────────────────────────────
function auditar(dados, req, user, tipo, extra = {}) {
  return registrarEvento(dados, { tipo, userId: user?.id ?? null, papel: user?.papel ?? null, ip: ipDe(req), ...extra });
}

/** Lê a sessão e o usuário; em sessão expirada, registra o evento. */
/**
 * Confere a sessão. Enquanto a troca de senha obrigatória estiver
 * pendente, só as rotas marcadas com `permitirTrocaPendente` (sessão,
 * termo e a própria troca) funcionam: a pessoa não usa o sistema antes
 * de criar a senha própria, nem pulando a tela.
 */
async function exigirSessao(req, dados, { permitirTrocaPendente = false } = {}) {
  const s = lerSessao(req);
  if (s.erro) {
    if (s.erro === "inatividade" && s.userId) {
      const u = dados.USERS.find((x) => x.id === s.userId);
      auditar(dados, req, u, "sessao_expirada");
      await db.gravar(dados);
    }
    throw new ErroHttp(401, s.erro === "inatividade" ? "Sessão encerrada por inatividade." : "Faça login para continuar.", {
      motivo: s.erro,
    });
  }
  const user = dados.USERS.find((u) => u.id === s.sessao.userId);
  if (!user || user.ativo === false) throw new ErroHttp(401, "Faça login para continuar.", { motivo: "usuario_inativo" });
  if (acessoExpirado(user)) {
    encerrarSessoesDoUsuario(user.id);
    throw new ErroHttp(401, "Seu acesso temporário ao prontuário expirou.", { motivo: "acesso_expirado" });
  }
  if (user.seguranca?.trocaObrigatoria && !permitirTrocaPendente)
    throw new ErroHttp(403, "Defina a sua senha pessoal para continuar.", { motivo: "troca_senha" });
  return user;
}

function exigirTecnico(user) {
  if (user.papel !== "tecnico") throw new ErroHttp(403, "Operação restrita ao técnico responsável.");
}

function reautenticar(user, senha) {
  if (!conferirSenha(senha || "", user.senha)) throw new ErroHttp(403, "Senha atual incorreta. Confirme sua senha para continuar.");
}

function institucional(dados) {
  const rt = dados.USERS.find((u) => u.papel === "tecnico" && u.ativo !== false && u.crp);
  return {
    ...INSTITUICAO,
    responsavelTecnico: rt ? { nome: rt.nome, crp: rt.crp } : null,
    software: SOFTWARE,
    versaoTermo: PRIVACIDADE.versaoTermo,
    prazoRespostaTitularDias: PRIVACIDADE.prazoRespostaTitularDias,
    guardaAnos: GUARDA.anosAposUltimoRegistro,
    pendencias: pendenciasInstitucionais(),
    acessoPortalDias: ACESSO_PORTAL.validadeDias,
  };
}

function respostaSessao(dados, user, extra = {}) {
  return {
    usuario: { ...usuarioPublico(user), login: user.login, acessoExpiraEm: user.papel === "paciente" ? user.acessoExpiraEm : undefined },
    termoPendente: !user.termos?.[PRIVACIDADE.versaoTermo],
    trocaObrigatoria: Boolean(user.seguranca?.trocaObrigatoria),
    config: {
      inatividadeMinutos: SEGURANCA.inatividadeMinutos,
      avisoInatividadeSegundos: SEGURANCA.avisoInatividadeSegundos,
      senha: SEGURANCA.senha,
    },
    institucional: institucional(dados),
    ...extra,
  };
}

const CATEGORIAS_ANEXO = ["outro", "termo", "diagnostico_externo", "material_teste"];

/** Monta o registro do documento a partir do que a tela enviou (só campos conhecidos). */
function documentoAnexado(meta, arquivoValidado) {
  const categoria = CATEGORIAS_ANEXO.includes(meta.categoria) ? meta.categoria : "outro";
  const documento = {
    id: `d_${randomUUID()}`,
    nome: arquivoValidado.nome,
    tipo: arquivoValidado.tipo,
    categoria,
    compartimento: categoria === "material_teste" ? "restrito" : "prontuario",
    data: new Date().toISOString().slice(0, 10),
  };
  if (String(meta.titulo || "").trim()) documento.titulo = String(meta.titulo).trim().slice(0, 200);
  if (categoria === "diagnostico_externo") {
    const o = meta.origem || {};
    if (!String(o.profissional || "").trim() || !String(o.crp || "").trim())
      throw new ErroHttp(400, "Informe o profissional e o registro de quem emitiu o diagnóstico.");
    documento.titulo ||= "Diagnóstico de outro profissional";
    documento.origem = Object.fromEntries(["profissional", "crp", "instituicao", "emitidoEm"].map((k) => [k, String(o[k] || "").trim().slice(0, 200)]));
    documento.resumo = String(meta.resumo || "").slice(0, 2000);
  }
  return documento;
}

/** Content-Disposition com nome em ASCII e em UTF-8 (RFC 6266). */
function disposicaoAnexo(nome) {
  const ascii =
    nome
      .normalize("NFD")
      .replace(/[^\x20-\x7e]/g, "")
      .replace(/["\\]/g, "")
      .replace(/\s+/g, " ")
      .trim() || "documento";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}

// ── Rotas da API ─────────────────────────────────────────────
// Cada rota recebe (req, res, parâmetros da URL, corpo JSON já lido).
const rotas = {
  "POST /api/auth/login": async (req, res, _p, corpo) => {
    const { login, senha } = corpo;
    const dados = await db.ler();
    const user = dados.USERS.find((u) => u.login === String(login || "").trim());
    const generico = "Usuário ou senha incorretos.";
    if (!user || user.ativo === false) {
      auditar(dados, req, null, "login_falha", { complemento: "login inexistente ou inativo" });
      await db.gravar(dados);
      throw new ErroHttp(401, generico);
    }
    if (estaBloqueado(user)) {
      auditar(dados, req, user, "login_falha", { complemento: "conta bloqueada" });
      await db.gravar(dados);
      throw new ErroHttp(423, "Acesso bloqueado temporariamente por tentativas inválidas. Tente mais tarde ou procure o técnico responsável.");
    }
    if (!conferirSenha(senha || "", user.senha)) {
      const bloqueou = registrarFalhaLogin(user);
      auditar(dados, req, user, bloqueou ? "login_bloqueado" : "login_falha");
      await db.gravar(dados);
      throw new ErroHttp(401, generico);
    }
    if (acessoExpirado(user)) {
      auditar(dados, req, user, "login_falha", { complemento: "acesso temporário vencido" });
      await db.gravar(dados);
      throw new ErroHttp(401, "Seu acesso temporário ao prontuário expirou. Procure o Serviço-Escola para pedir um novo acesso.");
    }
    const resumo = registrarSucessoLogin(user);
    auditar(dados, req, user, "login_sucesso");
    await db.gravar(dados);
    const token = criarSessao(user, req);
    enviarJson(res, 200, respostaSessao(dados, user, { acesso: resumo }), { "Set-Cookie": cookieSessao(token, req) });
  },

  "POST /api/auth/logout": async (req, res) => {
    const s = encerrarSessao(req);
    if (s) {
      const dados = await db.ler();
      auditar(dados, req, dados.USERS.find((u) => u.id === s.userId), "logout");
      await db.gravar(dados);
    }
    enviarJson(res, 200, { ok: true }, { "Set-Cookie": COOKIE_LIMPO });
  },

  "GET /api/auth/me": async (req, res) => {
    const dados = await db.ler();
    const user = await exigirSessao(req, dados, { permitirTrocaPendente: true });
    enviarJson(res, 200, respostaSessao(dados, user));
  },

  "POST /api/auth/termo": async (req, res, _p, { versao }) => {
    const dados = await db.ler();
    const user = await exigirSessao(req, dados, { permitirTrocaPendente: true });
    if (versao !== PRIVACIDADE.versaoTermo) throw new ErroHttp(409, "Versão do termo desatualizada. Recarregue a página.");
    user.termos ||= {};
    user.termos[versao] = new Date().toISOString();
    auditar(dados, req, user, "termo_aceito", { complemento: `versão ${versao}` });
    await db.gravar(dados);
    enviarJson(res, 200, { ok: true });
  },

  "POST /api/auth/senha": async (req, res, _p, { senhaAtual, novaSenha }) => {
    const dados = await db.ler();
    const user = await exigirSessao(req, dados, { permitirTrocaPendente: true });
    reautenticar(user, senhaAtual);
    const erro = validarPoliticaSenha(novaSenha, user);
    if (erro) throw new ErroHttp(400, erro);
    if (conferirSenha(novaSenha, user.senha) || conferirSenha(novaSenha, user.senhaAnterior))
      throw new ErroHttp(400, "A nova senha precisa ser diferente da atual e da anterior.");
    user.senhaAnterior = user.senha;
    user.senha = gerarHashSenha(novaSenha);
    user.seguranca ||= {};
    user.seguranca.trocaObrigatoria = false;
    user.seguranca.senhaAlteradaEm = new Date().toISOString();
    auditar(dados, req, user, "senha_alterada");
    await db.gravar(dados);
    enviarJson(res, 200, { ok: true });
  },

  "POST /api/usuarios": async (req, res, _p, b) => {
    const dados = await db.ler();
    const admin = await exigirSessao(req, dados);
    exigirTecnico(admin);
    reautenticar(admin, b.senhaAdmin);
    const novo = montarNovoUsuario(dados, b, { adminId: admin.id, senha: (s) => ({ senha: gerarHashSenha(s) }) });
    dados.USERS.push(novo);
    auditar(dados, req, admin, "usuario_criado", {
      registroId: novo.id,
      complemento: novo.papel,
      pacienteId: novo.papel === "paciente" ? novo.id : null,
    });
    await db.gravar(dados);
    enviarJson(res, 201, { usuario: usuarioPublico(novo, { completo: true }) });
  },

  "PUT /api/usuarios/:id": async (req, res, { id }, b) => {
    const dados = await db.ler();
    const admin = await exigirSessao(req, dados);
    exigirTecnico(admin);
    reautenticar(admin, b.senhaAdmin);
    const alvo = dados.USERS.find((u) => u.id === Number(id));
    if (!alvo) throw new ErroHttp(404, "Usuário não encontrado.");
    const { campos, papelMudou } = aplicarEdicaoUsuario(dados, alvo, b);
    if (campos.length) {
      // Com papel ou login novos, a pessoa entra de novo e recebe as permissões certas.
      if (papelMudou || campos.includes("login")) encerrarSessoesDoUsuario(alvo.id);
      auditar(dados, req, admin, "usuario_atualizado", { registroId: alvo.id, complemento: campos.join(",") });
      await db.gravar(dados);
    }
    enviarJson(res, 200, { usuario: usuarioPublico(alvo, { completo: true }), alterados: campos });
  },

  "POST /api/usuarios/:id/senha": async (req, res, { id }, b) => {
    const dados = await db.ler();
    const admin = await exigirSessao(req, dados);
    exigirTecnico(admin);
    reautenticar(admin, b.senhaAdmin);
    const alvo = dados.USERS.find((u) => u.id === Number(id));
    if (!alvo) throw new ErroHttp(404, "Usuário não encontrado.");
    if (alvo.id === admin.id) throw new ErroHttp(400, 'Para trocar a sua própria senha, use "Alterar senha" no menu.');
    aplicarRedefinicaoSenha(alvo, b.senhaProvisoria, (s) => ({ senha: gerarHashSenha(s), senhaAnterior: alvo.senha }));
    encerrarSessoesDoUsuario(alvo.id);
    auditar(dados, req, admin, "senha_redefinida", { registroId: alvo.id });
    await db.gravar(dados);
    enviarJson(res, 200, { usuario: usuarioPublico(alvo, { completo: true }) });
  },

  "POST /api/pacientes/:pid/acesso-temporario": async (req, res, { pid }, b) => {
    const dados = await db.ler();
    const admin = await exigirSessao(req, dados);
    exigirTecnico(admin);
    reautenticar(admin, b.senhaAdmin);
    const { usuario, novo, senhaGerada } = gerarAcessoTemporario(dados, pid, {
      adminId: admin.id,
      senha: (s) => ({ senha: gerarHashSenha(s) }),
    });
    // Renovação: a senha anterior deixa de valer e as sessões abertas caem.
    if (!novo) encerrarSessoesDoUsuario(usuario.id);
    auditar(dados, req, admin, "acesso_temporario_gerado", {
      registroId: usuario.id,
      pacienteId: usuario.id,
      complemento: `${novo ? "novo" : "renovado"}, válido até ${usuario.acessoExpiraEm.slice(0, 10)}`,
    });
    await db.gravar(dados);
    enviarJson(res, 200, {
      usuario: usuarioPublico(usuario, { completo: true }),
      login: usuario.login,
      senha: senhaGerada,
      expiraEm: usuario.acessoExpiraEm,
      validadeDias: ACESSO_PORTAL.validadeDias,
      validadeDefinida: ACESSO_PORTAL.definido,
    });
  },

  "POST /api/usuarios/:id/desbloquear": async (req, res, { id }) => {
    const dados = await db.ler();
    const admin = await exigirSessao(req, dados);
    exigirTecnico(admin);
    const alvo = dados.USERS.find((u) => u.id === Number(id));
    if (!alvo) throw new ErroHttp(404, "Usuário não encontrado.");
    alvo.seguranca ||= {};
    delete alvo.seguranca.bloqueadoAte;
    alvo.seguranca.tentativasFalhas = 0;
    auditar(dados, req, admin, "usuario_desbloqueado", { registroId: alvo.id });
    await db.gravar(dados);
    enviarJson(res, 200, { usuario: usuarioPublico(alvo, { completo: true }) });
  },

  "POST /api/usuarios/:id/ativo": async (req, res, { id }, { ativo, senhaAdmin }) => {
    const dados = await db.ler();
    const admin = await exigirSessao(req, dados);
    exigirTecnico(admin);
    reautenticar(admin, senhaAdmin);
    const alvo = dados.USERS.find((u) => u.id === Number(id));
    if (!alvo) throw new ErroHttp(404, "Usuário não encontrado.");
    if (!ativo) {
      const tecnicosAtivos = dados.USERS.filter((u) => u.papel === "tecnico" && u.ativo !== false);
      if (alvo.papel === "tecnico" && tecnicosAtivos.length <= 1)
        throw new ErroHttp(409, "O sistema precisa ter ao menos um técnico (administrador) ativo.");
      encerrarSessoesDoUsuario(alvo.id);
    }
    alvo.ativo = Boolean(ativo);
    auditar(dados, req, admin, ativo ? "usuario_reativado" : "usuario_inativado", { registroId: alvo.id });
    await db.gravar(dados);
    enviarJson(res, 200, { usuario: usuarioPublico(alvo, { completo: true }) });
  },

  "GET /api/data": async (req, res) => {
    const dados = await db.ler();
    const user = await exigirSessao(req, dados);
    enviarJson(res, 200, escopo(user, dados));
  },

  "PUT /api/data": async (req, res, _p, corpo) => {
    const dados = await db.ler();
    const user = await exigirSessao(req, dados);
    const r = aplicarAlteracoes(dados, user, corpo, { prazoRespostaTitularDias: PRIVACIDADE.prazoRespostaTitularDias });
    if (!r.ok) throw new ErroHttp(403, r.erro);
    for (const ev of r.eventos) auditar(r.db, req, user, ev.tipo, ev);
    if (r.eventos.length) await db.gravar(r.db);
    enviarJson(res, 200, { ok: true, data: escopo(user, r.db) });
  },

  // Envio de arquivo: o conteúdo é conferido (tipo real e tamanho),
  // cifrado e gravado; o registro do documento passa pelas mesmas
  // regras da gravação do prontuário (policy.mjs).
  "POST /api/pacientes/:pid/documentos": async (req, res, { pid }, b) => {
    const dados = await db.ler();
    const user = await exigirSessao(req, dados);
    const pacienteId = Number(pid);
    if (!pacientesPermitidos(user, dados).includes(pacienteId)) throw new ErroHttp(403, "Sem permissão para este paciente.");
    const bytes = Buffer.from(String(b.arquivo?.conteudoBase64 || ""), "base64");
    const v = validarArquivo({ nome: b.arquivo?.nome, bytes });
    if (!v.ok) throw new ErroHttp(400, v.erro);
    const documento = documentoAnexado(b.documento || {}, v);
    const r = aplicarAlteracoes(dados, user, { DOCUMENTOS: { [pacienteId]: [documento] } }, {
      prazoRespostaTitularDias: PRIVACIDADE.prazoRespostaTitularDias,
    });
    if (!r.ok) throw new ErroHttp(403, r.erro);
    const salvo = r.db.DOCUMENTOS[pacienteId].find((d) => d.id === documento.id);
    const arquivoId = `a_${randomUUID()}`;
    await db.arquivos.salvar(arquivoId, cifrarArquivo(bytes, CHAVE_ARQUIVOS));
    salvo.arquivo = { id: arquivoId, nome: v.nome, mime: v.mime, tamanho: v.tamanho, sha256: sha256(bytes), enviadoEm: new Date().toISOString() };
    for (const ev of r.eventos) auditar(r.db, req, user, ev.tipo, ev);
    await db.gravar(r.db);
    enviarJson(res, 201, { documento: salvo, data: escopo(user, r.db) });
  },

  "GET /api/pacientes/:pid/documentos/:docId/arquivo": async (req, res, { pid, docId }) => {
    const dados = await db.ler();
    const user = await exigirSessao(req, dados);
    // Só baixa quem pode ver o documento (mesmo escopo da leitura do prontuário).
    const visiveis = escopo(user, dados).DOCUMENTOS[Number(pid)] || [];
    const doc = visiveis.find((d) => String(d.id) === decodeURIComponent(docId));
    if (!doc) throw new ErroHttp(404, "Documento não encontrado.");
    if (!doc.arquivo) throw new ErroHttp(404, "Este registro não tem arquivo digital anexado.");
    const cifrado = await db.arquivos.ler(doc.arquivo.id);
    if (!cifrado) throw new ErroHttp(410, "O arquivo não foi encontrado no armazenamento. Procure o técnico responsável.");
    let bytes;
    try {
      bytes = decifrarArquivo(cifrado, CHAVE_ARQUIVOS);
    } catch {
      throw new ErroHttp(500, "Falha ao abrir o arquivo: conteúdo alterado ou chave de arquivos incorreta.");
    }
    if (sha256(bytes) !== doc.arquivo.sha256) throw new ErroHttp(500, "O arquivo não confere com o registrado no prontuário (integridade).");
    auditar(dados, req, user, "arquivo_baixado", { pacienteId: Number(pid), registroId: doc.id });
    await db.gravar(dados);
    res.writeHead(200, {
      "Content-Type": doc.arquivo.mime,
      "Content-Length": bytes.length,
      "Content-Disposition": disposicaoAnexo(doc.arquivo.nome),
      "Cache-Control": "no-store",
    });
    res.end(bytes);
  },

  "POST /api/audit/evento": async (req, res, _p, b) => {
    const dados = await db.ler();
    const user = await exigirSessao(req, dados);
    if (!EVENTOS_INFORMADOS_PELO_CLIENTE.has(b.tipo)) throw new ErroHttp(400, "Tipo de evento não aceito.");
    if (b.pacienteId != null && !pacientesPermitidos(user, dados).includes(Number(b.pacienteId)))
      throw new ErroHttp(403, "Sem permissão para este paciente.");
    auditar(dados, req, user, b.tipo, {
      pacienteId: b.pacienteId != null ? Number(b.pacienteId) : null,
      registroId: b.registroId ?? null,
      complemento: b.complemento,
    });
    await db.gravar(dados);
    enviarJson(res, 200, { ok: true });
  },

  "GET /api/audit": async (req, res) => {
    const dados = await db.ler();
    const user = await exigirSessao(req, dados);
    exigirTecnico(user);
    const q = Object.fromEntries(new URL(req.url, "http://x").searchParams);
    const { pagina: _pg, porPagina: _pp, ...filtros } = q;
    const verificacao = verificarTrilha(dados.AUDITORIA);
    const entradas = filtrarTrilha(dados.AUDITORIA, filtros);
    const pagina = paginar(entradas, q);
    // Toda consulta à trilha é auditada, com os filtros e a página vista.
    const complemento = `${new URLSearchParams(filtros).toString() || "sem filtros"} · página ${pagina.pagina}`;
    auditar(dados, req, user, "consulta_auditoria", { complemento });
    await db.gravar(dados);
    enviarJson(res, 200, { ...pagina, verificacao, eventos: EVENTOS });
  },

  "GET /api/audit/csv": async (req, res) => {
    const dados = await db.ler();
    const user = await exigirSessao(req, dados);
    exigirTecnico(user);
    const q = Object.fromEntries(new URL(req.url, "http://x").searchParams);
    const entradas = filtrarTrilha(dados.AUDITORIA, q);
    auditar(dados, req, user, "exportacao_auditoria", { complemento: `${entradas.length} registros` });
    await db.gravar(dados);
    res.writeHead(200, {
      "Content-Type": MIME[".csv"],
      "Content-Disposition": `attachment; filename="auditoria-pep-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    });
    res.end(trilhaCsv(entradas, { software: SOFTWARE, instituicao: INSTITUICAO.controlador, geradoPor: user.id }));
  },

  "GET /api/institucional": async (req, res) => {
    enviarJson(res, 200, institucional(await db.ler()));
  },
};

/** Página de uma lista: ?pagina=1&porPagina=50 (10 a 500). */
export function paginar(lista, { pagina, porPagina } = {}) {
  const tam = Math.min(Math.max(Number(porPagina) || 50, 10), 500);
  const paginas = Math.max(1, Math.ceil(lista.length / tam));
  const atual = Math.min(Math.max(Number(pagina) || 1, 1), paginas);
  return { total: lista.length, pagina: atual, paginas, porPagina: tam, entradas: lista.slice((atual - 1) * tam, atual * tam) };
}

function encontrarRota(metodo, caminho) {
  for (const [chave, fn] of Object.entries(rotas)) {
    const [m, padrao] = chave.split(" ");
    if (m !== metodo) continue;
    const nomes = [];
    const re = new RegExp("^" + padrao.replace(/:(\w+)/g, (_, n) => (nomes.push(n), "([^/]+)")) + "$");
    const achou = caminho.match(re);
    if (achou) return { fn, params: Object.fromEntries(nomes.map((n, i) => [n, achou[i + 1]])) };
  }
  return null;
}

async function api(req, res, caminho) {
  // Requisições que alteram estado precisam do cabeçalho próprio do app
  // (bloqueia envio forjado por outro site; o cookie já é SameSite=Strict).
  if (req.method !== "GET" && req.headers["x-pep-request"] !== "1")
    throw new ErroHttp(403, "Requisição sem o cabeçalho de origem do PEP.");
  const rota = encontrarRota(req.method, caminho);
  if (!rota) throw new ErroHttp(404, "Rota não encontrada.");
  // O corpo é lido antes de entrar na fila: um envio lento não segura as outras requisições.
  const corpo = req.method === "GET" ? {} : await lerCorpo(req);
  await emFila(() => rota.fn(req, res, rota.params, corpo));
}

function estatico(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end();
    return;
  }
  let caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (caminho.endsWith("/")) caminho += "index.html";
  const arquivo = normalize(join(ROOT, caminho));
  const relativo = arquivo.slice(ROOT.length + 1);
  // Bloqueia saída da raiz, arquivos ocultos, DADOS, dependências e código do servidor.
  const bloqueado =
    !arquivo.startsWith(ROOT + sep) ||
    relativo.split(sep).some((p) => p.startsWith(".")) ||
    /^(data|node_modules|server|scripts|tests|docs)(\\|\/|$)/.test(relativo) ||
    /^package(-lock)?\.json$/.test(relativo);
  let info;
  try {
    info = !bloqueado && statSync(arquivo);
  } catch {
    info = null;
  }
  if (!info || !info.isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Não encontrado.");
    return;
  }
  res.writeHead(200, {
    "Content-Type": MIME[extname(arquivo).toLowerCase()] || "application/octet-stream",
    "Content-Length": info.size,
    "Cache-Control": "no-cache",
  });
  if (req.method === "HEAD") res.end();
  else createReadStream(arquivo).pipe(res);
}

const server = createServer(async (req, res) => {
  cabecalhosSeguranca(res);
  try {
    const caminho = new URL(req.url, "http://x").pathname;
    if (caminho.startsWith("/api/")) await api(req, res, caminho);
    else estatico(req, res);
  } catch (erro) {
    const e = erro instanceof ErroUsuario ? new ErroHttp(erro.status, erro.message) : erro;
    if (!(e instanceof ErroHttp)) console.error("[PEP]", e);
    if (!res.headersSent) {
      const status = e.status || 500;
      enviarJson(res, status, { erro: e instanceof ErroHttp || e.status ? e.message : "Erro interno do servidor.", ...(e.extra || {}) }, status === 401 ? { "Set-Cookie": COOKIE_LIMPO } : {});
    }
  }
});

// ── Backup automático cifrado ────────────────────────────────
function backupAgendado() {
  return emFila(async () => {
    const dados = await db.ler();
    const arq = criarBackup(DATA_DIR, { manterUltimos: BACKUP.manterUltimos, texto: JSON.stringify(dados, null, 2) + "\n" });
    // Arquivos anexados já estão cifrados e nunca mudam: cópia incremental.
    if (db.arquivos.copiarPara) await db.arquivos.copiarPara(join(DATA_DIR, "backups", "arquivos"));
    registrarEvento(dados, { tipo: "backup_criado", ip: "servidor", complemento: arq.split(/[\\/]/).pop() });
    await db.gravar(dados);
  }).catch((e) => console.error("[PEP] Falha no backup automático:", e.message));
}

// Só sobe o servidor quando executado diretamente (testes importam as rotas sem ouvir porta).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => {
    console.log(`PEP rodando em http://localhost:${PORT}`);
    console.log(`Banco: ${db.descricao}`);
    const pend = pendenciasInstitucionais();
    if (pend.length)
      console.warn(`[PEP] Dados institucionais de demonstração ainda em uso (${pend.join(", ")}). Preencha ${ARQ_INSTITUICAO} antes do uso real.`);
    backupAgendado();
    setInterval(backupAgendado, BACKUP.intervaloHoras * 3600000).unref();
  });
}

export { server, db };
