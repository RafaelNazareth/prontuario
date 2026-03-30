/* ============================================================  DATA  */
const USERS = [
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
    id: 4,
    login: "paciente",
    pass: "1234",
    nome: "Maria Fernanda",
    papel: "paciente",
    avatar: "MF",
    color: "#43a047",
  },
];
const PACIENTES = [
  {
    id: 1,
    nome: "Ana Lima",
    cpf: "123.456.789-00",
    nascimento: "1990-03-15",
    telefone: "(11) 98765-4321",
    email: "ana@email.com",
    estudanteId: 3,
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
    estudanteId: 3,
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
    estudanteId: 3,
    supervisorId: 2,
    status: "ativo",
    cor: "#388e3c",
    ini: "CS",
  },
  {
    id: 4,
    nome: "Diego Almeida",
    cpf: "456.789.012-33",
    nascimento: "1975-02-28",
    telefone: "(11) 97654-3210",
    email: "diego@email.com",
    estudanteId: 3,
    supervisorId: 2,
    status: "inativo",
    cor: "#6d4c41",
    ini: "DA",
  },
  {
    id: 5,
    nome: "Elisa Ferreira",
    cpf: "567.890.123-44",
    nascimento: "2001-09-18",
    telefone: "(11) 96543-2109",
    email: "elisa@email.com",
    estudanteId: 3,
    supervisorId: 2,
    status: "ativo",
    cor: "#43a047",
    ini: "EF",
  },
];
const ANAMNESES = {
  1: {
    queixa:
      "Ansiedade generalizada com dificuldade de concentração no trabalho e insônia frequente.",
    historia:
      "Paciente relata início dos sintomas há aproximadamente 2 anos, coincidindo com promoção profissional e aumento de responsabilidades.",
    historico_medico:
      "Sem diagnósticos psiquiátricos prévios. Faz acompanhamento com clínico geral. Nega histórico familiar de transtornos mentais.",
    medicamentos:
      "Uso esporádico de melatonina para auxílio no sono (automedicação).",
    contexto:
      "Casada, dois filhos. Trabalha como gerente de projetos em empresa de TI. Relata bom suporte familiar.",
    hipoteses:
      "TAG. Plano: TCC com foco em técnicas de relaxamento e reestruturação cognitiva. Frequência quinzenal.",
    status: "finalizada",
    rascunho: false,
  },
  2: {
    queixa:
      "Episódios de tristeza profunda, desmotivação e retraimento social há 6 meses.",
    historia:
      "Término de relacionamento de 5 anos como evento desencadeante. Dificuldades para retomar a rotina habitual.",
    historico_medico:
      "Episódio depressivo leve na adolescência sem tratamento formal. Nega uso de medicamentos.",
    medicamentos: "Não usa medicamentos.",
    contexto:
      "Solteiro, mora com os pais. Analista de dados. Rede de suporte restrita no momento.",
    hipoteses:
      "Episódio depressivo moderado (F32.1). Encaminhamento para avaliação psiquiátrica em paralelo.",
    status: "finalizada",
    rascunho: false,
  },
  3: {
    queixa: "Dificuldades nas relações interpessoais e baixa autoestima.",
    historia:
      "Histórico de bullying na escola. Dificuldades de estabelecer vínculos desde a adolescência.",
    historico_medico:
      "Hipotireoidismo controlado. Nega histórico de transtornos psiquiátricos.",
    medicamentos: "Levotiroxina 50mcg.",
    contexto:
      "Mora sozinha, estuda medicina. Família residente em outro estado.",
    hipoteses:
      "Avaliação em andamento. Possível traço ansioso e dificuldades de vinculação.",
    status: "rascunho",
    rascunho: true,
  },
};
const EVOLUCOES = {
  1: [
    {
      id: 101,
      num: 1,
      data: "2026-01-10 14:00",
      autor: "João Silva",
      papel: "estudante",
      tipo: "atendimento",
      conteudo:
        "Primeira sessão de acolhimento. Paciente apresentou-se receptiva e colaborativa. Relatou principais queixas relacionadas à ansiedade no ambiente de trabalho. Foram apresentados os objetivos e o enquadramento do atendimento. Paciente demonstrou boa aliança terapêutica inicial.",
      tags: ["acolhimento", "ansiedade"],
    },
    {
      id: 102,
      num: 2,
      data: "2026-01-24 14:00",
      autor: "João Silva",
      papel: "estudante",
      tipo: "atendimento",
      conteudo:
        "Segunda sessão. Exploração da história de vida e contexto familiar. Identificação de padrões de pensamento ansiogênicos relacionados ao perfeccionismo e medo de falhar. Introdução a técnicas de respiração diafragmática.",
      tags: ["TCC", "ansiedade", "técnica"],
    },
    {
      id: 103,
      num: 3,
      data: "2026-02-07 16:00",
      autor: "Profa. Ana Beatriz",
      papel: "supervisor",
      tipo: "supervisao",
      conteudo:
        "Supervisão realizada em grupo. Discutida a formulação do caso de Ana Lima. Orientei o estudante sobre aprofundamento da psicoeducação sobre ansiedade e foco nas crenças nucleares identificadas. Progresso do caso considerado satisfatório.",
      tags: ["supervisão"],
    },
    {
      id: 104,
      num: 4,
      data: "2026-02-14 14:00",
      autor: "João Silva",
      papel: "estudante",
      tipo: "atendimento",
      conteudo:
        "Quarta sessão. Paciente trouxe registro de pensamentos automáticos realizado em casa. Trabalho de reestruturação cognitiva. Foram identificadas crenças relacionadas à necessidade de aprovação. Paciente demonstra crescente autoconsciência.",
      tags: ["TCC", "registro de pensamentos"],
    },
  ],
  2: [
    {
      id: 201,
      num: 1,
      data: "2026-01-15 10:00",
      autor: "João Silva",
      papel: "estudante",
      tipo: "atendimento",
      conteudo:
        "Sessão inicial de acolhimento. Bruno relatou o término como evento precipitante. Choro durante a sessão, mas boa capacidade de verbalização. Avaliação de risco: nega ideação suicida. Foram alinhados objetivos terapêuticos.",
      tags: ["acolhimento", "depressão", "avaliação de risco"],
    },
    {
      id: 202,
      num: 2,
      data: "2026-01-29 10:00",
      autor: "João Silva",
      papel: "estudante",
      tipo: "atendimento",
      conteudo:
        "Segunda sessão. Exploração do luto pelo término. Paciente com melhora discreta do humor. Estratégias de ativação comportamental. Encaminhamento para avaliação psiquiátrica realizado.",
      tags: ["ativação comportamental", "luto"],
    },
    {
      id: 203,
      num: 3,
      data: "2026-02-12 10:00",
      autor: "João Silva",
      papel: "estudante",
      tipo: "atendimento",
      conteudo:
        "Terceira sessão. Paciente relatou consulta psiquiátrica: iniciou fluoxetina 20mg. Discutidos efeitos esperados e importância da continuidade do tratamento.",
      tags: ["psiquiatria", "medicação"],
    },
  ],
  3: [
    {
      id: 301,
      num: 1,
      data: "2026-02-01 15:00",
      autor: "João Silva",
      papel: "estudante",
      tipo: "atendimento",
      conteudo:
        "Sessão inicial. Cláudia apresentou-se reservada inicialmente, mas foi se abrindo ao longo da sessão. Relatou dificuldades de socialização desde o ensino médio. Boa capacidade de insight. Aliança terapêutica em construção.",
      tags: ["acolhimento", "autoestima"],
    },
  ],
  4: [],
  5: [
    {
      id: 501,
      num: 1,
      data: "2026-02-20 09:00",
      autor: "João Silva",
      papel: "estudante",
      tipo: "atendimento",
      conteudo:
        "Primeiro atendimento. Elisa, 24 anos, estudante de engenharia. Queixa de ataques de pânico e medo de lugares públicos. Avaliação inicial realizada. Psicoeducação sobre o ciclo do pânico.",
      tags: ["pânico", "psicoeducação"],
    },
  ],
};
const AGENDAMENTOS = [
  {
    id: 1,
    pacienteId: 1,
    estudanteId: 3,
    supervisorId: 2,
    data: "2026-03-31",
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
    data: "2026-03-31",
    hora: "10:00",
    local: "Sala 02",
    modalidade: "presencial",
    status: "confirmado",
  },
  {
    id: 3,
    pacienteId: 3,
    estudanteId: 3,
    supervisorId: 2,
    data: "2026-04-01",
    hora: "15:00",
    local: "Sala 01",
    modalidade: "presencial",
    status: "confirmado",
  },
  {
    id: 4,
    pacienteId: 5,
    estudanteId: 3,
    supervisorId: 2,
    data: "2026-04-02",
    hora: "09:00",
    local: "Sala 03",
    modalidade: "presencial",
    status: "aguardando",
  },
  {
    id: 5,
    pacienteId: 1,
    estudanteId: 3,
    supervisorId: 2,
    data: "2026-04-07",
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
    data: "2026-04-07",
    hora: "16:00",
    local: "Supervisão",
    modalidade: "presencial",
    status: "confirmado",
  },
];
const DOCUMENTOS = {
  1: [
    {
      id: "d1",
      nome: "Autorização de Tratamento.pdf",
      tipo: "pdf",
      tamanho: "124 KB",
      data: "2026-01-10",
      autor: "Dr. Carlos Mendes",
    },
    {
      id: "d2",
      nome: "Resultado Avaliação Psicológica.pdf",
      tipo: "pdf",
      tamanho: "856 KB",
      data: "2026-01-24",
      autor: "João Silva",
    },
  ],
  2: [
    {
      id: "d3",
      nome: "Encaminhamento Psiquiatria.pdf",
      tipo: "pdf",
      tamanho: "78 KB",
      data: "2026-01-29",
      autor: "João Silva",
    },
    {
      id: "d4",
      nome: "Laudo médico.pdf",
      tipo: "pdf",
      tamanho: "203 KB",
      data: "2026-02-12",
      autor: "João Silva",
    },
    {
      id: "d5",
      nome: "Foto identidade.png",
      tipo: "img",
      tamanho: "312 KB",
      data: "2026-01-15",
      autor: "Dr. Carlos Mendes",
    },
  ],
  3: [],
  4: [],
  5: [],
};
const AUDITORIA = [
  {
    id: 1,
    tipo: "login",
    ator: "Dr. Carlos Mendes",
    acao: "Realizou login no sistema",
    obj: "",
    ts: "2026-03-28 08:12",
    dot: "#2e7d32",
  },
  {
    id: 2,
    tipo: "evolucao",
    ator: "João Silva",
    acao: "Registrou evolução #4 no caso",
    obj: "Ana Lima (Caso #1)",
    ts: "2026-03-27 15:30",
    dot: "#388e3c",
  },
  {
    id: 3,
    tipo: "agenda",
    ator: "Dr. Carlos Mendes",
    acao: "Criou agendamento para",
    obj: "Ana Lima — 31/03 14h",
    ts: "2026-03-26 09:45",
    dot: "#1b5e20",
  },
  {
    id: 4,
    tipo: "export",
    ator: "Dr. Carlos Mendes",
    acao: "Exportou prontuário PDF de",
    obj: "Bruno Carvalho",
    ts: "2026-03-25 11:00",
    dot: "#43a047",
  },
  {
    id: 5,
    tipo: "anamnese",
    ator: "João Silva",
    acao: "Finalizou anamnese do caso",
    obj: "Bruno Carvalho",
    ts: "2026-03-20 14:20",
    dot: "#2e7d32",
  },
  {
    id: 6,
    tipo: "cadastro",
    ator: "Dr. Carlos Mendes",
    acao: "Cadastrou paciente",
    obj: "Elisa Ferreira",
    ts: "2026-03-18 10:05",
    dot: "#388e3c",
  },
];
const ACESSO_PACIENTE = [
  {
    id: 1,
    pacienteId: 1,
    nome: "Ana Lima",
    status: "pendente",
    solicitacao: "2026-03-27",
    protocolo: "PROT-2026-001",
  },
  {
    id: 2,
    pacienteId: 2,
    nome: "Bruno Carvalho",
    status: "liberado",
    solicitacao: "2026-03-15",
    liberacao: "2026-03-16",
    protocolo: "PROT-2026-002",
  },
];

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

/* ============================================================  NAV CONFIG  */
const NAV_CONFIG = {
  tecnico: [
    { section: "Principal" },
    { id: "dashboard", icon: "bi-grid-1x2-fill", label: "Dashboard" },
    { id: "pacientes", icon: "bi-people-fill", label: "Pacientes" },
    { id: "agenda", icon: "bi-calendar3", label: "Agenda", badge: "6" },
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

/* ============================================================  BOOT (F5)  */
(function boot() {
  const sess = loadSession();
  if (sess) {
    const user = USERS.find((u) => u.id === sess.userId);
    if (user) {
      currentUser = user;
      document.getElementById("login-page").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      initApp(sess.page);
      return;
    }
  }
})();

/* ============================================================  LOGIN  */
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
  const u = document.getElementById("login-user").value.trim();
  const p = document.getElementById("login-pass").value.trim();
  const user = USERS.find((x) => x.login === u && x.pass === p);
  const err = document.getElementById("login-error");
  if (!user) {
    err.style.display = "flex";
    return;
  }
  err.style.display = "none";
  currentUser = user;
  const startPage = user.papel === "paciente" ? "meu-prontuario" : "dashboard";
  saveSession(user, startPage);
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
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
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
    default:
      pc.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="bi bi-compass"></i></div><h3>Página não encontrada</h3></div>`;
  }
}
function openProntuario(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  document.getElementById("topbar-title").textContent =
    `Prontuário · ${p.nome}`;
  saveSession(currentUser, `prontuario_${pid}`);
  document.getElementById("page-content").innerHTML = renderProntuario(pid);
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
}
function calcIdade(nasc) {
  return new Date().getFullYear() - new Date(nasc).getFullYear();
}

/* ============================================================  DASHBOARD  */
function renderDashboard() {
  const role = currentUser.papel;
  const lista =
    role === "estudante"
      ? PACIENTES.filter(
          (p) => p.estudanteId === currentUser.id && p.status === "ativo",
        )
      : PACIENTES.filter((p) => p.status === "ativo");
  const hoje = new Date().toISOString().split("T")[0];
  const proximos = AGENDAMENTOS.filter((a) => a.data >= hoje).slice(0, 5);
  const totalEvs = Object.values(EVOLUCOES).reduce((s, v) => s + v.length, 0);
  return `
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-icon stat-icon-green"><i class="bi bi-people-fill"></i></div><div><div class="stat-value">${lista.length}</div><div class="stat-label">Pacientes ativos</div><div class="stat-delta">↑ ${role === "estudante" ? "seus casos" : "total no serviço"}</div></div></div>
    <div class="stat-card"><div class="stat-icon stat-icon-green2"><i class="bi bi-calendar-check-fill"></i></div><div><div class="stat-value">${AGENDAMENTOS.length}</div><div class="stat-label">Agendamentos</div><div class="stat-delta">↑ próximos 30 dias</div></div></div>
    <div class="stat-card"><div class="stat-icon stat-icon-amber"><i class="bi bi-journal-medical"></i></div><div><div class="stat-value">${totalEvs}</div><div class="stat-label">Evoluções registradas</div></div></div>
    <div class="stat-card"><div class="stat-icon stat-icon-blue"><i class="bi bi-shield-check-fill"></i></div><div><div class="stat-value">100%</div><div class="stat-label">Integridade dos registros</div><div class="stat-delta">Evoluções imutáveis ✓</div></div></div>
  </div>
  <div class="dash-grid">
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-calendar3" style="color:var(--sc-green)"></i>Próximos Atendimentos</span>
        ${role === "tecnico" ? `<button class="btn btn-primary btn-sm" onclick="openModalNovoAgendamento()"><i class="bi bi-plus"></i> Novo</button>` : ""}
      </div>
      <div class="card-body" style="padding:12px">
        <div class="agenda-list">
          ${proximos
            .map((ag) => {
              const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
              const est = USERS.find((u) => u.id === ag.estudanteId);
              return `
          <div class="agenda-item" onclick="openProntuario(${ag.pacienteId})">
            <div class="agenda-time">${ag.hora}</div>
            <div class="agenda-dot" style="background:${pac.cor}"></div>
            <div style="flex:1;min-width:0"><div class="agenda-patient">${pac.nome}</div><div class="agenda-meta">${ag.data} · ${ag.local} · ${est.nome}</div></div>
            <span class="badge ${ag.status === "confirmado" ? "badge-green" : "badge-amber"}">${ag.status}</span>
          </div>`;
            })
            .join("")}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="bi bi-activity" style="color:var(--sc-green-mid)"></i>Atividade Recente</span></div>
      <div class="card-body" style="padding:6px 16px">
        <div class="activity-list">
          ${AUDITORIA.slice(0, 5)
            .map(
              (a) => `<div class="activity-item">
            <div class="activity-icon" style="background:${a.dot}18;color:${a.dot}"><i class="bi bi-circle-fill" style="font-size:8px"></i></div>
            <div><div class="activity-text"><strong>${a.ator.split(" ").slice(0, 2).join(" ")}</strong> ${a.acao} ${a.obj ? `<em style="color:var(--sc-green-dark)">${a.obj}</em>` : ""}</div><div class="activity-time">${a.ts}</div></div>
          </div>`,
            )
            .join("")}
        </div>
      </div>
    </div>
  </div>`;
}

/* ============================================================  PACIENTES  */
function renderPacientes() {
  const role = currentUser.papel;
  const lista =
    role === "estudante"
      ? PACIENTES.filter((p) => p.estudanteId === currentUser.id)
      : PACIENTES;
  return `
  <div class="page-header">
    <div class="page-header-left"><h1>${role === "estudante" ? "Meus Casos" : "Pacientes"}</h1><p>${lista.length} ${role === "estudante" ? "casos alocados" : "pacientes cadastrados"}</p></div>
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
    <table><thead><tr><th>Paciente</th><th>CPF</th><th>Estudante</th><th>Supervisor</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody id="pac-tbody">${lista.map(renderPacienteRow).join("")}</tbody></table>
  </div>`;
}
function renderPacienteRow(p) {
  const est = USERS.find((u) => u.id === p.estudanteId),
    sup = USERS.find((u) => u.id === p.supervisorId),
    role = currentUser.papel;
  return `<tr>
    <td><div style="display:flex;align-items:center;gap:10px">
      <div class="patient-avatar" style="background:${p.cor}">${p.ini}</div>
      <div><div style="font-weight:600;font-size:13px">${p.nome}</div><div style="font-size:11px;color:var(--text3)">Caso #${p.id} · ${calcIdade(p.nascimento)} anos</div></div>
    </div></td>
    <td style="color:var(--text2)">${p.cpf}</td>
    <td style="font-size:12px">${est?.nome || "—"}</td>
    <td style="font-size:12px">${sup?.nome || "—"}</td>
    <td><span class="badge ${p.status === "ativo" ? "badge-green" : "badge-gray"}">${p.status}</span></td>
    <td><div class="action-btns">
      <button class="btn btn-secondary btn-sm" onclick="openProntuario(${p.id})"><i class="bi bi-file-medical"></i> Prontuário</button>
      ${role === "tecnico" ? `<button class="btn btn-ghost btn-sm" onclick="openModalEditarPaciente(${p.id})"><i class="bi bi-pencil"></i></button>` : ""}
    </div></td>
  </tr>`;
}
function filterPacientes(q) {
  const role = currentUser.papel,
    lista =
      role === "estudante"
        ? PACIENTES.filter((p) => p.estudanteId === currentUser.id)
        : PACIENTES;
  document.getElementById("pac-tbody").innerHTML = lista
    .filter((p) => p.nome.toLowerCase().includes(q.toLowerCase()))
    .map(renderPacienteRow)
    .join("");
}
function filterPacienteStatus(s) {
  const role = currentUser.papel,
    lista =
      role === "estudante"
        ? PACIENTES.filter((p) => p.estudanteId === currentUser.id)
        : PACIENTES;
  document.getElementById("pac-tbody").innerHTML = (
    s ? lista.filter((p) => p.status === s) : lista
  )
    .map(renderPacienteRow)
    .join("");
}

/* ============================================================  PRONTUÁRIO  */
function renderProntuario(pid) {
  const p = PACIENTES.find((x) => x.id === pid),
    est = USERS.find((u) => u.id === p.estudanteId),
    sup = USERS.find((u) => u.id === p.supervisorId);
  const evs = EVOLUCOES[pid] || [],
    docs = DOCUMENTOS[pid] || [];
  return `
  <div class="back-btn" onclick="navigate('pacientes')"><i class="bi bi-arrow-left"></i> Voltar para pacientes</div>
  <div class="patient-profile">
    <div class="patient-profile-avatar" style="background:${p.cor}">${p.ini}</div>
    <div class="patient-profile-info">
      <h2>${p.nome}</h2>
      <p>Caso #${p.id} · ${p.cpf} · ${calcIdade(p.nascimento)} anos · <span class="badge ${p.status === "ativo" ? "badge-green" : "badge-gray"}">${p.status}</span></p>
      <p style="margin-top:5px;font-size:12px;color:var(--text3)"><i class="bi bi-person-badge"></i> ${est?.nome} &nbsp;·&nbsp; <i class="bi bi-person-check"></i> ${sup?.nome}</p>
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
  <div id="tab-resumo"     class="ptab-content active">${renderTabResumo(pid)}</div>
  <div id="tab-anamnese"   class="ptab-content">${renderTabAnamnese(pid)}</div>
  <div id="tab-evolucoes"  class="ptab-content">${renderTabEvolucoes(pid)}</div>
  <div id="tab-documentos" class="ptab-content">${renderTabDocumentos(pid)}</div>
  <div id="tab-agenda"     class="ptab-content">${renderTabAgendaPaciente(pid)}</div>`;
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
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="bi bi-person-fill" style="color:var(--sc-green)"></i>Dados do Paciente</span>${currentUser.papel === "tecnico" ? `<button class="btn btn-ghost btn-sm" onclick="openModalEditarPaciente(${pid})"><i class="bi bi-pencil"></i></button>` : ""}</div>
      <div class="card-body"><div style="display:grid;gap:8px">
        ${[
          ["Nome", p.nome],
          ["CPF", p.cpf],
          ["Nascimento", p.nascimento],
          ["Telefone", p.telefone],
          ["E-mail", p.email],
        ]
          .map(
            ([l, v]) =>
              `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text3)">${l}</span><span style="font-size:13px;font-weight:500">${v}</span></div>`,
          )
          .join("")}
      </div></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="bi bi-journal-medical" style="color:var(--sc-green)"></i>Queixa Principal</span></div>
      <div class="card-body">
        ${
          ams
            ? `<p style="font-size:13px;line-height:1.8">${ams.queixa}</p><div style="margin-top:10px"><span class="badge ${ams.status === "finalizada" ? "badge-green" : "badge-amber"}">${ams.status === "finalizada" ? "✓ Anamnese finalizada" : "Rascunho"}</span></div>`
            : `<div class="empty-state" style="padding:24px 0"><div class="empty-state-icon" style="font-size:28px"><i class="bi bi-journal-x"></i></div><p style="font-size:13px;color:var(--text3)">Anamnese não registrada</p></div>`
        }
      </div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px">
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="bi bi-clock-history" style="color:var(--sc-green)"></i>Últimas Evoluções</span></div>
      <div class="card-body" style="padding:0">
        ${evs.length ? evs.map((ev) => `<div style="padding:11px 16px;border-bottom:1px solid var(--border)"><div style="display:flex;align-items:center;gap:7px;margin-bottom:4px"><span class="tag tag-teal">${ev.tipo}</span><span style="font-size:11px;color:var(--text3)">#${ev.num} · ${ev.data}</span></div><p style="font-size:12px;line-height:1.6">${ev.conteudo.substring(0, 120)}...</p></div>`).join("") : `<div class="empty-state" style="padding:28px"><p style="font-size:13px;color:var(--text3)">Nenhuma evolução</p></div>`}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="bi bi-calendar3" style="color:var(--sc-green)"></i>Próximos Agendamentos</span></div>
      <div class="card-body" style="padding:0">
        ${ags.length ? ags.map((ag) => `<div style="padding:11px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px"><div style="text-align:center;background:var(--sc-green-pale);border-radius:7px;padding:6px 10px;min-width:58px"><div style="font-size:16px;font-weight:700;color:var(--sc-green-dark)">${ag.hora}</div><div style="font-size:10px;color:var(--text3)">${ag.data}</div></div><div><div style="font-size:13px;font-weight:500">${ag.local}</div><span class="badge ${ag.status === "confirmado" ? "badge-green" : "badge-amber"}" style="margin-top:2px">${ag.status}</span></div></div>`).join("") : `<div class="empty-state" style="padding:28px"><p style="font-size:13px;color:var(--text3)">Nenhum agendamento</p></div>`}
      </div>
    </div>
  </div>`;
}
function renderTabAnamnese(pid) {
  const ams = ANAMNESES[pid],
    role = currentUser.papel,
    canEdit = ["tecnico", "supervisor", "estudante"].includes(role);
  if (!ams)
    return `<div class="card"><div class="card-body"><div class="empty-state"><div class="empty-state-icon"><i class="bi bi-journal-plus"></i></div><h3>Anamnese não registrada</h3>${canEdit ? `<button class="btn btn-primary" style="margin-top:14px" onclick="openModalAnamnese(${pid})"><i class="bi bi-plus"></i> Registrar anamnese</button>` : ""}</div></div></div>`;
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
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
    <div class="anamnese-section"><div class="anamnese-section-title"><i class="bi ${ico}"></i>${tit}</div><div class="anamnese-text">${txt || '<em style="color:var(--text3)">Não informado</em>'}</div></div>`,
      )
      .join("")}
  </div>`;
}
function renderTabEvolucoes(pid) {
  const evs = (EVOLUCOES[pid] || []).slice().reverse(),
    role = currentUser.papel,
    canAdd = ["tecnico", "supervisor", "estudante"].includes(role);
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
        <span class="evolucao-author"><i class="bi bi-person-fill"></i> ${ev.autor} <span class="badge badge-gray" style="margin-left:4px">${ev.papel}</span></span>
      </div>
      <div class="evolucao-body">
        <p class="evolucao-content">${ev.conteudo}</p>
        <div class="evolucao-tags">${ev.tags.map((t) => `<span class="tag tag-teal"># ${t}</span>`).join("")}</div>
        <div class="imutavel-badge"><i class="bi bi-lock-fill"></i> ID imutável: EVO-${ev.id} · Não pode ser editada ou removida</div>
      </div>
    </div>`,
      )
      .join("")}
  </div>`;
}
function renderTabDocumentos(pid) {
  const docs = DOCUMENTOS[pid] || [],
    role = currentUser.papel,
    canUp = ["tecnico", "supervisor", "estudante"].includes(role);
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
    ${canUp ? `<button class="btn btn-primary" onclick="toast('Upload simulado com sucesso!','success')"><i class="bi bi-upload"></i> Upload</button>` : ""}
  </div>
  ${docs.length === 0 ? `<div class="card"><div class="card-body"><div class="empty-state"><div class="empty-state-icon"><i class="bi bi-folder2-open"></i></div><h3>Nenhum documento</h3></div></div></div>` : ""}
  <div class="doc-grid">
    ${docs
      .map(
        (
          d,
        ) => `<div class="doc-card" onclick="toast('Visualizando: ${d.nome}','info')">
      <div class="doc-icon ${IMAP[d.tipo] || "doc-icon-pdf"}"><i class="bi ${BIMAP[d.tipo] || "bi-file-fill"}"></i></div>
      <div class="doc-name">${d.nome}</div>
      <div class="doc-meta">${d.tamanho} · ${d.data}</div>
      <div class="doc-meta"><i class="bi bi-person" style="font-size:10px"></i> ${d.autor}</div>
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
      return `<tr><td>${ag.data}</td><td><strong>${ag.hora}</strong></td><td>${ag.local}</td><td>${ag.modalidade}</td><td>${est?.nome}</td><td><span class="badge ${ag.status === "confirmado" ? "badge-green" : "badge-amber"}">${ag.status}</span></td></tr>`;
    })
    .join("")}
  </tbody></table>`
  }
  </div>`;
}

/* ============================================================  AGENDA  */
function renderAgenda() {
  const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"],
    DATES = ["31/03", "01/04", "02/04", "03/04", "04/04"],
    HOURS = [
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ];
  const role = currentUser.papel;
  const dayMap = {
    "2026-03-31": 0,
    "2026-04-01": 1,
    "2026-04-02": 2,
    "2026-04-03": 3,
    "2026-04-04": 4,
  };
  const CLRS = [
    "cal-event-green",
    "cal-event-green2",
    "cal-event-blue",
    "cal-event-amber",
  ];
  const slotMap = {};
  AGENDAMENTOS.forEach((ag) => {
    const d = dayMap[ag.data];
    if (d === undefined) return;
    const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
    slotMap[`${d}_${ag.hora}`] = {
      label: pac.nome.split(" ")[0],
      hora: ag.hora,
      cls: CLRS[ag.pacienteId % CLRS.length],
      ag,
    };
  });
  return `
  <div class="page-header">
    <div class="page-header-left"><h1>Agenda</h1><p>Semana de 31/03 a 04/04/2026</p></div>
    ${role === "tecnico" ? `<button class="btn btn-primary" onclick="openModalNovoAgendamento()"><i class="bi bi-plus-lg"></i> Novo agendamento</button>` : ""}
  </div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
    <button class="cal-nav-btn"><i class="bi bi-chevron-left"></i></button>
    <span class="cal-month">Março / Abril 2026</span>
    <button class="cal-nav-btn"><i class="bi bi-chevron-right"></i></button>
    <button class="btn btn-secondary btn-sm"><i class="bi bi-calendar-check"></i> Hoje</button>
  </div>
  <div class="card" style="overflow:auto;margin-bottom:20px">
    <div class="calendar-grid">
      <div class="cal-header" style="font-size:10px;color:rgba(255,255,255,.4)">Hora</div>
      ${DAYS.map((d, i) => `<div class="cal-header">${d}<br><span style="font-size:10px;opacity:.6">${DATES[i]}</span></div>`).join("")}
      ${HOURS.map(
        (h) =>
          `<div class="cal-hour-label">${h}</div>${DAYS.map((_, di) => {
            const s = slotMap[`${di}_${h}`];
            return `<div class="cal-slot">${s ? `<div class="cal-event ${s.cls}" onclick="toast('${PACIENTES.find((p) => p.id === s.ag.pacienteId).nome} · ${s.ag.local}','info')">${s.label}<br>${s.hora}</div>` : ""}</div>`;
          }).join("")}`,
      ).join("")}
    </div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title">Lista de Agendamentos</span>${role === "tecnico" ? `<button class="btn btn-primary btn-sm" onclick="openModalNovoAgendamento()"><i class="bi bi-plus"></i> Novo</button>` : ""}</div>
    <table><thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Estudante</th><th>Supervisor</th><th>Local</th><th>Status</th>${role === "tecnico" ? "<th></th>" : ""}</tr></thead>
    <tbody>${AGENDAMENTOS.map((ag) => {
      const pac = PACIENTES.find((p) => p.id === ag.pacienteId),
        est = USERS.find((u) => u.id === ag.estudanteId),
        sup = USERS.find((u) => u.id === ag.supervisorId);
      return `<tr>
      <td>${ag.data}</td><td><strong>${ag.hora}</strong></td>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="patient-avatar" style="background:${pac.cor};width:24px;height:24px;font-size:10px">${pac.ini}</div>${pac.nome}</div></td>
      <td style="font-size:12px">${est?.nome}</td><td style="font-size:12px">${sup?.nome}</td><td>${ag.local}</td>
      <td><span class="badge ${ag.status === "confirmado" ? "badge-green" : "badge-amber"}">${ag.status}</span></td>
      ${role === "tecnico" ? `<td><button class="btn btn-ghost btn-sm" onclick="toast('Editando...','info')"><i class="bi bi-pencil"></i></button></td>` : ""}
    </tr>`;
    }).join("")}</tbody></table>
  </div>`;
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
        <div class="user-card-avatar" style="background:${RCOLORS[u.papel] || "#94a3b8"}">${u.avatar}</div>
        <div><div class="user-card-name">${u.nome}</div><div class="user-card-email">${u.login}@fcmscsp.edu.br</div></div>
        <span class="badge ${RBADGE[u.papel] || "badge-gray"}" style="margin-left:auto">${RLABELS[u.papel]}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="toast('Editando: ${u.nome}','info')"><i class="bi bi-pencil"></i> Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="toast('Permissões de ${u.nome}','info')"><i class="bi bi-shield-check"></i></button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
        <div class="user-stat"><div class="user-stat-val" style="color:var(--sc-green-dark)">${u.papel === "estudante" ? PACIENTES.filter((p) => p.estudanteId === u.id).length : PACIENTES.length}</div><div class="user-stat-label">Casos</div></div>
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

/* ============================================================  ACESSO PACIENTE  */
function renderAcessoPaciente() {
  return `
  <div class="page-header">
    <div class="page-header-left"><h1>Acesso do Paciente</h1><p>Solicitações formais de acesso ao prontuário — somente leitura</p></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 340px;gap:20px">
    <div>
      <div class="card" style="margin-bottom:18px">
        <div class="card-header"><span class="card-title">Solicitações</span></div>
        <div class="card-body" style="padding:12px">
          ${ACESSO_PACIENTE.map(
            (req) => `<div class="access-request-card">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--sc-green);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px">${req.nome
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)}</div>
            <div style="flex:1"><div class="access-request-name">${req.nome}</div><div class="access-request-date">Solicitação: ${req.solicitacao} · Protocolo: ${req.protocolo}</div></div>
            <span class="badge ${req.status === "liberado" ? "badge-green" : "badge-amber"}">${req.status}</span>
            <div class="access-request-actions">
              ${
                req.status === "pendente"
                  ? `<button class="btn btn-primary btn-sm" onclick="toast('Acesso liberado para ${req.nome}!','success')"><i class="bi bi-check-lg"></i> Liberar</button><button class="btn btn-secondary btn-sm" onclick="openModalExportar(${req.pacienteId})"><i class="bi bi-file-pdf"></i> PDF</button>`
                  : `<button class="btn btn-secondary btn-sm" onclick="openModalExportar(${req.pacienteId})"><i class="bi bi-file-pdf"></i> Reexportar</button>`
              }
            </div>
          </div>`,
          ).join("")}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Nova Solicitação</span></div>
        <div class="card-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">Paciente</label><select class="form-control">${PACIENTES.map((p) => `<option>${p.nome}</option>`).join("")}</select></div>
            <div class="form-group"><label class="form-label">Tipo de acesso</label><select class="form-control"><option>PDF entregue/assinado</option><option>Link temporário/token</option><option>Login do paciente</option></select></div>
          </div>
          <div class="form-group"><label class="form-label">Observações</label><textarea class="form-control" rows="2" placeholder="Motivo da solicitação..."></textarea></div>
          <button class="btn btn-primary" onclick="toast('Solicitação registrada: PROT-2026-003','success')"><i class="bi bi-plus"></i> Registrar</button>
        </div>
      </div>
    </div>
    <div class="card" style="align-self:start">
      <div class="card-header"><span class="card-title"><i class="bi bi-info-circle" style="color:var(--sc-green)"></i> Fluxo</span></div>
      <div class="card-body">
        ${[
          [
            "1",
            "Técnico registra a solicitação",
            "Protocolo gerado automaticamente",
          ],
          ["2", "Sistema gera exportação PDF", "Anamnese + evoluções + anexos"],
          ["3", "Técnico libera o acesso", "Entrega ou link temporário"],
          ["4", "Auditoria registrada", "Geração e disponibilização logadas"],
        ]
          .map(
            ([n, tit, desc]) =>
              `<div style="display:flex;gap:12px;padding:9px 0;border-bottom:1px solid var(--border)"><div style="width:24px;height:24px;border-radius:50%;background:var(--sc-green);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${n}</div><div><div style="font-size:13px;font-weight:600">${tit}</div><div style="font-size:11px;color:var(--text3)">${desc}</div></div></div>`,
          )
          .join("")}
        <div style="margin-top:12px;padding:10px;background:var(--sc-green-pale);border-radius:7px;font-size:12px;color:var(--sc-green-dark)"><i class="bi bi-shield-check"></i> Acesso APENAS de leitura.</div>
      </div>
    </div>
  </div>`;
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
  <div class="page-header">
    <div class="page-header-left"><h1>Trilha de Auditoria</h1><p>Histórico completo de ações no sistema</p></div>
    <button class="btn btn-secondary" onclick="toast('Exportando log...','info')"><i class="bi bi-download"></i> Exportar log</button>
  </div>
  <div style="display:grid;grid-template-columns:1fr 280px;gap:20px">
    <div class="card">
      <div class="card-header"><span class="card-title">Log de Atividades</span></div>
      <div class="card-body" style="padding:0 16px">
        <div>
          ${AUDITORIA.map(
            (a, i) => `<div class="audit-item">
            <div class="audit-line">
              <div class="audit-dot" style="background:${a.dot}"></div>
              ${i < AUDITORIA.length - 1 ? '<div class="audit-connector"></div>' : ""}
            </div>
            <div class="audit-body">
              <div class="audit-action"><i class="bi ${TIPO_ICONS[a.tipo] || "bi-dot"}" style="color:${a.dot};margin-right:5px"></i><strong>${a.ator}</strong> ${a.acao} ${a.obj ? `<em style="color:var(--sc-green-dark)">${a.obj}</em>` : ""}</div>
              <div class="audit-time"><i class="bi bi-clock" style="margin-right:4px"></i>${a.ts}</div>
            </div>
          </div>`,
          ).join("")}
        </div>
      </div>
    </div>
    <div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><span class="card-title">Filtros</span></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Tipo de ação</label><select class="form-control"><option>Todas</option><option>Login</option><option>Evolução</option><option>Agendamento</option><option>Exportação</option></select></div>
          <div class="form-group"><label class="form-label">Usuário</label><select class="form-control"><option>Todos</option>${USERS.map((u) => `<option>${u.nome}</option>`).join("")}</select></div>
          <div class="form-group"><label class="form-label">Data início</label><input type="date" class="form-control" value="2026-03-01"></div>
          <div class="form-group"><label class="form-label">Data fim</label><input type="date" class="form-control" value="2026-03-28"></div>
          <button class="btn btn-primary" style="width:100%" onclick="toast('Filtros aplicados','info')"><i class="bi bi-funnel"></i> Aplicar filtros</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Resumo</span></div>
        <div class="card-body">
          ${[
            ["Login", "1"],
            ["Evoluções", "1"],
            ["Agendamentos", "1"],
            ["Exportações", "1"],
            ["Anamneses", "1"],
            ["Cadastros", "1"],
          ]
            .map(
              ([l, v]) =>
                `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="color:var(--text2)">${l}</span><strong style="color:var(--sc-green-dark)">${v}</strong></div>`,
            )
            .join("")}
        </div>
      </div>
    </div>
  </div>`;
}

/* ============================================================  MEU PRONTUÁRIO (paciente)  */
function renderMeuProntuario() {
  const pid = 1,
    p = PACIENTES.find((x) => x.id === pid),
    evs = EVOLUCOES[pid] || [],
    ams = ANAMNESES[pid];
  return `<div style="max-width:800px;margin:0 auto">
    <div style="background:var(--sc-green-dark);color:#fff;border-radius:12px;padding:22px 26px;margin-bottom:22px;display:flex;align-items:center;gap:16px">
      <div style="width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700">${currentUser.avatar}</div>
      <div>
        <div style="font-size:17px;font-weight:700">${currentUser.nome}</div>
        <div style="font-size:13px;color:rgba(255,255,255,.6)">Acesso somente leitura · Caso #${pid}</div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-size:11px;color:rgba(255,255,255,.4)">Liberado por</div>
        <div style="font-size:13px;font-weight:500">Dr. Carlos Mendes</div>
      </div>
    </div>
    <div style="background:var(--sc-green-pale);border:1px solid var(--sc-green-pale2);border-radius:8px;padding:11px 15px;margin-bottom:18px;font-size:13px;color:var(--sc-green-dark);display:flex;gap:8px">
      <i class="bi bi-eye-fill" style="margin-top:1px;flex-shrink:0"></i>
      <span><strong>Acesso de leitura:</strong> Você pode visualizar seu prontuário, mas não pode editá-lo, adicionar evoluções ou apagar registros.</span>
    </div>
    <div class="card" style="margin-bottom:18px">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-journal-text" style="color:var(--sc-green)"></i>Anamnese</span>
        <button class="btn btn-secondary btn-sm" onclick="toast('Exportando PDF do prontuário...','info')"><i class="bi bi-file-pdf"></i> Exportar PDF</button>
      </div>
      <div class="card-body">
        ${
          ams
            ? `<div class="anamnese-grid" style="grid-template-columns:1fr">${[
                ["Queixa Principal", ams.queixa],
                ["História do Problema", ams.historia],
                ["Histórico Médico", ams.historico_medico],
              ]
                .map(
                  ([t, v]) =>
                    `<div class="anamnese-section"><div class="anamnese-section-title"><i class="bi bi-dot"></i>${t}</div><div class="anamnese-text">${v}</div></div>`,
                )
                .join("")}</div>`
            : '<p style="color:var(--text3)">Anamnese não disponível.</p>'
        }
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="bi bi-list-ul" style="color:var(--sc-green)"></i>Evoluções (${evs.length})</span></div>
      <div class="card-body" style="padding:0">
        ${evs
          .map(
            (
              ev,
            ) => `<div style="padding:13px 16px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="tag tag-teal">Evolução #${ev.num}</span>
            <span style="font-size:11px;color:var(--text3)">${ev.data} · ${ev.autor}</span>
          </div>
          <p style="font-size:13px;line-height:1.8">${ev.conteudo}</p>
        </div>`,
          )
          .join("")}
      </div>
    </div>
  </div>`;
}

/* ============================================================  MODAIS  */
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
  const p = PACIENTES.find((x) => x.id === pid);
  openModal(
    `<i class="bi bi-journal-plus" style="color:var(--sc-green)"></i> Nova Evolução — ${p.nome}`,
    `<div class="alert-immutable"><i class="bi bi-exclamation-triangle-fill"></i><span><strong>Atenção:</strong> Após salva, esta evolução não poderá ser editada ou removida. Para correções, crie uma evolução retificadora referenciando esta.</span></div>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Data/hora</label><input type="datetime-local" class="form-control" id="ev-data" value="${new Date().toISOString().slice(0, 16)}"></div>
      <div class="form-group"><label class="form-label">Tipo</label><select class="form-control" id="ev-tipo"><option value="atendimento">Atendimento</option><option value="supervisao">Supervisão</option><option value="contato">Contato</option><option value="retificacao">Retificação</option></select></div>
    </div>
    <div class="form-group"><label class="form-label">Conteúdo *</label><textarea class="form-control" id="ev-content" rows="6" placeholder="Descreva o atendimento, observações clínicas, intervenções..."></textarea></div>
    <div class="form-group"><label class="form-label">Tags (separadas por vírgula)</label><input type="text" class="form-control" id="ev-tags" placeholder="ex: ansiedade, TCC, acolhimento"><div class="form-hint">Tags opcionais para organização</div></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEvolucao(${pid})"><i class="bi bi-check-lg"></i> Salvar evolução</button>`,
  );
}
function salvarEvolucao(pid) {
  const content = document.getElementById("ev-content").value.trim();
  const tipo = document.getElementById("ev-tipo").value,
    data = document.getElementById("ev-data").value;
  const tagsRaw = document.getElementById("ev-tags").value;
  if (!content) {
    toast("Preencha o conteúdo", "error");
    return;
  }
  if (!EVOLUCOES[pid]) EVOLUCOES[pid] = [];
  const num = EVOLUCOES[pid].length + 1,
    id = Date.now();
  EVOLUCOES[pid].push({
    id,
    num,
    data: data.replace("T", " "),
    autor: currentUser.nome,
    papel: currentUser.papel,
    tipo,
    conteudo: content,
    tags: tagsRaw
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
  });
  AUDITORIA.unshift({
    id: Date.now(),
    tipo: "evolucao",
    ator: currentUser.nome,
    acao: `Registrou evolução #${num} no caso`,
    obj: PACIENTES.find((p) => p.id === pid).nome,
    ts: new Date().toLocaleString("pt-BR"),
    dot: "#388e3c",
  });
  closeModal();
  toast(`Evolução #${num} registrada!`, "success");
  openProntuario(pid);
  setTimeout(() => {
    const t = document.querySelectorAll(".ptab")[2];
    if (t) t.click();
  }, 100);
}

function openModalAnamnese(pid) {
  const p = PACIENTES.find((x) => x.id === pid),
    ams = ANAMNESES[pid] || {};
  openModal(
    `<i class="bi bi-journal-text" style="color:var(--sc-green)"></i> Anamnese — ${p.nome}`,
    `<div class="form-group"><label class="form-label">Queixa principal *</label><textarea class="form-control" id="am-queixa" rows="2">${ams.queixa || ""}</textarea></div>
    <div class="form-group"><label class="form-label">História do problema</label><textarea class="form-control" id="am-historia" rows="3">${ams.historia || ""}</textarea></div>
    <div class="form-group"><label class="form-label">Histórico médico/psicológico</label><textarea class="form-control" id="am-medico" rows="2">${ams.historico_medico || ""}</textarea></div>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Medicamentos/substâncias</label><textarea class="form-control" id="am-med" rows="2">${ams.medicamentos || ""}</textarea></div>
      <div class="form-group"><label class="form-label">Contexto familiar/social</label><textarea class="form-control" id="am-ctx" rows="2">${ams.contexto || ""}</textarea></div>
    </div>
    <div class="form-group"><label class="form-label">Hipóteses / Plano terapêutico</label><textarea class="form-control" id="am-hipo" rows="2">${ams.hipoteses || ""}</textarea></div>`,
    `<button class="btn btn-secondary" onclick="salvarAnamnese(${pid},'rascunho')"><i class="bi bi-save"></i> Salvar rascunho</button><button class="btn btn-primary" onclick="salvarAnamnese(${pid},'finalizada')"><i class="bi bi-check-lg"></i> Finalizar anamnese</button>`,
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
  closeModal();
  toast(
    status === "finalizada" ? "Anamnese finalizada!" : "Rascunho salvo!",
    "success",
  );
  openProntuario(pid);
  setTimeout(() => {
    const t = document.querySelectorAll(".ptab")[1];
    if (t) t.click();
  }, 100);
}

function openModalNovoPaciente() {
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
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Estudante</label><select class="form-control" id="np-est">${USERS.filter(
        (u) => u.papel === "estudante",
      )
        .map((u) => `<option value="${u.id}">${u.nome}</option>`)
        .join("")}</select></div>
      <div class="form-group"><label class="form-label">Supervisor</label><select class="form-control" id="np-sup">${USERS.filter(
        (u) => u.papel === "supervisor",
      )
        .map((u) => `<option value="${u.id}">${u.nome}</option>`)
        .join("")}</select></div>
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
  const CORES = ["#1b5e20", "#2e7d32", "#388e3c", "#43a047", "#558b2f"];
  const newId = Math.max(...PACIENTES.map((p) => p.id)) + 1;
  PACIENTES.push({
    id: newId,
    nome,
    cpf: document.getElementById("np-cpf").value || "000.000.000-00",
    nascimento: document.getElementById("np-nasc").value || "2000-01-01",
    telefone: document.getElementById("np-tel").value || "",
    email: document.getElementById("np-email").value || "",
    estudanteId: parseInt(document.getElementById("np-est").value),
    supervisorId: parseInt(document.getElementById("np-sup").value),
    status: "ativo",
    cor: CORES[newId % CORES.length],
    ini: nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
  });
  EVOLUCOES[newId] = [];
  DOCUMENTOS[newId] = [];
  closeModal();
  toast(`Paciente ${nome} cadastrado!`, "success");
  navigate("pacientes");
}

function openModalNovoAgendamento() {
  openModal(
    '<i class="bi bi-calendar-plus" style="color:var(--sc-green)"></i> Novo Agendamento',
    `<div class="form-group"><label class="form-label">Paciente *</label><select class="form-control" id="ag-pac">${PACIENTES.filter(
      (p) => p.status === "ativo",
    )
      .map((p) => `<option value="${p.id}">${p.nome}</option>`)
      .join("")}</select></div>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Estudante</label><select class="form-control" id="ag-est">${USERS.filter(
        (u) => u.papel === "estudante",
      )
        .map((u) => `<option value="${u.id}">${u.nome}</option>`)
        .join("")}</select></div>
      <div class="form-group"><label class="form-label">Supervisor</label><select class="form-control" id="ag-sup">${USERS.filter(
        (u) => u.papel === "supervisor",
      )
        .map((u) => `<option value="${u.id}">${u.nome}</option>`)
        .join("")}</select></div>
    </div>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Data *</label><input class="form-control" id="ag-data" type="date" value="2026-04-08"></div>
      <div class="form-group"><label class="form-label">Hora *</label><input class="form-control" id="ag-hora" type="time" value="14:00"></div>
    </div>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Local</label><input class="form-control" id="ag-local" type="text" placeholder="Sala 01, 02..."></div>
      <div class="form-group"><label class="form-label">Modalidade</label><select class="form-control" id="ag-modal"><option>presencial</option><option>remoto</option></select></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarAgendamento()"><i class="bi bi-check-lg"></i> Agendar</button>`,
  );
}
function salvarAgendamento() {
  const data = document.getElementById("ag-data").value,
    hora = document.getElementById("ag-hora").value;
  if (!data || !hora) {
    toast("Informe data e hora", "error");
    return;
  }
  const pid = parseInt(document.getElementById("ag-pac").value),
    pac = PACIENTES.find((p) => p.id === pid);
  AGENDAMENTOS.push({
    id: Math.max(...AGENDAMENTOS.map((a) => a.id)) + 1,
    pacienteId: pid,
    estudanteId: parseInt(document.getElementById("ag-est").value),
    supervisorId: parseInt(document.getElementById("ag-sup").value),
    data,
    hora,
    local: document.getElementById("ag-local").value || "Sala 01",
    modalidade: document.getElementById("ag-modal").value,
    status: "confirmado",
  });
  AUDITORIA.unshift({
    id: Date.now(),
    tipo: "agenda",
    ator: currentUser.nome,
    acao: "Criou agendamento para",
    obj: `${pac.nome} — ${data} ${hora}`,
    ts: new Date().toLocaleString("pt-BR"),
    dot: "#1b5e20",
  });
  closeModal();
  toast("Agendamento criado!", "success");
  navigate("agenda");
}

function openModalNovoUsuario() {
  openModal(
    '<i class="bi bi-person-plus-fill" style="color:var(--sc-green)"></i> Novo Usuário',
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
  const nome = document.getElementById("nu-nome").value.trim(),
    login = document.getElementById("nu-login").value.trim();
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
    color: "#2e7d32",
  });
  closeModal();
  toast(`Usuário ${nome} cadastrado!`, "success");
  navigate("acesso");
}

function openModalEditarPaciente(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  openModal(
    `<i class="bi bi-pencil" style="color:var(--sc-green)"></i> Editar Paciente — ${p.nome}`,
    `<div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Nome completo</label><input class="form-control" id="ep-nome" type="text" value="${p.nome}"></div>
      <div class="form-group"><label class="form-label">CPF</label><input class="form-control" id="ep-cpf" type="text" value="${p.cpf}"></div>
    </div>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="ep-tel" type="tel" value="${p.telefone}"></div>
      <div class="form-group"><label class="form-label">E-mail</label><input class="form-control" id="ep-email" type="email" value="${p.email}"></div>
    </div>
    <div class="form-group"><label class="form-label">Status</label><select class="form-control" id="ep-status"><option ${p.status === "ativo" ? "selected" : ""}>ativo</option><option ${p.status === "inativo" ? "selected" : ""}>inativo</option></select></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEdicaoPaciente(${pid})"><i class="bi bi-check-lg"></i> Salvar</button>`,
  );
}
function salvarEdicaoPaciente(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  p.nome = document.getElementById("ep-nome").value;
  p.cpf = document.getElementById("ep-cpf").value;
  p.telefone = document.getElementById("ep-tel").value;
  p.email = document.getElementById("ep-email").value;
  p.status = document.getElementById("ep-status").value;
  p.ini = p.nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  closeModal();
  toast("Paciente atualizado!", "success");
  navigate("pacientes");
}

function openModalExportar(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  openModal(
    `<i class="bi bi-file-pdf" style="color:#dc2626"></i> Exportar Prontuário — ${p.nome}`,
    `<div class="form-group"><label class="form-label">Incluir no PDF</label>
    <div style="display:flex;flex-direction:column;gap:8px">
      <label class="login-check" style="font-size:13px"><input type="checkbox" checked> Dados de identificação</label>
      <label class="login-check" style="font-size:13px"><input type="checkbox" checked> Anamnese</label>
      <label class="login-check" style="font-size:13px"><input type="checkbox" checked> Evoluções (${(EVOLUCOES[pid] || []).length})</label>
      <label class="login-check" style="font-size:13px"><input type="checkbox"> Documentos anexos (${(DOCUMENTOS[pid] || []).length})</label>
    </div></div>
    <div style="background:var(--sc-green-pale);border:1px solid var(--sc-green-pale2);border-radius:7px;padding:10px 14px;font-size:12px;color:var(--sc-green-dark)"><i class="bi bi-info-circle"></i> A exportação será registrada na trilha de auditoria.</div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="closeModal();toast('PDF exportado: Prontuário ${p.nome}.pdf','success');AUDITORIA.unshift({id:Date.now(),tipo:'export',ator:currentUser.nome,acao:'Exportou prontuário PDF de',obj:'${p.nome}',ts:new Date().toLocaleString('pt-BR'),dot:'#43a047'})"><i class="bi bi-download"></i> Exportar PDF</button>`,
  );
}

/* ============================================================  BUSCA GLOBAL  */
function globalSearch(q) {
  if (!q || q.length < 2) return;
  const found = PACIENTES.filter((p) =>
    p.nome.toLowerCase().includes(q.toLowerCase()),
  );
  if (found.length === 1) openProntuario(found[0].id);
}

/* ============================================================  TOAST  */
function toast(msg, type = "info") {
  const ICONS = {
    success: "bi-check-circle-fill",
    error: "bi-x-circle-fill",
    info: "bi-info-circle-fill",
  };
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="bi ${ICONS[type] || ICONS.info}"></i><span>${msg}</span>`;
  document.getElementById("toast-container").appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateX(100%)";
    t.style.transition = "all .3s";
    setTimeout(() => t.remove(), 300);
  }, 3000);
}
