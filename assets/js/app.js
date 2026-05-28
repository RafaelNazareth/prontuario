/* ============================================================  PERSISTÊNCIA E DADOS  */
const STORAGE_KEY = "pep_fcmscsp_data_v5";

let USERS = [];
let PACIENTES = [];
let ANAMNESES = {};
let EVOLUCOES = {};
let AGENDAMENTOS = [];
let DOCUMENTOS = {};
let AUDITORIA = [];
let ACESSO_PACIENTE = [];

function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[tag],
  );
}

function initData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const data = JSON.parse(stored);
    USERS = data.USERS || [];
    PACIENTES = data.PACIENTES || [];
    ANAMNESES = data.ANAMNESES || {};
    EVOLUCOES = data.EVOLUCOES || {};
    AGENDAMENTOS = data.AGENDAMENTOS || [];
    DOCUMENTOS = data.DOCUMENTOS || {};
    AUDITORIA = data.AUDITORIA || [];
    ACESSO_PACIENTE = data.ACESSO_PACIENTE || [];
  } else {
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
          "Ansiedade generalizada com dificuldade de concentração no trabalho e insônia frequente.",
        historia:
          "Paciente relata início dos sintomas há aproximadamente 2 anos, coincidindo com promoção profissional.",
        historico_medico:
          "Sem diagnósticos psiquiátricos prévios. Nega histórico familiar.",
        medicamentos: "Uso esporádico de melatonina.",
        contexto: "Casada, dois filhos. Trabalha como gerente de projetos.",
        hipoteses: "TAG. Plano: TCC com foco em técnicas de relaxamento.",
        status: "finalizada",
        rascunho: false,
      },
      2: {
        queixa:
          "Episódios de tristeza profunda, desmotivação e retraimento social há 6 meses.",
        historia:
          "Término de relacionamento de 5 anos como evento desencadeante.",
        historico_medico:
          "Episódio depressivo leve na adolescência sem tratamento formal.",
        medicamentos: "Não usa medicamentos.",
        contexto: "Solteiro, mora com os pais. Analista de dados.",
        hipoteses: "Episódio depressivo moderado (F32.1).",
        status: "finalizada",
        rascunho: false,
      },
      3: {
        queixa: "Dificuldades nas relações interpessoais e baixa autoestima.",
        historia: "Histórico de bullying na escola.",
        historico_medico: "Hipotireoidismo controlado.",
        medicamentos: "Levotiroxina 50mcg.",
        contexto: "Mora sozinha, estuda medicina.",
        hipoteses: "Avaliação em andamento.",
        status: "rascunho",
        rascunho: true,
      },
      4: {
        queixa: "Busca de autoconhecimento e auxílio no luto.",
        historia: "Perda recente do pai.",
        historico_medico: "Saudável.",
        medicamentos: "Nenhum.",
        contexto: "Casada.",
        hipoteses: "Luto normal.",
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
          conteudo:
            "Primeira sessão de acolhimento. Paciente apresentou-se receptiva.",
          tags: ["acolhimento", "ansiedade"],
        },
        {
          id: 102,
          num: 2,
          data: "2026-06-08 14:00",
          autor: "Lucas Mendes",
          papel: "estudante",
          tipo: "atendimento",
          conteudo: "Segunda sessão. Exploração da história de vida.",
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
          conteudo: "Sessão inicial de acolhimento. Bruno relatou término.",
          tags: ["acolhimento"],
        },
      ],
      3: [
        {
          id: 301,
          num: 1,
          data: "2026-06-03 15:00",
          autor: "Mariana Costa",
          papel: "estudante",
          tipo: "atendimento",
          conteudo: "Sessão inicial. Apresentou-se reservada.",
          tags: ["acolhimento"],
        },
      ],
      4: [
        {
          id: 401,
          num: 1,
          data: "2026-06-05 09:00",
          autor: "João Silva",
          papel: "estudante",
          tipo: "atendimento",
          conteudo: "Sessão de escuta qualificada sobre a perda.",
          tags: ["luto"],
        },
      ],
      5: [],
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
      {
        id: 4,
        pacienteId: 5,
        estudanteId: 6,
        supervisorId: 2,
        data: "2026-06-04",
        hora: "09:00",
        local: "Sala 03",
        modalidade: "presencial",
        status: "aguardando",
      },
      {
        id: 5,
        pacienteId: 1,
        estudanteId: 6,
        supervisorId: 2,
        data: "2026-06-08",
        hora: "14:00",
        local: "Sala 01",
        modalidade: "presencial",
        status: "confirmado",
      },
      {
        id: 6,
        pacienteId: 2,
        estudanteId: 3,
        supervisorId: 2,
        data: "2026-07-15",
        hora: "16:00",
        local: "Supervisão",
        modalidade: "presencial",
        status: "confirmado",
      },
    ];
    DOCUMENTOS = {
      1: [
        {
          id: "d1",
          nome: "Autorização de Tratamento.pdf",
          tipo: "pdf",
          tamanho: "124 KB",
          data: "2026-05-10",
          autor: "Dr. Carlos Mendes",
        },
        {
          id: "d2",
          nome: "Avaliação Psicológica.pdf",
          tipo: "pdf",
          tamanho: "856 KB",
          data: "2026-05-24",
          autor: "João Silva",
        },
      ],
      2: [
        {
          id: "d3",
          nome: "Encaminhamento.pdf",
          tipo: "pdf",
          tamanho: "78 KB",
          data: "2026-05-29",
          autor: "João Silva",
        },
      ],
      4: [
        {
          id: "d4",
          nome: "Termo_consentimento.pdf",
          tipo: "pdf",
          tamanho: "150 KB",
          data: "2026-06-01",
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
}

function saveData() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
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

/* ============================================================  STATE + SESSÃO  */
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

/* ============================================================  BOOT E LOGIN  */
(function boot() {
  initData();
  const sess = loadSession();
  if (sess) {
    const user = USERS.find((u) => u.id === sess.userId);
    if (user) {
      currentUser = user;
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
  const user = USERS.find((x) => x.login === u && x.pass === p);
  const err = document.getElementById("login-error");
  if (!user) return (err.style.display = "flex");
  err.style.display = "none";
  currentUser = user;
  const startPage = user.papel === "paciente" ? "meu-prontuario" : "dashboard";
  saveSession(user, startPage);
  logAudit("login", "Realizou login no sistema", "");
  document.getElementById("login-page").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  initApp(startPage);
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
}

/* ============================================================  APP INIT  */
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
  const pc = document.getElementById("page-content");
  switch (page) {
    case "dashboard":
      pc.innerHTML = renderDashboard();
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
}

function openProntuario(pid) {
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
  return new Date().getFullYear() - new Date(nasc).getFullYear();
}

/* ============================================================  DASHBOARD E PACIENTES  */
function renderDashboard() {
  const role = currentUser.papel;
  const lista =
    role === "estudante"
      ? PACIENTES.filter(
          (p) =>
            p.estudantesIds &&
            p.estudantesIds.includes(currentUser.id) &&
            p.status === "ativo",
        )
      : PACIENTES.filter((p) => p.status === "ativo");
  const proximos = AGENDAMENTOS.filter((a) => a.data >= "2026-06-01").slice(
    0,
    5,
  );
  const totalEvs = Object.values(EVOLUCOES).reduce((s, v) => s + v.length, 0);
  return `
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-icon stat-icon-green"><i class="bi bi-people-fill"></i></div><div><div class="stat-value">${lista.length}</div><div class="stat-label">Pacientes ativos</div></div></div>
    <div class="stat-card"><div class="stat-icon stat-icon-green2"><i class="bi bi-calendar-check-fill"></i></div><div><div class="stat-value">${AGENDAMENTOS.length}</div><div class="stat-label">Agendamentos</div></div></div>
    <div class="stat-card"><div class="stat-icon stat-icon-amber"><i class="bi bi-journal-medical"></i></div><div><div class="stat-value">${totalEvs}</div><div class="stat-label">Evoluções registradas</div></div></div>
    <div class="stat-card"><div class="stat-icon stat-icon-blue"><i class="bi bi-shield-check-fill"></i></div><div><div class="stat-value">100%</div><div class="stat-label">Integridade dos registros</div></div></div>
  </div>
  <div class="dash-grid">
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-calendar3" style="color:var(--sc-green)"></i>Próximos Atendimentos</span>
        ${role === "tecnico" ? `<button class="btn btn-primary btn-sm" onclick="openModalNovoAgendamento()"><i class="bi bi-plus"></i> Novo</button>` : ""}
      </div>
      <div class="card-body" style="padding:12px">
        <div class="agenda-list">
          ${
            proximos.length > 0
              ? proximos
                  .map((ag) => {
                    const pac = PACIENTES.find((p) => p.id === ag.pacienteId),
                      est = USERS.find((u) => u.id === ag.estudanteId);
                    return `<div class="agenda-item" onclick="openProntuario(${ag.pacienteId})">
            <div class="agenda-time">${ag.hora}</div><div class="agenda-dot" style="background:${pac.cor}"></div>
            <div style="flex:1;min-width:0"><div class="agenda-patient">${escapeHTML(pac.nome)}</div><div class="agenda-meta">${ag.data} · ${escapeHTML(ag.local)} · ${est ? escapeHTML(est.nome) : ""}</div></div>
            <span class="badge ${ag.status === "confirmado" ? "badge-green" : "badge-amber"}">${ag.status}</span></div>`;
                  })
                  .join("")
              : '<div class="empty-state" style="padding:20px"><p style="font-size:13px;color:var(--text3)">Nenhum agendamento futuro</p></div>'
          }
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="bi bi-activity" style="color:var(--sc-green-mid)"></i>Atividade Recente</span></div>
      <div class="card-body" style="padding:6px 16px"><div class="activity-list">
          ${AUDITORIA.slice(0, 5)
            .map(
              (
                a,
              ) => `<div class="activity-item"><div class="activity-icon" style="background:${a.dot}18;color:${a.dot}"><i class="bi bi-circle-fill" style="font-size:8px"></i></div>
            <div><div class="activity-text"><strong>${escapeHTML(a.ator.split(" ").slice(0, 2).join(" "))}</strong> ${escapeHTML(a.acao)} ${a.obj ? `<em style="color:var(--sc-green-dark)">${escapeHTML(a.obj)}</em>` : ""}</div><div class="activity-time">${a.ts}</div></div></div>`,
            )
            .join("")}
      </div></div>
    </div>
  </div>`;
}

function renderPacientes() {
  const role = currentUser.papel;
  const lista =
    role === "estudante"
      ? PACIENTES.filter(
          (p) => p.estudantesIds && p.estudantesIds.includes(currentUser.id),
        )
      : PACIENTES;

  return `
  <div class="page-header"><div class="page-header-left"><h1>${role === "estudante" ? "Meus Casos" : "Pacientes"}</h1><p>${lista.length} ${role === "estudante" ? "casos alocados" : "pacientes cadastrados"}</p></div>
    ${role === "tecnico" ? `<button class="btn btn-primary" onclick="openModalNovoPaciente()"><i class="bi bi-person-plus-fill"></i> Novo paciente</button>` : ""}
  </div>
  <div class="card">
    <div class="card-header" style="padding:12px 18px">
      <div class="filter-bar">
        <div class="search-box"><i class="bi bi-search"></i><input type="text" placeholder="Buscar por nome..." id="pac-search" oninput="filterPacientes(this.value)"></div>
        <select class="filter-select" onchange="filterPacienteStatus(this.value)">
          <option value="">Todos os status</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option>
        </select>
      </div>
    </div>
    <table><thead><tr><th>Paciente</th><th>CPF</th><th>Estudantes</th><th>Supervisor</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody id="pac-tbody">${lista.map(renderPacienteRow).join("")}</tbody></table>
  </div>`;
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

  return `<tr>
    <td><div style="display:flex;align-items:center;gap:10px"><div class="patient-avatar" style="background:${p.cor}">${escapeHTML(p.ini)}</div>
      <div><div style="font-weight:600;font-size:13px">${escapeHTML(p.nome)}</div><div style="font-size:11px;color:var(--text3)">Caso #${p.id} · ${calcIdade(p.nascimento)} anos</div></div></div></td>
    <td style="color:var(--text2)">${escapeHTML(p.cpf)}</td>
    <td style="font-size:12px; max-width: 180px;">${nomesEstudantes}</td>
    <td style="font-size:12px">${sup ? escapeHTML(sup.nome) : "—"}</td>
    <td><span class="badge ${p.status === "ativo" ? "badge-green" : "badge-gray"}">${p.status}</span></td>
    <td><div class="action-btns">
      <button class="btn btn-secondary btn-sm" onclick="openProntuario(${p.id})"><i class="bi bi-file-medical"></i> Prontuário</button>
      ${role === "tecnico" ? `<button class="btn btn-ghost btn-sm" onclick="openModalEditarPaciente(${p.id})"><i class="bi bi-pencil"></i></button>` : ""}
    </div></td>
  </tr>`;
}

function filterPacientes(q) {
  const role = currentUser.papel;
  const lista =
    role === "estudante"
      ? PACIENTES.filter(
          (p) => p.estudantesIds && p.estudantesIds.includes(currentUser.id),
        )
      : PACIENTES;
  document.getElementById("pac-tbody").innerHTML = lista
    .filter((p) => p.nome.toLowerCase().includes(q.toLowerCase()))
    .map(renderPacienteRow)
    .join("");
}

function filterPacienteStatus(s) {
  const role = currentUser.papel;
  const lista =
    role === "estudante"
      ? PACIENTES.filter(
          (p) => p.estudantesIds && p.estudantesIds.includes(currentUser.id),
        )
      : PACIENTES;
  document.getElementById("pac-tbody").innerHTML = (
    s ? lista.filter((p) => p.status === s) : lista
  )
    .map(renderPacienteRow)
    .join("");
}

/* ============================================================  PRONTUÁRIO COMPLETO  */
function renderProntuario(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  const sup = USERS.find((u) => u.id === p.supervisorId);

  const estudantes = (p.estudantesIds || [])
    .map((id) => USERS.find((u) => u.id === id))
    .filter(Boolean);
  const nomesEstudantes =
    estudantes.length > 0
      ? estudantes.map((e) => e.nome).join(", ")
      : "Sem estudante alocado";

  const evs = EVOLUCOES[pid] || [],
    docs = DOCUMENTOS[pid] || [];
  return `
  <div class="back-btn" onclick="navigate('pacientes')"><i class="bi bi-arrow-left"></i> Voltar para pacientes</div>
  <div class="patient-profile">
    <div class="patient-profile-avatar" style="background:${p.cor}">${escapeHTML(p.ini)}</div>
    <div class="patient-profile-info">
      <h2>${escapeHTML(p.nome)}</h2>
      <p>Caso #${p.id} · ${escapeHTML(p.cpf)} · ${calcIdade(p.nascimento)} anos · <span class="badge ${p.status === "ativo" ? "badge-green" : "badge-gray"}">${p.status}</span></p>
      <p style="margin-top:5px;font-size:12px;color:var(--text3)"><i class="bi bi-people"></i> ${escapeHTML(nomesEstudantes)} &nbsp;·&nbsp; <i class="bi bi-person-check"></i> ${sup?.nome}</p>
    </div>
    <div class="patient-profile-meta">
      <div class="meta-item"><div class="meta-label">Evoluções</div><div class="meta-value">${evs.length}</div></div>
      <div class="meta-item"><div class="meta-label">Documentos</div><div class="meta-value">${docs.length}</div></div>
      <div class="meta-item"><div class="meta-label">Atendimentos</div><div class="meta-value">${AGENDAMENTOS.filter((a) => a.pacienteId === pid).length}</div></div>
    </div>
  </div>
  <div class="prontuario-tabs">
    <button class="ptab active" onclick="switchTab(this,'tab-resumo')"><i class="bi bi-grid"></i> Resumo</button>
    <button class="ptab" onclick="switchTab(this,'tab-anamnese')"><i class="bi bi-journal-text"></i> Anamnese</button>
    <button class="ptab" onclick="switchTab(this,'tab-evolucoes')"><i class="bi bi-list-ul"></i> Evoluções <span class="badge badge-teal" style="margin-left:4px">${evs.length}</span></button>
    <button class="ptab" onclick="switchTab(this,'tab-documentos')"><i class="bi bi-paperclip"></i> Documentos <span class="badge badge-teal" style="margin-left:4px">${docs.length}</span></button>
    <button class="ptab" onclick="switchTab(this,'tab-agenda')"><i class="bi bi-calendar3"></i> Agenda</button>
  </div>
  <div id="tab-resumo" class="ptab-content active">${renderTabResumo(pid)}</div>
  <div id="tab-anamnese" class="ptab-content">${renderTabAnamnese(pid)}</div>
  <div id="tab-evolucoes" class="ptab-content">${renderTabEvolucoes(pid)}</div>
  <div id="tab-documentos" class="ptab-content">${renderTabDocumentos(pid)}</div>
  <div id="tab-agenda" class="ptab-content">${renderTabAgendaPaciente(pid)}</div>`;
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
    ams = ANAMNESES[pid];
  const evs = (EVOLUCOES[pid] || []).slice(-3).reverse(),
    ags = AGENDAMENTOS.filter((a) => a.pacienteId === pid).slice(0, 3);
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
    <div class="card"><div class="card-header"><span class="card-title"><i class="bi bi-person-fill" style="color:var(--sc-green)"></i>Dados do Paciente</span>${currentUser.papel === "tecnico" ? `<button class="btn btn-ghost btn-sm" onclick="openModalEditarPaciente(${pid})"><i class="bi bi-pencil"></i></button>` : ""}</div><div class="card-body"><div style="display:grid;gap:8px">
      ${[
        ["Nome", p.nome],
        ["CPF", p.cpf],
        ["Nascimento", p.nascimento],
        ["Telefone", p.telefone],
        ["E-mail", p.email],
      ]
        .map(
          ([l, v]) =>
            `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text3)">${l}</span><span style="font-size:13px;font-weight:500">${escapeHTML(v)}</span></div>`,
        )
        .join("")}
    </div></div></div>
    <div class="card"><div class="card-header"><span class="card-title"><i class="bi bi-journal-medical" style="color:var(--sc-green)"></i>Queixa Principal</span></div><div class="card-body">
      ${ams ? `<p style="font-size:13px;line-height:1.8">${escapeHTML(ams.queixa)}</p><div style="margin-top:10px"><span class="badge ${ams.status === "finalizada" ? "badge-green" : "badge-amber"}">${ams.status === "finalizada" ? "✓ Anamnese finalizada" : "Rascunho"}</span></div>` : `<div class="empty-state" style="padding:24px 0"><div class="empty-state-icon" style="font-size:28px"><i class="bi bi-journal-x"></i></div><p style="font-size:13px;color:var(--text3)">Anamnese não registrada</p></div>`}
    </div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px">
    <div class="card"><div class="card-header"><span class="card-title"><i class="bi bi-clock-history" style="color:var(--sc-green)"></i>Últimas Evoluções</span></div><div class="card-body" style="padding:0">
      ${evs.length ? evs.map((ev) => `<div style="padding:11px 16px;border-bottom:1px solid var(--border)"><div style="display:flex;align-items:center;gap:7px;margin-bottom:4px"><span class="tag tag-teal">${ev.tipo}</span><span style="font-size:11px;color:var(--text3)">#${ev.num} · ${ev.data}</span></div><p style="font-size:12px;line-height:1.6">${escapeHTML(ev.conteudo).substring(0, 120)}...</p></div>`).join("") : `<div class="empty-state" style="padding:28px"><p style="font-size:13px;color:var(--text3)">Nenhuma evolução</p></div>`}
    </div></div>
    <div class="card"><div class="card-header"><span class="card-title"><i class="bi bi-calendar3" style="color:var(--sc-green)"></i>Próximos Agendamentos</span></div><div class="card-body" style="padding:0">
      ${ags.length ? ags.map((ag) => `<div style="padding:11px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px"><div style="text-align:center;background:var(--sc-green-pale);border-radius:7px;padding:6px 10px;min-width:58px"><div style="font-size:16px;font-weight:700;color:var(--sc-green-dark)">${ag.hora}</div><div style="font-size:10px;color:var(--text3)">${ag.data}</div></div><div><div style="font-size:13px;font-weight:500">${escapeHTML(ag.local)}</div><span class="badge ${ag.status === "confirmado" ? "badge-green" : "badge-amber"}" style="margin-top:2px">${ag.status}</span></div></div>`).join("") : `<div class="empty-state" style="padding:28px"><p style="font-size:13px;color:var(--text3)">Nenhum agendamento</p></div>`}
    </div></div>
  </div>`;
}

function renderTabAnamnese(pid) {
  const ams = ANAMNESES[pid],
    role = currentUser.papel,
    canEdit = ["tecnico", "supervisor", "estudante"].includes(role);
  if (!ams)
    return `<div class="card"><div class="card-body"><div class="empty-state"><div class="empty-state-icon"><i class="bi bi-journal-plus"></i></div><h3>Anamnese não registrada</h3>${canEdit ? `<button class="btn btn-primary" style="margin-top:14px" onclick="openModalAnamnese(${pid})"><i class="bi bi-plus"></i> Registrar anamnese</button>` : ""}</div></div></div>`;
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:10px">
      <span class="badge ${ams.status === "finalizada" ? "badge-green" : "badge-amber"}"><i class="bi bi-${ams.status === "finalizada" ? "check-circle-fill" : "pencil-fill"}"></i> ${ams.status === "finalizada" ? "Finalizada" : "Rascunho"}</span>
      ${ams.status === "finalizada" ? `<span style="font-size:12px;color:var(--text3)"><i class="bi bi-lock-fill" style="color:#f59e0b"></i> Registro auditado</span>` : ""}
    </div>
    ${canEdit && ams.status === "rascunho" ? `<button class="btn btn-primary btn-sm" onclick="openModalAnamnese(${pid})"><i class="bi bi-pencil"></i> Editar rascunho</button>` : ""}
  </div>
  <div class="anamnese-grid">
    ${[
      ["bi-chat-quote-fill", "Queixa Principal", ams.queixa],
      ["bi-clock-history", "História do Problema", ams.historia],
      ["bi-hospital", "Histórico Médico/Psicológico", ams.historico_medico],
      ["bi-capsule", "Medicamentos e Substâncias", ams.medicamentos],
      ["bi-house-heart", "Contexto Familiar/Social", ams.contexto],
      ["bi-diagram-3", "Hipóteses e Plano Terapêutico", ams.hipoteses],
    ]
      .map(
        ([ico, tit, txt]) => `
    <div class="anamnese-section"><div class="anamnese-section-title"><i class="bi ${ico}"></i>${tit}</div><div class="anamnese-text">${txt ? escapeHTML(txt) : '<em style="color:var(--text3)">Não informado</em>'}</div></div>`,
      )
      .join("")}
  </div>`;
}

function renderTabEvolucoes(pid) {
  const evs = (EVOLUCOES[pid] || []).slice().reverse(),
    canAdd = ["tecnico", "supervisor", "estudante"].includes(currentUser.papel);
  const TB = {
    atendimento: "badge-teal",
    supervisao: "badge-blue",
    contato: "badge-amber",
    retificacao: "badge-red",
  };
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
    <div><strong>${evs.length}</strong> evoluções &nbsp;·&nbsp; <span style="font-size:12px;color:var(--text3)"><i class="bi bi-lock-fill" style="color:#f59e0b"></i> Imutáveis após salvas</span></div>
    ${canAdd ? `<button class="btn btn-primary" onclick="openModalEvolucao(${pid})"><i class="bi bi-plus-lg"></i> Nova evolução</button>` : ""}
  </div>
  ${evs.length === 0 ? `<div class="card"><div class="card-body"><div class="empty-state"><div class="empty-state-icon"><i class="bi bi-journal-x"></i></div><h3>Nenhuma evolução</h3><p>Registre após cada atendimento.</p></div></div></div>` : ""}
  <div class="evolucao-list">
    ${evs
      .map(
        (ev) => `<div class="evolucao-card">
      <div class="evolucao-header">
        <span class="evolucao-num">Evolução #${ev.num}</span>
        <span class="badge ${TB[ev.tipo] || "badge-gray"}">${ev.tipo}</span>
        <span class="evolucao-date"><i class="bi bi-calendar3"></i> ${ev.data}</span>
        <span class="evolucao-author"><i class="bi bi-person-fill"></i> ${escapeHTML(ev.autor)} <span class="badge badge-gray" style="margin-left:4px">${ev.papel}</span></span>
      </div>
      <div class="evolucao-body">
        <p class="evolucao-content">${escapeHTML(ev.conteudo)}</p>
        <div class="evolucao-tags">${(ev.tags || []).map((t) => `<span class="tag tag-teal"># ${escapeHTML(t)}</span>`).join("")}</div>
        <div class="imutavel-badge"><i class="bi bi-lock-fill"></i> ID imutável: EVO-${ev.id} · Não pode ser editada ou removida</div>
      </div>
    </div>`,
      )
      .join("")}
  </div>`;
}

function renderTabDocumentos(pid) {
  const docs = DOCUMENTOS[pid] || [],
    canUp = ["tecnico", "supervisor", "estudante"].includes(currentUser.papel);
  const IMAP = {
      pdf: "doc-icon-pdf",
      img: "doc-icon-img",
      docx: "doc-icon-docx",
    },
    BIMAP = {
      pdf: "bi-file-pdf-fill",
      img: "bi-file-image-fill",
      docx: "bi-file-earmark-word-fill",
    };
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
    <strong>${docs.length} documentos</strong>
    ${canUp ? `<button class="btn btn-primary" onclick="openModalUploadDocumento(${pid})"><i class="bi bi-upload"></i> Upload</button>` : ""}
  </div>
  ${docs.length === 0 ? `<div class="card"><div class="card-body"><div class="empty-state"><div class="empty-state-icon"><i class="bi bi-folder2-open"></i></div><h3>Nenhum documento</h3></div></div></div>` : ""}
  <div class="doc-grid">
    ${docs
      .map(
        (
          d,
        ) => `<div class="doc-card" onclick="toast('Visualizando: ${escapeHTML(d.nome)}','info')">
      <div class="doc-icon ${IMAP[d.tipo] || "doc-icon-pdf"}"><i class="bi ${BIMAP[d.tipo] || "bi-file-fill"}"></i></div>
      <div class="doc-name">${escapeHTML(d.nome)}</div>
      <div class="doc-meta">${d.tamanho} · ${d.data}</div>
      <div class="doc-meta"><i class="bi bi-person" style="font-size:10px"></i> ${escapeHTML(d.autor)}</div>
    </div>`,
      )
      .join("")}
  </div>`;
}

function renderTabAgendaPaciente(pid) {
  const ags = AGENDAMENTOS.filter((a) => a.pacienteId === pid);
  return `<div class="card"><div class="card-header"><span class="card-title">Histórico de Agendamentos</span></div>
  ${
    !ags.length
      ? `<div class="card-body"><div class="empty-state"><div class="empty-state-icon"><i class="bi bi-calendar-x"></i></div><h3>Nenhum agendamento</h3></div></div>`
      : `
  <table><thead><tr><th>Data</th><th>Hora</th><th>Local</th><th>Modalidade</th><th>Estudante</th><th>Status</th></tr></thead>
  <tbody>${ags
    .map((ag) => {
      const est = USERS.find((u) => u.id === ag.estudanteId);
      return `<tr><td>${ag.data}</td><td><strong>${ag.hora}</strong></td><td>${escapeHTML(ag.local)}</td><td>${ag.modalidade}</td><td>${est ? escapeHTML(est.nome) : "—"}</td><td><span class="badge ${ag.status === "confirmado" ? "badge-green" : "badge-amber"}">${ag.status}</span></td></tr>`;
    })
    .join("")}</tbody></table>`
  }</div>`;
}

/* ============================================================  AGENDA (JUNHO/JULHO 2026)  */
function renderAgenda() {
  const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"],
    DATES = ["01/06", "02/06", "03/06", "04/06", "05/06"],
    HOURS = [
      "08:00",
      "08:30",
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
    ];
  const dayMap = {
    "2026-06-01": 0,
    "2026-06-02": 1,
    "2026-06-03": 2,
    "2026-06-04": 3,
    "2026-06-05": 4,
  };
  const slotMap = {};
  AGENDAMENTOS.forEach((ag) => {
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
  return `<div class="page-header"><div class="page-header-left"><h1>Agenda</h1><p>Junho e Julho de 2026</p></div>
    ${currentUser.papel === "tecnico" ? `<button class="btn btn-primary" onclick="openModalNovoAgendamento()"><i class="bi bi-plus-lg"></i> Novo agendamento</button>` : ""}
  </div>
  <div class="card" style="overflow:auto;margin-bottom:20px">
    <div class="calendar-grid">
      <div class="cal-header">Hora</div>${DAYS.map((d, i) => `<div class="cal-header">${d}<br><span style="font-size:10px">${DATES[i]}</span></div>`).join("")}
      ${HOURS.map(
        (h) =>
          `<div class="cal-hour-label">${h}</div>${DAYS.map((_, di) => {
            const s = slotMap[`${di}_${h}`];
            return `<div class="cal-slot">${s ? `<div class="cal-event ${s.cls}" onclick="openProntuario(${s.ag.pacienteId})">${escapeHTML(s.label)}<br>${s.hora}</div>` : ""}</div>`;
          }).join("")}`,
      ).join("")}
    </div>
  </div>
  <div class="card"><div class="card-header"><span class="card-title">Lista Geral de Agendamentos (Junho/Julho)</span></div>
  <table><thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Status</th></tr></thead>
  <tbody>${AGENDAMENTOS.map((ag) => {
    const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
    return `<tr><td>${ag.data}</td><td>${ag.hora}</td><td>${escapeHTML(pac ? pac.nome : "")}</td><td><span class="badge badge-green">${ag.status}</span></td></tr>`;
  }).join("")}</tbody></table></div>`;
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
  return `
  <div class="page-header">
    <div class="page-header-left"><h1>Acesso & Usuários</h1><p>Perfis e permissões da plataforma</p></div>
    <button class="btn btn-primary" onclick="openModalNovoUsuario()"><i class="bi bi-person-plus-fill"></i> Novo usuário</button>
  </div>
  <div class="users-grid" style="margin-bottom:22px">
    ${USERS.filter((u) => u.papel !== "paciente")
      .map(
        (u) => `<div class="user-card">
      <div class="user-card-header">
        <div class="user-card-avatar" style="background:${RCOLORS[u.papel] || "#94a3b8"}">${escapeHTML(u.avatar)}</div>
        <div><div class="user-card-name">${escapeHTML(u.nome)}</div><div class="user-card-email">${escapeHTML(u.login)}@fcmscsp.edu.br</div></div>
        <span class="badge ${RBADGE[u.papel] || "badge-gray"}" style="margin-left:auto">${RLABELS[u.papel]}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="toast('Editando: ${escapeHTML(u.nome)}','info')"><i class="bi bi-pencil"></i> Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="toast('Permissões de ${escapeHTML(u.nome)}','info')"><i class="bi bi-shield-check"></i></button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
        <div class="user-stat"><div class="user-stat-val" style="color:var(--sc-green-dark)">${u.papel === "estudante" ? PACIENTES.filter((p) => p.estudantesIds && p.estudantesIds.includes(u.id)).length : PACIENTES.length}</div><div class="user-stat-label">Casos</div></div>
        <div class="user-stat"><div class="user-stat-val" style="color:var(--sc-green-dark)">Ativo</div><div class="user-stat-label">Status</div></div>
      </div>
    </div>`,
      )
      .join("")}
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title"><i class="bi bi-table" style="color:var(--sc-green)"></i>Matriz de Permissões</span></div>
    <div class="card-body" style="overflow-x:auto">
      <table class="perm-table">
        <thead><tr><th>Funcionalidade</th><th>Técnico</th><th>Supervisor</th><th>Estudante</th><th>Paciente</th></tr></thead>
        <tbody>${[
          [
            "Ver lista de casos",
            '<i class="bi bi-check-circle-fill perm-yes"></i> Todos',
            '<i class="bi bi-check-circle-fill perm-yes"></i> Todos',
            '<span class="perm-cond">Somente seus</span>',
            '<span class="perm-cond">Somente o seu</span>',
          ],
          [
            "Cadastrar/editar paciente",
            '<i class="bi bi-check-circle-fill perm-yes"></i>',
            '<span class="perm-cond">Não (padrão)</span>',
            '<span class="perm-cond">Não (padrão)</span>',
            '<i class="bi bi-x-circle-fill perm-no"></i>',
          ],
          [
            "Registrar anamnese",
            '<i class="bi bi-check-circle-fill perm-yes"></i>',
            '<i class="bi bi-check-circle-fill perm-yes"></i>',
            '<span class="perm-cond">Caso alocado</span>',
            '<i class="bi bi-x-circle-fill perm-no"></i>',
          ],
          [
            "Adicionar evolução",
            '<i class="bi bi-check-circle-fill perm-yes"></i>',
            '<i class="bi bi-check-circle-fill perm-yes"></i>',
            '<span class="perm-cond">Caso alocado</span>',
            '<i class="bi bi-x-circle-fill perm-no"></i>',
          ],
          [
            "Editar/remover evolução",
            '<span class="perm-never">NUNCA</span>',
            '<span class="perm-never">NUNCA</span>',
            '<span class="perm-never">NUNCA</span>',
            '<i class="bi bi-x-circle-fill perm-no"></i>',
          ],
          [
            "Upload de documentos",
            '<i class="bi bi-check-circle-fill perm-yes"></i>',
            '<i class="bi bi-check-circle-fill perm-yes"></i>',
            '<span class="perm-cond">Caso alocado</span>',
            '<i class="bi bi-x-circle-fill perm-no"></i>',
          ],
          [
            "Criar/editar agendamentos",
            '<i class="bi bi-check-circle-fill perm-yes"></i> único',
            '<span class="perm-cond">Somente ver</span>',
            '<span class="perm-cond">Somente ver</span>',
            '<span class="perm-cond">Somente ver</span>',
          ],
          [
            "Exportar prontuário (PDF)",
            '<i class="bi bi-check-circle-fill perm-yes"></i>',
            '<i class="bi bi-check-circle-fill perm-yes"></i>',
            '<span class="perm-cond">Somente do caso</span>',
            '<span class="perm-cond">Somente leitura</span>',
          ],
        ]
          .map(
            ([f, ...cols]) =>
              `<tr><td style="font-weight:500">${f}</td>${cols.map((c) => `<td style="text-align:center">${c}</td>`).join("")}</tr>`,
          )
          .join("")}</tbody>
      </table>
    </div>
    <div style="padding:11px 18px;background:#fffbeb;border-top:1px solid var(--border);display:flex;align-items:center;gap:8px;font-size:12px;color:#92400e">
      <i class="bi bi-exclamation-triangle-fill" style="color:#f59e0b"></i>
      <strong>Regra crítica:</strong> Evoluções não podem ser editadas ou removidas após salvas.
    </div>
  </div>`;
}

/* ============================================================  ACESSO PACIENTE (FUNCIONAL COM PDF E BUSCA)  */
function renderAcessoPaciente() {
  return `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Acesso do Paciente</h1>
      <p>Solicitações formais de acesso ao prontuário (somente leitura)</p>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 340px;gap:20px">
    <div>
      <div class="card" style="margin-bottom:18px">
        <div class="card-header"><span class="card-title">Solicitações Registradas</span></div>
        <div class="card-body" style="padding:12px">
          ${ACESSO_PACIENTE.map(
            (req) => `
          <div class="access-request-card" style="margin-bottom:10px;display:flex;align-items:center;gap:12px;padding:14px;border:1px solid var(--border);border-radius:8px">
            <div style="flex:1">
              <div style="font-weight:600">${escapeHTML(req.nome)}</div>
              <div style="font-size:12px;color:var(--text3)">Solicitado em: ${req.solicitacao} · ${escapeHTML(req.protocolo)}</div>
            </div>
            <span class="badge ${req.status === "liberado" ? "badge-green" : "badge-amber"}">${req.status}</span>
            <div style="display:flex;gap:6px">
              ${req.status === "pendente" ? `<button class="btn btn-primary btn-sm" onclick="liberarAcessoPaciente(${req.id})"><i class="bi bi-check"></i> Liberar Online</button>` : ""}
              <button class="btn btn-secondary btn-sm" onclick="gerarPdfProntuario(${req.pacienteId})"><i class="bi bi-file-pdf"></i> Gerar PDF</button>
            </div>
          </div>`,
          ).join("")}
        </div>
      </div>
    </div>
    
    <div class="card" style="align-self:start">
      <div class="card-header"><span class="card-title">Nova Solicitação</span></div>
      <div class="card-body">
        <div class="form-group" style="position:relative;">
          <label class="form-label">Buscar Paciente</label>
          <input type="text" id="req-pac-busca" class="form-control" placeholder="Digite o nome..." oninput="filtrarPacientesSolicitacao(this.value)" autocomplete="off">
          <input type="hidden" id="req-pac-id">
          <div id="autocomplete-lista" style="position:absolute; top:100%; left:0; right:0; background:var(--surface); border:1px solid var(--border); border-radius:7px; max-height:200px; overflow-y:auto; z-index:100; display:none; box-shadow:var(--shadow-md); margin-top:4px;">
          </div>
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="novaSolicitacaoPaciente()"><i class="bi bi-plus"></i> Registrar Solicitação</button>
      </div>
    </div>
  </div>`;
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
        (p) => `
      <div style="padding:10px 12px; font-size:13px; cursor:pointer; border-bottom:1px solid var(--border);" 
           onclick="selecionarPacienteSolicitacao(${p.id}, '${escapeHTML(p.nome)}')"
           onmouseover="this.style.background='var(--sc-green-pale)'" 
           onmouseout="this.style.background='transparent'">
        <strong>${escapeHTML(p.nome)}</strong> <br>
        <small style="color:var(--text3)">CPF: ${escapeHTML(p.cpf)}</small>
      </div>`,
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
  if (lista && e.target.id !== "req-pac-busca") {
    lista.style.display = "none";
  }
});

function liberarAcessoPaciente(reqId) {
  const req = ACESSO_PACIENTE.find((r) => r.id === reqId);
  if (req) {
    req.status = "liberado";
    req.liberacao = new Date().toISOString().split("T")[0];
    logAudit("cadastro", "Liberou acesso digital ao prontuário", req.nome);
    saveData();
    toast("Acesso online liberado para o paciente!", "success");
    navigate("acesso-pac");
  }
}

function novaSolicitacaoPaciente() {
  const pid = parseInt(document.getElementById("req-pac-id").value);
  if (isNaN(pid))
    return toast("Selecione um paciente na lista primeiro", "error");
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
    logAudit("cadastro", "Registrou solicitação de acesso", p.nome);
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
            (e) => `
        <div style="margin-bottom:15px; border-bottom:1px solid #ccc; padding-bottom:10px;">
          <p style="font-size:12px; color:#555; margin-bottom:5px;">
            <strong>Data:</strong> ${e.data} | <strong>Responsável:</strong> ${escapeHTML(e.autor)}
          </p>
          <p style="margin-top:0;">${escapeHTML(e.conteudo)}</p>
        </div>`,
          )
          .join("")
      : "<p>Nenhuma evolução registrada.</p>";

  const html = `
  <!DOCTYPE html>
  <html lang="pt-br">
  <head>
      <meta charset="UTF-8">
      <title>Prontuário - ${escapeHTML(p.nome)}</title>
      <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          h1 { color: #1b5e20; border-bottom: 2px solid #1b5e20; padding-bottom: 10px; margin-bottom: 5px; }
          h2 { color: #2e7d32; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom:5px; }
          .header { margin-bottom: 30px; }
          .header p { color: #555; font-size: 14px; margin-top:0; }
          .info-box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9; }
          .info-box p { margin: 8px 0; }
      </style>
  </head>
  <body>
      <div class="header">
          <h1>Prontuário Eletrônico</h1>
          <p>Faculdade de Ciências Médicas da Santa Casa de São Paulo (FCMSCSP)</p>
      </div>
      <div class="info-box">
          <strong>Paciente:</strong> ${escapeHTML(p.nome)} <br>
          <strong>CPF:</strong> ${escapeHTML(p.cpf)} <br>
          <strong>Nascimento:</strong> ${p.nascimento} <br>
          <strong>ID do Caso:</strong> #${p.id}
      </div>
      <h2>Anamnese</h2>
      <div class="info-box">
          <p><strong>Queixa Principal:</strong><br> ${escapeHTML(ams.queixa || "Não registrada")}</p>
          <p><strong>História:</strong><br> ${escapeHTML(ams.historia || "Não registrada")}</p>
          <p><strong>Histórico Médico/Psicológico:</strong><br> ${escapeHTML(ams.historico_medico || "Não registrado")}</p>
      </div>
      <h2>Evoluções</h2>
      ${evsHtml}
      <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #777;">
          Documento gerado em ${new Date().toLocaleString("pt-BR")} <br>
          Uso exclusivo e confidencial.
      </div>
  </body>
  </html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = function () {
    printWindow.print();
  };
  toast("Documento gerado para impressão/PDF!", "success");
  logAudit("export", "Gerou e exportou PDF do prontuário", p.nome);
  saveData();
}

/* ============================================================  AUDITORIA  */
function renderAuditoria() {
  const TIPO_ICONS = {
    login: "bi-box-arrow-in-right",
    evolucao: "bi-journal-plus",
    agenda: "bi-calendar-plus",
    export: "bi-file-pdf",
    anamnese: "bi-journal-text",
    cadastro: "bi-person-plus",
  };
  return `
  <div class="page-header"><div class="page-header-left"><h1>Trilha de Auditoria</h1></div></div>
  <div class="card"><div class="card-body" style="padding:0 16px">
    ${AUDITORIA.map(
      (
        a,
        i,
      ) => `<div class="audit-item"><div class="audit-line"><div class="audit-dot" style="background:${a.dot}"></div>${i < AUDITORIA.length - 1 ? '<div class="audit-connector"></div>' : ""}</div>
    <div class="audit-body"><div class="audit-action"><i class="bi ${TIPO_ICONS[a.tipo] || "bi-dot"}" style="color:${a.dot};margin-right:5px"></i><strong>${escapeHTML(a.ator)}</strong> ${escapeHTML(a.acao)} ${a.obj ? `<em style="color:var(--sc-green-dark)">${escapeHTML(a.obj)}</em>` : ""}</div><div class="audit-time">${a.ts}</div></div></div>`,
    ).join("")}
  </div></div>`;
}

/* ============================================================  MEU PRONTUÁRIO (PACIENTE)  */
function renderMeuProntuario() {
  const pid = 4;
  const p = PACIENTES.find((x) => x.id === pid);
  const ams = ANAMNESES[pid];
  const evs = EVOLUCOES[pid] || [];

  const acessoInfo = ACESSO_PACIENTE.find((a) => a.pacienteId === pid);
  const estaLiberado = acessoInfo && acessoInfo.status === "liberado";

  if (!estaLiberado) {
    return `<div class="empty-state">
      <div class="empty-state-icon"><i class="bi bi-lock"></i></div>
      <h3>Acesso Restrito</h3><p>O seu acesso ao prontuário digital ainda não foi libertado pela clínica.</p>
    </div>`;
  }

  return `<div style="max-width:800px;margin:0 auto">
    <div style="background:var(--sc-green-dark);color:#fff;border-radius:12px;padding:22px 26px;margin-bottom:22px;display:flex;align-items:center;gap:16px">
      <div style="width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700">MF</div>
      <div><div style="font-size:17px;font-weight:700">${escapeHTML(p.nome)}</div><div style="font-size:13px;color:rgba(255,255,255,.6)">Acesso somente leitura · ${escapeHTML(p.cpf)}</div></div>
      <div style="margin-left:auto;text-align:right"><button class="btn btn-secondary btn-sm" style="color:#111" onclick="toast('O seu prontuário foi transferido.','success')"><i class="bi bi-download"></i> Baixar PDF</button></div>
    </div>
    <div class="card" style="margin-bottom:18px"><div class="card-header"><span class="card-title">A sua Anamnese</span></div>
      <div class="card-body">${ams ? `<p>${escapeHTML(ams.queixa)}</p><hr><p>${escapeHTML(ams.historia)}</p>` : `<p>Sem registos.</p>`}</div>
    </div>
    <div class="card"><div class="card-header"><span class="card-title">As suas Evoluções de Consulta</span></div>
      <div class="card-body" style="padding:0">
        ${
          evs.length > 0
            ? evs
                .map(
                  (
                    ev,
                  ) => `<div style="padding:14px 16px;border-bottom:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text3);margin-bottom:6px">${ev.data} · Psicólogo responsável: ${escapeHTML(ev.autor)}</div>
          <p style="font-size:13px">${escapeHTML(ev.conteudo)}</p>
        </div>`,
                )
                .join("")
            : `<div style="padding:20px"><p>Sem evoluções.</p></div>`
        }
      </div>
    </div>
  </div>`;
}

/* ============================================================  MODAIS (AÇÕES DE ESCRITA)  */
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

function openModalEvolucao(pid) {
  openModal(
    `Nova Evolução`,
    `<div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Data/hora</label><input type="datetime-local" class="form-control" id="ev-data" value="${new Date().toISOString().slice(0, 16)}"></div>
      <div class="form-group"><label class="form-label">Tipo</label><select class="form-control" id="ev-tipo"><option value="atendimento">Atendimento</option><option value="supervisao">Supervisão</option></select></div>
    </div>
    <div class="form-group"><label class="form-label">Conteúdo *</label><textarea class="form-control" id="ev-content" rows="6"></textarea></div>
    <div class="form-group"><label class="form-label">Tags (separadas por vírgula)</label><input type="text" class="form-control" id="ev-tags"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEvolucao(${pid})">Salvar Imutável</button>`,
  );
}

function salvarEvolucao(pid) {
  const content = document.getElementById("ev-content").value.trim();
  if (!content) return toast("Conteúdo vazio!", "error");
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

function openModalUploadDocumento(pid) {
  openModal(
    `Upload de Documento (Simulado)`,
    `<div class="form-group"><label class="form-label">Nome do ficheiro</label><input type="text" id="up-nome" class="form-control" placeholder="Ex: Laudo_Medico.pdf"></div>
     <div class="form-group"><label class="form-label">Tipo</label><select id="up-tipo" class="form-control"><option value="pdf">PDF</option><option value="img">Imagem</option><option value="docx">Word</option></select></div>
     <div class="form-group"><label class="form-label">Ficheiro</label><input type="file" class="form-control"></div>`,
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
    `<div class="form-group"><label class="form-label">Queixa principal *</label><textarea class="form-control" id="am-queixa" rows="2">${escapeHTML(ams.queixa || "")}</textarea></div>
     <div class="form-group"><label class="form-label">História do problema</label><textarea class="form-control" id="am-historia" rows="3">${escapeHTML(ams.historia || "")}</textarea></div>
     <div class="form-group"><label class="form-label">Histórico médico/psicológico</label><textarea class="form-control" id="am-medico" rows="2">${escapeHTML(ams.historico_medico || "")}</textarea></div>
     <div class="form-row form-row-2"><div class="form-group"><label class="form-label">Medicamentos/substâncias</label><textarea class="form-control" id="am-med" rows="2">${escapeHTML(ams.medicamentos || "")}</textarea></div><div class="form-group"><label class="form-label">Contexto familiar/social</label><textarea class="form-control" id="am-ctx" rows="2">${escapeHTML(ams.contexto || "")}</textarea></div></div>
     <div class="form-group"><label class="form-label">Hipóteses / Plano terapêutico</label><textarea class="form-control" id="am-hipo" rows="2">${escapeHTML(ams.hipoteses || "")}</textarea></div>`,
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

function openModalNovoPaciente() {
  const estudantesOptions = USERS.filter((u) => u.papel === "estudante")
    .map((u) => `<option value="${u.id}">${escapeHTML(u.nome)}</option>`)
    .join("");
  openModal(
    '<i class="bi bi-person-plus-fill" style="color:var(--sc-green)"></i> Novo Paciente',
    `<div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Nome completo *</label><input class="form-control" id="np-nome" type="text"></div>
      <div class="form-group"><label class="form-label">CPF *</label><input class="form-control" id="np-cpf" type="text" placeholder="000.000.000-00"></div>
    </div>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Data de nascimento</label><input class="form-control" id="np-nasc" type="date"></div>
      <div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="np-tel" type="tel"></div>
    </div>
    <div class="form-group"><label class="form-label">E-mail</label><input class="form-control" id="np-email" type="email"></div>
    <div class="form-group"><label class="form-label">Supervisor</label><select class="form-control" id="np-sup">${USERS.filter(
      (u) => u.papel === "supervisor",
    )
      .map((u) => `<option value="${u.id}">${escapeHTML(u.nome)}</option>`)
      .join("")}</select></div>
    <div class="form-row form-row-3">
      <div class="form-group"><label class="form-label">Estudante 1</label><select class="form-control" id="np-est1"><option value="">Nenhum</option>${estudantesOptions}</select></div>
      <div class="form-group"><label class="form-label">Estudante 2</label><select class="form-control" id="np-est2"><option value="">Nenhum</option>${estudantesOptions}</select></div>
      <div class="form-group"><label class="form-label">Estudante 3</label><select class="form-control" id="np-est3"><option value="">Nenhum</option>${estudantesOptions}</select></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarNovoPaciente()"><i class="bi bi-check-lg"></i> Cadastrar</button>`,
  );
}

function salvarNovoPaciente() {
  const nome = document.getElementById("np-nome").value.trim();
  if (!nome) {
    toast("Informe o nome", "error");
    return;
  }

  const e1 = parseInt(document.getElementById("np-est1").value);
  const e2 = parseInt(document.getElementById("np-est2").value);
  const e3 = parseInt(document.getElementById("np-est3").value);
  const estudantesIds = [e1, e2, e3].filter((id) => !isNaN(id));

  const CORES = ["#1b5e20", "#2e7d32", "#388e3c", "#43a047", "#558b2f"];
  const newId = Date.now();

  PACIENTES.push({
    id: newId,
    nome,
    cpf: document.getElementById("np-cpf").value || "000.000.000-00",
    nascimento: document.getElementById("np-nasc").value || "2000-01-01",
    telefone: document.getElementById("np-tel").value || "",
    email: document.getElementById("np-email").value || "",
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
    `<div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Nome completo</label><input class="form-control" id="ep-nome" type="text" value="${escapeHTML(p.nome)}"></div>
      <div class="form-group"><label class="form-label">CPF</label><input class="form-control" id="ep-cpf" type="text" value="${escapeHTML(p.cpf)}"></div>
    </div>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="ep-tel" type="tel" value="${escapeHTML(p.telefone)}"></div>
      <div class="form-group"><label class="form-label">E-mail</label><input class="form-control" id="ep-email" type="email" value="${escapeHTML(p.email)}"></div>
    </div>
    <div class="form-row form-row-3">
      <div class="form-group"><label class="form-label">Estudante 1</label><select class="form-control" id="ep-est1"><option value="">Nenhum</option>${estudantesOptions}</select></div>
      <div class="form-group"><label class="form-label">Estudante 2</label><select class="form-control" id="ep-est2"><option value="">Nenhum</option>${estudantesOptions}</select></div>
      <div class="form-group"><label class="form-label">Estudante 3</label><select class="form-control" id="ep-est3"><option value="">Nenhum</option>${estudantesOptions}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Status</label><select class="form-control" id="ep-status"><option ${p.status === "ativo" ? "selected" : ""}>ativo</option><option ${p.status === "inativo" ? "selected" : ""}>inativo</option></select></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEdicaoPaciente(${pid})"><i class="bi bi-check-lg"></i> Salvar</button>`,
  );

  document.getElementById("ep-est1").value = est1;
  document.getElementById("ep-est2").value = est2;
  document.getElementById("ep-est3").value = est3;
}

function salvarEdicaoPaciente(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  p.nome = document.getElementById("ep-nome").value;
  p.cpf = document.getElementById("ep-cpf").value;
  p.telefone = document.getElementById("ep-tel").value;
  p.email = document.getElementById("ep-email").value;
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

function openModalNovoUsuario() {
  openModal(
    '<i class="bi bi-person-plus-fill" style="color:var(--sc-green)"></i> Novo Utilizador',
    `<div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Nome completo *</label><input class="form-control" id="nu-nome" type="text"></div>
      <div class="form-group"><label class="form-label">Login *</label><input class="form-control" id="nu-login" type="text"></div>
    </div>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Senha *</label><input class="form-control" id="nu-pass" type="password"></div>
      <div class="form-group"><label class="form-label">Papel *</label><select class="form-control" id="nu-role"><option value="estudante">Estudante</option><option value="supervisor">Supervisor</option><option value="tecnico">Psicólogo Técnico</option></select></div>
    </div>`,
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
  logAudit("cadastro", "Cadastrou novo utilizador no sistema", nome);
  saveData();
  closeModal();
  toast(`Utilizador ${nome} cadastrado!`, "success");
  navigate("acesso");
}

function openModalNovoAgendamento() {
  openModal(
    `Novo Agendamento`,
    `<div class="form-group"><label class="form-label">Paciente</label><select id="ag-pac" class="form-control">${PACIENTES.map((p) => `<option value="${p.id}">${escapeHTML(p.nome)}</option>`).join("")}</select></div>
     <div class="form-row form-row-2"><div class="form-group"><label class="form-label">Data</label><input type="date" id="ag-data" class="form-control"></div>
     <div class="form-group"><label class="form-label">Hora</label><input type="time" id="ag-hora" class="form-control"></div></div>
     <div class="form-group"><label class="form-label">Local</label><input type="text" id="ag-local" class="form-control" placeholder="Ex: Sala 02"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarAgendamento()">Agendar</button>`,
  );
}

function salvarAgendamento() {
  AGENDAMENTOS.push({
    id: Date.now(),
    pacienteId: parseInt(document.getElementById("ag-pac").value),
    estudanteId: 3,
    supervisorId: 2,
    data: document.getElementById("ag-data").value,
    hora: document.getElementById("ag-hora").value,
    local: document.getElementById("ag-local").value || "Consultório",
    modalidade: "presencial",
    status: "confirmado",
  });
  logAudit(
    "agenda",
    "Criou novo agendamento",
    PACIENTES.find(
      (p) => p.id === parseInt(document.getElementById("ag-pac").value),
    ).nome,
  );
  saveData();
  closeModal();
  toast("Agendamento criado!", "success");
  navigate("agenda");
}

/* ============================================================  TOAST E BUSCA GLOBAL  */
function globalSearch(q) {
  if (!q || q.length < 2) return;
  const found = PACIENTES.filter((p) =>
    p.nome.toLowerCase().includes(q.toLowerCase()),
  );
  if (found.length === 1) openProntuario(found[0].id);
}

function toast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="bi bi-info-circle-fill"></i><span>${msg}</span>`;
  document.getElementById("toast-container").appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 300);
  }, 3000);
}
