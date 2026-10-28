// ============================================================
// server/index.mjs
// ------------------------------------------------------------
// Servidor local do PEP (Node.js puro, sem dependências).
//
//   Autenticação e sessão
//     POST /api/auth/login      login + senha → cookie de sessão
//     POST /api/auth/logout
//     GET  /api/auth/me         usuário da sessão, configuração e dados institucionais
//     POST /api/auth/termo      aceite do aviso de privacidade/termo de uso (por versão)
//     POST /api/auth/senha      troca da própria senha (exige a senha atual)
//   Usuários (só técnico, com reautenticação)
//     POST /api/usuarios                    cadastrar
//     POST /api/usuarios/:id/desbloquear
//     POST /api/usuarios/:id/ativo          inativar/reativar (nunca excluir)
//   Dados do prontuário (escopo e regras em policy.mjs)
//     GET  /api/data            só o que o papel pode ver
//     PUT  /api/data            grava alterações conferidas item a item
//   Auditoria (gravada só pelo servidor)
//     POST /api/audit/evento    leitura/impressão informada pela tela
//     GET  /api/audit           consulta com filtros (só técnico)
//     GET  /api/audit/csv       exportação (só técnico)
//   Informações públicas
//     GET  /api/institucional   aviso de privacidade, encarregado, responsável técnico
//
// Uso: npm run dev   (ou: node server/index.mjs [porta])
// Escuta apenas em 127.0.0.1. Em produção, publique atrás de um
// proxy com HTTPS (SBIS NGS1.05.01); o cookie passa a ser Secure.
// ============================================================

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createJsonDb } from "./jsonDb.mjs";
import { BACKUP, GUARDA, INSTITUICAO, PRIVACIDADE, SEGURANCA, SOFTWARE } from "./config.mjs";
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

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DATA_DIR = process.env.PEP_DATA_DIR || join(ROOT, "data");
const PORT = Number(process.argv[2] || process.env.PORT || 5500);
const HOST = "127.0.0.1";
const LIMITE_BYTES = 25 * 1024 * 1024;

const db = createJsonDb(DATA_DIR);

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
  "img-src 'self' data: https://fcmsantacasasp.edu.br",
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

// ── Migração: senhas antigas em texto puro viram hash ───────
(function migrarSenhas() {
  const dados = db.ler();
  let mudou = false;
  for (const u of dados.USERS) {
    if (u.pass !== undefined) {
      u.senha = gerarHashSenha(u.pass);
      delete u.pass;
      mudou = true;
    }
  }
  if (mudou) {
    db.gravar(dados);
    console.log("[PEP] Senhas em texto puro convertidas para hash scrypt.");
  }
})();

// ── Helpers de sessão/auditoria ──────────────────────────────
function auditar(dados, req, user, tipo, extra = {}) {
  return registrarEvento(dados, { tipo, userId: user?.id ?? null, papel: user?.papel ?? null, ip: ipDe(req), ...extra });
}

/** Lê a sessão e o usuário; em sessão expirada, registra o evento. */
function exigirSessao(req, dados) {
  const s = lerSessao(req);
  if (s.erro) {
    if (s.erro === "inatividade" && s.userId) {
      const u = dados.USERS.find((x) => x.id === s.userId);
      auditar(dados, req, u, "sessao_expirada");
      db.gravar(dados);
    }
    throw new ErroHttp(401, s.erro === "inatividade" ? "Sessão encerrada por inatividade." : "Faça login para continuar.", {
      motivo: s.erro,
    });
  }
  const user = dados.USERS.find((u) => u.id === s.sessao.userId);
  if (!user || user.ativo === false) throw new ErroHttp(401, "Faça login para continuar.", { motivo: "usuario_inativo" });
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
  };
}

function respostaSessao(dados, user, extra = {}) {
  return {
    usuario: { ...usuarioPublico(user), login: user.login },
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

// ── Rotas da API ─────────────────────────────────────────────
const rotas = {
  "POST /api/auth/login": async (req, res) => {
    const { login, senha } = await lerCorpo(req);
    const dados = db.ler();
    const user = dados.USERS.find((u) => u.login === String(login || "").trim());
    const generico = "Usuário ou senha incorretos.";
    if (!user || user.ativo === false) {
      auditar(dados, req, null, "login_falha", { complemento: "login inexistente ou inativo" });
      db.gravar(dados);
      throw new ErroHttp(401, generico);
    }
    if (estaBloqueado(user)) {
      auditar(dados, req, user, "login_falha", { complemento: "conta bloqueada" });
      db.gravar(dados);
      throw new ErroHttp(423, "Acesso bloqueado temporariamente por tentativas inválidas. Tente mais tarde ou procure o técnico responsável.");
    }
    if (!conferirSenha(senha || "", user.senha)) {
      const bloqueou = registrarFalhaLogin(user);
      auditar(dados, req, user, bloqueou ? "login_bloqueado" : "login_falha");
      db.gravar(dados);
      throw new ErroHttp(401, generico);
    }
    const resumo = registrarSucessoLogin(user);
    auditar(dados, req, user, "login_sucesso");
    db.gravar(dados);
    const token = criarSessao(user, req);
    enviarJson(res, 200, respostaSessao(dados, user, { acesso: resumo }), { "Set-Cookie": cookieSessao(token, req) });
  },

  "POST /api/auth/logout": async (req, res) => {
    const s = encerrarSessao(req);
    if (s) {
      const dados = db.ler();
      auditar(dados, req, dados.USERS.find((u) => u.id === s.userId), "logout");
      db.gravar(dados);
    }
    enviarJson(res, 200, { ok: true }, { "Set-Cookie": COOKIE_LIMPO });
  },

  "GET /api/auth/me": async (req, res) => {
    const dados = db.ler();
    const user = exigirSessao(req, dados);
    enviarJson(res, 200, respostaSessao(dados, user));
  },

  "POST /api/auth/termo": async (req, res) => {
    const dados = db.ler();
    const user = exigirSessao(req, dados);
    const { versao } = await lerCorpo(req);
    if (versao !== PRIVACIDADE.versaoTermo) throw new ErroHttp(409, "Versão do termo desatualizada. Recarregue a página.");
    user.termos ||= {};
    user.termos[versao] = new Date().toISOString();
    auditar(dados, req, user, "termo_aceito", { complemento: `versão ${versao}` });
    db.gravar(dados);
    enviarJson(res, 200, { ok: true });
  },

  "POST /api/auth/senha": async (req, res) => {
    const dados = db.ler();
    const user = exigirSessao(req, dados);
    const { senhaAtual, novaSenha } = await lerCorpo(req);
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
    db.gravar(dados);
    enviarJson(res, 200, { ok: true });
  },

  "POST /api/usuarios": async (req, res) => {
    const dados = db.ler();
    const admin = exigirSessao(req, dados);
    exigirTecnico(admin);
    const b = await lerCorpo(req);
    reautenticar(admin, b.senhaAdmin);
    const nome = String(b.nome || "").trim();
    const login = String(b.login || "").trim();
    if (!nome || !login) throw new ErroHttp(400, "Informe nome e login.");
    if (!/^[a-z0-9._-]{3,40}$/i.test(login)) throw new ErroHttp(400, "Login: 3 a 40 letras, números, ponto, hífen ou sublinhado.");
    if (!["tecnico", "supervisor", "estudante"].includes(b.papel)) throw new ErroHttp(400, "Papel inválido.");
    if (dados.USERS.some((u) => u.login.toLowerCase() === login.toLowerCase())) throw new ErroHttp(409, "Já existe usuário com este login.");
    if (b.papel !== "estudante" && !/^CRP \d{2}\/\d{4,6}$/.test(String(b.crp || "").trim()))
      throw new ErroHttp(400, "Informe o CRP no formato CRP 06/123456.");
    if (b.papel === "estudante" && !String(b.matricula || "").trim()) throw new ErroHttp(400, "Informe a matrícula do estudante.");
    const erro = validarPoliticaSenha(b.senhaInicial, { nome, login });
    if (erro) throw new ErroHttp(400, erro);
    const id = Math.max(...dados.USERS.filter((u) => u.papel !== "paciente").map((u) => u.id)) + 1;
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
      senha: gerarHashSenha(b.senhaInicial),
      seguranca: { trocaObrigatoria: true },
      criadoEm: new Date().toISOString(),
      criadoPorId: admin.id,
    };
    dados.USERS.push(novo);
    auditar(dados, req, admin, "usuario_criado", { registroId: id, complemento: novo.papel });
    db.gravar(dados);
    enviarJson(res, 201, { usuario: usuarioPublico(novo, { completo: true }) });
  },

  "POST /api/usuarios/:id/desbloquear": async (req, res, { id }) => {
    const dados = db.ler();
    const admin = exigirSessao(req, dados);
    exigirTecnico(admin);
    const alvo = dados.USERS.find((u) => u.id === Number(id));
    if (!alvo) throw new ErroHttp(404, "Usuário não encontrado.");
    alvo.seguranca ||= {};
    delete alvo.seguranca.bloqueadoAte;
    alvo.seguranca.tentativasFalhas = 0;
    auditar(dados, req, admin, "usuario_desbloqueado", { registroId: alvo.id });
    db.gravar(dados);
    enviarJson(res, 200, { usuario: usuarioPublico(alvo, { completo: true }) });
  },

  "POST /api/usuarios/:id/ativo": async (req, res, { id }) => {
    const dados = db.ler();
    const admin = exigirSessao(req, dados);
    exigirTecnico(admin);
    const { ativo, senhaAdmin } = await lerCorpo(req);
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
    db.gravar(dados);
    enviarJson(res, 200, { usuario: usuarioPublico(alvo, { completo: true }) });
  },

  "GET /api/data": async (req, res) => {
    const dados = db.ler();
    const user = exigirSessao(req, dados);
    enviarJson(res, 200, escopo(user, dados));
  },

  "PUT /api/data": async (req, res) => {
    const corpo = await lerCorpo(req);
    const dados = db.ler();
    const user = exigirSessao(req, dados);
    const r = aplicarAlteracoes(dados, user, corpo, { prazoRespostaTitularDias: PRIVACIDADE.prazoRespostaTitularDias });
    if (!r.ok) throw new ErroHttp(403, r.erro);
    for (const ev of r.eventos) auditar(r.db, req, user, ev.tipo, ev);
    if (r.eventos.length) db.gravar(r.db);
    enviarJson(res, 200, { ok: true, data: escopo(user, r.db) });
  },

  "POST /api/audit/evento": async (req, res) => {
    const dados = db.ler();
    const user = exigirSessao(req, dados);
    const b = await lerCorpo(req);
    if (!EVENTOS_INFORMADOS_PELO_CLIENTE.has(b.tipo)) throw new ErroHttp(400, "Tipo de evento não aceito.");
    if (b.pacienteId != null && !pacientesPermitidos(user, dados).includes(Number(b.pacienteId)))
      throw new ErroHttp(403, "Sem permissão para este paciente.");
    auditar(dados, req, user, b.tipo, {
      pacienteId: b.pacienteId != null ? Number(b.pacienteId) : null,
      registroId: b.registroId ?? null,
      complemento: b.complemento,
    });
    db.gravar(dados);
    enviarJson(res, 200, { ok: true });
  },

  "GET /api/audit": async (req, res) => {
    const dados = db.ler();
    const user = exigirSessao(req, dados);
    exigirTecnico(user);
    const q = Object.fromEntries(new URL(req.url, "http://x").searchParams);
    const verificacao = verificarTrilha(dados.AUDITORIA);
    const entradas = filtrarTrilha(dados.AUDITORIA, q);
    auditar(dados, req, user, "consulta_auditoria", { complemento: new URLSearchParams(q).toString() || "sem filtros" });
    db.gravar(dados);
    enviarJson(res, 200, { total: entradas.length, entradas: entradas.slice(0, 1000), verificacao, eventos: EVENTOS });
  },

  "GET /api/audit/csv": async (req, res) => {
    const dados = db.ler();
    const user = exigirSessao(req, dados);
    exigirTecnico(user);
    const q = Object.fromEntries(new URL(req.url, "http://x").searchParams);
    const entradas = filtrarTrilha(dados.AUDITORIA, q);
    auditar(dados, req, user, "exportacao_auditoria", { complemento: `${entradas.length} registros` });
    db.gravar(dados);
    res.writeHead(200, {
      "Content-Type": MIME[".csv"],
      "Content-Disposition": `attachment; filename="auditoria-pep-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    });
    res.end(trilhaCsv(entradas, { software: SOFTWARE, instituicao: INSTITUICAO.controlador, geradoPor: user.id }));
  },

  "GET /api/institucional": async (req, res) => {
    enviarJson(res, 200, institucional(db.ler()));
  },
};

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
  await rota.fn(req, res, rota.params);
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
  } catch (e) {
    if (!(e instanceof ErroHttp)) console.error("[PEP]", e);
    if (!res.headersSent) {
      const status = e.status || 500;
      enviarJson(res, status, { erro: e instanceof ErroHttp || e.status ? e.message : "Erro interno do servidor.", ...(e.extra || {}) }, status === 401 ? { "Set-Cookie": COOKIE_LIMPO } : {});
    }
  }
});

// ── Backup automático cifrado ────────────────────────────────
function backupAgendado() {
  try {
    const arq = criarBackup(DATA_DIR, { manterUltimos: BACKUP.manterUltimos });
    const dados = db.ler();
    registrarEvento(dados, { tipo: "backup_criado", ip: "servidor", complemento: arq.split(/[\\/]/).pop() });
    db.gravar(dados);
  } catch (e) {
    console.error("[PEP] Falha no backup automático:", e.message);
  }
}

// Só sobe o servidor quando executado diretamente (testes importam as rotas sem ouvir porta).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => {
    console.log(`PEP rodando em http://localhost:${PORT}`);
    console.log(`Dados: ${db.dbPath}`);
    db.ler(); // cria db.json a partir do seed, se necessário
    backupAgendado();
    setInterval(backupAgendado, BACKUP.intervaloHoras * 3600000).unref();
  });
}

export { server };
