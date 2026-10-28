// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { doLogout } from "./auth.js";
import { servidor } from "../infrastructure/jsonDataSource.js";
import { openProntuario } from "../pages/dashboard.js";
import { escapeHTML, getPacientesPermitidos } from "./store.js";

export function globalSearch(q) {
  if (!q || q.length < 2) return;
  const meusPacientes = getPacientesPermitidos();
  const found = meusPacientes.filter((p) =>
    p.nome.toLowerCase().includes(q.toLowerCase()),
  );
  if (found.length === 1) {
    openProntuario(found[0].id);
  } else if (found.length === 0 && q.length >= 3) {
    toast("Nenhum paciente encontrado para a busca.", "info");
  }
}

// ─────────────────────────────────────────────────────────────
// toast(msg, type?, duracao?)
// Exibe notificação temporária no canto inferior direito.
// type: 'success' | 'error' | 'warning' | 'info' (padrão)
// Estilos: .toast, .toast-success, .toast-error, .toast-warning
// ─────────────────────────────────────────────────────────────
export function toast(msg, type = "info") {
  const ICONS = {
    success: "bi-check-circle-fill",
    error: "bi-exclamation-circle-fill",
    warning: "bi-exclamation-triangle-fill",
    info: "bi-info-circle-fill",
  };
  const icon = ICONS[type] || ICONS.info;
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="bi ${icon}"></i><span>${escapeHTML(msg)}</span>`;
  document.getElementById("toast-container").appendChild(t);
  // Trigger reflow para animação de entrada funcionar
  t.getBoundingClientRect();
  t.classList.add("toast-visible");
  setTimeout(() => {
    t.classList.remove("toast-visible");
    setTimeout(() => t.remove(), 350);
  }, 3200);
}

/* ============================================================  SESSÃO: INATIVIDADE  */
// SBIS NGS1.02.20/22: a sessão é encerrada após o tempo de inatividade
// definido no servidor (server/config.mjs), com aviso antes. O servidor
// também encerra a sessão sozinho; aqui a tela acompanha o mesmo relógio
// e, enquanto há atividade, renova a sessão no servidor (no máximo 1x/min).
let _cfg = null;
let _ultimaAtividade = 0;
let _ultimoPing = 0;
let _relogio = null;
let _avisoAberto = false;

function registrarAtividade() {
  if (!_cfg || _avisoAberto) return;
  _ultimaAtividade = Date.now();
  if (Date.now() - _ultimoPing > 60000) {
    _ultimoPing = Date.now();
    servidor.ping().catch(() => {});
  }
}

function fecharAvisoInatividade() {
  document.getElementById("aviso-inatividade")?.remove();
  _avisoAberto = false;
}

function abrirAvisoInatividade(segundos) {
  _avisoAberto = true;
  const el = document.createElement("div");
  el.id = "aviso-inatividade";
  el.className = "modal-overlay";
  el.style.zIndex = "3300";
  el.innerHTML = `<div class="modal confirm-dialog" role="alertdialog" aria-labelledby="inat-title">
      <div class="confirm-icon is-warn"><i class="bi bi-hourglass-split"></i></div>
      <h3 id="inat-title">Sua sessão vai ser encerrada</h3>
      <p>Por segurança, a sessão termina após um período sem atividade. Restam <strong id="inat-seg">${segundos}</strong> segundos.</p>
      <div class="confirm-actions"><button class="btn btn-secondary" id="inat-sair">Sair agora</button><button class="btn btn-primary" id="inat-continuar">Continuar conectado</button></div>
    </div>`;
  document.body.appendChild(el);
  el.querySelector("#inat-continuar").onclick = () => {
    servidor
      .ping()
      .then(() => {
        _ultimaAtividade = _ultimoPing = Date.now();
        fecharAvisoInatividade();
      })
      .catch(() => {});
  };
  el.querySelector("#inat-sair").onclick = () => {
    fecharAvisoInatividade();
    doLogout();
  };
  el.querySelector("#inat-continuar").focus();
}

function verificarInatividade() {
  if (!_cfg) return;
  const limite = (_cfg.inatividadeMinutos || 15) * 60000;
  const aviso = (_cfg.avisoInatividadeSegundos || 60) * 1000;
  const parado = Date.now() - _ultimaAtividade;
  if (parado >= limite) {
    fecharAvisoInatividade();
    doLogout({ motivo: "inatividade", mensagem: "Sua sessão foi encerrada por inatividade. Entre novamente." });
  } else if (parado >= limite - aviso) {
    if (!_avisoAberto) abrirAvisoInatividade(Math.ceil((limite - parado) / 1000));
    const seg = document.getElementById("inat-seg");
    if (seg) seg.textContent = String(Math.ceil((limite - parado) / 1000));
  }
}

export function iniciarControleInatividade(config) {
  _cfg = config || {};
  _ultimaAtividade = _ultimoPing = Date.now();
  clearInterval(_relogio);
  _relogio = setInterval(verificarInatividade, 1000);
}

export function pararControleInatividade() {
  _cfg = null;
  clearInterval(_relogio);
  fecharAvisoInatividade();
}

// Mantido por compatibilidade com chamadas antigas.
export function resetarTempoInatividade() {
  registrarAtividade();
}

["mousemove", "keydown", "touchstart", "click", "scroll"].forEach((evtName) => {
  document.addEventListener(evtName, registrarAtividade, { passive: true });
});
