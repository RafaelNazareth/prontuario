/* ============================================================  PERSISTÊNCIA E SEGURANÇA  */
const STORAGE_KEY = "pep_fcmscsp_data_v14"; // v14: 50 alunos/17 grupos, notificações, faltas, troca de paciente

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
// Notificações persistentes: faltas, alertas de evolução, troca de paciente
let NOTIFICACOES = [];
let FALTAS = []; // { id, agId, pacienteId, data, justificada, estudantesIds }

function initData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const data = desencriptar(stored);
      // Valida estrutura mínima antes de aceitar
      if (!Array.isArray(data.USERS) || !Array.isArray(data.PACIENTES)) {
        throw new Error("Estrutura inválida");
      }
      USERS = data.USERS || [];
      PACIENTES = data.PACIENTES || [];
      ANAMNESES = data.ANAMNESES || {};
      EVOLUCOES = data.EVOLUCOES || {};
      AGENDAMENTOS = data.AGENDAMENTOS || [];
      DOCUMENTOS = data.DOCUMENTOS || {};
      AUDITORIA = data.AUDITORIA || [];
      ACESSO_PACIENTE = data.ACESSO_PACIENTE || [];
      NOTIFICACOES = data.NOTIFICACOES || [];
      FALTAS = data.FALTAS || [];
      // Migração: normaliza cores antigas para padrão acessível
      _normalizeCores();
    } catch (e) {
      // Corrupção detectada: NÃO apaga silenciosamente, avisa e usa mock
      console.warn(
        "[PEP] Dados corrompidos ou chave incompatível. Carregando dados de demonstração.",
        e,
      );
      mockData();
    }
  } else {
    mockData();
  }
}

function mockData() {
  // ── USUÁRIOS FIXOS (login de demonstração) ────────────────────
  const USERS_FIXOS = [
    { id:1, login:"tecnico", pass:"1234", nome:"Dr. Carlos Mendes",
      papel:"tecnico", avatar:"CM", color:"#1b5e20" },
  ];
  // Supervisor de demonstração (login: supervisor / 1234)
  // é o primeiro supervisor da lista abaixo (id=10)
  // Estudante de demonstração (login: estudante / 1234) é est01 (id=100)
  // Paciente de demonstração (login: paciente / 1234) é o paciente do grupo 0 (id=200)

  // ── SUPERVISORES (5) ─────────────────────────────────────────
  const SUPERVISORES_MOCK = [
    {
        "id": 10,
        "login": "sup1",
        "pass": "1234",
        "nome": "Profa. Ana Beatriz",
        "papel": "supervisor",
        "avatar": "AB",
        "color": "#2e7d32"
    },
    {
        "id": 11,
        "login": "sup2",
        "pass": "1234",
        "nome": "Prof. Carlos Eduardo",
        "papel": "supervisor",
        "avatar": "CE",
        "color": "#2e7d32"
    },
    {
        "id": 12,
        "login": "sup3",
        "pass": "1234",
        "nome": "Profa. Denise Faria",
        "papel": "supervisor",
        "avatar": "DF",
        "color": "#2e7d32"
    },
    {
        "id": 13,
        "login": "sup4",
        "pass": "1234",
        "nome": "Prof. Eduardo Moraes",
        "papel": "supervisor",
        "avatar": "EM",
        "color": "#2e7d32"
    },
    {
        "id": 14,
        "login": "sup5",
        "pass": "1234",
        "nome": "Profa. Fernanda Leal",
        "papel": "supervisor",
        "avatar": "FL",
        "color": "#2e7d32"
    }
];

  // ── ESTUDANTES (50) ──────────────────────────────────────────
  const ESTUDANTES_MOCK = [
    {
        "id": 100,
        "login": "est01",
        "pass": "1234",
        "nome": "Ana Rocha",
        "papel": "estudante",
        "avatar": "AR",
        "color": "#388e3c"
    },
    {
        "id": 101,
        "login": "est02",
        "pass": "1234",
        "nome": "Bruno Souza",
        "papel": "estudante",
        "avatar": "BS",
        "color": "#388e3c"
    },
    {
        "id": 102,
        "login": "est03",
        "pass": "1234",
        "nome": "Cláudia Silva",
        "papel": "estudante",
        "avatar": "CS",
        "color": "#388e3c"
    },
    {
        "id": 103,
        "login": "est04",
        "pass": "1234",
        "nome": "Daniel Castro",
        "papel": "estudante",
        "avatar": "DC",
        "color": "#388e3c"
    },
    {
        "id": 104,
        "login": "est05",
        "pass": "1234",
        "nome": "Elisa Lima",
        "papel": "estudante",
        "avatar": "EL",
        "color": "#388e3c"
    },
    {
        "id": 105,
        "login": "est06",
        "pass": "1234",
        "nome": "Felipe Pereira",
        "papel": "estudante",
        "avatar": "FP",
        "color": "#388e3c"
    },
    {
        "id": 106,
        "login": "est07",
        "pass": "1234",
        "nome": "Gabriela Pereira",
        "papel": "estudante",
        "avatar": "GP",
        "color": "#388e3c"
    },
    {
        "id": 107,
        "login": "est08",
        "pass": "1234",
        "nome": "Hugo Rodrigues",
        "papel": "estudante",
        "avatar": "HR",
        "color": "#388e3c"
    },
    {
        "id": 108,
        "login": "est09",
        "pass": "1234",
        "nome": "Isabela Castro",
        "papel": "estudante",
        "avatar": "IC",
        "color": "#388e3c"
    },
    {
        "id": 109,
        "login": "est10",
        "pass": "1234",
        "nome": "João Souza",
        "papel": "estudante",
        "avatar": "JS",
        "color": "#388e3c"
    },
    {
        "id": 110,
        "login": "est11",
        "pass": "1234",
        "nome": "Karen Dias",
        "papel": "estudante",
        "avatar": "KD",
        "color": "#388e3c"
    },
    {
        "id": 111,
        "login": "est12",
        "pass": "1234",
        "nome": "Lucas Castro",
        "papel": "estudante",
        "avatar": "LC",
        "color": "#388e3c"
    },
    {
        "id": 112,
        "login": "est13",
        "pass": "1234",
        "nome": "Mariana Moreira",
        "papel": "estudante",
        "avatar": "MM",
        "color": "#388e3c"
    },
    {
        "id": 113,
        "login": "est14",
        "pass": "1234",
        "nome": "Nathan Fernandes",
        "papel": "estudante",
        "avatar": "NF",
        "color": "#388e3c"
    },
    {
        "id": 114,
        "login": "est15",
        "pass": "1234",
        "nome": "Olivia Oliveira",
        "papel": "estudante",
        "avatar": "OO",
        "color": "#388e3c"
    },
    {
        "id": 115,
        "login": "est16",
        "pass": "1234",
        "nome": "Pedro Vieira",
        "papel": "estudante",
        "avatar": "PV",
        "color": "#388e3c"
    },
    {
        "id": 116,
        "login": "est17",
        "pass": "1234",
        "nome": "Queila Carvalho",
        "papel": "estudante",
        "avatar": "QC",
        "color": "#388e3c"
    },
    {
        "id": 117,
        "login": "est18",
        "pass": "1234",
        "nome": "Rafael Santos",
        "papel": "estudante",
        "avatar": "RS",
        "color": "#388e3c"
    },
    {
        "id": 118,
        "login": "est19",
        "pass": "1234",
        "nome": "Sara Silva",
        "papel": "estudante",
        "avatar": "SS",
        "color": "#388e3c"
    },
    {
        "id": 119,
        "login": "est20",
        "pass": "1234",
        "nome": "Thiago Oliveira",
        "papel": "estudante",
        "avatar": "TO",
        "color": "#388e3c"
    },
    {
        "id": 120,
        "login": "est21",
        "pass": "1234",
        "nome": "Ursula Alves",
        "papel": "estudante",
        "avatar": "UA",
        "color": "#388e3c"
    },
    {
        "id": 121,
        "login": "est22",
        "pass": "1234",
        "nome": "Victor Pereira",
        "papel": "estudante",
        "avatar": "VP",
        "color": "#388e3c"
    },
    {
        "id": 122,
        "login": "est23",
        "pass": "1234",
        "nome": "Wendy Sousa",
        "papel": "estudante",
        "avatar": "WS",
        "color": "#388e3c"
    },
    {
        "id": 123,
        "login": "est24",
        "pass": "1234",
        "nome": "Xavier Barbosa",
        "papel": "estudante",
        "avatar": "XB",
        "color": "#388e3c"
    },
    {
        "id": 124,
        "login": "est25",
        "pass": "1234",
        "nome": "Yasmin Silva",
        "papel": "estudante",
        "avatar": "YS",
        "color": "#388e3c"
    },
    {
        "id": 125,
        "login": "est26",
        "pass": "1234",
        "nome": "Zanele Fernandes",
        "papel": "estudante",
        "avatar": "ZF",
        "color": "#388e3c"
    },
    {
        "id": 126,
        "login": "est27",
        "pass": "1234",
        "nome": "Alice Alves",
        "papel": "estudante",
        "avatar": "AA",
        "color": "#388e3c"
    },
    {
        "id": 127,
        "login": "est28",
        "pass": "1234",
        "nome": "Bernardo Monteiro",
        "papel": "estudante",
        "avatar": "BM",
        "color": "#388e3c"
    },
    {
        "id": 128,
        "login": "est29",
        "pass": "1234",
        "nome": "Carla Rocha",
        "papel": "estudante",
        "avatar": "CR",
        "color": "#388e3c"
    },
    {
        "id": 129,
        "login": "est30",
        "pass": "1234",
        "nome": "Diego Monteiro",
        "papel": "estudante",
        "avatar": "DM",
        "color": "#388e3c"
    },
    {
        "id": 130,
        "login": "est31",
        "pass": "1234",
        "nome": "Eduarda Fernandes",
        "papel": "estudante",
        "avatar": "EF",
        "color": "#388e3c"
    },
    {
        "id": 131,
        "login": "est32",
        "pass": "1234",
        "nome": "Fábio Carvalho",
        "papel": "estudante",
        "avatar": "FC",
        "color": "#388e3c"
    },
    {
        "id": 132,
        "login": "est33",
        "pass": "1234",
        "nome": "Gisele Pereira",
        "papel": "estudante",
        "avatar": "GP",
        "color": "#388e3c"
    },
    {
        "id": 133,
        "login": "est34",
        "pass": "1234",
        "nome": "Henrique Almeida",
        "papel": "estudante",
        "avatar": "HA",
        "color": "#388e3c"
    },
    {
        "id": 134,
        "login": "est35",
        "pass": "1234",
        "nome": "Ingrid Vieira",
        "papel": "estudante",
        "avatar": "IV",
        "color": "#388e3c"
    },
    {
        "id": 135,
        "login": "est36",
        "pass": "1234",
        "nome": "Julio Lima",
        "papel": "estudante",
        "avatar": "JL",
        "color": "#388e3c"
    },
    {
        "id": 136,
        "login": "est37",
        "pass": "1234",
        "nome": "Kelly Cunha",
        "papel": "estudante",
        "avatar": "KC",
        "color": "#388e3c"
    },
    {
        "id": 137,
        "login": "est38",
        "pass": "1234",
        "nome": "Leonardo Campos",
        "papel": "estudante",
        "avatar": "LC",
        "color": "#388e3c"
    },
    {
        "id": 138,
        "login": "est39",
        "pass": "1234",
        "nome": "Monica Silva",
        "papel": "estudante",
        "avatar": "MS",
        "color": "#388e3c"
    },
    {
        "id": 139,
        "login": "est40",
        "pass": "1234",
        "nome": "Nelson Cardoso",
        "papel": "estudante",
        "avatar": "NC",
        "color": "#388e3c"
    },
    {
        "id": 140,
        "login": "est41",
        "pass": "1234",
        "nome": "Odete Cunha",
        "papel": "estudante",
        "avatar": "OC",
        "color": "#388e3c"
    },
    {
        "id": 141,
        "login": "est42",
        "pass": "1234",
        "nome": "Paulo Ferreira",
        "papel": "estudante",
        "avatar": "PF",
        "color": "#388e3c"
    },
    {
        "id": 142,
        "login": "est43",
        "pass": "1234",
        "nome": "Renata Monteiro",
        "papel": "estudante",
        "avatar": "RM",
        "color": "#388e3c"
    },
    {
        "id": 143,
        "login": "est44",
        "pass": "1234",
        "nome": "Silvio Carvalho",
        "papel": "estudante",
        "avatar": "SC",
        "color": "#388e3c"
    },
    {
        "id": 144,
        "login": "est45",
        "pass": "1234",
        "nome": "Tatiana Costa",
        "papel": "estudante",
        "avatar": "TC",
        "color": "#388e3c"
    },
    {
        "id": 145,
        "login": "est46",
        "pass": "1234",
        "nome": "Ulisses Lima",
        "papel": "estudante",
        "avatar": "UL",
        "color": "#388e3c"
    },
    {
        "id": 146,
        "login": "est47",
        "pass": "1234",
        "nome": "Vera Rodrigues",
        "papel": "estudante",
        "avatar": "VR",
        "color": "#388e3c"
    },
    {
        "id": 147,
        "login": "est48",
        "pass": "1234",
        "nome": "Willian Alves",
        "papel": "estudante",
        "avatar": "WA",
        "color": "#388e3c"
    },
    {
        "id": 148,
        "login": "est49",
        "pass": "1234",
        "nome": "Xiomara Cardoso",
        "papel": "estudante",
        "avatar": "XC",
        "color": "#388e3c"
    },
    {
        "id": 149,
        "login": "est50",
        "pass": "1234",
        "nome": "Yolanda Costa",
        "papel": "estudante",
        "avatar": "YC",
        "color": "#388e3c"
    }
];

  // Ajustar logins de demonstração para funcionar com as contas de teste
  const sup0 = SUPERVISORES_MOCK[0];
  sup0.login = "supervisor"; sup0.pass = "1234";
  const est0 = ESTUDANTES_MOCK[0];
  est0.login = "estudante"; est0.pass = "1234";

  USERS = [
    ...USERS_FIXOS,
    ...SUPERVISORES_MOCK,
    ...ESTUDANTES_MOCK,
    // Conta paciente de demonstração (acessa prontuário do paciente id=200)
    { id:200, login:"paciente", pass:"1234", nome:"Laura Assis",
      papel:"paciente", avatar:"LA", color:"#1b5e20" },
  ];

  // ── PACIENTES (17 — 1 por grupo) ─────────────────────────────
  PACIENTES = [
    {
        "id": 200,
        "nome": "Laura Assis",
        "cpf": "100.000.000-00",
        "nascimento": "1970-01-01",
        "telefone": "(11) 92674-2519",
        "email": "laura.assis@email.com",
        "estudantesIds": [
            100,
            101,
            102
        ],
        "supervisorId": 10,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "LA",
        "faltas": []
    },
    {
        "id": 201,
        "nome": "Marcos Barros",
        "cpf": "101.111.111-11",
        "nascimento": "1973-02-02",
        "telefone": "(11) 97224-2584",
        "email": "marcos.barros@email.com",
        "estudantesIds": [
            103,
            104,
            105
        ],
        "supervisorId": 11,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "MB",
        "faltas": []
    },
    {
        "id": 202,
        "nome": "Beatriz Coelho",
        "cpf": "102.222.222-22",
        "nascimento": "1976-03-03",
        "telefone": "(11) 96881-6635",
        "email": "beatriz.coelho@email.com",
        "estudantesIds": [
            106,
            107,
            108
        ],
        "supervisorId": 12,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "BC",
        "faltas": []
    },
    {
        "id": 203,
        "nome": "Rodrigo Duarte",
        "cpf": "103.333.333-33",
        "nascimento": "1979-04-04",
        "telefone": "(11) 95333-1711",
        "email": "rodrigo.duarte@email.com",
        "estudantesIds": [
            109,
            110,
            111
        ],
        "supervisorId": 13,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "RD",
        "faltas": []
    },
    {
        "id": 204,
        "nome": "Leticia Esteves",
        "cpf": "104.444.444-44",
        "nascimento": "1982-05-05",
        "telefone": "(11) 98527-9785",
        "email": "leticia.esteves@email.com",
        "estudantesIds": [
            112,
            113,
            114
        ],
        "supervisorId": 14,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "LE",
        "faltas": []
    },
    {
        "id": 205,
        "nome": "André Fontes",
        "cpf": "105.555.555-55",
        "nascimento": "1985-06-06",
        "telefone": "(11) 93045-7201",
        "email": "andré.fontes@email.com",
        "estudantesIds": [
            115,
            116,
            117
        ],
        "supervisorId": 10,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "AF",
        "faltas": []
    },
    {
        "id": 206,
        "nome": "Patrícia Guedes",
        "cpf": "106.666.666-66",
        "nascimento": "1988-07-07",
        "telefone": "(11) 92291-5803",
        "email": "patrícia.guedes@email.com",
        "estudantesIds": [
            118,
            119,
            120
        ],
        "supervisorId": 11,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "PG",
        "faltas": []
    },
    {
        "id": 207,
        "nome": "Renato Hora",
        "cpf": "107.777.777-77",
        "nascimento": "1991-08-08",
        "telefone": "(11) 96925-4150",
        "email": "renato.hora@email.com",
        "estudantesIds": [
            121,
            122,
            123
        ],
        "supervisorId": 12,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "RH",
        "faltas": []
    },
    {
        "id": 208,
        "nome": "Camila Ivo",
        "cpf": "108.888.888-88",
        "nascimento": "1994-09-09",
        "telefone": "(11) 92139-1750",
        "email": "camila.ivo@email.com",
        "estudantesIds": [
            124,
            125,
            126
        ],
        "supervisorId": 13,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "CI",
        "faltas": []
    },
    {
        "id": 209,
        "nome": "Sérgio Jardim",
        "cpf": "109.999.999-99",
        "nascimento": "1997-10-10",
        "telefone": "(11) 94733-5741",
        "email": "sérgio.jardim@email.com",
        "estudantesIds": [
            127,
            128,
            129
        ],
        "supervisorId": 14,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "SJ",
        "faltas": []
    },
    {
        "id": 210,
        "nome": "Fernanda Kuroki",
        "cpf": "111.111.111-10",
        "nascimento": "2000-11-11",
        "telefone": "(11) 92307-4814",
        "email": "fernanda.kuroki@email.com",
        "estudantesIds": [
            130,
            131,
            132
        ],
        "supervisorId": 10,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "FK",
        "faltas": []
    },
    {
        "id": 211,
        "nome": "Tiago Leite",
        "cpf": "112.222.222-21",
        "nascimento": "2003-12-12",
        "telefone": "(11) 92654-7227",
        "email": "tiago.leite@email.com",
        "estudantesIds": [
            133,
            134,
            135
        ],
        "supervisorId": 11,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "TL",
        "faltas": []
    },
    {
        "id": 212,
        "nome": "Amanda Melo",
        "cpf": "113.333.333-32",
        "nascimento": "2006-01-13",
        "telefone": "(11) 95554-8428",
        "email": "amanda.melo@email.com",
        "estudantesIds": [
            136,
            137,
            138
        ],
        "supervisorId": 12,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "AM",
        "faltas": []
    },
    {
        "id": 213,
        "nome": "Roberto Nobre",
        "cpf": "114.444.444-43",
        "nascimento": "2009-02-14",
        "telefone": "(11) 96977-3664",
        "email": "roberto.nobre@email.com",
        "estudantesIds": [
            139,
            140,
            141
        ],
        "supervisorId": 13,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "RN",
        "faltas": []
    },
    {
        "id": 214,
        "nome": "Simone Ota",
        "cpf": "115.555.555-54",
        "nascimento": "1972-03-15",
        "telefone": "(11) 97065-6820",
        "email": "simone.ota@email.com",
        "estudantesIds": [
            142,
            143,
            144
        ],
        "supervisorId": 14,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "SO",
        "faltas": []
    },
    {
        "id": 215,
        "nome": "Fabiana Prado",
        "cpf": "116.666.666-65",
        "nascimento": "1975-04-16",
        "telefone": "(11) 94432-5374",
        "email": "fabiana.prado@email.com",
        "estudantesIds": [
            145,
            146,
            147
        ],
        "supervisorId": 10,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "FP",
        "faltas": []
    },
    {
        "id": 216,
        "nome": "Leonardo Queiroz",
        "cpf": "117.777.777-76",
        "nascimento": "1978-05-17",
        "telefone": "(11) 92169-3803",
        "email": "leonardo.queiroz@email.com",
        "estudantesIds": [
            148,
            149
        ],
        "supervisorId": 11,
        "status": "ativo",
        "cor": "#1b5e20",
        "ini": "LQ",
        "faltas": []
    }
];

  // ── ANAMNESES (algumas concluídas para realismo) ──────────────
  ANAMNESES = {
    200: { queixa:"Ansiedade generalizada com dificuldade de concentração.",
           historia:"Início há 2 anos após promoção profissional.",
           historico_medico:"Nega histórico relevante.",
           medicamentos:"Melatonina 2mg.",
           contexto:"Casada, dois filhos.", hipoteses:"TAG (F41.1)",
           status:"finalizada", rascunho:false },
    201: { queixa:"Tristeza profunda e retraimento social há 6 meses.",
           historia:"Término de relacionamento de 5 anos.",
           historico_medico:"Episódio depressivo leve na adolescência.",
           medicamentos:"Nenhum.", contexto:"Solteiro.",
           hipoteses:"Depressão moderada (F32.1)",
           status:"finalizada", rascunho:false },
    202: { queixa:"Dificuldades de relacionamento interpessoal.",
           historia:"Histórico de perdas na infância.",
           historico_medico:"Sem uso de medicamentos.",
           medicamentos:"Nenhum.", contexto:"Mora sozinho.",
           hipoteses:"Transtorno de adaptação (F43.2)",
           status:"rascunho", rascunho:true },
  };

  // ── EVOLUÇÕES (iniciais de exemplo) ──────────────────────────
  EVOLUCOES = {
    200: [
      { id:10001, num:1, data:"2026-06-02 08:00", autor:"Est. Ana Rocha",
         papel:"estudante", tipo:"atendimento",
         conteudo:"Sessão de acolhimento. Paciente receptiva, relato de ansiedade moderada.",
         tags:["acolhimento"] },
      { id:10002, num:2, data:"2026-06-09 08:00", autor:"Est. Ana Rocha",
         papel:"estudante", tipo:"atendimento",
         conteudo:"Exploração da história de vida. Identificação de gatilhos de ansiedade.",
         tags:["TCC","ansiedade"] },
    ],
    201: [
      { id:10003, num:1, data:"2026-06-02 08:30", autor:"Est. Daniel Castro",
         papel:"estudante", tipo:"atendimento",
         conteudo:"Primeira sessão. Paciente apresenta humor rebaixado e anedonia.",
         tags:["acolhimento","depressão"] },
    ],
  };

  // ── AGENDAMENTOS (junho e julho 2026) ────────────────────────
  AGENDAMENTOS = [
    {
        "id": 1000,
        "pacienteId": 200,
        "estudanteId": 100,
        "supervisorId": 10,
        "data": "2026-06-08",
        "hora": "08:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1001,
        "pacienteId": 200,
        "estudanteId": 100,
        "supervisorId": 10,
        "data": "2026-06-15",
        "hora": "08:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1002,
        "pacienteId": 200,
        "estudanteId": 100,
        "supervisorId": 10,
        "data": "2026-06-22",
        "hora": "08:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1003,
        "pacienteId": 200,
        "estudanteId": 100,
        "supervisorId": 10,
        "data": "2026-06-29",
        "hora": "08:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1004,
        "pacienteId": 200,
        "estudanteId": 100,
        "supervisorId": 10,
        "data": "2026-07-06",
        "hora": "08:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1005,
        "pacienteId": 200,
        "estudanteId": 100,
        "supervisorId": 10,
        "data": "2026-07-13",
        "hora": "08:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1006,
        "pacienteId": 200,
        "estudanteId": 100,
        "supervisorId": 10,
        "data": "2026-07-20",
        "hora": "08:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1007,
        "pacienteId": 200,
        "estudanteId": 100,
        "supervisorId": 10,
        "data": "2026-07-27",
        "hora": "08:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1008,
        "pacienteId": 201,
        "estudanteId": 103,
        "supervisorId": 11,
        "data": "2026-06-02",
        "hora": "08:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1009,
        "pacienteId": 201,
        "estudanteId": 103,
        "supervisorId": 11,
        "data": "2026-06-09",
        "hora": "08:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "faltou"
    },
    {
        "id": 1010,
        "pacienteId": 201,
        "estudanteId": 103,
        "supervisorId": 11,
        "data": "2026-06-16",
        "hora": "08:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1011,
        "pacienteId": 201,
        "estudanteId": 103,
        "supervisorId": 11,
        "data": "2026-06-23",
        "hora": "08:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1012,
        "pacienteId": 201,
        "estudanteId": 103,
        "supervisorId": 11,
        "data": "2026-06-30",
        "hora": "08:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1013,
        "pacienteId": 201,
        "estudanteId": 103,
        "supervisorId": 11,
        "data": "2026-07-07",
        "hora": "08:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "faltou"
    },
    {
        "id": 1014,
        "pacienteId": 201,
        "estudanteId": 103,
        "supervisorId": 11,
        "data": "2026-07-14",
        "hora": "08:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1015,
        "pacienteId": 201,
        "estudanteId": 103,
        "supervisorId": 11,
        "data": "2026-07-21",
        "hora": "08:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1016,
        "pacienteId": 201,
        "estudanteId": 103,
        "supervisorId": 11,
        "data": "2026-07-28",
        "hora": "08:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1017,
        "pacienteId": 202,
        "estudanteId": 106,
        "supervisorId": 12,
        "data": "2026-06-03",
        "hora": "09:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1018,
        "pacienteId": 202,
        "estudanteId": 106,
        "supervisorId": 12,
        "data": "2026-06-10",
        "hora": "09:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1019,
        "pacienteId": 202,
        "estudanteId": 106,
        "supervisorId": 12,
        "data": "2026-06-17",
        "hora": "09:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1020,
        "pacienteId": 202,
        "estudanteId": 106,
        "supervisorId": 12,
        "data": "2026-06-24",
        "hora": "09:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1021,
        "pacienteId": 202,
        "estudanteId": 106,
        "supervisorId": 12,
        "data": "2026-07-01",
        "hora": "09:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1022,
        "pacienteId": 202,
        "estudanteId": 106,
        "supervisorId": 12,
        "data": "2026-07-08",
        "hora": "09:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1023,
        "pacienteId": 202,
        "estudanteId": 106,
        "supervisorId": 12,
        "data": "2026-07-15",
        "hora": "09:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1024,
        "pacienteId": 202,
        "estudanteId": 106,
        "supervisorId": 12,
        "data": "2026-07-22",
        "hora": "09:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1025,
        "pacienteId": 202,
        "estudanteId": 106,
        "supervisorId": 12,
        "data": "2026-07-29",
        "hora": "09:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1026,
        "pacienteId": 203,
        "estudanteId": 109,
        "supervisorId": 13,
        "data": "2026-06-04",
        "hora": "09:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1027,
        "pacienteId": 203,
        "estudanteId": 109,
        "supervisorId": 13,
        "data": "2026-06-11",
        "hora": "09:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1028,
        "pacienteId": 203,
        "estudanteId": 109,
        "supervisorId": 13,
        "data": "2026-06-18",
        "hora": "09:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1029,
        "pacienteId": 203,
        "estudanteId": 109,
        "supervisorId": 13,
        "data": "2026-06-25",
        "hora": "09:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1030,
        "pacienteId": 203,
        "estudanteId": 109,
        "supervisorId": 13,
        "data": "2026-07-02",
        "hora": "09:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1031,
        "pacienteId": 203,
        "estudanteId": 109,
        "supervisorId": 13,
        "data": "2026-07-09",
        "hora": "09:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1032,
        "pacienteId": 203,
        "estudanteId": 109,
        "supervisorId": 13,
        "data": "2026-07-16",
        "hora": "09:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1033,
        "pacienteId": 203,
        "estudanteId": 109,
        "supervisorId": 13,
        "data": "2026-07-23",
        "hora": "09:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1034,
        "pacienteId": 203,
        "estudanteId": 109,
        "supervisorId": 13,
        "data": "2026-07-30",
        "hora": "09:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1035,
        "pacienteId": 204,
        "estudanteId": 112,
        "supervisorId": 14,
        "data": "2026-06-05",
        "hora": "10:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1036,
        "pacienteId": 204,
        "estudanteId": 112,
        "supervisorId": 14,
        "data": "2026-06-12",
        "hora": "10:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1037,
        "pacienteId": 204,
        "estudanteId": 112,
        "supervisorId": 14,
        "data": "2026-06-19",
        "hora": "10:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1038,
        "pacienteId": 204,
        "estudanteId": 112,
        "supervisorId": 14,
        "data": "2026-06-26",
        "hora": "10:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1039,
        "pacienteId": 204,
        "estudanteId": 112,
        "supervisorId": 14,
        "data": "2026-07-03",
        "hora": "10:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1040,
        "pacienteId": 204,
        "estudanteId": 112,
        "supervisorId": 14,
        "data": "2026-07-10",
        "hora": "10:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1041,
        "pacienteId": 204,
        "estudanteId": 112,
        "supervisorId": 14,
        "data": "2026-07-17",
        "hora": "10:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1042,
        "pacienteId": 204,
        "estudanteId": 112,
        "supervisorId": 14,
        "data": "2026-07-24",
        "hora": "10:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1043,
        "pacienteId": 204,
        "estudanteId": 112,
        "supervisorId": 14,
        "data": "2026-07-31",
        "hora": "10:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1044,
        "pacienteId": 205,
        "estudanteId": 115,
        "supervisorId": 10,
        "data": "2026-06-08",
        "hora": "10:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1045,
        "pacienteId": 205,
        "estudanteId": 115,
        "supervisorId": 10,
        "data": "2026-06-15",
        "hora": "10:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1046,
        "pacienteId": 205,
        "estudanteId": 115,
        "supervisorId": 10,
        "data": "2026-06-22",
        "hora": "10:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1047,
        "pacienteId": 205,
        "estudanteId": 115,
        "supervisorId": 10,
        "data": "2026-06-29",
        "hora": "10:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1048,
        "pacienteId": 205,
        "estudanteId": 115,
        "supervisorId": 10,
        "data": "2026-07-06",
        "hora": "10:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1049,
        "pacienteId": 205,
        "estudanteId": 115,
        "supervisorId": 10,
        "data": "2026-07-13",
        "hora": "10:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1050,
        "pacienteId": 205,
        "estudanteId": 115,
        "supervisorId": 10,
        "data": "2026-07-20",
        "hora": "10:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1051,
        "pacienteId": 205,
        "estudanteId": 115,
        "supervisorId": 10,
        "data": "2026-07-27",
        "hora": "10:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1052,
        "pacienteId": 206,
        "estudanteId": 118,
        "supervisorId": 11,
        "data": "2026-06-02",
        "hora": "11:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "cancelado"
    },
    {
        "id": 1053,
        "pacienteId": 206,
        "estudanteId": 118,
        "supervisorId": 11,
        "data": "2026-06-09",
        "hora": "11:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1054,
        "pacienteId": 206,
        "estudanteId": 118,
        "supervisorId": 11,
        "data": "2026-06-16",
        "hora": "11:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1055,
        "pacienteId": 206,
        "estudanteId": 118,
        "supervisorId": 11,
        "data": "2026-06-23",
        "hora": "11:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1056,
        "pacienteId": 206,
        "estudanteId": 118,
        "supervisorId": 11,
        "data": "2026-06-30",
        "hora": "11:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1057,
        "pacienteId": 206,
        "estudanteId": 118,
        "supervisorId": 11,
        "data": "2026-07-07",
        "hora": "11:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1058,
        "pacienteId": 206,
        "estudanteId": 118,
        "supervisorId": 11,
        "data": "2026-07-14",
        "hora": "11:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1059,
        "pacienteId": 206,
        "estudanteId": 118,
        "supervisorId": 11,
        "data": "2026-07-21",
        "hora": "11:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1060,
        "pacienteId": 206,
        "estudanteId": 118,
        "supervisorId": 11,
        "data": "2026-07-28",
        "hora": "11:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1061,
        "pacienteId": 207,
        "estudanteId": 121,
        "supervisorId": 12,
        "data": "2026-06-03",
        "hora": "11:30",
        "local": "Sala 08",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1062,
        "pacienteId": 207,
        "estudanteId": 121,
        "supervisorId": 12,
        "data": "2026-06-10",
        "hora": "11:30",
        "local": "Sala 08",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1063,
        "pacienteId": 207,
        "estudanteId": 121,
        "supervisorId": 12,
        "data": "2026-06-17",
        "hora": "11:30",
        "local": "Sala 08",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1064,
        "pacienteId": 207,
        "estudanteId": 121,
        "supervisorId": 12,
        "data": "2026-06-24",
        "hora": "11:30",
        "local": "Sala 08",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1065,
        "pacienteId": 207,
        "estudanteId": 121,
        "supervisorId": 12,
        "data": "2026-07-01",
        "hora": "11:30",
        "local": "Sala 08",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1066,
        "pacienteId": 207,
        "estudanteId": 121,
        "supervisorId": 12,
        "data": "2026-07-08",
        "hora": "11:30",
        "local": "Sala 08",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1067,
        "pacienteId": 207,
        "estudanteId": 121,
        "supervisorId": 12,
        "data": "2026-07-15",
        "hora": "11:30",
        "local": "Sala 08",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1068,
        "pacienteId": 207,
        "estudanteId": 121,
        "supervisorId": 12,
        "data": "2026-07-22",
        "hora": "11:30",
        "local": "Sala 08",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1069,
        "pacienteId": 207,
        "estudanteId": 121,
        "supervisorId": 12,
        "data": "2026-07-29",
        "hora": "11:30",
        "local": "Sala 08",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1070,
        "pacienteId": 208,
        "estudanteId": 124,
        "supervisorId": 13,
        "data": "2026-06-04",
        "hora": "13:00",
        "local": "Consultório 1",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1071,
        "pacienteId": 208,
        "estudanteId": 124,
        "supervisorId": 13,
        "data": "2026-06-11",
        "hora": "13:00",
        "local": "Consultório 1",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1072,
        "pacienteId": 208,
        "estudanteId": 124,
        "supervisorId": 13,
        "data": "2026-06-18",
        "hora": "13:00",
        "local": "Consultório 1",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1073,
        "pacienteId": 208,
        "estudanteId": 124,
        "supervisorId": 13,
        "data": "2026-06-25",
        "hora": "13:00",
        "local": "Consultório 1",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1074,
        "pacienteId": 208,
        "estudanteId": 124,
        "supervisorId": 13,
        "data": "2026-07-02",
        "hora": "13:00",
        "local": "Consultório 1",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1075,
        "pacienteId": 208,
        "estudanteId": 124,
        "supervisorId": 13,
        "data": "2026-07-09",
        "hora": "13:00",
        "local": "Consultório 1",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1076,
        "pacienteId": 208,
        "estudanteId": 124,
        "supervisorId": 13,
        "data": "2026-07-16",
        "hora": "13:00",
        "local": "Consultório 1",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1077,
        "pacienteId": 208,
        "estudanteId": 124,
        "supervisorId": 13,
        "data": "2026-07-23",
        "hora": "13:00",
        "local": "Consultório 1",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1078,
        "pacienteId": 208,
        "estudanteId": 124,
        "supervisorId": 13,
        "data": "2026-07-30",
        "hora": "13:00",
        "local": "Consultório 1",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1079,
        "pacienteId": 209,
        "estudanteId": 127,
        "supervisorId": 14,
        "data": "2026-06-05",
        "hora": "13:30",
        "local": "Consultório 2",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1080,
        "pacienteId": 209,
        "estudanteId": 127,
        "supervisorId": 14,
        "data": "2026-06-12",
        "hora": "13:30",
        "local": "Consultório 2",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1081,
        "pacienteId": 209,
        "estudanteId": 127,
        "supervisorId": 14,
        "data": "2026-06-19",
        "hora": "13:30",
        "local": "Consultório 2",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1082,
        "pacienteId": 209,
        "estudanteId": 127,
        "supervisorId": 14,
        "data": "2026-06-26",
        "hora": "13:30",
        "local": "Consultório 2",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1083,
        "pacienteId": 209,
        "estudanteId": 127,
        "supervisorId": 14,
        "data": "2026-07-03",
        "hora": "13:30",
        "local": "Consultório 2",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1084,
        "pacienteId": 209,
        "estudanteId": 127,
        "supervisorId": 14,
        "data": "2026-07-10",
        "hora": "13:30",
        "local": "Consultório 2",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1085,
        "pacienteId": 209,
        "estudanteId": 127,
        "supervisorId": 14,
        "data": "2026-07-17",
        "hora": "13:30",
        "local": "Consultório 2",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1086,
        "pacienteId": 209,
        "estudanteId": 127,
        "supervisorId": 14,
        "data": "2026-07-24",
        "hora": "13:30",
        "local": "Consultório 2",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1087,
        "pacienteId": 209,
        "estudanteId": 127,
        "supervisorId": 14,
        "data": "2026-07-31",
        "hora": "13:30",
        "local": "Consultório 2",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1088,
        "pacienteId": 210,
        "estudanteId": 130,
        "supervisorId": 10,
        "data": "2026-06-08",
        "hora": "14:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1089,
        "pacienteId": 210,
        "estudanteId": 130,
        "supervisorId": 10,
        "data": "2026-06-15",
        "hora": "14:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1090,
        "pacienteId": 210,
        "estudanteId": 130,
        "supervisorId": 10,
        "data": "2026-06-22",
        "hora": "14:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1091,
        "pacienteId": 210,
        "estudanteId": 130,
        "supervisorId": 10,
        "data": "2026-06-29",
        "hora": "14:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1092,
        "pacienteId": 210,
        "estudanteId": 130,
        "supervisorId": 10,
        "data": "2026-07-06",
        "hora": "14:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1093,
        "pacienteId": 210,
        "estudanteId": 130,
        "supervisorId": 10,
        "data": "2026-07-13",
        "hora": "14:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1094,
        "pacienteId": 210,
        "estudanteId": 130,
        "supervisorId": 10,
        "data": "2026-07-20",
        "hora": "14:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1095,
        "pacienteId": 210,
        "estudanteId": 130,
        "supervisorId": 10,
        "data": "2026-07-27",
        "hora": "14:00",
        "local": "Sala 01",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1096,
        "pacienteId": 211,
        "estudanteId": 133,
        "supervisorId": 11,
        "data": "2026-06-02",
        "hora": "14:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1097,
        "pacienteId": 211,
        "estudanteId": 133,
        "supervisorId": 11,
        "data": "2026-06-09",
        "hora": "14:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1098,
        "pacienteId": 211,
        "estudanteId": 133,
        "supervisorId": 11,
        "data": "2026-06-16",
        "hora": "14:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1099,
        "pacienteId": 211,
        "estudanteId": 133,
        "supervisorId": 11,
        "data": "2026-06-23",
        "hora": "14:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1100,
        "pacienteId": 211,
        "estudanteId": 133,
        "supervisorId": 11,
        "data": "2026-06-30",
        "hora": "14:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "cancelado"
    },
    {
        "id": 1101,
        "pacienteId": 211,
        "estudanteId": 133,
        "supervisorId": 11,
        "data": "2026-07-07",
        "hora": "14:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1102,
        "pacienteId": 211,
        "estudanteId": 133,
        "supervisorId": 11,
        "data": "2026-07-14",
        "hora": "14:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1103,
        "pacienteId": 211,
        "estudanteId": 133,
        "supervisorId": 11,
        "data": "2026-07-21",
        "hora": "14:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "cancelado"
    },
    {
        "id": 1104,
        "pacienteId": 211,
        "estudanteId": 133,
        "supervisorId": 11,
        "data": "2026-07-28",
        "hora": "14:30",
        "local": "Sala 02",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1105,
        "pacienteId": 212,
        "estudanteId": 136,
        "supervisorId": 12,
        "data": "2026-06-03",
        "hora": "15:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1106,
        "pacienteId": 212,
        "estudanteId": 136,
        "supervisorId": 12,
        "data": "2026-06-10",
        "hora": "15:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1107,
        "pacienteId": 212,
        "estudanteId": 136,
        "supervisorId": 12,
        "data": "2026-06-17",
        "hora": "15:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "cancelado"
    },
    {
        "id": 1108,
        "pacienteId": 212,
        "estudanteId": 136,
        "supervisorId": 12,
        "data": "2026-06-24",
        "hora": "15:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1109,
        "pacienteId": 212,
        "estudanteId": 136,
        "supervisorId": 12,
        "data": "2026-07-01",
        "hora": "15:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1110,
        "pacienteId": 212,
        "estudanteId": 136,
        "supervisorId": 12,
        "data": "2026-07-08",
        "hora": "15:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1111,
        "pacienteId": 212,
        "estudanteId": 136,
        "supervisorId": 12,
        "data": "2026-07-15",
        "hora": "15:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1112,
        "pacienteId": 212,
        "estudanteId": 136,
        "supervisorId": 12,
        "data": "2026-07-22",
        "hora": "15:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1113,
        "pacienteId": 212,
        "estudanteId": 136,
        "supervisorId": 12,
        "data": "2026-07-29",
        "hora": "15:00",
        "local": "Sala 03",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1114,
        "pacienteId": 213,
        "estudanteId": 139,
        "supervisorId": 13,
        "data": "2026-06-04",
        "hora": "15:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1115,
        "pacienteId": 213,
        "estudanteId": 139,
        "supervisorId": 13,
        "data": "2026-06-11",
        "hora": "15:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1116,
        "pacienteId": 213,
        "estudanteId": 139,
        "supervisorId": 13,
        "data": "2026-06-18",
        "hora": "15:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1117,
        "pacienteId": 213,
        "estudanteId": 139,
        "supervisorId": 13,
        "data": "2026-06-25",
        "hora": "15:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1118,
        "pacienteId": 213,
        "estudanteId": 139,
        "supervisorId": 13,
        "data": "2026-07-02",
        "hora": "15:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1119,
        "pacienteId": 213,
        "estudanteId": 139,
        "supervisorId": 13,
        "data": "2026-07-09",
        "hora": "15:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1120,
        "pacienteId": 213,
        "estudanteId": 139,
        "supervisorId": 13,
        "data": "2026-07-16",
        "hora": "15:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1121,
        "pacienteId": 213,
        "estudanteId": 139,
        "supervisorId": 13,
        "data": "2026-07-23",
        "hora": "15:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1122,
        "pacienteId": 213,
        "estudanteId": 139,
        "supervisorId": 13,
        "data": "2026-07-30",
        "hora": "15:30",
        "local": "Sala 04",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1123,
        "pacienteId": 214,
        "estudanteId": 142,
        "supervisorId": 14,
        "data": "2026-06-05",
        "hora": "16:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1124,
        "pacienteId": 214,
        "estudanteId": 142,
        "supervisorId": 14,
        "data": "2026-06-12",
        "hora": "16:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1125,
        "pacienteId": 214,
        "estudanteId": 142,
        "supervisorId": 14,
        "data": "2026-06-19",
        "hora": "16:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1126,
        "pacienteId": 214,
        "estudanteId": 142,
        "supervisorId": 14,
        "data": "2026-06-26",
        "hora": "16:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1127,
        "pacienteId": 214,
        "estudanteId": 142,
        "supervisorId": 14,
        "data": "2026-07-03",
        "hora": "16:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1128,
        "pacienteId": 214,
        "estudanteId": 142,
        "supervisorId": 14,
        "data": "2026-07-10",
        "hora": "16:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1129,
        "pacienteId": 214,
        "estudanteId": 142,
        "supervisorId": 14,
        "data": "2026-07-17",
        "hora": "16:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1130,
        "pacienteId": 214,
        "estudanteId": 142,
        "supervisorId": 14,
        "data": "2026-07-24",
        "hora": "16:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1131,
        "pacienteId": 214,
        "estudanteId": 142,
        "supervisorId": 14,
        "data": "2026-07-31",
        "hora": "16:00",
        "local": "Sala 05",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1132,
        "pacienteId": 215,
        "estudanteId": 145,
        "supervisorId": 10,
        "data": "2026-06-08",
        "hora": "16:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1133,
        "pacienteId": 215,
        "estudanteId": 145,
        "supervisorId": 10,
        "data": "2026-06-15",
        "hora": "16:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1134,
        "pacienteId": 215,
        "estudanteId": 145,
        "supervisorId": 10,
        "data": "2026-06-22",
        "hora": "16:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1135,
        "pacienteId": 215,
        "estudanteId": 145,
        "supervisorId": 10,
        "data": "2026-06-29",
        "hora": "16:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1136,
        "pacienteId": 215,
        "estudanteId": 145,
        "supervisorId": 10,
        "data": "2026-07-06",
        "hora": "16:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1137,
        "pacienteId": 215,
        "estudanteId": 145,
        "supervisorId": 10,
        "data": "2026-07-13",
        "hora": "16:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1138,
        "pacienteId": 215,
        "estudanteId": 145,
        "supervisorId": 10,
        "data": "2026-07-20",
        "hora": "16:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1139,
        "pacienteId": 215,
        "estudanteId": 145,
        "supervisorId": 10,
        "data": "2026-07-27",
        "hora": "16:30",
        "local": "Sala 06",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1140,
        "pacienteId": 216,
        "estudanteId": 148,
        "supervisorId": 11,
        "data": "2026-06-02",
        "hora": "08:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1141,
        "pacienteId": 216,
        "estudanteId": 148,
        "supervisorId": 11,
        "data": "2026-06-09",
        "hora": "08:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1142,
        "pacienteId": 216,
        "estudanteId": 148,
        "supervisorId": 11,
        "data": "2026-06-16",
        "hora": "08:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1143,
        "pacienteId": 216,
        "estudanteId": 148,
        "supervisorId": 11,
        "data": "2026-06-23",
        "hora": "08:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "cancelado"
    },
    {
        "id": 1144,
        "pacienteId": 216,
        "estudanteId": 148,
        "supervisorId": 11,
        "data": "2026-06-30",
        "hora": "08:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1145,
        "pacienteId": 216,
        "estudanteId": 148,
        "supervisorId": 11,
        "data": "2026-07-07",
        "hora": "08:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1146,
        "pacienteId": 216,
        "estudanteId": 148,
        "supervisorId": 11,
        "data": "2026-07-14",
        "hora": "08:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1147,
        "pacienteId": 216,
        "estudanteId": 148,
        "supervisorId": 11,
        "data": "2026-07-21",
        "hora": "08:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    },
    {
        "id": 1148,
        "pacienteId": 216,
        "estudanteId": 148,
        "supervisorId": 11,
        "data": "2026-07-28",
        "hora": "08:00",
        "local": "Sala 07",
        "modalidade": "presencial",
        "status": "confirmado"
    }
];

  // ── DOCUMENTOS ───────────────────────────────────────────────
  DOCUMENTOS = {
    200: [{ id:"d1", nome:"Termo_Consentimento_Laura.pdf", tipo:"pdf",
            tamanho:"124 KB", data:"2026-05-28", autor:"Dr. Carlos Mendes" }],
  };

  // ── AUDITORIA ────────────────────────────────────────────────
  AUDITORIA = [
    { id:1, tipo:"cadastro", ator:"Dr. Carlos Mendes",
      acao:"Importou dados do semestre 2026/1", obj:"50 estudantes · 17 grupos",
      ts:"2026-05-28 09:00", dot:"#1b5e20" },
  ];

  // ── ACESSO PACIENTE ──────────────────────────────────────────
  ACESSO_PACIENTE = [
    { id:1, pacienteId:200, nome:"Laura Assis", status:"liberado",
      solicitacao:"2026-06-01", liberacao:"2026-06-01",
      protocolo:"PROT-2026-001" },
  ];

  // ── NOTIFICAÇÕES E FALTAS ────────────────────────────────────
  NOTIFICACOES = [];
  FALTAS = [];

  saveData();
}

// Garante que TODOS os pacientes usem a cor institucional #1b5e20
function _normalizeCores() {
  const COR_PADRAO = "#1b5e20";
  let changed = false;
  PACIENTES.forEach((p) => {
    if (p.cor !== COR_PADRAO) {
      p.cor = COR_PADRAO;
      changed = true;
    }
  });
  if (changed) saveData();
}


// =============================================================
// Retorna HTML completo de badge de status de agendamento.
// ACESSIBILIDADE: sempre inclui ícone + texto para não depender
// exclusivamente de cor — essencial para daltonismo.
// =============================================================
function badgeAgendamento(status) {
  const map = {
    confirmado: { cls: "badge-green",  icon: "bi-check-circle-fill", label: "confirmado" },
    pendente:   { cls: "badge-amber",  icon: "bi-clock-fill",        label: "pendente"   },
    cancelado:  { cls: "badge-cancel", icon: "bi-slash-circle-fill", label: "cancelado"  },
    faltou:     { cls: "badge-amber",  icon: "bi-person-x-fill",     label: "faltou"     },
  };
  const b = map[status] || { cls: "badge-gray", icon: "bi-question-circle", label: status };
  return `<span class="badge ${b.cls}"><i class="bi ${b.icon}" aria-hidden="true"></i>${escapeHTML(b.label)}</span>`;
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
      NOTIFICACOES,
      FALTAS,
    }),
  );
}
// ─────────────────────────────────────────────────────────────
// logAudit(tipo, acao, obj)
// Registra entrada imutável na trilha de auditoria (AUDITORIA[]).
//
// tipo: 'login' | 'cadastro' | 'evolucao' | 'agenda' | 'acesso' | ...
// acao: texto descritivo da ação (ex: 'Editou agendamento')
// obj:  nome do paciente ou objeto afetado
//
// IMPORTANTE: entradas de auditoria NUNCA são apagadas.
// Para produção, mover para API REST com servidor de logs.
// ─────────────────────────────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────
// getPacientesPermitidos()
// Controle de acesso por papel (RBAC simples).
//
// tecnico   → todos os pacientes
// supervisor → pacientes onde supervisorId === currentUser.id
// estudante  → pacientes onde estudantesIds inclui currentUser.id
// paciente   → somente o próprio cadastro (id === currentUser.id)
//
// MANUTENÇÃO: se adicionar um novo papel, adicione um case aqui.
// ─────────────────────────────────────────────────────────────
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
function initApp(restorePage) {
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

      <div class="card" style="flex:1.35;min-width:0">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-bar-chart-line-fill" style="color:var(--sc-green)"></i> Atendimentos por Mês</span>
          <span style="font-size:11px;color:var(--text3)">consultas realizadas × canceladas</span>
        </div>
        <div class="card-body" style="padding:10px 14px 14px">
          <div class="chart-container" style="height:190px"><canvas id="chartAtendMes"></canvas></div>
        </div>
      </div>

      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:14px">

        <div class="card" style="flex:none">
          <div class="card-header"><span class="card-title"><i class="bi bi-diagram-3-fill" style="color:#6d28d9"></i> Situação dos Grupos</span></div>
          <div class="card-body" style="padding:10px 14px">
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <div class="dash-mini-stat" style="background:#f0fdf4;border-color:#bbf7d0">
                <div class="dash-mini-val" style="color:#14532d">${PACIENTES.filter(p=>p.status==="ativo").length}</div>
                <div class="dash-mini-lbl">Grupos ativos</div>
              </div>
              <div class="dash-mini-stat" style="background:#fffbeb;border-color:#fde68a">
                <div class="dash-mini-val" style="color:#92400e">${listaAtivos.filter(p=>!(ANAMNESES[p.id]&&ANAMNESES[p.id].status==="finalizada")).length}</div>
                <div class="dash-mini-lbl">Sem anamnese</div>
              </div>
              <div class="dash-mini-stat" style="background:#fef2f2;border-color:#fecaca">
                <div class="dash-mini-val" style="color:#991b1b">${FALTAS.filter(f=>!f.justificada).length}</div>
                <div class="dash-mini-lbl">Faltas inj.</div>
              </div>
              <div class="dash-mini-stat" style="background:#ede9fe;border-color:#ddd6fe">
                <div class="dash-mini-val" style="color:#6d28d9">${totalEvs}</div>
                <div class="dash-mini-lbl">Evoluções</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="flex:1">
          <div class="card-header"><span class="card-title"><i class="bi bi-pie-chart-fill" style="color:#f59e0b"></i> Conformidade CRP</span></div>
          <div class="card-body" style="padding:8px 14px">
            <div class="chart-container" style="height:110px"><canvas id="chartAnamneses"></canvas></div>
          </div>
        </div>

      </div>

      <div class="card" style="flex:none;width:240px;min-width:200px">
        <div class="card-header"><span class="card-title"><i class="bi bi-calendar-event" style="color:var(--sc-green)"></i> Agenda Hoje</span></div>
        <div class="card-body" style="padding:8px 12px;max-height:280px;overflow-y:auto">
          ${
            agsHoje.length === 0
              ? '<div style="text-align:center;padding:20px 0;font-size:12px;color:var(--text3)"><i class="bi bi-calendar-x" style="font-size:22px;display:block;margin-bottom:6px"></i>Nenhum atendimento hoje</div>'
              : agsHoje.slice(0,8).map((ag) => {
                  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
                  const est = USERS.find(u => u.id === ag.estudanteId);
                  return '<div class="dash-today-item" onclick="openProntuario(' + ag.pacienteId + ')">' +
                    '<div class="dash-today-hora">' + ag.hora + '</div>' +
                    '<div class="dash-today-dot" style="background:#1b5e20"></div>' +
                    '<div style="flex:1;min-width:0">' +
                      '<div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHTML(pac?.nome || "—") + '</div>' +
                      '<div style="font-size:9px;color:var(--text3)">' + escapeHTML(ag.local) + (est ? " · " + escapeHTML(est.nome.split(" ")[0]) : "") + '</div>' +
                    '</div></div>';
                }).join("") +
              (agsHoje.length > 8 ? '<div style="text-align:center;font-size:11px;color:var(--text3);padding:6px 0">+' + (agsHoje.length-8) + ' mais</div>' : '')
          }
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

// ─────────────────────────────────────────────────────────────
// renderDashboardCharts()
// Renderiza todos os gráficos do dashboard após o HTML estar no DOM.
//
// Gráficos gerenciais (técnico/supervisor):
//   chartAtendMes  → linha: atendimentos confirmados x cancelados por mês
//   chartAnamneses → doughnut: conformidade CRP (anamneses finalizadas/pendentes)
//
// Gráfico estudante:
//   chartMeusCasos → barras horizontais: evoluções por paciente
//
// MANUTENÇÃO: para adicionar um gráfico, crie o <canvas> no renderDashboard()
// e adicione o bloco new Chart() aqui. Use _destroyChart(id) antes para evitar
// instâncias duplicadas ao navegar.
// ─────────────────────────────────────────────────────────────
function renderDashboardCharts() {
  const role = currentUser.papel;
  const meusPacientes = getPacientesPermitidos();
  const listaAtivos = meusPacientes.filter((p) => p.status === "ativo");

  const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: {} } },
  };

  // ── GRÁFICO 1 (gerencial): Atendimentos por mês — linha dupla ───────────
  // Substitui o gráfico de barras por estudante (ilegível com 50 alunos).
  // Mostra volume mensal de consultas confirmadas vs. canceladas/faltas.
  const ctxAtend = document.getElementById("chartAtendMes");
  if (ctxAtend) {
    _destroyChart("atendMes");

    // Calcular últimos 6 meses
    const meses = [];
    const labMeses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({ y: d.getFullYear(), m: d.getMonth(), label: labMeses[d.getMonth()] + "/" + String(d.getFullYear()).slice(2) });
    }

    const dataConfirmados = meses.map(({ y, m }) =>
      AGENDAMENTOS.filter((a) => {
        const d = new Date(a.data + "T12:00:00");
        return d.getFullYear() === y && d.getMonth() === m && a.status === "confirmado";
      }).length
    );
    const dataCancelados = meses.map(({ y, m }) =>
      AGENDAMENTOS.filter((a) => {
        const d = new Date(a.data + "T12:00:00");
        return d.getFullYear() === y && d.getMonth() === m &&
               (a.status === "cancelado" || a.status === "faltou");
      }).length
    );

    _chartInsts["atendMes"] = new Chart(ctxAtend, {
      type: "line",
      data: {
        labels: meses.map((m) => m.label),
        datasets: [
          {
            label: "Realizados",
            data: dataConfirmados,
            borderColor: "#1b5e20",
            backgroundColor: "rgba(27,94,32,0.08)",
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            borderWidth: 2,
          },
          {
            label: "Cancelados/Faltas",
            data: dataCancelados,
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245,158,11,0.07)",
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            borderWidth: 2,
            borderDash: [5, 4],
          },
        ],
      },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          legend: {
            display: true, position: "top", align: "end",
            labels: { usePointStyle: true, padding: 14, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => " " + ctx.dataset.label + ": " + ctx.parsed.y,
            },
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: "#f1f5f1" } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  // ── GRÁFICO 2 (gerencial): Conformidade CRP — doughnut ──────────────────
  const ctxAnam = document.getElementById("chartAnamneses");
  if (ctxAnam) {
    _destroyChart("anam");
    let finalizadas = listaAtivos.filter((p) => ANAMNESES[p.id]?.status === "finalizada").length;
    let pendentes = listaAtivos.length - finalizadas;
    if (finalizadas === 0 && pendentes === 0) pendentes = 1;
    _chartInsts["anam"] = new Chart(ctxAnam, {
      type: "doughnut",
      data: {
        labels: ["Finalizadas", "Pendentes"],
        datasets: [{
          data: [finalizadas, pendentes],
          backgroundColor: ["#1b5e20", "#f59e0b"],
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        ...CHART_DEFAULTS,
        cutout: "68%",
        plugins: {
          legend: { display: true, position: "bottom", labels: { usePointStyle: true, padding: 8, font: { size: 10 } } },
          tooltip: { callbacks: { label: (ctx) => " " + ctx.label + ": " + ctx.parsed } },
        },
      },
    });
    chartEvolucoesInst = _chartInsts["anam"];
  }

  // ── GRÁFICO 3 (estudante): Evoluções por caso ────────────────────────────
  const ctxMeusCasos = document.getElementById("chartMeusCasos");
  if (ctxMeusCasos && role === "estudante") {
    _destroyChart("meusCasos");
    const meusCasos = listaAtivos;
    _chartInsts["meusCasos"] = new Chart(ctxMeusCasos, {
      type: "bar",
      data: {
        labels: meusCasos.map((p) => p.nome.split(" ")[0]),
        datasets: [{
          label: "Evoluções",
          data: meusCasos.map((p) => (EVOLUCOES[p.id] || []).length),
          backgroundColor: "#1b5e20",
          borderRadius: 6,
        }],
      },
      options: {
        ...CHART_DEFAULTS,
        indexAxis: "y",
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: "#f1f5f1" } },
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
  <button type="button" class="back-btn" onclick="navigate('pacientes')"><i class="bi bi-arrow-left"></i> Voltar</button>
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
  const ags = AGENDAMENTOS.filter((a) => a.pacienteId === pid)
    .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));
  const canManage = ["tecnico", "supervisor", "estudante", "paciente"].includes(currentUser.papel);
  const hoje = new Date().toISOString().split("T")[0];
  const rows = ags.map((ag) => {
    const isPast = ag.data < hoje;
    const isCanceled = ag.status === "cancelado";
    const badgeCls = isCanceled ? "badge-cancel" : ag.status === "faltou" ? "badge-amber" : (ag.status === "confirmado" ? "badge-green" : "badge-amber");
    const dataFmt = ag.data.split("-").reverse().join("/");
    const isFaltou = ag.status === "faltou";
    const faltaInfo = FALTAS.find((f) => f.agId === ag.id);
    const acoes = (!isCanceled && !isFaltou && canManage)
      ? `<div class="action-btns" style="flex-wrap:wrap;gap:4px">
           ${!isPast ? `<button class="btn btn-secondary btn-sm" onclick="openModalEditarAgendamento(${ag.id})" title="Editar agendamento">
             <i class="bi bi-pencil"></i> Editar
           </button>` : ""}
           <button class="btn btn-sm" style="background:#fef3c7;color:#92400e;border:1px solid #f59e0b" onclick="registrarFalta(${ag.id})" title="Registrar falta">
             <i class="bi bi-person-x"></i> Faltou
           </button>
           ${!isPast ? `<button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5" onclick="confirmarCancelamentoAgendamento(${ag.id})" title="Cancelar agendamento">
             <i class="bi bi-x-circle"></i> Cancelar
           </button>` : ""}
         </div>`
      : isFaltou
        ? `<div style="font-size:11px">
            <span style="color:#92400e"><i class="bi bi-person-x"></i> Faltou</span>
            ${faltaInfo && !faltaInfo.justificada && ["tecnico","supervisor"].includes(currentUser.papel)
              ? `<br><button class="btn btn-sm" style="margin-top:3px;background:#dcfce7;color:#14532d;border:1px solid #86efac" onclick="justificarFalta('${faltaInfo?.id}')"><i class="bi bi-check"></i> Justificar</button>`
              : faltaInfo?.justificada ? '<span style="color:var(--text3)"> (justificada)</span>' : ""}
           </div>`
        : `<span style="font-size:11px;color:var(--text3)">${isPast && !isFaltou ? "Concluído" : "—"}</span>`;
    return `<tr style="${isCanceled ? "opacity:0.55" : ""}">
      <td style="font-weight:500">${dataFmt}</td>
      <td><strong>${escapeHTML(ag.hora)}</strong></td>
      <td>${escapeHTML(ag.local)}</td>
      <td><span class="badge ${badgeCls}">${ag.status}</span></td>
      <td>${acoes}</td>
    </tr>`;
  }).join("");
  const emptyState = ags.length === 0
    ? `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text3)"><i class="bi bi-calendar-x" style="font-size:22px;display:block;margin-bottom:8px"></i>Nenhum agendamento registrado</td></tr>`
    : "";
  return `<div class="card">
    <div class="card-header">
      <span class="card-title"><i class="bi bi-calendar3" style="color:var(--sc-green)"></i> Agendamentos</span>
    </div>
    <div class="table-responsive">
      <table>
        <thead><tr><th>Data</th><th>Hora</th><th>Local</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${rows || emptyState}</tbody>
      </table>
    </div>
  </div>`;
}

function _renderProximosList(proximos, hoje) {
  if (proximos.length === 0)
    return '<div class="empty-state" style="padding:28px"><i class="bi bi-calendar-x" style="font-size:28px;color:var(--text3)"></i><p style="margin-top:8px;color:var(--text3)">Nenhum atendimento futuro agendado.</p></div>';
  const rows = proximos
    .map((ag) => {
      const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
      const isHj = ag.data === hoje;
      const dataFmt = ag.data.split("-").reverse().join("/");
      const hojeSpan = isHj
        ? '<span style="font-size:10px;background:var(--sc-green);color:#fff;border-radius:3px;padding:1px 5px;margin-right:4px">HOJE</span>'
        : "";
      const avatar = `<div class="patient-avatar" style="background:#1b5e20;width:24px;height:24px;font-size:10px">${escapeHTML(pac?.ini || "?")}</div>`;
      const link = `<button class="dash-link-btn" onclick="openProntuario(${ag.pacienteId})">${escapeHTML(pac?.nome || "—")}</button>`;
      const isCanceled = ag.status === "cancelado";
      const badge = badgeAgendamento(ag.status);
      const acoesCell = !isCanceled
        ? `<div class="action-btns" style="flex-wrap:nowrap">
             <button class="btn btn-ghost btn-sm" onclick="openModalEditarAgendamento(${ag.id})" title="Editar"><i class="bi bi-pencil"></i></button>
             <button class="btn btn-ghost btn-sm" style="color:#dc2626" onclick="confirmarCancelamentoAgendamento(${ag.id})" title="Cancelar"><i class="bi bi-x-circle"></i></button>
           </div>`
        : `<span style="font-size:11px;color:var(--text3)">—</span>`;
      return `<tr style="${isHj ? "background:#f0fdf4" : ""}${isCanceled ? ";opacity:0.55" : ""}">
      <td style="font-weight:${isHj ? "700" : "400"}">${hojeSpan}${dataFmt}</td>
      <td style="font-weight:600">${ag.hora}</td>
      <td><div style="display:flex;align-items:center;gap:8px">${avatar}${link}</div></td>
      <td style="font-size:12px">${escapeHTML(ag.local)}</td>
      <td>${badge}</td>
      <td>${acoesCell}</td>
    </tr>`;
    })
    .join("");
  return `<div class="table-responsive"><table><thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Local</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ============================================================  AGENDA  */
function _agendaGetSemana(offsetSemanas) {
  const hoje = new Date();
  const diaSemana = hoje.getDay();
  const seg = new Date(hoje);
  seg.setDate(
    hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1) + offsetSemanas * 7,
  );
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(seg);
    d.setDate(seg.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

let _agendaSemanaOffset = 0;

// ─────────────────────────────────────────────────────────────
// renderAgenda()
// Renderiza a view semanal de agendamentos.
//
// ESTRUTURA:
//   - _agendaGetSemana(offset) → array de 5 datas ISO (seg-sex)
//   - slotMap: dicionário { 'ISO_HH:MM' → { pac, ag } } para O(1)
//   - headerCols: <th> por dia, destaca hoje em verde escuro
//   - rows: <tr> por hora, <td> por dia; usa classes CSS da agenda
//
// ACESSIBILIDADE:
//   - Eventos: aria-label com nome + local
//   - Cancelados: fundo cinza + ícone slash — não depende de cor
//   - Bordas entre colunas/linhas definidas em CSS (.agenda-table)
//
// MANUTENÇÃO:
//   Para adicionar novos horários, edite o array HOURS abaixo.
//   Para alterar aparência dos eventos, edite as classes
//   .agenda-td-slot, .cal-event-accessible, .agenda-ev-* no CSS.
// ─────────────────────────────────────────────────────────────
function renderAgenda() {
  const DIAS_LABEL = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  // Slots de 30 min das 8h às 17h
  const HOURS = [
    "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
    "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30",
  ];
  const semana = _agendaGetSemana(_agendaSemanaOffset);
  const hoje = new Date().toISOString().split("T")[0];
  const MESES = [
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

  const meusPacientesIds = getPacientesPermitidos().map((p) => p.id);
  // Para estudante: só agendamentos onde ele é o responsável
  // Para técnico/supervisor: todos agendamentos dos seus pacientes
  let meusAgendamentos;
  if (currentUser.papel === "estudante") {
    meusAgendamentos = AGENDAMENTOS.filter((a) =>
      meusPacientesIds.includes(a.pacienteId) && a.estudanteId === currentUser.id
    );
  } else {
    meusAgendamentos = AGENDAMENTOS.filter((a) =>
      meusPacientesIds.includes(a.pacienteId)
    );
  }

  // slotMapMulti: chave "ISO_HH:MM" → array de { pac, ag, estudante }
  // Permite múltiplos eventos no mesmo slot (diferentes estudantes)
  const slotMapMulti = {};
  meusAgendamentos.forEach((ag) => {
    if (semana.includes(ag.data)) {
      const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
      const est = USERS.find((u) => u.id === ag.estudanteId);
      if (pac) {
        const key = ag.data + "_" + ag.hora;
        if (!slotMapMulti[key]) slotMapMulti[key] = [];
        slotMapMulti[key].push({ pac, ag, est });
      }
    }
  });

  const fmtDia = (iso) => {
    const parts = iso.split("-");
    return parseInt(parts[2]) + " " + MESES[parseInt(parts[1]) - 1];
  };
  const isHoje = (iso) => iso === hoje;

  const semLabel = fmtDia(semana[0]) + " — " + fmtDia(semana[4]);

  const headerCols = semana
    .map((iso, i) => {
      const ativo = isHoje(iso);
      const dot = ativo
        ? '<div style="width:6px;height:6px;border-radius:50%;background:#69c96d;margin:3px auto 0"></div>'
        : "";
      return (
        '<th class="agenda-th" style="background:' +
        (ativo ? "#1b5e20" : "var(--bg)") +
        '" ' + (ativo ? 'data-today="true"' : '') + '>' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:' +
        (ativo ? "#a5d6a7" : "var(--text3)") + '">' +
        DIAS_LABEL[i] +
        "</div>" +
        '<div style="font-size:13px;font-weight:700;color:' +
        (ativo ? "#ffffff" : "var(--text)") +
        '">' +
        fmtDia(iso) +
        "</div>" +
        dot +
        "</th>"
      );
    })
    .join("");

  const rows = HOURS.map((hora) => {
    const cells = semana
      .map((iso) => {
        const key = iso + "_" + hora;
        const evs = slotMapMulti[key] || [];
        const todayClass = isHoje(iso) ? ' agenda-td-today' : '';
        if (evs.length > 0) {
          // Múltiplos eventos no mesmo slot (diferentes estudantes/pacientes)
          const evCards = evs.map((ev) => {
            const isCan = ev.ag.status === 'cancelado';
            const isFaltou = ev.ag.status === 'faltou';
            const bgStyle = isCan
              ? 'background:#e5e7eb;border-left:4px solid #9ca3af;'
              : isFaltou
                ? 'background:#fef3c7;border-left:4px solid #f59e0b;'
                : 'background:#1b5e20;border-left:4px solid #69c96d;';
            const nameColor = (isCan || isFaltou) ? '#374151' : '#ffffff';
            const localColor = (isCan || isFaltou) ? '#6b7280' : '#a5d6a7';
            const estNome = ev.est ? ev.est.nome.split(' ')[0] : '';
            return '<div class="cal-event-accessible" ' +
              'aria-label="Consulta: ' + escapeHTML(ev.pac.nome) + '" ' +
              'style="' + bgStyle + 'cursor:default;padding:5px 7px;border-radius:5px;margin:2px 0">' +
              '<div style="font-weight:700;font-size:11px;color:' + nameColor + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;cursor:pointer" onclick="openProntuario(' + ev.pac.id + ')">' +
              escapeHTML(ev.pac.nome.split(' ')[0]) +
              '</div>' +
              '<div style="font-size:9px;color:' + localColor + ';margin-bottom:2px">' +
              escapeHTML(ev.ag.local) + (estNome ? ' · ' + escapeHTML(estNome) : '') +
              '</div>' +
              (isCan ? '<div class="agenda-ev-canceled-label"><i class="bi bi-slash-circle"></i> cancelado</div>'
               : isFaltou ? '<div class="agenda-ev-canceled-label" style="color:#92400e"><i class="bi bi-person-x"></i> faltou</div>'
               : '<div class="agenda-ev-actions">' +
                   '<button class="agenda-ev-btn" onclick="openModalEditarAgendamento(' + ev.ag.id + ')" title="Editar" aria-label="Editar agendamento de ' + escapeHTML(ev.pac.nome) + '"><i class="bi bi-pencil"></i></button>' +
                   '<button class="agenda-ev-btn agenda-ev-btn-cancel" onclick="confirmarCancelamentoAgendamento(' + ev.ag.id + ')" title="Cancelar" aria-label="Cancelar agendamento de ' + escapeHTML(ev.pac.nome) + '"><i class="bi bi-x-circle"></i></button>' +
                   '</div>') +
              '</div>';
          }).join('');
          return '<td class="agenda-td-slot' + todayClass + '" style="vertical-align:top;padding:3px">' + evCards + '</td>';
        }
        return '<td class="agenda-td-slot agenda-td-empty' + todayClass + '"></td>';
      })
      .join("");
    return (
      '<tr><td class="agenda-td-hour">' +
      hora +
      "</td>" +
      cells +
      "</tr>"
    );
  }).join("");

  const proximos = meusAgendamentos
    .filter((a) => a.data >= hoje)
    .sort(
      (a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora),
    )
    .slice(0, 8);

  const canAdd = ["tecnico", "supervisor", "estudante"].includes(
    currentUser.papel,
  );

  return (
    '<div class="page-header"><div class="page-header-left"><h1>Agenda</h1></div>' +
    (canAdd
      ? '<button class="btn btn-primary" onclick="openModalNovoAgendamento()"><i class="bi bi-plus-lg"></i> Novo Agendamento</button>'
      : "") +
    "</div>" +
    '<div class="card" style="margin-bottom:18px">' +
    '<div class="card-header" style="gap:12px;flex-wrap:wrap">' +
    '<button class="btn btn-secondary btn-sm" onclick="_agendaSemanaOffset--;navigate(\'agenda\')" title="Semana anterior"><i class="bi bi-chevron-left"></i></button>' +
    '<span class="card-title" style="flex:1;text-align:center;font-size:13px">' +
    semLabel +
    "</span>" +
    '<button class="btn btn-ghost btn-sm" onclick="_agendaSemanaOffset=0;navigate(\'agenda\')">Hoje</button>' +
    '<button class="btn btn-secondary btn-sm" onclick="_agendaSemanaOffset++;navigate(\'agenda\')" title="Próxima semana"><i class="bi bi-chevron-right"></i></button>' +
    "</div>" +
    '<div class="agenda-calendar-wrap" style="overflow-x:auto"><table class="agenda-table"> ' +
    '<thead><tr><th class="agenda-th-corner"></th>' +
    headerCols +
    "</tr></thead>" +
    "<tbody>" +
    rows +
    "</tbody>" +
    "</table></div></div>" +
    '<div class="card"><div class="card-header"><span class="card-title"><i class="bi bi-list-ul" style="color:var(--sc-green)"></i> Próximos Atendimentos</span></div>' +
    '<div class="card-body" style="padding:0">' +
    _renderProximosList(proximos, hoje) +
    "</div></div>"
  );
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
  // Usa o id do usuário logado (paciente), não hardcoded
  const pid = currentUser.id;
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
  const evContent = document.getElementById("ev-content").value.trim();
  if (!evContent) return toast("Preencha o conteúdo da evolução!", "error");
  // Remove instância anterior para evitar duplo disparo
  const existing = document.getElementById("custom-confirm");
  if (existing) existing.remove();
  const confirmDiv = document.createElement("div");
  confirmDiv.id = "custom-confirm";
  confirmDiv.className = "modal-overlay";
  confirmDiv.style.cssText =
    "z-index:3000;display:flex;align-items:center;justify-content:center;padding:15px";
  confirmDiv.innerHTML = `<div class="modal" style="max-width:400px;text-align:center;padding:28px 24px" onclick="event.stopPropagation()"><i class="bi bi-exclamation-triangle-fill" style="font-size:44px;color:var(--amber);display:block;margin-bottom:14px"></i><h3 style="margin-bottom:8px;font-size:18px">Confirmar Evolução</h3><p style="font-size:13px;color:var(--text2);margin-bottom:24px;line-height:1.6">Uma vez salva, esta evolução <strong>não poderá ser alterada ou apagada</strong>, conforme normas do CRP.</p><div style="display:flex;gap:10px;justify-content:center"><button class="btn btn-secondary" onclick="document.getElementById('custom-confirm').remove()">Cancelar</button><button class="btn btn-primary" onclick="executarSalvarEvolucao(${pid})">Confirmar</button></div></div>`;
  document.body.appendChild(confirmDiv);
}

function executarSalvarEvolucao(pid) {
  const conf = document.getElementById("custom-confirm");
  if (conf) conf.remove();
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
  const pacNomeEv = PACIENTES.find((p) => p.id === pid)?.nome || "Desconhecido";
  logAudit("evolucao", `Registrou evolução #${num}`, pacNomeEv);
  saveData();
  closeModal();
  toast("Salvo com sucesso!", "success");
  openProntuario(pid);
}

/* ============================================================  DOCUMENTOS E ANAMNESE  */
function openModalUploadDocumento(pid) {
  openModal(
    `Upload de Documento (Simulado)`,
    `<div class="form-group"><label class="form-label">Nome do arquivo</label><input type="text" id="up-nome" class="form-control" placeholder="Ex: Laudo_Medico.pdf"></div><div class="form-group"><label class="form-label">Tipo</label><select id="up-tipo" class="form-control"><option value="pdf">PDF</option><option value="img">Imagem</option><option value="docx">Word</option></select></div><div class="form-group"><label class="form-label">Arquivo</label><input type="file" class="form-control"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarUploadDocumento(${pid})">Enviar Arquivo</button>`,
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
  // Guard CRP: anamnese finalizada é imutável
  const existente = ANAMNESES[pid];
  if (
    existente &&
    existente.status === "finalizada" &&
    status === "finalizada"
  ) {
    toast(
      "Esta anamnese já foi finalizada e não pode ser alterada (CRP).",
      "error",
    );
    return;
  }
  const queixa = document.getElementById("am-queixa").value.trim();
  if (!queixa) return toast("A queixa principal é obrigatória!", "error");
  ANAMNESES[pid] = {
    queixa: document.getElementById("am-queixa").value,
    historia: document.getElementById("am-historia").value,
    historico_medico: document.getElementById("am-medico").value,
    medicamentos: document.getElementById("am-med").value,
    contexto: document.getElementById("am-ctx").value,
    hipoteses: document.getElementById("am-hipo").value,
    status,
    rascunho: status === "rascunho",
    criadoPor: currentUser.nome,
    criadoEm: existente?.criadoEm || new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
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
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label">Nome completo *</label><input class="form-control" id="np-nome" type="text"></div><div class="form-group"><label class="form-label">CPF *</label><input class="form-control" id="np-cpf" type="text" placeholder="000.000.000-00" autocomplete="off" oninput="maskCPF(this)"></div></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Data de nascimento</label><input class="form-control" id="np-nasc" type="date"></div><div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="np-tel" type="tel" placeholder="(00) 00000-0000" oninput="maskPhone(this)"></div></div><div class="form-group"><label class="form-label">E-mail</label><input class="form-control" id="np-email" type="email"></div><div class="form-group"><label class="form-label">Supervisor</label><select class="form-control" id="np-sup">${USERS.filter(
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
  if (!cpf) return showError("np-cpf", "CPF é obrigatório!");
  if (!validarCPF(cpf))
    return showError("np-cpf", "O CPF informado não é válido!");
  if (
    PACIENTES.some((p) => p.cpf.replace(/\D/g, "") === cpf.replace(/\D/g, ""))
  )
    return showError("np-cpf", "Já existe um paciente com este CPF!");
  if (email && !validarEmail(email))
    return showError("np-email", "O e-mail informado tem formato inválido!");

  const e1 = parseInt(document.getElementById("np-est1").value);
  const e2 = parseInt(document.getElementById("np-est2").value);
  const e3 = parseInt(document.getElementById("np-est3").value);
  const estudantesIds = [e1, e2, e3].filter((id) => !isNaN(id));
  const CORES = [
    "#1b5e20",
    "#1b5e20",
    "#1b5e20",
    "#1b5e20",
    "#1b5e20",
    "#1b5e20",
    "#1b5e20",
  ];
  const newId = Date.now();
  PACIENTES.push({
    id: newId,
    nome,
    cpf: cpf || "",
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
    return showError("ep-cpf", "O CPF informado não é válido!");
  if (email && !validarEmail(email))
    return showError("ep-email", "O e-mail informado tem formato inválido!");

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
  const pass = document.getElementById("nu-pass").value.trim();
  if (!nome) return toast("Informe o nome completo!", "error");
  if (!login) return toast("Informe o login!", "error");
  if (!pass || pass.length < 4)
    return toast("Senha deve ter no mínimo 4 caracteres!", "error");
  if (USERS.some((u) => u.login === login))
    return toast("Este login já está em uso!", "error");
  USERS.push({
    id: Date.now(),
    login,
    pass: pass,
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
  const agData = document.getElementById("ag-data").value;
  const agHora = document.getElementById("ag-hora").value;
  if (!agData) return toast("Selecione a data do agendamento!", "error");
  if (!agHora) return toast("Selecione o horário do agendamento!", "error");
  const pac = PACIENTES.find((p) => p.id === pacienteId);
  const estId = currentUser.papel === "estudante" ? currentUser.id : pac?.estudantesIds?.[0] || null;
  const supId = currentUser.papel === "supervisor" ? currentUser.id : pac?.supervisorId || null;
  // Conflito: mesmo paciente + mesmo estudante + mesmo slot
  const conflito = AGENDAMENTOS.find(
    (a) => a.pacienteId === pacienteId && a.estudanteId === estId &&
           a.data === agData && a.hora === agHora && a.status !== "cancelado"
  );
  if (conflito) return toast("Já existe um agendamento para este paciente com este estudante neste horário!", "error");
  AGENDAMENTOS.push({
    id: Date.now(),
    pacienteId,
    estudanteId: estId,
    supervisorId: supId,
    data: agData,
    hora: agHora,
    local: document.getElementById("ag-local").value.trim() || "Consultório",
    modalidade: "presencial",
    status: "confirmado",
  });
  const pacNome = pac?.nome || "";
  logAudit("agenda", "Criou agendamento", pacNome);
  saveData();
  closeModal();
  toast("Agendamento criado!", "success");
  navigate("agenda");
}

/* ============================================================  EDITAR E CANCELAR AGENDAMENTO  */

// ─────────────────────────────────────────────────────────────
// openModalEditarAgendamento(agId)
// Abre modal de edição de data/hora/local de um agendamento.
// Valida: data obrigatória, hora obrigatória, conflito de horário.
// Auditoria: toda edição é registrada via logAudit().
// ─────────────────────────────────────────────────────────────
function openModalEditarAgendamento(agId) {
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return toast("Agendamento não encontrado.", "error");
  if (ag.status === "cancelado") return toast("Não é possível editar um agendamento cancelado.", "error");

  openModal(
    `<i class="bi bi-pencil-square" style="color:var(--sc-green)"></i> Editar Agendamento`,
    `<div class="form-row form-row-2">
      <div class="form-group">
        <label class="form-label">Data *</label>
        <input type="date" id="eag-data" class="form-control" value="${escapeHTML(ag.data)}">
      </div>
      <div class="form-group">
        <label class="form-label">Hora *</label>
        <input type="time" id="eag-hora" class="form-control" value="${escapeHTML(ag.hora)}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Local</label>
      <input type="text" id="eag-local" class="form-control" value="${escapeHTML(ag.local)}" placeholder="Ex: Sala 02">
    </div>
    <div class="form-group">
      <div style="padding:10px 14px;background:#fffbeb;border:1px solid #f59e0b;border-radius:7px;font-size:12px;color:#78350f;display:flex;align-items:flex-start;gap:8px">
        <i class="bi bi-info-circle-fill" style="flex-shrink:0;margin-top:1px;color:#d97706"></i>
        <span>Alterações serão registradas na trilha de auditoria. O status do agendamento será mantido como <strong>confirmado</strong>.</span>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="salvarEdicaoAgendamento(${agId})"><i class="bi bi-check-lg"></i> Salvar Alterações</button>`,
  );
}

function salvarEdicaoAgendamento(agId) {
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return;
  const novaData = document.getElementById("eag-data").value;
  const novaHora = document.getElementById("eag-hora").value;
  const novoLocal = document.getElementById("eag-local").value.trim();
  if (!novaData) return showError("eag-data", "Informe a nova data!");
  if (!novaHora) return showError("eag-hora", "Informe o novo horário!");

  // Verifica conflito: mesmo PACIENTE + mesmo estudante + mesmo slot
  // Dois estudantes diferentes PODEM ter agendamentos no mesmo horário
  const conflito = AGENDAMENTOS.find(
    (a) => a.id !== agId && a.pacienteId === ag.pacienteId &&
           a.estudanteId === ag.estudanteId &&
           a.data === novaData && a.hora === novaHora && a.status !== "cancelado"
  );
  if (conflito) return toast("Já existe um agendamento para este paciente com este estudante neste horário!", "error");

  ag.data = novaData;
  ag.hora = novaHora;
  ag.local = novoLocal || "Consultório";
  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
  logAudit("agenda", "Editou agendamento", pac?.nome || "");
  saveData();
  closeModal();
  toast("Agendamento atualizado!", "success");
  navigate("agenda");
}

// ─────────────────────────────────────────────────────────────
// confirmarCancelamentoAgendamento(agId)
// Exibe diálogo de confirmação antes de cancelar um agendamento.
// Cria overlay independente (não usa openModal) para não conflitar
// com modais já abertos (ex: prontuário com abas).
// executarCancelamentoAgendamento() faz o cancelamento de fato.
// ─────────────────────────────────────────────────────────────
function confirmarCancelamentoAgendamento(agId) {
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return;
  if (ag.status === "cancelado") return toast("Este agendamento já está cancelado.", "warning");
  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
  const dataFmt = ag.data.split("-").reverse().join("/");

  // Remove instância anterior para evitar duplo disparo
  const existing = document.getElementById("cancel-confirm");
  if (existing) existing.remove();

  const confirmDiv = document.createElement("div");
  confirmDiv.id = "cancel-confirm";
  confirmDiv.className = "modal-overlay";
  confirmDiv.style.cssText = "z-index:3000;display:flex;align-items:center;justify-content:center;padding:15px";
  confirmDiv.innerHTML = `
    <div class="modal" style="max-width:420px;text-align:center;padding:32px 28px" onclick="event.stopPropagation()">
      <div style="width:56px;height:56px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <i class="bi bi-calendar-x-fill" style="font-size:26px;color:#dc2626"></i>
      </div>
      <h3 style="margin-bottom:8px;font-size:18px;font-weight:700">Cancelar Agendamento?</h3>
      <p style="font-size:13px;color:var(--text2);margin-bottom:6px;line-height:1.6">
        <strong>${escapeHTML(pac?.nome || "Paciente")}</strong><br>
        ${dataFmt} às ${escapeHTML(ag.hora)} · ${escapeHTML(ag.local)}
      </p>
      <p style="font-size:12px;color:var(--text3);margin-bottom:24px">
        O cancelamento será registrado na trilha de auditoria e não poderá ser desfeito.
      </p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-secondary" onclick="document.getElementById('cancel-confirm').remove()">Voltar</button>
        <button class="btn" style="background:#dc2626;color:#fff" onclick="executarCancelamentoAgendamento(${agId})">
          <i class="bi bi-x-circle-fill"></i> Confirmar Cancelamento
        </button>
      </div>
    </div>`;
  document.body.appendChild(confirmDiv);
  confirmDiv.addEventListener("click", (e) => { if (e.target === confirmDiv) confirmDiv.remove(); });
}

function executarCancelamentoAgendamento(agId) {
  const conf = document.getElementById("cancel-confirm");
  if (conf) conf.remove();
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return;
  ag.status = "cancelado";
  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
  logAudit("agenda", "Cancelou agendamento", pac?.nome || "");
  saveData();
  toast("Agendamento cancelado.", "warning");
  navigate("agenda");
}


/* ============================================================  SISTEMA DE NOTIFICAÇÕES  */
// ─────────────────────────────────────────────────────────────
// NOTIFICAÇÕES DO SININHO
//
// Tipos implementados:
//  1. "evolucao_pendente"   → estudante não registrou evolução 1h após consulta
//  2. "troca_solicitada"    → técnico: paciente faltou 2x sem justificativa
//  3. "troca_realizada"     → estudantes: paciente foi trocado
//  4. "falta_registrada"    → técnico/supervisor: falta registrada no prontuário
//
// getNotificacoesAtivas() → calcula notificações em tempo real + persistentes
// renderNotifPanel()      → HTML do painel do sininho
// marcarNotifLida(id)     → marca como lida e salva
// ─────────────────────────────────────────────────────────────

function getNotificacoesAtivas() {
  if (!currentUser) return [];
  const notifs = [];
  const agora = new Date();
  const hojeISO = agora.toISOString().split("T")[0];

  // ── TIPO 1: Evolução pendente após 1h da consulta (só para estudantes) ──
  if (currentUser.papel === "estudante") {
    const meusAgs = AGENDAMENTOS.filter(
      (a) => a.estudanteId === currentUser.id &&
             a.status === "confirmado" &&
             a.data <= hojeISO
    );
    meusAgs.forEach((ag) => {
      // Combinar data + hora para comparar com agora
      const dtConsulta = new Date(ag.data + "T" + ag.hora + ":00");
      const diffMs = agora - dtConsulta;
      const umHora = 60 * 60 * 1000;
      if (diffMs < umHora) return; // ainda não passou 1h

      const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
      if (!pac) return;

      // Verifica se já há evolução registrada após a consulta
      const evs = EVOLUCOES[ag.pacienteId] || [];
      const temEv = evs.some((e) => {
        const dtEv = new Date(e.data.replace(" ","T"));
        return dtEv >= dtConsulta;
      });
      if (temEv) return; // evolução já registrada

      // Verifica se já há anamnese finalizada (idem)
      const ams = ANAMNESES[ag.pacienteId];
      const temAnamnese = ams && ams.status === "finalizada";

      const notifId = "ev_pend_" + ag.id;
      const jaLida = NOTIFICACOES.find((n) => n.id === notifId && n.lida);
      if (!jaLida) {
        notifs.push({
          id: notifId,
          tipo: "evolucao_pendente",
          icone: "bi-exclamation-circle-fill",
          cor: "#f59e0b",
          titulo: "Evolução pendente",
          desc: `Consulta com ${escapeHTML(pac.nome)} em ${ag.data.split("-").reverse().join("/")} às ${ag.hora}. Registre a evolução.`,
          acao: `openProntuario(${pac.id})`,
          lida: false,
          ts: ag.data + " " + ag.hora
        });
      }
    });
  }

  // ── TIPO 2: Troca de paciente solicitada (só para técnico) ──
  if (currentUser.papel === "tecnico") {
    NOTIFICACOES.filter((n) => n.tipo === "troca_solicitada" && !n.lida).forEach((n) => {
      notifs.push(n);
    });
  }

  // ── TIPO 3: Troca realizada — notificar estudantes ──
  if (currentUser.papel === "estudante") {
    NOTIFICACOES.filter(
      (n) => n.tipo === "troca_realizada" && !n.lida &&
             n.estudantesIds && n.estudantesIds.includes(currentUser.id)
    ).forEach((n) => {
      notifs.push(n);
    });
  }

  // ── TIPO 4: Falta registrada — notif para supervisor/técnico ──
  if (currentUser.papel === "tecnico" || currentUser.papel === "supervisor") {
    NOTIFICACOES.filter(
      (n) => n.tipo === "falta_registrada" && !n.lida
    ).forEach((n) => {
      if (currentUser.papel === "tecnico") notifs.push(n);
      else {
        // supervisor: só dos seus pacientes
        const pac = PACIENTES.find((p) => p.id === n.pacienteId);
        if (pac && pac.supervisorId === currentUser.id) notifs.push(n);
      }
    });
  }

  return notifs;
}

function renderNotifPanel() {
  const notifs = getNotificacoesAtivas();
  const count = notifs.length;

  // Atualizar o badge do sininho
  const dot = document.querySelector(".notif-dot");
  if (dot) {
    dot.style.display = count > 0 ? "block" : "none";
    dot.textContent = count > 9 ? "9+" : (count > 0 ? count : "");
  }

  if (count === 0) {
    return `<div style="padding:28px 20px;text-align:center;color:var(--text3)">
      <i class="bi bi-bell-slash" style="font-size:28px;display:block;margin-bottom:10px"></i>
      Nenhuma notificação pendente.
    </div>`;
  }

  return notifs.map((n) => `
    <div class="notif-item" onclick="acionarNotif('${n.id}','${n.acao || ''}')">
      <div class="notif-icon" style="background:${n.cor || "#1b5e20"}22;color:${n.cor || "#1b5e20"}">
        <i class="bi ${n.icone || 'bi-bell-fill'}"></i>
      </div>
      <div class="notif-body">
        <div class="notif-titulo">${n.titulo}</div>
        <div class="notif-desc">${n.desc}</div>
        <div class="notif-ts">${n.ts || ""}</div>
      </div>
      <button class="notif-dismiss" onclick="event.stopPropagation();marcarNotifLida('${n.id}')"
        title="Marcar como lida" aria-label="Marcar como lida">
        <i class="bi bi-x"></i>
      </button>
    </div>`).join("");
}

function toggleNotifPanel() {
  let panel = document.getElementById("notif-panel");
  if (panel) {
    panel.remove();
    return;
  }
  panel = document.createElement("div");
  panel.id = "notif-panel";
  panel.className = "notif-panel";
  panel.innerHTML = `
    <div class="notif-panel-header">
      <span><i class="bi bi-bell-fill" style="color:var(--sc-green)"></i> Notificações</span>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('notif-panel').remove()">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div class="notif-panel-body">${renderNotifPanel()}</div>`;

  // Posicionar abaixo do sininho
  const bell = document.querySelector(".topbar-icon-btn");
  const rect = bell ? bell.getBoundingClientRect() : {right:60,top:50};
  panel.style.position = "fixed";
  panel.style.top = (rect.bottom + 8) + "px";
  panel.style.right = "12px";
  document.body.appendChild(panel);

  // Fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener("click", function handler(e) {
      if (!panel.contains(e.target) && !e.target.closest(".topbar-icon-btn")) {
        panel.remove();
        document.removeEventListener("click", handler);
      }
    });
  }, 0);
}

function marcarNotifLida(notifId) {
  // Para notifs persistentes: marcar no array NOTIFICACOES
  const n = NOTIFICACOES.find((x) => x.id === notifId);
  if (n) { n.lida = true; saveData(); }
  // Para notifs calculadas (evolucao_pendente): adicionar entrada "lida"
  else {
    NOTIFICACOES.push({ id: notifId, tipo: "lida", lida: true });
    saveData();
  }
  // Recriar painel
  const panel = document.getElementById("notif-panel");
  if (panel) {
    const body = panel.querySelector(".notif-panel-body");
    if (body) body.innerHTML = renderNotifPanel();
  }
}

function acionarNotif(notifId, acao) {
  marcarNotifLida(notifId);
  const panel = document.getElementById("notif-panel");
  if (panel) panel.remove();
  if (acao) {
    try { eval(acao); } catch(e) { console.warn("Ação de notificação inválida:", e); }
  }
}

// Atualiza o badge do sininho a cada 60s (sem recarregar tela)
function _updateNotifBadge() {
  const notifs = getNotificacoesAtivas();
  const count = notifs.length;
  const dot = document.querySelector(".notif-dot");
  if (dot) {
    dot.style.display = count > 0 ? "flex" : "none";
    dot.textContent = count > 9 ? "9+" : (count > 0 ? String(count) : "");
  }
}
setInterval(_updateNotifBadge, 60000);


/* ============================================================  FALTAS E TROCA DE PACIENTE  */
// ─────────────────────────────────────────────────────────────
// registrarFalta(agId)
//   Marca o agendamento como "faltou" e registra na lista FALTAS.
//   Se o paciente acumular 2 faltas injustificadas → emite notificação
//   de troca de paciente para os técnicos (sininho deles).
//
// justificarFalta(faltaId)
//   Marca a falta como justificada (não conta para o limite de 2).
//
// executarTrocaPaciente(pacienteId)
//   Técnico confirma a troca: muda status do paciente para "inativo",
//   notifica os estudantes do grupo.
// ─────────────────────────────────────────────────────────────

function registrarFalta(agId) {
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return;
  if (ag.status === "faltou") return toast("Falta já registrada.", "warning");
  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);

  ag.status = "faltou";

  const faltaId = "falta_" + ag.id;
  FALTAS.push({
    id: faltaId, agId: ag.id,
    pacienteId: ag.pacienteId,
    data: ag.data, hora: ag.hora,
    justificada: false,
    estudantesIds: pac?.estudantesIds || [],
    registradoPor: currentUser.nome,
    ts: new Date().toISOString()
  });

  logAudit("falta", "Registrou falta do paciente", pac?.nome || "");

  // Notificar supervisor e técnico
  NOTIFICACOES.push({
    id: "notif_falta_" + ag.id,
    tipo: "falta_registrada",
    pacienteId: ag.pacienteId,
    icone: "bi-person-x-fill",
    cor: "#f59e0b",
    titulo: "Falta registrada",
    desc: `${escapeHTML(pac?.nome || "Paciente")} faltou em ${ag.data.split("-").reverse().join("/")} às ${ag.hora}.`,
    acao: `openProntuario(${ag.pacienteId})`,
    lida: false,
    ts: new Date().toLocaleDateString("pt-BR")
  });

  // Verificar limite: 2 faltas injustificadas → pedir troca
  const faltasInj = FALTAS.filter(
    (f) => f.pacienteId === ag.pacienteId && !f.justificada
  ).length;

  if (faltasInj >= 2) {
    // Verificar se já tem pedido de troca pendente
    const jaTem = NOTIFICACOES.some(
      (n) => n.tipo === "troca_solicitada" && n.pacienteId === ag.pacienteId && !n.lida
    );
    if (!jaTem) {
      NOTIFICACOES.push({
        id: "troca_" + ag.pacienteId + "_" + Date.now(),
        tipo: "troca_solicitada",
        pacienteId: ag.pacienteId,
        icone: "bi-arrow-left-right",
        cor: "#dc2626",
        titulo: "⚠ Troca de paciente recomendada",
        desc: `${escapeHTML(pac?.nome || "Paciente")} acumulou ${faltasInj} faltas injustificadas. Considere a troca do caso.`,
        acao: `confirmarTrocaPaciente(${ag.pacienteId})`,
        lida: false,
        ts: new Date().toLocaleDateString("pt-BR"),
        estudantesIds: pac?.estudantesIds || []
      });
      toast(`⚠ ${pac?.nome} acumulou 2 faltas. Notificação de troca enviada ao técnico.`, "warning");
    }
  }

  saveData();
  toast("Falta registrada.", "warning");
  _updateNotifBadge();
  openProntuario(ag.pacienteId);
}

function justificarFalta(faltaId) {
  const f = FALTAS.find((x) => x.id === faltaId);
  if (!f) return;
  f.justificada = true;
  const pac = PACIENTES.find((p) => p.id === f.pacienteId);
  logAudit("falta", "Justificou falta", pac?.nome || "");
  saveData();
  toast("Falta justificada.", "success");
  openProntuario(f.pacienteId);
}

function confirmarTrocaPaciente(pacienteId) {
  const pac = PACIENTES.find((p) => p.id === pacienteId);
  if (!pac) return;
  const faltasInj = FALTAS.filter((f) => f.pacienteId === pacienteId && !f.justificada).length;

  // Fechar painel de notificações se aberto
  const panel = document.getElementById("notif-panel");
  if (panel) panel.remove();

  const confirmDiv = document.createElement("div");
  confirmDiv.id = "troca-confirm";
  confirmDiv.className = "modal-overlay";
  confirmDiv.style.cssText = "z-index:3100;display:flex;align-items:center;justify-content:center;padding:15px";
  confirmDiv.innerHTML = `
    <div class="modal" style="max-width:460px;padding:32px 28px" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:center;margin-bottom:18px">
        <div style="width:60px;height:60px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center">
          <i class="bi bi-arrow-left-right" style="font-size:28px;color:#dc2626"></i>
        </div>
      </div>
      <h3 style="text-align:center;margin-bottom:10px;font-size:18px">Confirmar Troca de Paciente?</h3>
      <p style="text-align:center;font-size:13px;color:var(--text2);margin-bottom:6px">
        <strong>${escapeHTML(pac.nome)}</strong> — ${faltasInj} faltas injustificadas
      </p>
      <p style="font-size:12px;color:var(--text3);text-align:center;margin-bottom:20px;line-height:1.6">
        O paciente será marcado como <strong>inativo</strong> e os estudantes do grupo serão notificados automaticamente.
        Esta ação é irreversível e será registrada na trilha de auditoria.
      </p>
      <div class="form-group">
        <label class="form-label">Motivo da troca (opcional)</label>
        <textarea id="troca-motivo" class="form-control" rows="2" placeholder="Ex: Paciente sinalizou impossibilidade de continuar..."></textarea>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
        <button class="btn btn-secondary" onclick="document.getElementById('troca-confirm').remove()">Cancelar</button>
        <button class="btn" style="background:#dc2626;color:#fff" onclick="executarTrocaPaciente(${pacienteId})">
          <i class="bi bi-check-lg"></i> Confirmar Troca
        </button>
      </div>
    </div>`;
  document.body.appendChild(confirmDiv);
  confirmDiv.addEventListener("click", (e) => { if (e.target === confirmDiv) confirmDiv.remove(); });
}

function executarTrocaPaciente(pacienteId) {
  const confirmEl = document.getElementById("troca-confirm");
  const motivo = document.getElementById("troca-motivo")?.value || "";
  if (confirmEl) confirmEl.remove();

  const pac = PACIENTES.find((p) => p.id === pacienteId);
  if (!pac) return;

  pac.status = "inativo";

  // Cancelar todos os agendamentos futuros do paciente
  const hojeISO = new Date().toISOString().split("T")[0];
  AGENDAMENTOS.filter((a) => a.pacienteId === pacienteId && a.data >= hojeISO && a.status === "confirmado")
    .forEach((a) => { a.status = "cancelado"; });

  // Marcar notificação de troca como lida
  NOTIFICACOES.filter((n) => n.tipo === "troca_solicitada" && n.pacienteId === pacienteId)
    .forEach((n) => { n.lida = true; });

  // Notificar os estudantes do grupo
  const estudantesIds = pac.estudantesIds || [];
  if (estudantesIds.length > 0) {
    NOTIFICACOES.push({
      id: "troca_realizada_" + pacienteId + "_" + Date.now(),
      tipo: "troca_realizada",
      pacienteId: pacienteId,
      estudantesIds: estudantesIds,
      icone: "bi-person-dash-fill",
      cor: "#dc2626",
      titulo: "Troca de paciente confirmada",
      desc: `O caso de ${escapeHTML(pac.nome)} foi encerrado pelo técnico.${motivo ? " Motivo: " + escapeHTML(motivo) : ""} Aguarde a alocação de um novo paciente.`,
      acao: "",
      lida: false,
      ts: new Date().toLocaleDateString("pt-BR"),
    });
  }

  logAudit("troca", "Executou troca de paciente" + (motivo ? ": " + motivo : ""), pac.nome);
  saveData();
  toast(`Paciente ${pac.nome} marcado como inativo. Estudantes notificados.`, "success");
  _updateNotifBadge();
  navigate("pacientes");
}

/* ============================================================  TOAST E BUSCA GLOBAL  */
// ─────────────────────────────────────────────────────────────
// globalSearch(q)
// Busca global por nome de paciente ou número de caso.
// Chamado pelo input da topbar (oninput).
// Se q tiver 2+ chars: navega para 'pacientes' e aplica filtro.
// MANUTENÇÃO: para incluir outros tipos de busca (evolucoes,
//   documentos), adicione a lógica aqui e em renderPacientes.
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// toast(msg, type?, duracao?)
// Exibe notificação temporária no canto inferior direito.
// type: 'success' | 'error' | 'warning' | 'info' (padrão)
// Estilos: .toast, .toast-success, .toast-error, .toast-warning
// ─────────────────────────────────────────────────────────────
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
