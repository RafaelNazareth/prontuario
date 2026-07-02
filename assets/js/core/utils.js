// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser, doLogout } from "./auth.js";
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

/* ============================================================  SEGURANÇA: AUTO-LOGOUT  */
export let tempoInativo;
export function resetarTempoInatividade() {
  clearTimeout(tempoInativo);
  if (currentUser) {
    tempoInativo = setTimeout(() => {
      toast("Sessão expirada. Faça login.", "error");
      doLogout();
    }, 600000);
  }
}
window.onload = resetarTempoInatividade;
document.onmousemove = resetarTempoInatividade;
document.onkeypress = resetarTempoInatividade;
document.ontouchstart = resetarTempoInatividade;
