// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { renderAcesso, renderAcessoPaciente, renderAuditoria, renderMeuProntuario } from "../pages/acesso.js";
import { renderAgenda } from "../pages/agenda.js";
import { openProntuario, renderDashboard, renderDashboardCharts } from "../pages/dashboard.js";
import { _updateNotifBadge } from "../pages/notificacoes.js";
import { renderPacientes } from "../pages/pacientes.js";
import { USERS, initData, logAudit, sanitizarUsuario } from "./store.js";
import { resetarTempoInatividade, tempoInativo } from "./utils.js";

export let currentUser = null;
export let currentPage = "dashboard";
export const SESSION_KEY = "pep_fcmscsp_session";

export function saveSession(user, page) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ userId: user.id, page: page || currentPage }),
  );
}
export function loadSession() {
  try {
    const r = sessionStorage.getItem(SESSION_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function toggleMenu() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebar-overlay").classList.toggle("open");
}

export const NAV_CONFIG = {
  tecnico: [
    { section: "Principal" },
    { id: "dashboard", icon: "bi-grid-1x2-fill", label: "Dashboard" },
    { id: "pacientes", icon: "bi-people-fill", label: "Pacientes" },
    { id: "agenda", icon: "bi-calendar3", label: "Agenda" },
    { section: "Gestão" },
    { id: "acesso", icon: "bi-shield-person-fill", label: "Acesso & Usuários" },
    { id: "acesso-pac", icon: "bi-file-person-fill", label: "Acesso Paciente" },
    { id: "auditoria", icon: "bi-clock-history", label: "Trilha de Auditoria" },
  ],
  supervisor: [
    { section: "Principal" },
    { id: "dashboard", icon: "bi-grid-1x2-fill", label: "Dashboard" },
    { id: "pacientes", icon: "bi-people-fill", label: "Pacientes" },
    { id: "agenda", icon: "bi-calendar3", label: "Agenda" },
  ],
  estudante: [
    { section: "Principal" },
    { id: "dashboard", icon: "bi-grid-1x2-fill", label: "Dashboard" },
    { id: "pacientes", icon: "bi-people-fill", label: "Meus Casos" },
    { id: "agenda", icon: "bi-calendar3", label: "Minha Agenda" },
  ],
  paciente: [
    { section: "Meu Prontuário" },
    { id: "meu-prontuario", icon: "bi-file-medical-fill", label: "Prontuário" },
  ],
};

// Antes era uma IIFE auto-executada ao carregar o script.
// Em ES Modules evitamos efeitos colaterais no carregamento do módulo:
// esta função é chamada explicitamente pelo main.js após todos os módulos
// estarem prontos (DOMContentLoaded).
export function boot() {
  initData();
  const sess = loadSession();
  if (sess) {
    const user = USERS.find((u) => u.id === sess.userId);
    if (user) {
      currentUser = sanitizarUsuario(user); // sem senha em memória
      document.getElementById("login-page").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      initApp(sess.page);
    }
  }
}

export function fillLogin(u, p) {
  document.getElementById("login-user").value = u;
  document.getElementById("login-pass").value = p;
}
export function togglePw() {
  const inp = document.getElementById("login-pass"),
    ico = document.getElementById("toggle-pw-icon");
  inp.type = inp.type === "password" ? "text" : "password";
  ico.className =
    inp.type === "password"
      ? "bi bi-eye toggle-pw"
      : "bi bi-eye-slash toggle-pw";
}

export function doLogin() {
  const u = document.getElementById("login-user").value.trim(),
    p = document.getElementById("login-pass").value.trim();
  const err = document.getElementById("login-error");
  const btn = document.querySelector(".btn-login");

  // Loading state
  btn.disabled = true;
  btn.innerHTML = `<span class="login-spinner"></span><span>Entrando...</span>`;

  setTimeout(() => {
    const user = USERS.find((x) => x.login === u && x.pass === p);
    if (!user) {
      err.style.display = "flex";
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-box-arrow-in-right"></i><span>Entrar</span>`;
      return;
    }
    err.style.display = "none";
    currentUser = sanitizarUsuario(user); // nunca expõe senha em memória
    const startPage =
      user.papel === "paciente" ? "meu-prontuario" : "dashboard";
    saveSession(currentUser, startPage);
    logAudit("login", "Realizou login no sistema", "");
    document.getElementById("login-page").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    initApp(startPage);
    resetarTempoInatividade();
  }, 300); // pequeno delay para feedback visual
}

document.getElementById("login-pass").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});
document.getElementById("login-user").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});
export function doLogout() {
  clearSession();
  currentUser = null;
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-page").classList.remove("hidden");
  clearTimeout(tempoInativo);
  // Resetar botão e campos de login para evitar estado travado ao trocar usuário
  const btn = document.querySelector(".btn-login");
  if (btn) {
    btn.disabled = false;
    btn.innerHTML =
      '<i class="bi bi-box-arrow-in-right"></i><span>Entrar</span>';
  }
  const userInput = document.getElementById("login-user");
  const passInput = document.getElementById("login-pass");
  if (userInput) userInput.value = "";
  if (passInput) passInput.value = "";
  const err = document.getElementById("login-error");
  if (err) err.style.display = "none";
}

/* ============================================================  APP INIT E NAVEGAÇÃO  */
export function initApp(restorePage) {
  const u = currentUser;
  const ROLE_LABELS = {
    tecnico: "Psicólogo Técnico",
    supervisor: "Supervisor",
    estudante: "Estudante",
    paciente: "Paciente",
  };
  const ROLE_CSS = {
    tecnico: "ctx-role-tecnico",
    supervisor: "ctx-role-supervisor",
    estudante: "ctx-role-estudante",
    paciente: "ctx-role-paciente",
  };
  const ROLE_ICONS = {
    tecnico: "bi-person-badge-fill",
    supervisor: "bi-mortarboard-fill",
    estudante: "bi-book-fill",
    paciente: "bi-heart-pulse-fill",
  };

  // Context card (topo da sidebar)
  const ctxAvatar = document.getElementById("sb-avatar");
  if (ctxAvatar) {
    ctxAvatar.textContent = u.avatar;
    ctxAvatar.style.background = u.color;
  }
  const sbName = document.getElementById("sb-name");
  if (sbName)
    sbName.textContent =
      u.nome.split(" ")[0] + " " + (u.nome.split(" ")[1] || "");
  const sbRole = document.getElementById("sb-role");
  if (sbRole) {
    sbRole.textContent = ROLE_LABELS[u.papel];
    sbRole.className = "sidebar-ctx-role " + (ROLE_CSS[u.papel] || "");
    const ic = document.createElement("i");
    ic.className = "bi " + (ROLE_ICONS[u.papel] || "bi-person");
    sbRole.prepend(ic);
  }

  // Footer avatar + nome
  const footerAvatar = document.getElementById("sb-avatar-footer");
  if (footerAvatar) {
    footerAvatar.textContent = u.avatar;
    footerAvatar.style.background = u.color;
  }
  const footerName = document.getElementById("sb-name-footer");
  if (footerName) footerName.textContent = u.nome;

  buildSidebar();
  setTimeout(_updateNotifBadge, 200);
  navigate(
    restorePage || (u.papel === "paciente" ? "meu-prontuario" : "dashboard"),
  );
}

export function buildSidebar() {
  const nav = document.getElementById("sidebar-nav");
  nav.innerHTML = "";
  (NAV_CONFIG[currentUser.papel] || []).forEach((item) => {
    if (item.section) {
      const s = document.createElement("div");
      s.className = "sidebar-section";
      s.textContent = item.section;
      nav.appendChild(s);
    } else {
      const el = document.createElement("div");
      el.className = "nav-item";
      el.dataset.page = item.id;
      el.title = item.label; // tooltip nativo acessível
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.innerHTML = `<i class="bi ${item.icon}"></i><span>${item.label}</span>${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ""}`;
      el.onclick = () => navigate(item.id);
      el.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") navigate(item.id);
      };
      nav.appendChild(el);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// navigate(page)
// Roteador central do SPA. Renderiza a página no #page-content.
// Páginas: dashboard, pacientes, agenda, prontuario,
//   meu-prontuario, acesso, acesso-pac, auditoria.
// MANUTENÇÃO: para nova página, crie render<X>() + case + NAV_CONFIG.
// ─────────────────────────────────────────────────────────────
export function navigate(page) {
  if (page.startsWith("prontuario_"))
    return openProntuario(parseInt(page.split("_")[1]));
  currentPage = page;
  saveSession(currentUser, page);
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.toggle("active", el.dataset.page === page));
  const T = {
    dashboard: "Dashboard",
    pacientes: "Pacientes",
    agenda: "Agenda",
    acesso: "Acesso & Usuários",
    "acesso-pac": "Acesso do Paciente",
    auditoria: "Trilha de Auditoria",
    "meu-prontuario": "Meu Prontuário",
  };
  document.getElementById("topbar-title").textContent = T[page] || page;

  if (window.innerWidth < 1000) {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("open");
  }
  // Limpa campo de busca ao navegar
  const gs = document.getElementById("global-search");
  if (gs) gs.value = "";

  const pc = document.getElementById("page-content");
  pc.classList.add("page-transitioning");
  setTimeout(() => {
    switch (page) {
      case "dashboard":
        pc.innerHTML = renderDashboard();
        setTimeout(renderDashboardCharts, 50);
        break;
      case "pacientes":
        pc.innerHTML = renderPacientes();
        break;
      case "agenda":
        pc.innerHTML = renderAgenda();
        break;
      case "acesso":
        pc.innerHTML = renderAcesso();
        break;
      case "acesso-pac":
        pc.innerHTML = renderAcessoPaciente();
        break;
      case "auditoria":
        pc.innerHTML = renderAuditoria();
        break;
      case "meu-prontuario":
        pc.innerHTML = renderMeuProntuario();
        break;
    }
    pc.classList.remove("page-transitioning");
    pc.classList.add("page-entering");
    setTimeout(() => pc.classList.remove("page-entering"), 300);
  }, 120);
}

