// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { renderAcesso, renderAcessoPaciente, renderAuditoria, renderMeuProntuario } from "../pages/acesso.js";
import { renderAgenda } from "../pages/agenda.js";
import { openProntuario, renderDashboard, renderDashboardCharts } from "../pages/dashboard.js";
import { _updateNotifBadge, startNotifBadgePolling } from "../pages/notificacoes.js";
import { renderPacientes } from "../pages/pacientes.js";
import { initData, limparDados, setSessao } from "./store.js";
import { iniciarControleInatividade, pararControleInatividade, toast } from "./utils.js";
import { canAccessPage } from "./permissions.js";
import { servidor } from "../infrastructure/jsonDataSource.js";
import { exigirAceiteTermo, exigirTrocaSenha, renderPrivacidade } from "../pages/privacidade.js";

export let currentUser = null;
export let currentPage = "dashboard";
export const SESSION_KEY = "pep_fcmscsp_session";

// Usada SOMENTE pela suíte de testes automatizados (tests/), para exercitar
// core/permissions.js e os repositórios sem precisar simular um DOM completo
// (doLogin/boot dependem de elementos de formulário e de renderizar a
// aplicação inteira). Nunca chamar a partir de código de produção — currentUser
// só deve mudar via doLogin()/doLogout()/boot().
export function _setCurrentUserForTests(user) {
  currentUser = user;
}

// A sessão de verdade é o cookie HttpOnly emitido pelo servidor; aqui só
// se guarda a última página aberta (nenhum dado de identidade).
export function saveSession(_user, page) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ page: page || currentPage }));
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
    { section: "Atendimento" },
    { id: "dashboard", icon: "bi-house", label: "Visão geral" },
    { id: "pacientes", icon: "bi-people", label: "Pacientes" },
    { id: "agenda", icon: "bi-calendar3", label: "Agenda" },
    { section: "Gestão" },
    { id: "acesso", icon: "bi-person-gear", label: "Usuários e permissões" },
    { id: "acesso-pac", icon: "bi-file-earmark-person", label: "Solicitações dos titulares" },
    { id: "auditoria", icon: "bi-clock-history", label: "Auditoria" },
    { section: "Conformidade" },
    { id: "privacidade", icon: "bi-shield-lock", label: "Privacidade e normas" },
  ],
  supervisor: [
    { section: "Atendimento" },
    { id: "dashboard", icon: "bi-house", label: "Visão geral" },
    { id: "pacientes", icon: "bi-people", label: "Pacientes" },
    { id: "agenda", icon: "bi-calendar3", label: "Agenda" },
    { section: "Conformidade" },
    { id: "privacidade", icon: "bi-shield-lock", label: "Privacidade e normas" },
  ],
  estudante: [
    { section: "Atendimento" },
    { id: "dashboard", icon: "bi-house", label: "Visão geral" },
    { id: "pacientes", icon: "bi-people", label: "Meus casos" },
    { id: "agenda", icon: "bi-calendar3", label: "Minha agenda" },
    { section: "Conformidade" },
    { id: "privacidade", icon: "bi-shield-lock", label: "Privacidade e normas" },
  ],
  paciente: [
    { section: "Paciente" },
    { id: "meu-prontuario", icon: "bi-file-medical", label: "Meu prontuário" },
    { id: "privacidade", icon: "bi-shield-lock", label: "Privacidade e direitos" },
  ],
};

// Antes era uma IIFE auto-executada ao carregar o script.
// Em ES Modules evitamos efeitos colaterais no carregamento do módulo:
// esta função é chamada explicitamente pelo main.js após todos os módulos
// estarem prontos (DOMContentLoaded).
export async function boot() {
  wireLoginKeydownShortcuts();
  // Sessão existente? O servidor confere o cookie (e a inatividade).
  try {
    const sessao = await servidor.sessao();
    await entrarComSessao(sessao, loadSession()?.page);
  } catch (e) {
    if (e.motivo === "inatividade") mostrarErroLogin("Sua sessão foi encerrada por inatividade. Entre novamente.");
    else if (e instanceof TypeError)
      mostrarErroLogin("Não foi possível falar com o servidor. Inicie o sistema com npm run dev e recarregue a página.");
    else if (e.status !== 401) mostrarErroLogin(e.message);
  }
}

function mostrarErroLogin(msg) {
  const err = document.getElementById("login-error");
  if (!err) return;
  err.innerHTML = `<i class="bi bi-exclamation-circle"></i> <span></span>`;
  err.querySelector("span").textContent = msg;
  err.style.display = "flex";
}

function resetarBotaoLogin() {
  const btn = document.querySelector(".btn-login");
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-box-arrow-in-right"></i><span>Entrar</span>`;
  }
}

// Fluxo comum a login e restauração de sessão: termo de uso, troca de
// senha obrigatória, carga dos dados e abertura do app.
async function entrarComSessao(sessao, pagina) {
  setSessao(sessao);
  currentUser = sessao.usuario;
  if (sessao.termoPendente) await exigirAceiteTermo(sessao);
  if (sessao.trocaObrigatoria) await exigirTrocaSenha({ obrigatoria: true });
  await initData();
  document.getElementById("login-page").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  iniciarControleInatividade(sessao.config);
  initApp(pagina);
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

export async function doLogin() {
  const u = document.getElementById("login-user").value.trim(),
    p = document.getElementById("login-pass").value;
  const err = document.getElementById("login-error");
  const btn = document.querySelector(".btn-login");
  if (btn.disabled) return;
  btn.disabled = true;
  btn.innerHTML = `<span class="login-spinner"></span><span>Entrando...</span>`;
  err.style.display = "none";
  try {
    const sessao = await servidor.login(u, p);
    document.getElementById("login-pass").value = "";
    const startPage = sessao.usuario.papel === "paciente" ? "meu-prontuario" : "dashboard";
    await entrarComSessao(sessao, startPage);
    avisarUltimoAcesso(sessao.acesso);
  } catch (e) {
    mostrarErroLogin(e.message || "Usuário ou senha incorretos.");
  } finally {
    resetarBotaoLogin();
  }
}

// SBIS NGS1.02.15: após o login, informar último acesso e tentativas falhas.
function avisarUltimoAcesso(acesso) {
  if (!acesso) return;
  const quando = acesso.ultimoAcesso
    ? new Date(acesso.ultimoAcesso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : null;
  const falhas = acesso.falhasDesdeUltimoAcesso || 0;
  const msg =
    (quando ? `Último acesso: ${quando}.` : "Primeiro acesso a esta conta.") +
    (falhas ? ` ${falhas} ${falhas === 1 ? "tentativa" : "tentativas"} de login sem sucesso desde então.` : "");
  toast(msg, falhas ? "warning" : "info");
}

// Chamada por boot() — não no carregamento do módulo (mesmo motivo já
// documentado acima para a antiga IIFE: um módulo ES não deve ter efeitos
// colaterais na hora de ser importado, e isso também torna as funções
// puras de core/ testáveis em Node sem precisar de um DOM real).
export function wireLoginKeydownShortcuts() {
  document.getElementById("login-pass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
  document.getElementById("login-user").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
}

/**
 * Encerra a sessão no servidor e volta à tela de login.
 * @param {{motivo?:string}} [opts] motivo exibido na tela de login
 */
export async function doLogout(opts = {}) {
  pararControleInatividade();
  if (currentUser && opts.motivo !== "inatividade") await servidor.logout().catch(() => {});
  clearSession();
  currentUser = null;
  limparDados();
  document.getElementById("page-content").innerHTML = "";
  document.querySelectorAll(".modal-overlay:not(#modal-overlay)").forEach((el) => el.remove());
  document.getElementById("modal-overlay").classList.add("hidden");
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-page").classList.remove("hidden");
  resetarBotaoLogin();
  const userInput = document.getElementById("login-user");
  const passInput = document.getElementById("login-pass");
  if (userInput) userInput.value = "";
  if (passInput) passInput.value = "";
  const err = document.getElementById("login-error");
  if (err) err.style.display = "none";
  if (opts.mensagem) mostrarErroLogin(opts.mensagem);
}

/* ============================================================  APP INIT E NAVEGAÇÃO  */
export function initApp(restorePage) {
  const u = currentUser;
  const ROLE_LABELS = {
    tecnico: "Psicólogo técnico",
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
  // Rodapé da sidebar: avatar, nome e papel do usuário logado
  const sbRole = document.getElementById("sb-role");
  if (sbRole) {
    sbRole.textContent = ROLE_LABELS[u.papel] || "";
    sbRole.className = "sidebar-user-role " + (ROLE_CSS[u.papel] || "");
  }
  const footerAvatar = document.getElementById("sb-avatar-footer");
  if (footerAvatar) {
    footerAvatar.textContent = u.avatar;
    footerAvatar.style.background = u.color;
  }
  const footerName = document.getElementById("sb-name-footer");
  if (footerName) footerName.textContent = u.nome;

  buildSidebar();
  setTimeout(_updateNotifBadge, 200);
  startNotifBadgePolling();
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
  // Guarda de rota: NAV_CONFIG só decide o que aparece no menu; sem esta
  // checagem, chamar navigate('acesso') diretamente (ex.: pelo console)
  // renderizava a tela de administração para qualquer papel.
  if (!canAccessPage(page)) {
    toast("Você não tem permissão para acessar esta página.", "error");
    page = currentUser.papel === "paciente" ? "meu-prontuario" : "dashboard";
  }
  currentPage = page;
  saveSession(currentUser, page);
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.toggle("active", el.dataset.page === page));
  const T = {
    dashboard: "Visão geral",
    pacientes: currentUser.papel === "estudante" ? "Meus casos" : "Pacientes",
    agenda: currentUser.papel === "estudante" ? "Minha agenda" : "Agenda",
    acesso: "Usuários e permissões",
    "acesso-pac": "Solicitações dos titulares",
    privacidade: "Privacidade e normas",
    auditoria: "Auditoria",
    "meu-prontuario": "Meu prontuário",
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
      case "privacidade":
        pc.innerHTML = renderPrivacidade();
        break;
    }
    pc.classList.remove("page-transitioning");
    pc.classList.add("page-entering");
    setTimeout(() => pc.classList.remove("page-entering"), 300);
  }, 120);
}

