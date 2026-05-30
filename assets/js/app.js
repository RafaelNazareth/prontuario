/* ============================================================  PERSISTÊNCIA E SEGURANÇA  */
const STORAGE_KEY = "pep_fcmscsp_data_v12"; // v12: melhorias de segurança e qualidade

// ATENÇÃO: btoa/atob é ofuscação Base64, NÃO criptografia real.
// Para produção, substituir por AES-GCM via SubtleCrypto ou mover para backend seguro.
function encriptar(dados) {
  return btoa(encodeURIComponent(JSON.stringify(dados)));
}
function desencriptar(dados_ofuscados) {
  return JSON.parse(decodeURIComponent(atob(dados_ofuscados)));
}

// Retorna usuário sem expor a senha em memória/sessão
function sanitizarUsuario(user) {
  const { pass, ...semSenha } = user;
  return semSenha;
}
function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(
    /[&<>'"]/g,
    (tag) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        tag
      ],
  );
}

let USERS = [];
let PACIENTES = [];
let ANAMNESES = {};
let EVOLUCOES = {};
let AGENDAMENTOS = [];
let DOCUMENTOS = {};
let AUDITORIA = [];
let ACESSO_PACIENTE = [];

function initData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const data = desencriptar(stored);
      USERS = data.USERS || [];
      PACIENTES = data.PACIENTES || [];
      ANAMNESES = data.ANAMNESES || {};
      EVOLUCOES = data.EVOLUCOES || {};
      AGENDAMENTOS = data.AGENDAMENTOS || [];
      DOCUMENTOS = data.DOCUMENTOS || {};
      AUDITORIA = data.AUDITORIA || [];
      ACESSO_PACIENTE = data.ACESSO_PACIENTE || [];
    } catch (e) {
      mockData();
    }
  } else {
    mockData();
  }
}

function mockData() {
  USERS = [
    {
      id: 1,
      login: "tecnico",
      pass: "1234",
      nome: "Dr. Carlos Mendes",
      papel: "tecnico",
      avatar: "CM",
      color: "#1b5e20",
    },
    {
      id: 2,
      login: "supervisor",
      pass: "1234",
      nome: "Profa. Ana Beatriz",
      papel: "supervisor",
      avatar: "AB",
      color: "#2e7d32",
    },
    {
      id: 3,
      login: "estudante",
      pass: "1234",
      nome: "João Silva",
      papel: "estudante",
      avatar: "JS",
      color: "#388e3c",
    },
    {
      id: 5,
      login: "estudante2",
      pass: "1234",
      nome: "Lucas Mendes",
      papel: "estudante",
      avatar: "LM",
      color: "#2e7d32",
    },
    {
      id: 6,
      login: "estudante3",
      pass: "1234",
      nome: "Mariana Costa",
      papel: "estudante",
      avatar: "MC",
      color: "#1b5e20",
    },
    {
      id: 4,
      login: "paciente",
      pass: "1234",
      nome: "Maria Fernanda",
      papel: "paciente",
      avatar: "MF",
      color: "#43a047",
    },
  ];
  PACIENTES = [
    {
      id: 1,
      nome: "Ana Lima",
      cpf: "123.456.789-00",
      nascimento: "1990-03-15",
      telefone: "(11) 98765-4321",
      email: "ana@email.com",
      estudantesIds: [3, 5, 6],
      supervisorId: 2,
      status: "ativo",
      cor: "#1b5e20",
      ini: "AL",
    },
    {
      id: 2,
      nome: "Bruno Carvalho",
      cpf: "234.567.890-11",
      nascimento: "1985-07-22",
      telefone: "(11) 91234-5678",
      email: "bruno@email.com",
      estudantesIds: [3],
      supervisorId: 2,
      status: "ativo",
      cor: "#2e7d32",
      ini: "BC",
    },
    {
      id: 3,
      nome: "Cláudia Santos",
      cpf: "345.678.901-22",
      nascimento: "1998-11-05",
      telefone: "(11) 99876-5432",
      email: "claudia@email.com",
      estudantesIds: [5, 6],
      supervisorId: 2,
      status: "ativo",
      cor: "#388e3c",
      ini: "CS",
    },
    {
      id: 4,
      nome: "Maria Fernanda",
      cpf: "456.789.012-33",
      nascimento: "1975-02-28",
      telefone: "(11) 97654-3210",
      email: "maria@email.com",
      estudantesIds: [3],
      supervisorId: 2,
      status: "ativo",
      cor: "#6d4c41",
      ini: "MF",
    },
    {
      id: 5,
      nome: "Elisa Ferreira",
      cpf: "567.890.123-44",
      nascimento: "2001-09-18",
      telefone: "(11) 96543-2109",
      email: "elisa@email.com",
      estudantesIds: [3, 6],
      supervisorId: 2,
      status: "ativo",
      cor: "#43a047",
      ini: "EF",
    },
  ];
  ANAMNESES = {
    1: {
      queixa:
        "Ansiedade generalizada com dificuldade de concentração no trabalho.",
      historia: "Início há 2 anos, promoção profissional.",
      historico_medico: "Nega histórico familiar.",
      medicamentos: "Melatonina.",
      contexto: "Casada, dois filhos.",
      hipoteses: "TAG.",
      status: "finalizada",
      rascunho: false,
    },
    2: {
      queixa: "Tristeza profunda e retraimento social há 6 meses.",
      historia: "Término de relacionamento de 5 anos.",
      historico_medico: "Episódio depressivo leve na adolescência.",
      medicamentos: "Nenhum.",
      contexto: "Solteiro.",
      hipoteses: "Depressão moderada.",
      status: "finalizada",
      rascunho: false,
    },
  };
  EVOLUCOES = {
    1: [
      {
        id: 101,
        num: 1,
        data: "2026-06-01 14:00",
        autor: "João Silva",
        papel: "estudante",
        tipo: "atendimento",
        conteudo: "Sessão de acolhimento. Paciente receptiva.",
        tags: ["acolhimento"],
      },
      {
        id: 102,
        num: 2,
        data: "2026-06-08 14:00",
        autor: "Lucas Mendes",
        papel: "estudante",
        tipo: "atendimento",
        conteudo: "Exploração da história de vida.",
        tags: ["TCC"],
      },
    ],
    2: [
      {
        id: 201,
        num: 1,
        data: "2026-06-02 10:00",
        autor: "João Silva",
        papel: "estudante",
        tipo: "atendimento",
        conteudo: "Sessão inicial.",
        tags: ["acolhimento"],
      },
    ],
  };
  AGENDAMENTOS = [
    {
      id: 1,
      pacienteId: 1,
      estudanteId: 3,
      supervisorId: 2,
      data: "2026-06-01",
      hora: "14:00",
      local: "Sala 01",
      modalidade: "presencial",
      status: "confirmado",
    },
    {
      id: 2,
      pacienteId: 2,
      estudanteId: 3,
      supervisorId: 2,
      data: "2026-06-02",
      hora: "10:00",
      local: "Sala 02",
      modalidade: "presencial",
      status: "confirmado",
    },
    {
      id: 3,
      pacienteId: 3,
      estudanteId: 5,
      supervisorId: 2,
      data: "2026-06-03",
      hora: "15:00",
      local: "Sala 01",
      modalidade: "presencial",
      status: "confirmado",
    },
  ];
  DOCUMENTOS = {
    1: [
      {
        id: "d1",
        nome: "Autorização.pdf",
        tipo: "pdf",
        tamanho: "124 KB",
        data: "2026-05-10",
        autor: "Dr. Carlos Mendes",
      },
    ],
  };
  AUDITORIA = [
    {
      id: 1,
      tipo: "cadastro",
      ator: "Dr. Carlos Mendes",
      acao: "Cadastrou paciente",
      obj: "Elisa Ferreira",
      ts: "2026-05-28 10:05",
      dot: "#388e3c",
    },
  ];
  ACESSO_PACIENTE = [
    {
      id: 1,
      pacienteId: 1,
      nome: "Ana Lima",
      status: "pendente",
      solicitacao: "2026-06-01",
      protocolo: "PROT-2026-001",
    },
    {
      id: 2,
      pacienteId: 4,
      nome: "Maria Fernanda",
      status: "liberado",
      solicitacao: "2026-06-02",
      liberacao: "2026-06-02",
      protocolo: "PROT-2026-002",
    },
  ];
  saveData();
}

function saveData() {
  localStorage.setItem(
    STORAGE_KEY,
    encriptar({
      USERS,
      PACIENTES,
      ANAMNESES,
      EVOLUCOES,
      AGENDAMENTOS,
      DOCUMENTOS,
      AUDITORIA,
      ACESSO_PACIENTE,
    }),
  );
}
function logAudit(tipo, acao, obj) {
  AUDITORIA.unshift({
    id: Date.now(),
    tipo,
    ator: currentUser.nome,
    acao,
    obj,
    ts: new Date().toLocaleString("pt-BR"),
    dot: "#1b5e20",
  });
  saveData();
}

/* ============================================================  MOTOR DE PERMISSÕES DA LGPD  */
// Esta é a função central que dita quem pode ver o quê, baseada no papel de quem fez o login.
function getPacientesPermitidos() {
  if (!currentUser) return [];
  if (currentUser.papel === "tecnico") {
    return PACIENTES; // Técnico vê todos os pacientes da clínica
  } else if (currentUser.papel === "supervisor") {
    return PACIENTES.filter((p) => p.supervisorId === currentUser.id); // Supervisor só vê quem supervisiona
  } else if (currentUser.papel === "estudante") {
    return PACIENTES.filter(
      (p) => p.estudantesIds && p.estudantesIds.includes(currentUser.id),
    ); // Estudante só vê quem atende
  } else if (currentUser.papel === "paciente") {
    return PACIENTES.filter((p) => p.id === currentUser.id); // Paciente vê apenas ele mesmo
  }
  return [];
}

/* ============================================================  SESSÃO E MENU MOBILE  */
let currentUser = null;
let currentPage = "dashboard";
const SESSION_KEY = "pep_fcmscsp_session";

function saveSession(user, page) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ userId: user.id, page: page || currentPage }),
  );
}
function loadSession() {
  try {
    const r = sessionStorage.getItem(SESSION_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function toggleMenu() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebar-overlay").classList.toggle("open");
}

const NAV_CONFIG = {
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

(function boot() {
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
})();

function fillLogin(u, p) {
  document.getElementById("login-user").value = u;
  document.getElementById("login-pass").value = p;
}
function togglePw() {
  const inp = document.getElementById("login-pass"),
    ico = document.getElementById("toggle-pw-icon");
  inp.type = inp.type === "password" ? "text" : "password";
  ico.className =
    inp.type === "password"
      ? "bi bi-eye toggle-pw"
      : "bi bi-eye-slash toggle-pw";
}

function doLogin() {
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
function doLogout() {
  clearSession();
  currentUser = null;
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-page").classList.remove("hidden");
  clearTimeout(tempoInativo);
}

/* ============================================================  APP INIT E NAVEGAÇÃO  */
function initApp(restorePage) {
  const u = currentUser;
  const sb = document.getElementById("sb-avatar");
  sb.textContent = u.avatar;
  sb.style.background = u.color;
  document.getElementById("sb-name").textContent = u.nome;
  const RL = {
    tecnico: "Psicólogo Técnico",
    supervisor: "Supervisor",
    estudante: "Estudante",
    paciente: "Paciente",
  };
  document.getElementById("sb-role").textContent = RL[u.papel];
  buildSidebar();
  navigate(
    restorePage || (u.papel === "paciente" ? "meu-prontuario" : "dashboard"),
  );
}

function buildSidebar() {
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
      el.innerHTML = `<i class="bi ${item.icon}"></i><span>${item.label}</span>${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ""}`;
      el.onclick = () => navigate(item.id);
      nav.appendChild(el);
    }
  });
}

function navigate(page) {
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

function openProntuario(pid) {
  const meusPacientesIds = getPacientesPermitidos().map((p) => p.id);
  if (!meusPacientesIds.includes(pid)) {
    toast("Acesso negado. Paciente não alocado ao seu usuário.", "error");
    return navigate("pacientes");
  }

  const p = PACIENTES.find((x) => x.id === pid);
  if (!p) return navigate("pacientes");
  document.getElementById("topbar-title").textContent =
    `Prontuário · ${escapeHTML(p.nome)}`;
  saveSession(currentUser, `prontuario_${pid}`);
  document.getElementById("page-content").innerHTML = renderProntuario(pid);
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
}

function calcIdade(nasc) {
  const hoje = new Date();
  const nascDate = new Date(nasc);
  let idade = hoje.getFullYear() - nascDate.getFullYear();
  const mDiff = hoje.getMonth() - nascDate.getMonth();
  if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < nascDate.getDate())) {
    idade--;
  }
  return idade;
}

/* ============================================================  DASHBOARD  */

// Helpers internos do dashboard
function _dashFmtData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}
function _dashFmtDataLonga(iso) {
  if (!iso) return "—";
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${meses[parseInt(m) - 1]}`;
}
function _dashDiaSemana(iso) {
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return dias[new Date(iso + "T12:00:00").getDay()];
}
function _dashUrgenciaCor(n) {
  if (n === 0) return { bg: "#dcfce7", text: "#14532d", label: "Zerado" };
  if (n <= 1) return { bg: "#fef3c7", text: "#78350f", label: "Atenção" };
  return { bg: "#fee2e2", text: "#7f1d1d", label: "Crítico" };
}

function renderDashboard() {
  const role = currentUser.papel;
  const hoje = new Date().toISOString().split("T")[0];
  const hojeDate = new Date();
  const meusPacientes = getPacientesPermitidos();
  const listaAtivos = meusPacientes.filter((p) => p.status === "ativo");
  const meusPacientesIds = meusPacientes.map((p) => p.id);
  const meusAgs = AGENDAMENTOS.filter((a) =>
    meusPacientesIds.includes(a.pacienteId),
  );
  const agsHoje = meusAgs
    .filter((a) => a.data === hoje)
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const agsFuturos = meusAgs
    .filter((a) => a.data > hoje)
    .sort(
      (a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora),
    );
  const proximos7 = [...agsHoje, ...agsFuturos].slice(0, 7);

  let totalEvs = 0;
  meusPacientesIds.forEach((pid) => {
    totalEvs += (EVOLUCOES[pid] || []).length;
  });

  const anamnesesFeitas = listaAtivos.filter(
    (p) => ANAMNESES[p.id] && ANAMNESES[p.id].status === "finalizada",
  ).length;
  const anamnesesPendentes = listaAtivos.length - anamnesesFeitas;
  const taxaConformidade =
    listaAtivos.length > 0
      ? Math.round((anamnesesFeitas / listaAtivos.length) * 100)
      : 100;

  // ── DASHBOARD GERENCIAL (técnico / supervisor) ────────────────────────────
  if (role === "tecnico" || role === "supervisor") {
    const estudantes = USERS.filter((u) => u.papel === "estudante");
    const acessosPendentes = ACESSO_PACIENTE.filter(
      (a) => a.status === "pendente",
    ).length;
    const estSemCaso = estudantes.filter(
      (e) =>
        !PACIENTES.some(
          (p) => p.estudantesIds && p.estudantesIds.includes(e.id),
        ),
    ).length;
    const totalPacientes =
      role === "tecnico" ? PACIENTES.length : meusPacientes.length;
    const inativos = meusPacientes.filter((p) => p.status === "inativo").length;

    // Índice de saúde operacional (score 0–100)
    let saudeScore = 100;
    if (anamnesesPendentes > 0)
      saudeScore -= Math.min(30, anamnesesPendentes * 10);
    if (acessosPendentes > 0 && role === "tecnico")
      saudeScore -= Math.min(20, acessosPendentes * 7);
    if (estSemCaso > 0) saudeScore -= Math.min(20, estSemCaso * 10);
    saudeScore = Math.max(0, saudeScore);
    const saudeCor =
      saudeScore >= 80 ? "#2e7d32" : saudeScore >= 50 ? "#f59e0b" : "#dc2626";
    const saudeLabel =
      saudeScore >= 80 ? "Regular" : saudeScore >= 50 ? "Atenção" : "Crítico";

    // Atividade recente de evoluções (últimas 4 semanas por semana)
    const semanaLabels = [];
    const semanaData = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(hojeDate);
      d.setDate(d.getDate() - i * 7);
      const semStr = d.toISOString().split("T")[0].substring(0, 7);
      semanaLabels.push(`S-${4 - i}`);
      let count = 0;
      Object.values(EVOLUCOES).forEach((evs) => {
        evs.forEach((e) => {
          if (e.data && e.data.startsWith(semStr)) count++;
        });
      });
      semanaData.push(count);
    }
    // Adiciona semana atual com dado real
    semanaLabels[3] = "Esta sem.";

    // Distribuição de carga dos estudantes
    const cargaLabels = estudantes.map((e) => e.nome.split(" ")[0]);
    const cargaData = estudantes.map(
      (e) =>
        PACIENTES.filter(
          (p) => p.estudantesIds && p.estudantesIds.includes(e.id),
        ).length,
    );
    const evsPorEstudante = estudantes.map((e) => {
      let n = 0;
      PACIENTES.filter(
        (p) => p.estudantesIds && p.estudantesIds.includes(e.id),
      ).forEach((p) => {
        n += (EVOLUCOES[p.id] || []).length;
      });
      return n;
    });

    // Alertas críticos
    const alertas = [];
    if (role === "tecnico" && acessosPendentes > 0)
      alertas.push({
        nivel: "critico",
        icon: "bi-shield-x-fill",
        titulo: `${acessosPendentes} solicitação(ões) de acesso pendente`,
        desc: "Pacientes aguardam liberação de prontuário digital.",
        acao: "navigate('acesso-pac')",
        label: "Resolver agora",
      });
    if (anamnesesPendentes > 0)
      alertas.push({
        nivel: "atencao",
        icon: "bi-clipboard-x-fill",
        titulo: `${anamnesesPendentes} caso(s) sem anamnese finalizada`,
        desc: "Casos ativos sem anamnese são irregulares perante o CRP.",
        acao: null,
        label: null,
      });
    if (estSemCaso > 0)
      alertas.push({
        nivel: "atencao",
        icon: "bi-person-slash",
        titulo: `${estSemCaso} estudante(s) sem caso alocado`,
        desc: "Alocar estudantes garante a carga horária obrigatória.",
        acao: "navigate('pacientes')",
        label: "Alocar agora",
      });
    if (alertas.length === 0)
      alertas.push({
        nivel: "ok",
        icon: "bi-check-circle-fill",
        titulo: "Operação 100% regular",
        desc: "Nenhuma pendência crítica detectada no momento.",
        acao: null,
        label: null,
      });

    const alertasHtml = alertas
      .map((a) => {
        const cores = {
          critico: {
            bg: "#fef2f2",
            bord: "#dc2626",
            icon: "#dc2626",
            tituloCor: "#7f1d1d",
          },
          atencao: {
            bg: "#fffbeb",
            bord: "#f59e0b",
            icon: "#d97706",
            tituloCor: "#78350f",
          },
          ok: {
            bg: "#f0fdf4",
            bord: "#22c55e",
            icon: "#16a34a",
            tituloCor: "#14532d",
          },
        };
        const c = cores[a.nivel];
        return `<div class="dash-alert" style="background:${c.bg};border-left:3px solid ${c.bord}">
        <i class="bi ${a.icon}" style="color:${c.icon};font-size:15px;flex-shrink:0;margin-top:1px"></i>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700;color:${c.tituloCor};margin-bottom:2px">${a.titulo}</div>
          <div style="font-size:11px;color:var(--text2);line-height:1.5">${a.desc}</div>
          ${a.acao ? `<button class="dash-alert-btn" onclick="${a.acao}">${a.label} <i class="bi bi-arrow-right"></i></button>` : ""}
        </div>
      </div>`;
      })
      .join("");

    // Lista de pacientes sem evolução recente (>14 dias)
    const semEvolucao = listaAtivos
      .filter((p) => {
        const evs = EVOLUCOES[p.id] || [];
        if (evs.length === 0) return true;
        const ultima = evs[evs.length - 1].data || "";
        const diffDias =
          (hojeDate - new Date(ultima.substring(0, 10) + "T12:00:00")) /
          86400000;
        return diffDias > 14;
      })
      .slice(0, 5);

    return `
    <div class="dash-welcome-bar">
      <div>
        <div class="dash-welcome-title">Bom dia, ${escapeHTML(currentUser.nome.split(" ")[0])} <span style="font-size:18px">👋</span></div>
        <div class="dash-welcome-sub">Visão operacional do Serviço-Escola · ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</div>
      </div>
      <div class="dash-health-pill" style="border-color:${saudeCor}20;background:${saudeCor}10">
        <div class="dash-health-ring" style="--score:${saudeScore};--cor:${saudeCor}">
          <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" stroke-width="3.2"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="${saudeCor}" stroke-width="3.2" stroke-dasharray="${saudeScore} ${100 - saudeScore}" stroke-dashoffset="25" stroke-linecap="round"/></svg>
          <span style="color:${saudeCor}">${saudeScore}</span>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:${saudeCor}">${saudeLabel}</div>
          <div style="font-size:10px;color:var(--text3)">Saúde operacional</div>
        </div>
      </div>
    </div>

    <div class="stats-grid" style="margin-bottom:20px">
      <div class="dash-kpi-card">
        <div class="dash-kpi-icon" style="background:var(--sc-green-pale);color:var(--sc-green-dark)"><i class="bi bi-people-fill"></i></div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-value">${listaAtivos.length}<span class="dash-kpi-sub">/ ${totalPacientes} total</span></div>
          <div class="dash-kpi-label">Pacientes Ativos</div>
        </div>
        <div class="dash-kpi-trend ${inativos > 0 ? "trend-warn" : "trend-ok"}">
          <i class="bi ${inativos > 0 ? "bi-arrow-down-short" : "bi-check2"}"></i> ${inativos > 0 ? inativos + " inativo(s)" : "Todos ativos"}
        </div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-icon" style="background:${taxaConformidade < 80 ? "#fef3c7" : "#dcfce7"};color:${taxaConformidade < 80 ? "#92400e" : "#14532d"}"><i class="bi bi-shield-check"></i></div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-value">${taxaConformidade}%<span class="dash-kpi-sub">${anamnesesFeitas}/${listaAtivos.length} ok</span></div>
          <div class="dash-kpi-label">Conformidade CRP</div>
          <div class="dash-kpi-bar"><div style="width:${taxaConformidade}%;background:${taxaConformidade < 80 ? "#f59e0b" : "#2e7d32"}"></div></div>
        </div>
        <div class="dash-kpi-trend ${taxaConformidade < 80 ? "trend-warn" : "trend-ok"}">
          <i class="bi ${taxaConformidade < 80 ? "bi-exclamation-circle" : "bi-check2"}"></i> ${taxaConformidade < 80 ? anamnesesPendentes + " pendente(s)" : "Regular"}
        </div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-icon" style="background:#dbeafe;color:#1e40af"><i class="bi bi-person-workspace"></i></div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-value">${estudantes.length - estSemCaso}<span class="dash-kpi-sub">/ ${estudantes.length} estudantes</span></div>
          <div class="dash-kpi-label">Estudantes Alocados</div>
          <div class="dash-kpi-bar"><div style="width:${estudantes.length > 0 ? Math.round(((estudantes.length - estSemCaso) / estudantes.length) * 100) : 100}%;background:#3b82f6"></div></div>
        </div>
        <div class="dash-kpi-trend ${estSemCaso > 0 ? "trend-warn" : "trend-ok"}">
          <i class="bi ${estSemCaso > 0 ? "bi-person-slash" : "bi-check2"}"></i> ${estSemCaso > 0 ? estSemCaso + " ocioso(s)" : "Todos alocados"}
        </div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-icon" style="background:#ede9fe;color:#6d28d9"><i class="bi bi-journal-medical"></i></div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-value">${totalEvs}<span class="dash-kpi-sub">evoluções</span></div>
          <div class="dash-kpi-label">Volume Clínico Total</div>
        </div>
        <div class="dash-kpi-trend trend-ok">
          <i class="bi bi-graph-up-arrow"></i> ${listaAtivos.length > 0 ? (totalEvs / listaAtivos.length).toFixed(1) + " / caso" : "—"}
        </div>
      </div>
    </div>

    <div class="dash-row-3" style="margin-bottom:20px">
      <div class="card" style="flex:2;min-width:0">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-bar-chart-line-fill" style="color:var(--sc-green)"></i> Carga de Casos por Estudante</span>
          <span style="font-size:11px;color:var(--text3)">casos alocados × evoluções redigidas</span>
        </div>
        <div class="card-body" style="padding-top:10px"><div class="chart-container" style="height:220px"><canvas id="chartCargaEstudante"></canvas></div></div>
      </div>
      <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:16px">
        <div class="card" style="flex:1">
          <div class="card-header"><span class="card-title"><i class="bi bi-pie-chart-fill" style="color:#6d28d9"></i> Anamneses</span></div>
          <div class="card-body" style="padding:10px"><div class="chart-container" style="height:130px"><canvas id="chartAnamneses"></canvas></div></div>
        </div>
        <div class="card" style="flex:1">
          <div class="card-header"><span class="card-title"><i class="bi bi-calendar-event" style="color:var(--sc-green)"></i> Agenda Hoje</span></div>
          <div class="card-body" style="padding:10px 14px">
            ${
              agsHoje.length === 0
                ? `<div style="text-align:center;padding:14px 0;font-size:12px;color:var(--text3)"><i class="bi bi-calendar-x" style="font-size:22px;display:block;margin-bottom:6px"></i>Nenhum atendimento hoje</div>`
                : agsHoje
                    .map((ag) => {
                      const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
                      return `<div class="dash-today-item" onclick="openProntuario(${ag.pacienteId})">
                    <div class="dash-today-hora">${ag.hora}</div>
                    <div class="dash-today-dot" style="background:${pac?.cor || "#888"}"></div>
                    <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(pac?.nome || "—")}</div><div style="font-size:10px;color:var(--text3)">${escapeHTML(ag.local)}</div></div>
                  </div>`;
                    })
                    .join("")
            }
          </div>
        </div>
      </div>
    </div>

    <div class="dash-row-2" style="margin-bottom:20px">
      <div class="card" style="flex:1;min-width:0">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-lightning-charge-fill" style="color:#f59e0b"></i> Pendências & Alertas</span>
          <span class="dash-badge-count" style="background:${alertas[0].nivel === "ok" ? "#dcfce7" : "#fef3c7"};color:${alertas[0].nivel === "ok" ? "#14532d" : "#78350f"}">${alertas.filter((a) => a.nivel !== "ok").length || "✓"}</span>
        </div>
        <div class="card-body" style="padding:12px;display:flex;flex-direction:column;gap:8px">${alertasHtml}</div>
      </div>
      <div class="card" style="flex:1.4;min-width:0">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-clock-history" style="color:var(--sc-green)"></i> Casos sem Evolução Recente <span style="font-size:11px;color:var(--text3);font-weight:400">(+14 dias)</span></span>
        </div>
        <div class="card-body" style="padding:0">
          ${
            semEvolucao.length === 0
              ? `<div class="empty-state" style="padding:28px 20px"><i class="bi bi-check-all" style="color:var(--sc-green);font-size:32px"></i><p style="margin-top:8px;font-weight:600">Todos os casos têm evolução recente</p></div>`
              : `<table style="min-width:auto"><thead><tr><th>Paciente</th><th>Última evolução</th><th>Estudante(s)</th><th></th></tr></thead><tbody>
              ${semEvolucao
                .map((p) => {
                  const evs = EVOLUCOES[p.id] || [];
                  const ultima =
                    evs.length > 0
                      ? evs[evs.length - 1].data?.substring(0, 10)
                      : null;
                  const diffDias = ultima
                    ? Math.round(
                        (hojeDate - new Date(ultima + "T12:00:00")) / 86400000,
                      )
                    : null;
                  const ests = (p.estudantesIds || [])
                    .map(
                      (id) =>
                        USERS.find((u) => u.id === id)?.nome?.split(" ")[0],
                    )
                    .filter(Boolean)
                    .join(", ");
                  const urg = _dashUrgenciaCor(
                    diffDias !== null ? (diffDias > 30 ? 2 : 1) : 2,
                  );
                  return `<tr>
                  <td><div style="display:flex;align-items:center;gap:8px"><div class="patient-avatar" style="background:${p.cor};width:26px;height:26px;font-size:10px">${escapeHTML(p.ini)}</div><span style="font-weight:600">${escapeHTML(p.nome)}</span></div></td>
                  <td><span style="background:${urg.bg};color:${urg.text};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">${ultima ? _dashFmtDataLonga(ultima) + " (" + diffDias + "d)" : "Nunca"}</span></td>
                  <td style="font-size:11px;color:var(--text2)">${ests || "—"}</td>
                  <td><button class="btn btn-secondary btn-sm" onclick="openProntuario(${p.id})"><i class="bi bi-file-medical"></i></button></td>
                </tr>`;
                })
                .join("")}
            </tbody></table>`
          }
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:0">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-calendar-week" style="color:var(--sc-green)"></i> Próximos Atendimentos</span>
        <button class="btn btn-secondary btn-sm" onclick="navigate('agenda')"><i class="bi bi-calendar3"></i> Ver agenda completa</button>
      </div>
      <div class="card-body" style="padding:0">
        ${
          proximos7.length === 0
            ? `<div class="empty-state" style="padding:28px"><i class="bi bi-calendar-x" style="font-size:28px;color:var(--text3)"></i><p style="margin-top:8px;color:var(--text3)">Nenhum atendimento futuro agendado</p></div>`
            : `<div class="table-responsive"><table style="min-width:auto"><thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Local</th><th>Estudante</th><th>Status</th></tr></thead><tbody>
          ${proximos7
            .map((ag) => {
              const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
              const est = USERS.find((u) => u.id === ag.estudanteId);
              const isHoje = ag.data === hoje;
              return `<tr style="${isHoje ? "background:#f0fdf4" : ""}">
              <td><div style="font-weight:${isHoje ? "700" : "400"};color:${isHoje ? "var(--sc-green-dark)" : "inherit"}">${isHoje ? "<span style='font-size:10px;background:var(--sc-green);color:#fff;border-radius:3px;padding:1px 5px;margin-right:4px'>HOJE</span>" : ""}${_dashFmtDataLonga(ag.data)}</div><div style="font-size:10px;color:var(--text3)">${_dashDiaSemana(ag.data)}</div></td>
              <td style="font-weight:600">${ag.hora}</td>
              <td><div style="display:flex;align-items:center;gap:8px"><div class="patient-avatar" style="background:${pac?.cor || "#888"};width:26px;height:26px;font-size:10px">${escapeHTML(pac?.ini || "?")}</div><button class="dash-link-btn" onclick="openProntuario(${ag.pacienteId})">${escapeHTML(pac?.nome || "—")}</button></div></td>
              <td style="font-size:12px">${escapeHTML(ag.local)}</td>
              <td style="font-size:12px">${escapeHTML(est?.nome?.split(" ")[0] || "—")}</td>
              <td><span class="badge ${ag.status === "confirmado" ? "badge-green" : "badge-amber"}">${ag.status}</span></td>
            </tr>`;
            })
            .join("")}
          </tbody></table></div>`
        }
      </div>
    </div>`;
  }

  // ── DASHBOARD ESTUDANTE ───────────────────────────────────────────────────
  else {
    const meusCasos = listaAtivos;
    const anamnesesOk = meusCasos.filter(
      (p) => ANAMNESES[p.id]?.status === "finalizada",
    ).length;
    const evsPorCaso = meusCasos.map((p) => ({
      p,
      n: (EVOLUCOES[p.id] || []).length,
    }));
    const proximaConsulta = proximos7[0];

    // Dias até próxima consulta
    let diasProxima = null;
    if (proximaConsulta) {
      diasProxima = Math.max(
        0,
        Math.round(
          (new Date(proximaConsulta.data + "T12:00:00") - hojeDate) / 86400000,
        ),
      );
    }

    // Alertas pessoais
    const alertas = [];
    if (anamnesesPendentes > 0)
      alertas.push({
        nivel: "atencao",
        icon: "bi-clipboard-x-fill",
        titulo: `${anamnesesPendentes} caso(s) com anamnese pendente`,
        desc: "Finalize a anamnese o quanto antes. Exigência do CRP.",
        acao: "navigate('pacientes')",
        label: "Ver casos",
      });
    meusCasos.forEach((p) => {
      const evs = EVOLUCOES[p.id] || [];
      if (evs.length === 0) {
        alertas.push({
          nivel: "atencao",
          icon: "bi-journal-x",
          titulo: `Sem evoluções: ${p.nome}`,
          desc: "Este caso ainda não possui nenhuma evolução registrada.",
          acao: `openProntuario(${p.id})`,
          label: "Registrar",
        });
      }
    });
    if (alertas.length === 0)
      alertas.push({
        nivel: "ok",
        icon: "bi-patch-check-fill",
        titulo: "Tudo em dia! Continue assim.",
        desc: "Todos os seus casos estão com documentação regular.",
        acao: null,
        label: null,
      });

    const alertasHtml = alertas
      .slice(0, 3)
      .map((a) => {
        const cores = {
          atencao: {
            bg: "#fffbeb",
            bord: "#f59e0b",
            icon: "#d97706",
            tituloCor: "#78350f",
          },
          ok: {
            bg: "#f0fdf4",
            bord: "#22c55e",
            icon: "#16a34a",
            tituloCor: "#14532d",
          },
        };
        const c = cores[a.nivel];
        return `<div class="dash-alert" style="background:${c.bg};border-left:3px solid ${c.bord}">
        <i class="bi ${a.icon}" style="color:${c.icon};font-size:15px;flex-shrink:0;margin-top:1px"></i>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700;color:${c.tituloCor};margin-bottom:2px">${a.titulo}</div>
          <div style="font-size:11px;color:var(--text2)">${a.desc}</div>
          ${a.acao ? `<button class="dash-alert-btn" onclick="${a.acao}">${a.label} <i class="bi bi-arrow-right"></i></button>` : ""}
        </div>
      </div>`;
      })
      .join("");

    return `
    <div class="dash-welcome-bar">
      <div>
        <div class="dash-welcome-title">Olá, ${escapeHTML(currentUser.nome.split(" ")[0])} <span style="font-size:18px">🩺</span></div>
        <div class="dash-welcome-sub">Seus casos clínicos · ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</div>
      </div>
      ${
        proximaConsulta
          ? `<div class="dash-proxima-pill">
        <i class="bi bi-calendar-check" style="color:var(--sc-green)"></i>
        <div>
          <div style="font-size:11px;color:var(--text3)">Próximo atendimento</div>
          <div style="font-size:13px;font-weight:700;color:var(--sc-green-dark)">${diasProxima === 0 ? "Hoje" : "Em " + diasProxima + "d"} · ${proximaConsulta.hora} · ${escapeHTML(PACIENTES.find((p) => p.id === proximaConsulta.pacienteId)?.nome || "—")}</div>
        </div>
      </div>`
          : ""
      }
    </div>

    <div class="stats-grid" style="margin-bottom:20px">
      <div class="dash-kpi-card">
        <div class="dash-kpi-icon" style="background:var(--sc-green-pale);color:var(--sc-green-dark)"><i class="bi bi-folder2-open"></i></div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-value">${meusCasos.length}</div>
          <div class="dash-kpi-label">Meus Pacientes</div>
        </div>
        <div class="dash-kpi-trend trend-ok"><i class="bi bi-person-check"></i> Todos ativos</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-icon" style="background:${anamnesesPendentes > 0 ? "#fef3c7" : "#dcfce7"};color:${anamnesesPendentes > 0 ? "#92400e" : "#14532d"}"><i class="bi bi-file-earmark-medical"></i></div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-value">${anamnesesOk}<span class="dash-kpi-sub">/ ${meusCasos.length}</span></div>
          <div class="dash-kpi-label">Anamneses Finalizadas</div>
          <div class="dash-kpi-bar"><div style="width:${meusCasos.length > 0 ? Math.round((anamnesesOk / meusCasos.length) * 100) : 100}%;background:${anamnesesPendentes > 0 ? "#f59e0b" : "#2e7d32"}"></div></div>
        </div>
        <div class="dash-kpi-trend ${anamnesesPendentes > 0 ? "trend-warn" : "trend-ok"}"><i class="bi ${anamnesesPendentes > 0 ? "bi-exclamation-circle" : "bi-check2"}"></i> ${anamnesesPendentes > 0 ? anamnesesPendentes + " pendente(s)" : "OK"}</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-icon" style="background:#dbeafe;color:#1e40af"><i class="bi bi-journal-text"></i></div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-value">${totalEvs}</div>
          <div class="dash-kpi-label">Evoluções Redigidas</div>
        </div>
        <div class="dash-kpi-trend trend-ok"><i class="bi bi-graph-up"></i> ${meusCasos.length > 0 ? (totalEvs / meusCasos.length).toFixed(1) + " / caso" : "—"}</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-icon" style="background:#ede9fe;color:#6d28d9"><i class="bi bi-calendar-event"></i></div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-value">${meusAgs.filter((a) => a.data >= hoje).length}</div>
          <div class="dash-kpi-label">Consultas Futuras</div>
        </div>
        <div class="dash-kpi-trend ${agsHoje.length > 0 ? "trend-today" : "trend-ok"}"><i class="bi bi-calendar-day"></i> ${agsHoje.length > 0 ? agsHoje.length + " hoje" : "Nenhuma hoje"}</div>
      </div>
    </div>

    <div class="dash-row-2" style="margin-bottom:20px">
      <div class="card" style="flex:1.3;min-width:0">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-calendar3" style="color:var(--sc-green)"></i> Agenda da Semana</span>
          <button class="btn btn-secondary btn-sm" onclick="navigate('agenda')">Ver tudo</button>
        </div>
        <div class="card-body" style="padding:0">
          ${
            proximos7.length === 0
              ? `<div class="empty-state" style="padding:28px"><i class="bi bi-calendar-x" style="font-size:28px;color:var(--text3)"></i><p style="margin-top:8px;color:var(--text3)">Nenhum atendimento futuro agendado</p></div>`
              : `<div class="table-responsive"><table style="min-width:auto"><thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Local</th><th>Status</th></tr></thead><tbody>
            ${proximos7
              .map((ag) => {
                const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
                const isHoje = ag.data === hoje;
                return `<tr style="${isHoje ? "background:#f0fdf4" : ""}">
                <td><div style="font-weight:${isHoje ? "700" : "400"};color:${isHoje ? "var(--sc-green-dark)" : "inherit"};white-space:nowrap">${isHoje ? "<span style='font-size:10px;background:var(--sc-green);color:#fff;border-radius:3px;padding:1px 5px;margin-right:4px'>HOJE</span>" : ""}${_dashFmtDataLonga(ag.data)}</div></td>
                <td style="font-weight:600">${ag.hora}</td>
                <td><button class="dash-link-btn" onclick="openProntuario(${ag.pacienteId})">${escapeHTML(pac?.nome || "—")}</button></td>
                <td style="font-size:12px">${escapeHTML(ag.local)}</td>
                <td><span class="badge ${ag.status === "confirmado" ? "badge-green" : "badge-amber"}">${ag.status}</span></td>
              </tr>`;
              })
              .join("")}
            </tbody></table></div>`
          }
        </div>
      </div>
      <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:16px">
        <div class="card" style="flex:1">
          <div class="card-header"><span class="card-title"><i class="bi bi-lightning-charge-fill" style="color:#f59e0b"></i> Suas Pendências</span></div>
          <div class="card-body" style="padding:12px;display:flex;flex-direction:column;gap:8px">${alertasHtml}</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:0">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-people-fill" style="color:var(--sc-green)"></i> Meus Casos Clínicos</span>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-responsive"><table style="min-width:auto"><thead><tr><th>Paciente</th><th>Anamnese</th><th>Evoluções</th><th>Últ. atendimento</th><th>Situação</th><th></th></tr></thead><tbody>
        ${
          meusCasos.length === 0
            ? `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text3)">Nenhum caso alocado.</td></tr>`
            : meusCasos
                .map((p) => {
                  const evs = EVOLUCOES[p.id] || [];
                  const ultimaEv =
                    evs.length > 0
                      ? evs[evs.length - 1].data?.substring(0, 10)
                      : null;
                  const diffDias = ultimaEv
                    ? Math.round(
                        (hojeDate - new Date(ultimaEv + "T12:00:00")) /
                          86400000,
                      )
                    : null;
                  const anam = ANAMNESES[p.id];
                  const anamOk = anam?.status === "finalizada";
                  const urg =
                    diffDias === null
                      ? {
                          bg: "#fee2e2",
                          text: "#7f1d1d",
                          label: "Sem registro",
                        }
                      : diffDias > 21
                        ? {
                            bg: "#fee2e2",
                            text: "#7f1d1d",
                            label: diffDias + "d atrás",
                          }
                        : diffDias > 7
                          ? {
                              bg: "#fef3c7",
                              text: "#78350f",
                              label: diffDias + "d atrás",
                            }
                          : {
                              bg: "#dcfce7",
                              text: "#14532d",
                              label:
                                diffDias === 0 ? "Hoje" : diffDias + "d atrás",
                            };
                  return `<tr>
                <td><div style="display:flex;align-items:center;gap:8px"><div class="patient-avatar" style="background:${p.cor};width:28px;height:28px;font-size:11px">${escapeHTML(p.ini)}</div><div><div style="font-weight:600;font-size:13px">${escapeHTML(p.nome)}</div><div style="font-size:10px;color:var(--text3)">${calcIdade(p.nascimento)} anos</div></div></div></td>
                <td>${
                  anamOk
                    ? `<span class="badge badge-green"><i class="bi bi-check-lg"></i> Finalizada</span>`
                    : `<span class="badge badge-amber"><i class="bi bi-clock"></i> Pendente</span>`
                }</td>
                <td style="font-weight:600">${evs.length}</td>
                <td><span style="background:${urg.bg};color:${urg.text};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">${ultimaEv ? _dashFmtDataLonga(ultimaEv) : "—"} <span style="opacity:.7">${urg.label}</span></span></td>
                <td><span class="badge ${p.status === "ativo" ? "badge-green" : "badge-gray"}">${p.status}</span></td>
                <td><button class="btn btn-secondary btn-sm" onclick="openProntuario(${p.id})"><i class="bi bi-file-medical"></i> Abrir</button></td>
              </tr>`;
                })
                .join("")
        }
        </tbody></table></div>
      </div>
    </div>`;
  }
}

let _chartInsts = {};
function _destroyChart(id) {
  if (_chartInsts[id]) {
    _chartInsts[id].destroy();
    delete _chartInsts[id];
  }
}

let chartTendenciaInst = null;
let chartEvolucoesInst = null;
let chartCasosEstudanteInst = null;
function renderDashboardCharts() {
  const role = currentUser.papel;
  const meusPacientes = getPacientesPermitidos();
  const listaAtivos = meusPacientes.filter((p) => p.status === "ativo");

  const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: {} },
    },
  };

  // ── Gráfico gerencial: Carga por estudante (grouped bar) ─────────────────
  const ctxCarga = document.getElementById("chartCargaEstudante");
  if (ctxCarga) {
    _destroyChart("carga");
    const estudantes = USERS.filter((u) => u.papel === "estudante");
    const labels = estudantes.map((e) => e.nome.split(" ")[0]);
    const dataCasos = estudantes.map(
      (e) =>
        PACIENTES.filter(
          (p) => p.estudantesIds && p.estudantesIds.includes(e.id),
        ).length,
    );
    const dataEvs = estudantes.map((e) => {
      let n = 0;
      PACIENTES.filter(
        (p) => p.estudantesIds && p.estudantesIds.includes(e.id),
      ).forEach((p) => {
        n += (EVOLUCOES[p.id] || []).length;
      });
      return n;
    });
    _chartInsts["carga"] = new Chart(ctxCarga, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Casos",
            data: dataCasos,
            backgroundColor: "#2e7d32",
            borderRadius: 5,
            barPercentage: 0.45,
          },
          {
            label: "Evoluções",
            data: dataEvs,
            backgroundColor: "#93c5fd",
            borderRadius: 5,
            barPercentage: 0.45,
          },
        ],
      },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          legend: {
            display: true,
            position: "top",
            align: "end",
            labels: { usePointStyle: true, padding: 12, font: { size: 11 } },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            grid: { color: "#f1f5f1" },
          },
          x: { grid: { display: false } },
        },
      },
    });
    chartCasosEstudanteInst = _chartInsts["carga"];
  }

  // ── Gráfico gerencial: Status anamneses (doughnut) ───────────────────────
  const ctxAnam = document.getElementById("chartAnamneses");
  if (ctxAnam) {
    _destroyChart("anam");
    let finalizadas = listaAtivos.filter(
      (p) => ANAMNESES[p.id]?.status === "finalizada",
    ).length;
    let pendentes = listaAtivos.length - finalizadas;
    if (finalizadas === 0 && pendentes === 0) pendentes = 1;
    _chartInsts["anam"] = new Chart(ctxAnam, {
      type: "doughnut",
      data: {
        labels: ["Finalizadas", "Pendentes"],
        datasets: [
          {
            data: [finalizadas, pendentes],
            backgroundColor: ["#2e7d32", "#f59e0b"],
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        ...CHART_DEFAULTS,
        cutout: "72%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { usePointStyle: true, padding: 10, font: { size: 10 } },
          },
        },
      },
    });
    chartEvolucoesInst = _chartInsts["anam"];
  }

  // ── Gráfico estudante: Evoluções por caso (horizontal bar) ───────────────
  const ctxMeusCasos = document.getElementById("chartMeusCasos");
  if (ctxMeusCasos && role === "estudante") {
    _destroyChart("meusCasos");
    const meusCasos = listaAtivos;
    _chartInsts["meusCasos"] = new Chart(ctxMeusCasos, {
      type: "bar",
      data: {
        labels: meusCasos.map((p) => p.nome.split(" ")[0]),
        datasets: [
          {
            label: "Evoluções",
            data: meusCasos.map((p) => (EVOLUCOES[p.id] || []).length),
            backgroundColor: meusCasos.map((p) => p.cor || "#2e7d32"),
            borderRadius: 5,
          },
        ],
      },
      options: {
        ...CHART_DEFAULTS,
        indexAxis: "y",
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            grid: { color: "#f1f5f1" },
          },
          y: { grid: { display: false } },
        },
      },
    });
  }
}

/* ============================================================  PACIENTES  */
function renderPacientes() {
  const role = currentUser.papel;
  // Agora utiliza a função centralizada que bloqueia quem não tem acesso.
  const lista = getPacientesPermitidos();

  return `<div class="page-header"><div class="page-header-left"><h1>${role === "estudante" ? "Meus Casos" : "Pacientes"}</h1><p>${lista.length} casos listados</p></div>${role === "tecnico" ? `<button class="btn btn-primary" onclick="openModalNovoPaciente()"><i class="bi bi-person-plus-fill"></i> Novo paciente</button>` : ""}</div>
  <div class="card"><div class="card-header" style="padding:12px 18px"><div class="filter-bar"><div class="search-box"><i class="bi bi-search"></i><input type="text" placeholder="Buscar por nome..." id="pac-search" oninput="filterPacientes(this.value)"></div><select class="filter-select" onchange="filterPacienteStatus(this.value)"><option value="">Todos os status</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option></select></div></div>
  <div class="table-responsive"><table><thead><tr><th>Paciente</th><th>CPF</th><th>Estudantes</th><th>Supervisor</th><th>Status</th><th>Ações</th></tr></thead><tbody id="pac-tbody">${lista.map(renderPacienteRow).join("")}</tbody></table></div></div>`;
}

function renderPacienteRow(p) {
  const estudantes = (p.estudantesIds || [])
    .map((id) => USERS.find((u) => u.id === id))
    .filter(Boolean);
  const nomesEstudantes =
    estudantes.length > 0
      ? estudantes.map((e) => escapeHTML(e.nome)).join(", ")
      : "—";
  const sup = USERS.find((u) => u.id === p.supervisorId);
  const role = currentUser.papel;
  return `<tr><td><div style="display:flex;align-items:center;gap:10px"><div class="patient-avatar" style="background:${p.cor}">${escapeHTML(p.ini)}</div><div><div style="font-weight:600;font-size:13px">${escapeHTML(p.nome)}</div><div style="font-size:11px;color:var(--text3)">Caso #${p.id}</div></div></div></td><td style="color:var(--text2)">${escapeHTML(p.cpf)}</td><td style="font-size:12px; max-width: 180px;">${nomesEstudantes}</td><td style="font-size:12px">${sup ? escapeHTML(sup.nome) : "—"}</td><td><span class="badge ${p.status === "ativo" ? "badge-green" : "badge-gray"}">${p.status}</span></td><td><div class="action-btns"><button class="btn btn-secondary btn-sm" onclick="openProntuario(${p.id})"><i class="bi bi-file-medical"></i> Prontuário</button>${role === "tecnico" ? `<button class="btn btn-ghost btn-sm" onclick="openModalEditarPaciente(${p.id})"><i class="bi bi-pencil"></i></button>` : ""}</div></td></tr>`;
}

function filterPacientes(q) {
  const lista = getPacientesPermitidos();
  document.getElementById("pac-tbody").innerHTML = lista
    .filter((p) => p.nome.toLowerCase().includes(q.toLowerCase()))
    .map(renderPacienteRow)
    .join("");
}
function filterPacienteStatus(s) {
  const lista = getPacientesPermitidos();
  document.getElementById("pac-tbody").innerHTML = (
    s ? lista.filter((p) => p.status === s) : lista
  )
    .map(renderPacienteRow)
    .join("");
}

/* ============================================================  PRONTUÁRIO  */
function renderProntuario(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  const sup = USERS.find((u) => u.id === p.supervisorId);
  const estudantes = (p.estudantesIds || [])
    .map((id) => USERS.find((u) => u.id === id))
    .filter(Boolean);
  const nomesEstudantes =
    estudantes.length > 0 ? estudantes.map((e) => e.nome).join(", ") : "Nenhum";
  const evs = EVOLUCOES[pid] || [],
    docs = DOCUMENTOS[pid] || [];
  return `
  <div class="back-btn" onclick="navigate('pacientes')"><i class="bi bi-arrow-left"></i> Voltar</div>
  <div class="patient-profile"><div class="patient-profile-avatar" style="background:${p.cor}">${escapeHTML(p.ini)}</div><div class="patient-profile-info"><h2>${escapeHTML(p.nome)}</h2><p>Caso #${p.id} · ${escapeHTML(p.cpf)} · <span class="badge ${p.status === "ativo" ? "badge-green" : "badge-gray"}">${p.status}</span></p><p style="margin-top:5px;font-size:12px;color:var(--text3)"><i class="bi bi-people"></i> ${escapeHTML(nomesEstudantes)} &nbsp;·&nbsp; <i class="bi bi-person-check"></i> ${sup?.nome}</p></div><div class="patient-profile-meta"><div class="meta-item"><div class="meta-label">Evoluções</div><div class="meta-value">${evs.length}</div></div></div></div>
  <div class="prontuario-tabs"><button class="ptab active" onclick="switchTab(this,'tab-resumo')"><i class="bi bi-grid"></i> Resumo</button><button class="ptab" onclick="switchTab(this,'tab-anamnese')"><i class="bi bi-journal-text"></i> Anamnese</button><button class="ptab" onclick="switchTab(this,'tab-evolucoes')"><i class="bi bi-list-ul"></i> Evoluções</button><button class="ptab" onclick="switchTab(this,'tab-documentos')"><i class="bi bi-paperclip"></i> Docs</button><button class="ptab" onclick="switchTab(this,'tab-agenda')"><i class="bi bi-calendar3"></i> Agenda</button></div>
  <div id="tab-resumo" class="ptab-content active">${renderTabResumo(pid)}</div><div id="tab-anamnese" class="ptab-content">${renderTabAnamnese(pid)}</div><div id="tab-evolucoes" class="ptab-content">${renderTabEvolucoes(pid)}</div><div id="tab-documentos" class="ptab-content">${renderTabDocumentos(pid)}</div><div id="tab-agenda" class="ptab-content">${renderTabAgendaPaciente(pid)}</div>`;
}

function switchTab(btn, tabId) {
  document
    .querySelectorAll(".ptab")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".ptab-content")
    .forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(tabId).classList.add("active");
}

function renderTabResumo(pid) {
  const p = PACIENTES.find((x) => x.id === pid),
    ams = ANAMNESES[pid],
    evs = (EVOLUCOES[pid] || []).slice(-3).reverse(),
    ags = AGENDAMENTOS.filter((a) => a.pacienteId === pid).slice(0, 3);
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px"><div class="card"><div class="card-header"><span class="card-title"><i class="bi bi-person-fill" style="color:var(--sc-green)"></i>Dados do Paciente</span>${currentUser.papel === "tecnico" ? `<button class="btn btn-ghost btn-sm" onclick="openModalEditarPaciente(${pid})"><i class="bi bi-pencil"></i></button>` : ""}</div><div class="card-body"><div style="display:grid;gap:8px">${[
    ["Nome", p.nome],
    ["CPF", p.cpf],
    ["Telefone", p.telefone],
  ]
    .map(
      ([l, v]) =>
        `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text3)">${l}</span><span style="font-size:13px;font-weight:500">${escapeHTML(v)}</span></div>`,
    )
    .join(
      "",
    )}</div></div></div><div class="card"><div class="card-header"><span class="card-title"><i class="bi bi-journal-medical" style="color:var(--sc-green)"></i>Queixa Principal</span></div><div class="card-body">${ams ? `<p style="font-size:13px;line-height:1.8">${escapeHTML(ams.queixa)}</p>` : `<p style="font-size:13px;color:var(--text3)">Anamnese não registrada</p>`}</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px"><div class="card"><div class="card-header"><span class="card-title"><i class="bi bi-clock-history" style="color:var(--sc-green)"></i>Últimas Evoluções</span></div><div class="card-body" style="padding:0">${evs.length ? evs.map((ev) => `<div style="padding:11px 16px;border-bottom:1px solid var(--border)"><div style="display:flex;align-items:center;gap:7px;margin-bottom:4px"><span class="tag tag-teal">${ev.tipo}</span></div><p style="font-size:12px;line-height:1.6">${escapeHTML(ev.conteudo).substring(0, 120)}...</p></div>`).join("") : `<div style="padding:20px"><p style="font-size:13px;color:var(--text3)">Nenhuma evolução</p></div>`}</div></div></div>`;
}

function renderTabAnamnese(pid) {
  const ams = ANAMNESES[pid],
    role = currentUser.papel,
    canEdit = ["tecnico", "supervisor", "estudante"].includes(role);
  if (!ams)
    return `<div class="card"><div class="card-body"><div class="empty-state"><h3>Anamnese não registrada</h3>${canEdit ? `<button class="btn btn-primary" onclick="openModalAnamnese(${pid})">Registrar anamnese</button>` : ""}</div></div></div>`;
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><span class="badge ${ams.status === "finalizada" ? "badge-green" : "badge-amber"}">${ams.status}</span>${canEdit && ams.status === "rascunho" ? `<button class="btn btn-primary btn-sm" onclick="openModalAnamnese(${pid})"><i class="bi bi-pencil"></i> Editar</button>` : ""}</div><div class="anamnese-grid">${[
    ["bi-chat-quote-fill", "Queixa Principal", ams.queixa],
    ["bi-clock-history", "História", ams.historia],
    ["bi-hospital", "Histórico Médico", ams.historico_medico],
    ["bi-diagram-3", "Plano Terapêutico", ams.hipoteses],
  ]
    .map(
      ([ico, tit, txt]) =>
        `<div class="anamnese-section"><div class="anamnese-section-title"><i class="bi ${ico}"></i>${tit}</div><div class="anamnese-text">${txt ? escapeHTML(txt) : "-"}</div></div>`,
    )
    .join("")}</div>`;
}

function renderTabEvolucoes(pid) {
  const evs = (EVOLUCOES[pid] || []).slice().reverse(),
    canAdd = ["tecnico", "supervisor", "estudante"].includes(currentUser.papel);
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><div><strong>${evs.length}</strong> evoluções</div>${canAdd ? `<button class="btn btn-primary" onclick="openModalEvolucao(${pid})"><i class="bi bi-plus-lg"></i> Nova evolução</button>` : ""}</div><div class="evolucao-list">${evs.map((ev) => `<div class="evolucao-card"><div class="evolucao-header"><span class="badge badge-teal">${ev.tipo}</span><span class="evolucao-date"><i class="bi bi-calendar3"></i> ${ev.data}</span><span class="evolucao-author"><i class="bi bi-person-fill"></i> ${escapeHTML(ev.autor)}</span></div><div class="evolucao-body"><p class="evolucao-content">${escapeHTML(ev.conteudo)}</p></div></div>`).join("")}</div>`;
}

function renderTabDocumentos(pid) {
  const docs = DOCUMENTOS[pid] || [],
    canUp = ["tecnico", "supervisor", "estudante"].includes(currentUser.papel);
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><strong>${docs.length} documentos</strong>${canUp ? `<button class="btn btn-primary" onclick="openModalUploadDocumento(${pid})"><i class="bi bi-upload"></i> Upload</button>` : ""}</div><div class="doc-grid">${docs.map((d) => `<div class="doc-card" onclick="toast('Visualizando: ${escapeHTML(d.nome)}','info')"><div class="doc-icon doc-icon-pdf"><i class="bi bi-file-earmark-fill"></i></div><div class="doc-name">${escapeHTML(d.nome)}</div></div>`).join("")}</div>`;
}

function renderTabAgendaPaciente(pid) {
  const ags = AGENDAMENTOS.filter((a) => a.pacienteId === pid);
  return `<div class="card"><div class="card-header"><span class="card-title">Histórico de Agendamentos</span></div><div class="table-responsive"><table><thead><tr><th>Data</th><th>Hora</th><th>Local</th><th>Status</th></tr></thead><tbody>${ags
    .map((ag) => {
      return `<tr><td>${ag.data}</td><td><strong>${ag.hora}</strong></td><td>${escapeHTML(ag.local)}</td><td><span class="badge badge-green">${ag.status}</span></td></tr>`;
    })
    .join("")}</tbody></table></div></div>`;
}

/* ============================================================  AGENDA  */
function renderAgenda() {
  const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"],
    DATES = ["01/06", "02/06", "03/06", "04/06", "05/06"],
    HOURS = ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"];
  const dayMap = {
    "2026-06-01": 0,
    "2026-06-02": 1,
    "2026-06-03": 2,
    "2026-06-04": 3,
    "2026-06-05": 4,
  };
  const slotMap = {};

  // Utiliza a validação central para filtrar a agenda
  const meusPacientesIds = getPacientesPermitidos().map((p) => p.id);
  const meusAgendamentos = AGENDAMENTOS.filter((a) =>
    meusPacientesIds.includes(a.pacienteId),
  );

  meusAgendamentos.forEach((ag) => {
    const d = dayMap[ag.data];
    if (d !== undefined) {
      const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
      if (pac)
        slotMap[`${d}_${ag.hora}`] = {
          label: pac.nome.split(" ")[0],
          hora: ag.hora,
          cls: "cal-event-blue",
          ag,
        };
    }
  });

  return `<div class="page-header"><div class="page-header-left"><h1>Agenda</h1><p>Junho e Julho de 2026</p></div>${currentUser.papel === "tecnico" ? `<button class="btn btn-primary" onclick="openModalNovoAgendamento()"><i class="bi bi-plus-lg"></i> Novo agendamento</button>` : ""}</div><div class="card"><div class="table-responsive"><div class="calendar-grid"><div class="cal-header">Hora</div>${DAYS.map((d, i) => `<div class="cal-header">${d}<br><span style="font-size:10px">${DATES[i]}</span></div>`).join("")}${HOURS.map(
    (h) =>
      `<div class="cal-hour-label">${h}</div>${DAYS.map((_, di) => {
        const s = slotMap[`${di}_${h}`];
        return `<div class="cal-slot">${s ? `<div class="cal-event ${s.cls}" onclick="openProntuario(${s.ag.pacienteId})">${escapeHTML(s.label)}<br>${s.hora}</div>` : ""}</div>`;
      }).join("")}`,
  ).join(
    "",
  )}</div></div></div><div class="card"><div class="card-header"><span class="card-title">Sua Lista de Agendamentos</span></div><div class="table-responsive"><table><thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Status</th></tr></thead><tbody>${meusAgendamentos
    .map((ag) => {
      const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
      return `<tr><td>${ag.data}</td><td>${ag.hora}</td><td>${escapeHTML(pac ? pac.nome : "")}</td><td><span class="badge badge-green">${ag.status}</span></td></tr>`;
    })
    .join("")}</tbody></table></div></div>`;
}

/* ============================================================  ACESSO & USUÁRIOS  */
function renderAcesso() {
  const RLABELS = {
    tecnico: "Psicólogo Técnico",
    supervisor: "Supervisor",
    estudante: "Estudante",
  };
  const RCOLORS = {
    tecnico: "#1b5e20",
    supervisor: "#2e7d32",
    estudante: "#388e3c",
  };
  const RBADGE = {
    tecnico: "badge-teal",
    supervisor: "badge-teal",
    estudante: "badge-green",
  };
  return `<div class="page-header"><div class="page-header-left"><h1>Acesso & Usuários</h1></div><button class="btn btn-primary" onclick="openModalNovoUsuario()"><i class="bi bi-person-plus-fill"></i> Novo usuário</button></div><div class="users-grid" style="margin-bottom:22px">${USERS.filter(
    (u) => u.papel !== "paciente",
  )
    .map(
      (u) =>
        `<div class="user-card"><div class="user-card-header"><div class="user-card-avatar" style="background:${RCOLORS[u.papel] || "#94a3b8"}">${escapeHTML(u.avatar)}</div><div><div class="user-card-name">${escapeHTML(u.nome)}</div><div class="user-card-email">${escapeHTML(u.login)}@fcmscsp.edu.br</div></div><span class="badge ${RBADGE[u.papel] || "badge-gray"}" style="margin-left:auto">${RLABELS[u.papel]}</span></div><div style="display:flex;gap:8px;margin-top:4px"><button class="btn btn-secondary btn-sm" style="flex:1" onclick="toast('Editando','info')"><i class="bi bi-pencil"></i> Editar</button></div></div>`,
    )
    .join(
      "",
    )}</div><div class="card"><div class="card-header"><span class="card-title"><i class="bi bi-table" style="color:var(--sc-green)"></i>Matriz de Permissões</span></div><div class="table-responsive"><table class="perm-table"><thead><tr><th>Funcionalidade</th><th>Técnico</th><th>Supervisor</th><th>Estudante</th></tr></thead><tbody>${[
    [
      "Ver Lista de Casos",
      '<i class="bi bi-check-circle-fill perm-yes"></i> Todos',
      '<span class="perm-cond">Somente seus</span>',
      '<span class="perm-cond">Somente seus</span>',
    ],
    [
      "Cadastrar paciente",
      '<i class="bi bi-check-circle-fill perm-yes"></i>',
      '<span class="perm-cond">Não</span>',
      '<span class="perm-cond">Não</span>',
    ],
    [
      "Registrar evolução",
      '<i class="bi bi-check-circle-fill perm-yes"></i>',
      '<i class="bi bi-check-circle-fill perm-yes"></i>',
      '<span class="perm-cond">Seu caso</span>',
    ],
    [
      "Remover evolução",
      '<span class="perm-never">NUNCA</span>',
      '<span class="perm-never">NUNCA</span>',
      '<span class="perm-never">NUNCA</span>',
    ],
  ]
    .map(
      ([f, ...cols]) =>
        `<tr><td style="font-weight:500">${f}</td>${cols.map((c) => `<td style="text-align:center">${c}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody></table></div></div>`;
}

/* ============================================================  ACESSO PACIENTE (BUSCA + PDF)  */
function renderAcessoPaciente() {
  return `<div class="page-header"><div class="page-header-left"><h1>Acesso do Paciente</h1></div></div><div class="acesso-pac-grid"><div><div class="card" style="margin-bottom:18px"><div class="card-header"><span class="card-title">Solicitações Registradas</span></div><div class="card-body" style="padding:12px">${ACESSO_PACIENTE.map((req) => `<div class="access-request-card" style="margin-bottom:10px;display:flex;align-items:center;gap:12px;padding:14px;border:1px solid var(--border);border-radius:8px"><div style="flex:1"><div style="font-weight:600">${escapeHTML(req.nome)}</div><div style="font-size:12px;color:var(--text3)">Solicitado em: ${req.solicitacao}</div></div><span class="badge ${req.status === "liberado" ? "badge-green" : "badge-amber"}">${req.status}</span><div style="display:flex;gap:6px">${req.status === "pendente" ? `<button class="btn btn-primary btn-sm" onclick="liberarAcessoPaciente(${req.id})"><i class="bi bi-check"></i> Liberar</button>` : ""}<button class="btn btn-secondary btn-sm" onclick="gerarPdfProntuario(${req.pacienteId})"><i class="bi bi-file-pdf"></i> PDF</button></div></div>`).join("")}</div></div></div><div class="card" style="align-self:start"><div class="card-header"><span class="card-title">Nova Solicitação</span></div><div class="card-body"><div class="form-group" style="position:relative;"><label class="form-label">Buscar Paciente</label><input type="text" id="req-pac-busca" class="form-control" placeholder="Digite o nome..." oninput="filtrarPacientesSolicitacao(this.value)" autocomplete="off"><input type="hidden" id="req-pac-id"><div id="autocomplete-lista" style="position:absolute; top:100%; left:0; right:0; background:var(--surface); border:1px solid var(--border); border-radius:7px; max-height:200px; overflow-y:auto; z-index:100; display:none; box-shadow:var(--shadow-md); margin-top:4px;"></div></div><button class="btn btn-primary" style="width:100%" onclick="novaSolicitacaoPaciente()"><i class="bi bi-plus"></i> Registrar</button></div></div></div>`;
}

function filtrarPacientesSolicitacao(termo) {
  const listaEl = document.getElementById("autocomplete-lista");
  if (!termo || termo.trim().length === 0) {
    listaEl.style.display = "none";
    document.getElementById("req-pac-id").value = "";
    return;
  }
  const filtrados = PACIENTES.filter((p) =>
    p.nome.toLowerCase().includes(termo.toLowerCase()),
  ).sort((a, b) => a.nome.localeCompare(b.nome));
  if (filtrados.length === 0) {
    listaEl.innerHTML =
      '<div style="padding:10px 12px; font-size:12px; color:var(--text3);">Nenhum paciente encontrado.</div>';
  } else {
    listaEl.innerHTML = filtrados
      .map(
        (p) =>
          `<div style="padding:10px 12px; font-size:13px; cursor:pointer; border-bottom:1px solid var(--border);" onclick="selecionarPacienteSolicitacao(${p.id}, '${escapeHTML(p.nome)}')" onmouseover="this.style.background='var(--sc-green-pale)'" onmouseout="this.style.background='transparent'"><strong>${escapeHTML(p.nome)}</strong> <br><small style="color:var(--text3)">CPF: ${escapeHTML(p.cpf)}</small></div>`,
      )
      .join("");
  }
  listaEl.style.display = "block";
}

function selecionarPacienteSolicitacao(id, nome) {
  document.getElementById("req-pac-id").value = id;
  document.getElementById("req-pac-busca").value = nome;
  document.getElementById("autocomplete-lista").style.display = "none";
}
document.addEventListener("click", function (e) {
  const lista = document.getElementById("autocomplete-lista");
  if (lista && e.target.id !== "req-pac-busca") lista.style.display = "none";
});

function liberarAcessoPaciente(reqId) {
  const req = ACESSO_PACIENTE.find((r) => r.id === reqId);
  if (req) {
    req.status = "liberado";
    req.liberacao = new Date().toISOString().split("T")[0];
    logAudit("cadastro", "Liberou acesso ao prontuário", req.nome);
    saveData();
    toast("Acesso liberado!", "success");
    navigate("acesso-pac");
  }
}
function novaSolicitacaoPaciente() {
  const pid = parseInt(document.getElementById("req-pac-id").value);
  if (isNaN(pid)) return toast("Selecione um paciente", "error");
  const p = PACIENTES.find((x) => x.id === pid);
  if (p) {
    ACESSO_PACIENTE.push({
      id: Date.now(),
      pacienteId: p.id,
      nome: p.nome,
      status: "pendente",
      solicitacao: new Date().toISOString().split("T")[0],
      protocolo: "PROT-" + Date.now(),
    });
    logAudit("cadastro", "Registrou solicitação", p.nome);
    saveData();
    toast("Solicitação registrada!", "success");
    navigate("acesso-pac");
  }
}

function gerarPdfProntuario(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  if (!p) return;
  const ams = ANAMNESES[pid] || {};
  const evs = EVOLUCOES[pid] || [];
  const printWindow = window.open("", "_blank", "width=800,height=900");
  let evsHtml =
    evs.length > 0
      ? evs
          .map(
            (e) =>
              `<div style="margin-bottom:15px; border-bottom:1px solid #ccc; padding-bottom:10px;"><p style="font-size:12px; color:#555; margin-bottom:5px;"><strong>Data:</strong> ${e.data} | <strong>Resp:</strong> ${escapeHTML(e.autor)}</p><p style="margin-top:0;">${escapeHTML(e.conteudo)}</p></div>`,
          )
          .join("")
      : "<p>Nenhuma evolução.</p>";
  const html = `<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Prontuário - ${escapeHTML(p.nome)}</title><style>body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; } h1 { color: #1b5e20; border-bottom: 2px solid #1b5e20; padding-bottom: 10px; margin-bottom: 5px; } .info-box { border: 1px solid #ddd; padding: 15px; background: #f9f9f9; }</style></head><body><h1>Prontuário Eletrônico</h1><div class="info-box"><strong>Paciente:</strong> ${escapeHTML(p.nome)} <br><strong>CPF:</strong> ${escapeHTML(p.cpf)}</div><h2>Anamnese</h2><div class="info-box"><p>${escapeHTML(ams.queixa || "Não registrada")}</p></div><h2>Evoluções</h2>${evsHtml}</body></html>`;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = function () {
    printWindow.print();
  };
  toast("PDF Gerado!", "success");
  logAudit("export", "Exportou PDF", p.nome);
  saveData();
}

/* ============================================================  AUDITORIA E MEU PRONTUARIO  */
function renderAuditoria() {
  return `<div class="page-header"><div class="page-header-left"><h1>Trilha de Auditoria</h1></div></div><div class="card"><div class="card-body" style="padding:0 16px">${AUDITORIA.map((a, i) => `<div class="audit-item"><div class="audit-line"><div class="audit-dot" style="background:${a.dot}"></div>${i < AUDITORIA.length - 1 ? '<div class="audit-connector"></div>' : ""}</div><div class="audit-body"><div class="audit-action"><strong>${escapeHTML(a.ator)}</strong> ${escapeHTML(a.acao)} ${a.obj ? `<em>${escapeHTML(a.obj)}</em>` : ""}</div><div class="audit-time">${a.ts}</div></div></div>`).join("")}</div></div>`;
}
function renderMeuProntuario() {
  const pid = 4;
  const p = PACIENTES.find((x) => x.id === pid);
  const ams = ANAMNESES[pid];
  const evs = EVOLUCOES[pid] || [];
  const acessoInfo = ACESSO_PACIENTE.find((a) => a.pacienteId === pid);
  if (!acessoInfo || acessoInfo.status !== "liberado")
    return `<div class="empty-state"><h3>Acesso Restrito</h3></div>`;
  return `<div style="max-width:800px;margin:0 auto"><div style="background:var(--sc-green-dark);color:#fff;border-radius:12px;padding:22px;margin-bottom:22px;"><div><div style="font-size:17px;font-weight:700">${escapeHTML(p.nome)}</div></div></div><div class="card"><div class="card-header"><span class="card-title">Anamnese</span></div><div class="card-body">${ams ? `<p>${escapeHTML(ams.queixa)}</p>` : `<p>Sem registros.</p>`}</div></div></div>`;
}

/* ============================================================  MODAIS E ALERTAS (AÇÕES DE ESCRITA)  */
function openModal(title, body, footer = "") {
  document.getElementById("modal-title").innerHTML = title;
  document.getElementById("modal-body").innerHTML = body;
  document.getElementById("modal-footer").innerHTML = footer;
  document.getElementById("modal-overlay").classList.remove("hidden");
}
function closeModal(e) {
  if (!e || e.target === document.getElementById("modal-overlay"))
    document.getElementById("modal-overlay").classList.add("hidden");
}

/* ============================================================  VALIDADORES E MÁSCARAS  */
function maskCPF(input) {
  let v = input.value.replace(/\D/g, "");
  if (v.length > 11) v = v.substring(0, 11);
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  input.value = v;
}
function maskPhone(input) {
  let v = input.value.replace(/\D/g, "");
  if (v.length > 11) v = v.substring(0, 11);
  v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  v = v.replace(/(\d)(\d{4})$/, "$1-$2");
  input.value = v;
}

function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0,
    resto;
  for (let i = 1; i <= 9; i++)
    soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto == 10 || resto == 11) resto = 0;
  if (resto != parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++)
    soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto == 10 || resto == 11) resto = 0;
  if (resto != parseInt(cpf.substring(10, 11))) return false;
  return true;
}

function validarEmail(email) {
  if (!email) return true; // permite vazio
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function showError(inputId, msg) {
  const el = document.getElementById(inputId);
  if (el) {
    const originalBorder = el.style.borderColor;
    el.style.borderColor = "var(--red)";
    setTimeout(() => (el.style.borderColor = originalBorder), 3000);
  }
  toast(msg, "error");
}

/* ============================================================  EVOLUÇÕES  */
function inserirTemplateEvolucao(tipo) {
  const textarea = document.getElementById("ev-content");
  let texto = "";
  if (tipo === "SOAP")
    texto =
      "S (Subjetivo): [Escrever queixa do paciente]\nO (Objetivo): [Escrever comportamento observado]\nA (Avaliação): [Análise do psicólogo]\nP (Plano): [Próximos passos]";
  else if (tipo === "ACOLHIMENTO")
    texto =
      "1. Motivo da consulta:\n2. Breve histórico:\n3. Estado mental observado:\n4. Encaminhamento/Conclusão:";
  if (textarea.value.trim() !== "") textarea.value += "\n\n" + texto;
  else textarea.value = texto;
}

function openModalEvolucao(pid) {
  openModal(
    `Nova Evolução`,
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label">Data/hora</label><input type="datetime-local" class="form-control" id="ev-data" value="${new Date().toISOString().slice(0, 16)}"></div><div class="form-group"><label class="form-label">Tipo</label><select class="form-control" id="ev-tipo"><option value="atendimento">Atendimento</option><option value="supervisao">Supervisão</option></select></div></div><div class="form-group"><div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 5px;"><label class="form-label" style="margin:0;">Conteúdo *</label><div style="display:flex; gap:6px;"><button class="btn btn-secondary btn-sm" onclick="inserirTemplateEvolucao('SOAP')"><i class="bi bi-layout-text-window"></i> Modelo SOAP</button><button class="btn btn-secondary btn-sm" onclick="inserirTemplateEvolucao('ACOLHIMENTO')"><i class="bi bi-layout-text-window"></i> Acolhimento</button></div></div><textarea class="form-control" id="ev-content" rows="6"></textarea></div><div class="form-group"><label class="form-label">Tags (separadas por vírgula)</label><input type="text" class="form-control" id="ev-tags"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="confirmarSalvarEvolucao(${pid})">Salvar Imutável</button>`,
  );
}

function confirmarSalvarEvolucao(pid) {
  const content = document.getElementById("ev-content").value.trim();
  if (!content) return toast("Preencha o conteúdo da evolução!", "error");

  let confirmDiv = document.getElementById("custom-confirm");
  if (!confirmDiv) {
    confirmDiv = document.createElement("div");
    confirmDiv.id = "custom-confirm";
    confirmDiv.className = "modal-overlay";
    confirmDiv.style.zIndex = "3000";
    document.body.appendChild(confirmDiv);
  }
  confirmDiv.innerHTML = `<div class="modal" style="max-width: 400px; text-align: center; padding: 24px;" onclick="event.stopPropagation()"><i class="bi bi-exclamation-triangle-fill" style="font-size: 44px; color: var(--amber); margin-bottom: 12px; display: block;"></i><h3 style="margin-bottom: 8px; font-size: 18px; color: var(--text);">Tem certeza?</h3><p style="font-size: 14px; color: var(--text2); margin-bottom: 24px; line-height: 1.5;">Uma vez salva, esta evolução <strong>não poderá ser alterada ou apagada</strong> devido a normas do CRP.</p><div style="display: flex; gap: 10px; justify-content: center;"><button class="btn btn-secondary" onclick="document.getElementById('custom-confirm').classList.add('hidden')">Cancelar</button><button class="btn btn-primary" onclick="executarSalvarEvolucao(${pid})">Sim, confirmar</button></div></div>`;
  confirmDiv.classList.remove("hidden");
}

function executarSalvarEvolucao(pid) {
  document.getElementById("custom-confirm").classList.add("hidden");
  const content = document.getElementById("ev-content").value.trim();
  if (!EVOLUCOES[pid]) EVOLUCOES[pid] = [];
  const num = EVOLUCOES[pid].length + 1;
  EVOLUCOES[pid].push({
    id: Date.now(),
    num: num,
    data: document.getElementById("ev-data").value.replace("T", " "),
    autor: currentUser.nome,
    papel: currentUser.papel,
    tipo: document.getElementById("ev-tipo").value,
    conteudo: content,
    tags: document
      .getElementById("ev-tags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  });
  logAudit(
    "evolucao",
    `Registrou evolução #${num}`,
    PACIENTES.find((p) => p.id === pid).nome,
  );
  saveData();
  closeModal();
  toast("Salvo com sucesso!", "success");
  openProntuario(pid);
}

/* ============================================================  DOCUMENTOS E ANAMNESE  */
function openModalUploadDocumento(pid) {
  openModal(
    `Upload de Documento (Simulado)`,
    `<div class="form-group"><label class="form-label">Nome do ficheiro</label><input type="text" id="up-nome" class="form-control" placeholder="Ex: Laudo_Medico.pdf"></div><div class="form-group"><label class="form-label">Tipo</label><select id="up-tipo" class="form-control"><option value="pdf">PDF</option><option value="img">Imagem</option><option value="docx">Word</option></select></div><div class="form-group"><label class="form-label">Ficheiro</label><input type="file" class="form-control"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarUploadDocumento(${pid})">Enviar Ficheiro</button>`,
  );
}
function salvarUploadDocumento(pid) {
  let nome = document.getElementById("up-nome").value || "Documento.pdf";
  let tipo = document.getElementById("up-tipo").value;
  if (!DOCUMENTOS[pid]) DOCUMENTOS[pid] = [];
  DOCUMENTOS[pid].push({
    id: `d${Date.now()}`,
    nome: nome,
    tipo: tipo,
    tamanho: Math.floor(Math.random() * 900 + 50) + " KB",
    data: new Date().toISOString().split("T")[0],
    autor: currentUser.nome,
  });
  logAudit("export", "Fez upload de documento", nome);
  saveData();
  closeModal();
  toast("Documento enviado e salvo!", "success");
  openProntuario(pid);
  setTimeout(() => {
    document.querySelectorAll(".ptab")[3].click();
  }, 100);
}

function openModalAnamnese(pid) {
  const ams = ANAMNESES[pid] || {};
  openModal(
    `Anamnese`,
    `<div class="form-group"><label class="form-label">Queixa principal *</label><textarea class="form-control" id="am-queixa" rows="2">${escapeHTML(ams.queixa || "")}</textarea></div><div class="form-group"><label class="form-label">História do problema</label><textarea class="form-control" id="am-historia" rows="3">${escapeHTML(ams.historia || "")}</textarea></div><div class="form-group"><label class="form-label">Histórico médico/psicológico</label><textarea class="form-control" id="am-medico" rows="2">${escapeHTML(ams.historico_medico || "")}</textarea></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Medicamentos/substâncias</label><textarea class="form-control" id="am-med" rows="2">${escapeHTML(ams.medicamentos || "")}</textarea></div><div class="form-group"><label class="form-label">Contexto familiar/social</label><textarea class="form-control" id="am-ctx" rows="2">${escapeHTML(ams.contexto || "")}</textarea></div></div><div class="form-group"><label class="form-label">Hipóteses / Plano terapêutico</label><textarea class="form-control" id="am-hipo" rows="2">${escapeHTML(ams.hipoteses || "")}</textarea></div>`,
    `<button class="btn btn-secondary" onclick="salvarAnamnese(${pid},'rascunho')">Salvar rascunho</button><button class="btn btn-primary" onclick="salvarAnamnese(${pid}, 'finalizada')">Finalizar Anamnese</button>`,
  );
}
function salvarAnamnese(pid, status) {
  ANAMNESES[pid] = {
    queixa: document.getElementById("am-queixa").value,
    historia: document.getElementById("am-historia").value,
    historico_medico: document.getElementById("am-medico").value,
    medicamentos: document.getElementById("am-med").value,
    contexto: document.getElementById("am-ctx").value,
    hipoteses: document.getElementById("am-hipo").value,
    status,
    rascunho: status === "rascunho",
  };
  logAudit(
    "anamnese",
    "Atualizou anamnese",
    PACIENTES.find((p) => p.id === pid).nome,
  );
  saveData();
  closeModal();
  toast(
    status === "finalizada" ? "Anamnese finalizada!" : "Rascunho salvo!",
    "success",
  );
  openProntuario(pid);
}

/* ============================================================  PACIENTE: CADASTRO E EDIÇÃO COM VALIDAÇÃO  */
function openModalNovoPaciente() {
  const estudantesOptions = USERS.filter((u) => u.papel === "estudante")
    .map((u) => `<option value="${u.id}">${escapeHTML(u.nome)}</option>`)
    .join("");
  openModal(
    '<i class="bi bi-person-plus-fill" style="color:var(--sc-green)"></i> Novo Paciente',
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label">Nome completo *</label><input class="form-control" id="np-nome" type="text"></div><div class="form-group"><label class="form-label">CPF *</label><input class="form-control" id="np-cpf" type="text" placeholder="000.000.000-00" oninput="maskCPF(this)"></div></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Data de nascimento</label><input class="form-control" id="np-nasc" type="date"></div><div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="np-tel" type="tel" placeholder="(00) 00000-0000" oninput="maskPhone(this)"></div></div><div class="form-group"><label class="form-label">E-mail</label><input class="form-control" id="np-email" type="email"></div><div class="form-group"><label class="form-label">Supervisor</label><select class="form-control" id="np-sup">${USERS.filter(
      (u) => u.papel === "supervisor",
    )
      .map((u) => `<option value="${u.id}">${escapeHTML(u.nome)}</option>`)
      .join(
        "",
      )}</select></div><div class="form-row form-row-3"><div class="form-group"><label class="form-label">Estudante 1</label><select class="form-control" id="np-est1"><option value="">Nenhum</option>${estudantesOptions}</select></div><div class="form-group"><label class="form-label">Estudante 2</label><select class="form-control" id="np-est2"><option value="">Nenhum</option>${estudantesOptions}</select></div><div class="form-group"><label class="form-label">Estudante 3</label><select class="form-control" id="np-est3"><option value="">Nenhum</option>${estudantesOptions}</select></div></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarNovoPaciente()"><i class="bi bi-check-lg"></i> Cadastrar</button>`,
  );
}

function salvarNovoPaciente() {
  const nome = document.getElementById("np-nome").value.trim();
  const cpf = document.getElementById("np-cpf").value.trim();
  const email = document.getElementById("np-email").value.trim();

  if (!nome) return showError("np-nome", "Informe o nome completo!");
  if (cpf && !validarCPF(cpf))
    return showError("np-cpf", "O CPF introduzido não é válido!");
  if (email && !validarEmail(email))
    return showError(
      "np-email",
      "O e-mail introduzido tem um formato inválido!",
    );

  const e1 = parseInt(document.getElementById("np-est1").value);
  const e2 = parseInt(document.getElementById("np-est2").value);
  const e3 = parseInt(document.getElementById("np-est3").value);
  const estudantesIds = [e1, e2, e3].filter((id) => !isNaN(id));
  const CORES = ["#1b5e20", "#2e7d32", "#388e3c", "#43a047", "#558b2f"];
  const newId = Date.now();
  PACIENTES.push({
    id: newId,
    nome,
    cpf: cpf || "000.000.000-00",
    nascimento: document.getElementById("np-nasc").value || "2000-01-01",
    telefone: document.getElementById("np-tel").value || "",
    email: email || "",
    estudantesIds: estudantesIds,
    supervisorId: parseInt(document.getElementById("np-sup").value),
    status: "ativo",
    cor: CORES[PACIENTES.length % CORES.length],
    ini: nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
  });
  EVOLUCOES[newId] = [];
  DOCUMENTOS[newId] = [];
  logAudit("cadastro", "Cadastrou paciente", nome);
  saveData();
  closeModal();
  toast(`Paciente ${nome} cadastrado!`, "success");
  navigate("pacientes");
}

function openModalEditarPaciente(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  const estudantesOptions = USERS.filter((u) => u.papel === "estudante")
    .map((u) => `<option value="${u.id}">${escapeHTML(u.nome)}</option>`)
    .join("");
  const est1 = p.estudantesIds && p.estudantesIds[0] ? p.estudantesIds[0] : "";
  const est2 = p.estudantesIds && p.estudantesIds[1] ? p.estudantesIds[1] : "";
  const est3 = p.estudantesIds && p.estudantesIds[2] ? p.estudantesIds[2] : "";
  openModal(
    `<i class="bi bi-pencil" style="color:var(--sc-green)"></i> Editar Paciente — ${escapeHTML(p.nome)}`,
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label">Nome completo</label><input class="form-control" id="ep-nome" type="text" value="${escapeHTML(p.nome)}"></div><div class="form-group"><label class="form-label">CPF</label><input class="form-control" id="ep-cpf" type="text" value="${escapeHTML(p.cpf)}" oninput="maskCPF(this)"></div></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="ep-tel" type="tel" value="${escapeHTML(p.telefone)}" oninput="maskPhone(this)"></div><div class="form-group"><label class="form-label">E-mail</label><input class="form-control" id="ep-email" type="email" value="${escapeHTML(p.email)}"></div></div><div class="form-row form-row-3"><div class="form-group"><label class="form-label">Estudante 1</label><select class="form-control" id="ep-est1"><option value="">Nenhum</option>${estudantesOptions}</select></div><div class="form-group"><label class="form-label">Estudante 2</label><select class="form-control" id="ep-est2"><option value="">Nenhum</option>${estudantesOptions}</select></div><div class="form-group"><label class="form-label">Estudante 3</label><select class="form-control" id="ep-est3"><option value="">Nenhum</option>${estudantesOptions}</select></div></div><div class="form-group"><label class="form-label">Status</label><select class="form-control" id="ep-status"><option ${p.status === "ativo" ? "selected" : ""}>ativo</option><option ${p.status === "inativo" ? "selected" : ""}>inativo</option></select></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEdicaoPaciente(${pid})"><i class="bi bi-check-lg"></i> Salvar</button>`,
  );
  document.getElementById("ep-est1").value = est1;
  document.getElementById("ep-est2").value = est2;
  document.getElementById("ep-est3").value = est3;
}

function salvarEdicaoPaciente(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  const nome = document.getElementById("ep-nome").value.trim();
  const cpf = document.getElementById("ep-cpf").value.trim();
  const email = document.getElementById("ep-email").value.trim();

  if (!nome) return showError("ep-nome", "Informe o nome completo!");
  if (cpf && !validarCPF(cpf))
    return showError("ep-cpf", "O CPF introduzido não é válido!");
  if (email && !validarEmail(email))
    return showError(
      "ep-email",
      "O e-mail introduzido tem um formato inválido!",
    );

  p.nome = nome;
  p.cpf = cpf;
  p.telefone = document.getElementById("ep-tel").value;
  p.email = email;
  p.status = document.getElementById("ep-status").value;
  const e1 = parseInt(document.getElementById("ep-est1").value);
  const e2 = parseInt(document.getElementById("ep-est2").value);
  const e3 = parseInt(document.getElementById("ep-est3").value);
  p.estudantesIds = [e1, e2, e3].filter((id) => !isNaN(id));
  p.ini = p.nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  logAudit("cadastro", "Atualizou dados do paciente", p.nome);
  saveData();
  closeModal();
  toast("Paciente atualizado!", "success");
  navigate("pacientes");
}

/* ============================================================  USUÁRIO E AGENDAMENTO  */
function openModalNovoUsuario() {
  openModal(
    '<i class="bi bi-person-plus-fill" style="color:var(--sc-green)"></i> Novo Usuário',
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label">Nome completo *</label><input class="form-control" id="nu-nome" type="text"></div><div class="form-group"><label class="form-label">Login *</label><input class="form-control" id="nu-login" type="text"></div></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Senha *</label><input class="form-control" id="nu-pass" type="password"></div><div class="form-group"><label class="form-label">Papel *</label><select class="form-control" id="nu-role"><option value="estudante">Estudante</option><option value="supervisor">Supervisor</option><option value="tecnico">Psicólogo Técnico</option></select></div></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarNovoUsuario()"><i class="bi bi-check-lg"></i> Cadastrar</button>`,
  );
}
function salvarNovoUsuario() {
  const nome = document.getElementById("nu-nome").value.trim();
  const login = document.getElementById("nu-login").value.trim();
  if (!nome || !login) {
    toast("Preencha nome e login", "error");
    return;
  }
  USERS.push({
    id: Date.now(),
    login,
    pass: document.getElementById("nu-pass").value || "1234",
    nome,
    papel: document.getElementById("nu-role").value,
    avatar: nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
    color: "#388e3c",
  });
  logAudit("cadastro", "Cadastrou usuário", nome);
  saveData();
  closeModal();
  toast(`Usuário ${nome} cadastrado!`, "success");
  navigate("acesso");
}

function openModalNovoAgendamento() {
  const meusPacientes = getPacientesPermitidos();
  openModal(
    `Novo Agendamento`,
    `<div class="form-group"><label class="form-label">Paciente</label><select id="ag-pac" class="form-control">${meusPacientes.map((p) => `<option value="${p.id}">${escapeHTML(p.nome)}</option>`).join("")}</select></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Data</label><input type="date" id="ag-data" class="form-control"></div><div class="form-group"><label class="form-label">Hora</label><input type="time" id="ag-hora" class="form-control"></div></div><div class="form-group"><label class="form-label">Local</label><input type="text" id="ag-local" class="form-control" placeholder="Ex: Sala 02"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarAgendamento()">Agendar</button>`,
  );
}

function salvarAgendamento() {
  const pacienteId = parseInt(document.getElementById("ag-pac").value);
  AGENDAMENTOS.push({
    id: Date.now(),
    pacienteId,
    estudanteId:
      currentUser.papel === "estudante"
        ? currentUser.id
        : parseInt(document.getElementById("ag-est")?.value) || 3,
    supervisorId: currentUser.papel === "supervisor" ? currentUser.id : 2,
    data: document.getElementById("ag-data").value,
    hora: document.getElementById("ag-hora").value,
    local: document.getElementById("ag-local").value || "Consultório",
    modalidade: "presencial",
    status: "confirmado",
  });
  const pacNome = PACIENTES.find((p) => p.id === pacienteId)?.nome || "";
  logAudit("agenda", "Criou agendamento", pacNome);
  saveData();
  closeModal();
  toast("Agendamento criado!", "success");
  navigate("agenda");
}

/* ============================================================  TOAST E BUSCA GLOBAL  */
function globalSearch(q) {
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

function toast(msg, type = "info") {
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
let tempoInativo;
function resetarTempoInatividade() {
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
