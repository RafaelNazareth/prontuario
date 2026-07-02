// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser } from "./auth.js";

/* ============================================================  PERSISTÊNCIA E SEGURANÇA  */
export const STORAGE_KEY = "pep_fcmscsp_data_v14"; // v14: 50 alunos/17 grupos, notificações, faltas, troca de paciente

// ATENÇÃO: btoa/atob é ofuscação Base64, NÃO criptografia real.
// Para produção, substituir por AES-GCM via SubtleCrypto ou mover para backend seguro.
export function encriptar(dados) {
  return btoa(encodeURIComponent(JSON.stringify(dados)));
}
export function desencriptar(dados_ofuscados) {
  return JSON.parse(decodeURIComponent(atob(dados_ofuscados)));
}

// Retorna usuário sem expor a senha em memória/sessão
export function sanitizarUsuario(user) {
  const { pass, ...semSenha } = user;
  return semSenha;
}
export function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(
    /[&<>'"]/g,
    (tag) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        tag
      ],
  );
}

export let USERS = [];
export let PACIENTES = [];
export let ANAMNESES = {};
export let EVOLUCOES = {};
export let AGENDAMENTOS = [];
export let DOCUMENTOS = {};
export let AUDITORIA = [];
export let ACESSO_PACIENTE = [];
// Notificações persistentes: faltas, alertas de evolução, troca de paciente
export let NOTIFICACOES = [];
export let FALTAS = []; // { id, agId, pacienteId, data, justificada, estudantesIds }

export function initData() {
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

export function mockData() {
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
export function _normalizeCores() {
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
export function badgeAgendamento(status) {
  const map = {
    confirmado: { cls: "badge-green",  icon: "bi-check-circle-fill", label: "confirmado" },
    pendente:   { cls: "badge-amber",  icon: "bi-clock-fill",        label: "pendente"   },
    cancelado:  { cls: "badge-cancel", icon: "bi-slash-circle-fill", label: "cancelado"  },
    faltou:     { cls: "badge-amber",  icon: "bi-person-x-fill",     label: "faltou"     },
  };
  const b = map[status] || { cls: "badge-gray", icon: "bi-question-circle", label: status };
  return `<span class="badge ${b.cls}"><i class="bi ${b.icon}" aria-hidden="true"></i>${escapeHTML(b.label)}</span>`;
}

export function saveData() {
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
export function logAudit(tipo, acao, obj) {
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
export function getPacientesPermitidos() {
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
