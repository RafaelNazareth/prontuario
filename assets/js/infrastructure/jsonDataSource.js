// ============================================================
// infrastructure/jsonDataSource.js
// ------------------------------------------------------------
// Comunicação com o servidor do PEP (server/index.mjs).
//
//   - api()             chamada autenticada (cookie de sessão HttpOnly)
//   - carregarDataset() GET /api/data — só o que o papel pode ver
//   - gravarDataset()   PUT /api/data — agrupa gravações próximas; o
//                       servidor confere cada alteração e devolve o
//                       escopo atualizado (com autoria, horários e
//                       assinaturas carimbados por ele)
//
// Eventos disparados em window:
//   "pep:unauthorized" → sessão ausente/expirada (detail: {motivo, mensagem})
//   "pep:save-error"   → gravação recusada ou falhou (detail: mensagem)
//   "pep:saved"        → gravação concluída
//   "pep:synced"       → estado atualizado com a resposta do servidor
// ============================================================

const ESPERA_MS = 250;

// ── Modo de operação ─────────────────────────────────────────
// "servidor": há o servidor Node (npm run dev) — segurança real.
// "demo": hospedagem estática (GitHub Pages, Live Server) — a API é
// simulada no navegador por servidorDemo.js, com as mesmas regras e
// dados fictícios guardados só neste navegador.
let _modo = null;

export async function detectarModo() {
  if (_modo) return _modo;
  try {
    const r = await fetch("./api/institucional", { cache: "no-store", headers: { Accept: "application/json" } });
    const tipo = r.headers.get("content-type") || "";
    _modo = r.ok && tipo.includes("application/json") ? "servidor" : "demo";
  } catch {
    _modo = "demo";
  }
  if (_modo === "demo") console.info("[PEP] Servidor não encontrado: rodando em modo demonstração (dados só neste navegador).");
  return _modo;
}

export function emModoDemo() {
  return _modo === "demo";
}

let _pendente = null;
let _timer = null;
let _fila = Promise.resolve();
let _aoSincronizar = null;

function emitir(tipo, detail) {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(tipo, { detail }));
  }
}

/**
 * Chamada à API do PEP. Lança Error com a mensagem do servidor.
 * @param {string} caminho ex.: "/api/auth/me"
 * @param {{metodo?:string, corpo?:object, silencioso401?:boolean}} [opts]
 */
export async function api(caminho, { metodo = "GET", corpo, silencioso401 = false } = {}) {
  if ((await detectarModo()) === "demo") {
    const { atenderDemo } = await import("./servidorDemo.js");
    try {
      return await atenderDemo(caminho, metodo, corpo);
    } catch (e) {
      if (e.status === 401 && !silencioso401) emitir("pep:unauthorized", { motivo: e.motivo, mensagem: e.message });
      throw e;
    }
  }
  const r = await fetch(caminho, {
    method: metodo,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(metodo !== "GET" ? { "Content-Type": "application/json", "X-PEP-Request": "1" } : {}),
    },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && !silencioso401) emitir("pep:unauthorized", { motivo: dados.motivo, mensagem: dados.erro });
    const e = new Error(dados.erro || `Servidor respondeu ${r.status}`);
    e.status = r.status;
    e.motivo = dados.motivo;
    throw e;
  }
  return dados;
}

/** Carrega o dataset que o usuário logado pode ver. */
export function carregarDataset() {
  return api("/api/data");
}

/** Função chamada com o escopo devolvido pelo servidor após cada gravação. */
export function aoSincronizar(fn) {
  _aoSincronizar = fn;
}

/**
 * Agenda a gravação do estado. Chamadas em sequência viram uma única
 * escrita; escritas nunca se sobrepõem.
 * @param {() => object} snapshot função que devolve o estado atual
 */
export function gravarDataset(snapshot) {
  _pendente = snapshot;
  clearTimeout(_timer);
  _timer = setTimeout(descarregar, ESPERA_MS);
}

/** Grava imediatamente o que estiver pendente. */
export function descarregar() {
  clearTimeout(_timer);
  if (!_pendente) return _fila;
  const snapshot = _pendente;
  _pendente = null;
  _fila = _fila
    .then(() => api("/api/data", { metodo: "PUT", corpo: snapshot() }))
    .then((resp) => {
      emitir("pep:saved");
      // Só aplica a resposta se não houver nova alteração esperando envio.
      if (!_pendente && resp?.data && _aoSincronizar) {
        _aoSincronizar(resp.data);
        emitir("pep:synced");
      }
    })
    .catch((e) => {
      console.error("[PEP] Falha ao gravar:", e);
      emitir("pep:save-error", e.message);
      // Recarrega o estado do servidor para desfazer na tela o que não foi gravado.
      if (e.status !== 401 && _aoSincronizar)
        carregarDataset()
          .then((d) => {
            _aoSincronizar(d);
            emitir("pep:synced");
          })
          .catch(() => {});
    });
  return _fila;
}

/**
 * Ao ocultar/fechar a aba, grava na hora o que estiver aguardando.
 * (sendBeacon/keepalive não servem aqui: limitam o corpo a ~64 KB.)
 * Chamada uma vez pelo main.js no boot.
 */
export function gravarAoOcultarAba() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") descarregar();
  });
}

// ── Atalhos da API ───────────────────────────────────────────
export const servidor = {
  login: (login, senha) => api("/api/auth/login", { metodo: "POST", corpo: { login, senha }, silencioso401: true }),
  logout: () => api("/api/auth/logout", { metodo: "POST", silencioso401: true }),
  sessao: () => api("/api/auth/me", { silencioso401: true }),
  ping: () => api("/api/auth/me"),
  aceitarTermo: (versao) => api("/api/auth/termo", { metodo: "POST", corpo: { versao } }),
  trocarSenha: (senhaAtual, novaSenha) => api("/api/auth/senha", { metodo: "POST", corpo: { senhaAtual, novaSenha } }),
  institucional: () => api("/api/institucional"),
  criarUsuario: (dados) => api("/api/usuarios", { metodo: "POST", corpo: dados }),
  desbloquearUsuario: (id) => api(`/api/usuarios/${id}/desbloquear`, { metodo: "POST" }),
  alterarAtivoUsuario: (id, ativo, senhaAdmin) => api(`/api/usuarios/${id}/ativo`, { metodo: "POST", corpo: { ativo, senhaAdmin } }),
  evento: (tipo, dados = {}) => api("/api/audit/evento", { metodo: "POST", corpo: { tipo, ...dados } }),
  auditoria: (filtros = {}) => api(`/api/audit?${new URLSearchParams(filtros)}`),
  urlCsvAuditoria: (filtros = {}) => `/api/audit/csv?${new URLSearchParams(filtros)}`,
  /** Baixa a trilha em CSV (no modo demonstração o arquivo é gerado no navegador). */
  async baixarCsvAuditoria(filtros = {}) {
    const a = document.createElement("a");
    if ((await detectarModo()) === "demo") {
      const { csvAuditoriaDemo } = await import("./servidorDemo.js");
      a.href = URL.createObjectURL(new Blob([await csvAuditoriaDemo(filtros)], { type: "text/csv;charset=utf-8" }));
      a.download = `auditoria-pep-${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      a.href = `/api/audit/csv?${new URLSearchParams(filtros)}`;
      a.download = "";
    }
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
};
