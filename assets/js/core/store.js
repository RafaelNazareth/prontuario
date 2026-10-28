// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser } from "./auth.js";
import { aoSincronizar, carregarDataset, gravarDataset, servidor } from "../infrastructure/jsonDataSource.js";

/* ============================================================  PERSISTÊNCIA E SEGURANÇA  */
// Os dados vivem em data/db.json (criado a partir de data/seed.json),
// lidos e gravados pelo servidor local (server/index.mjs) através de
// infrastructure/jsonDataSource.js. Este módulo mantém o estado em
// memória e pede a gravação a cada alteração (saveData()).

// Retorna usuário sem expor a senha em memória/sessão
export function sanitizarUsuario(user) {
  if (!user) return null;
  const { pass, ...semSenha } = user;
  return semSenha;
}
export function escapeHTML(str) {
  if (str === null || str === undefined) return "";
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
// Registro documental (Res. CFP 05/2025, art. 17 §2º): supervisões e
// anotações compartilhadas só entre supervisor e estagiários — fora do
// prontuário que o paciente acessa.
export let REGISTRO_DOCUMENTAL = {};
// Comunicações/compartilhamentos de informação (Res. CFP 001/2009 art. 2º V;
// LGPD art. 18 VII; Código de Ética art. 10): data, destinatário, finalidade.
export let COMPARTILHAMENTOS = {};

// Configuração e dados institucionais vindos do servidor (/api/auth/me).
export let SESSAO = { config: {}, institucional: {} };
export function setSessao(dados) {
  SESSAO = { config: dados.config || {}, institucional: dados.institucional || {} };
}

// Persistência ligada só depois de carregar pelo navegador (initData).
// Em testes (loadDataset direto), saveData() não grava nada.
let _persistir = null;

// ─────────────────────────────────────────────────────────────
// initData()
// Carrega o dataset de data/db.json (via GET /api/data) e liga a
// gravação automática. Assíncrona: auth.boot() aguarda antes de
// liberar o login.
// ─────────────────────────────────────────────────────────────
export async function initData() {
  const data = await carregarDataset();
  loadDataset(data);
  _persistir = gravarDataset;
  // Depois de cada gravação o servidor devolve o escopo com autoria,
  // horários e assinaturas carimbados por ele.
  aoSincronizar(loadDataset);
}

/** Limpa o estado em memória (logout). */
export function limparDados() {
  _persistir = null;
  loadDataset({ USERS: [], PACIENTES: [] });
}

// ─────────────────────────────────────────────────────────────
// loadDataset(data)
// Popula o estado em memória a partir de um objeto no formato do
// JSON (USERS, PACIENTES, ...). Usada por initData() e pelos testes.
// ─────────────────────────────────────────────────────────────
export function loadDataset(data) {
  if (!data || !Array.isArray(data.USERS) || !Array.isArray(data.PACIENTES)) {
    throw new Error("Estrutura de dados inválida: USERS e PACIENTES precisam ser listas.");
  }
  USERS = data.USERS;
  PACIENTES = data.PACIENTES;
  ANAMNESES = data.ANAMNESES || {};
  EVOLUCOES = data.EVOLUCOES || {};
  AGENDAMENTOS = data.AGENDAMENTOS || [];
  DOCUMENTOS = data.DOCUMENTOS || {};
  AUDITORIA = data.AUDITORIA || [];
  ACESSO_PACIENTE = data.ACESSO_PACIENTE || [];
  NOTIFICACOES = data.NOTIFICACOES || [];
  FALTAS = data.FALTAS || [];
  REGISTRO_DOCUMENTAL = data.REGISTRO_DOCUMENTAL || {};
  COMPARTILHAMENTOS = data.COMPARTILHAMENTOS || {};
}

/** Estado que o navegador envia ao servidor (usuários e auditoria ficam de fora). */
export function snapshotDataset() {
  return {
    PACIENTES,
    ANAMNESES,
    EVOLUCOES,
    AGENDAMENTOS,
    DOCUMENTOS,
    ACESSO_PACIENTE,
    NOTIFICACOES,
    FALTAS,
    REGISTRO_DOCUMENTAL,
    COMPARTILHAMENTOS,
  };
}


// =============================================================
// Retorna HTML completo de badge de status de agendamento.
// ACESSIBILIDADE: sempre inclui ícone + texto para não depender
// exclusivamente de cor — essencial para daltonismo.
// =============================================================
export function badgeAgendamento(status) {
  const map = {
    confirmado: { cls: "badge-green",  icon: "bi-check-circle-fill", label: "Confirmado" },
    pendente:   { cls: "badge-amber",  icon: "bi-clock-fill",        label: "Pendente"   },
    cancelado:  { cls: "badge-cancel", icon: "bi-slash-circle-fill", label: "Cancelado"  },
    faltou:     { cls: "badge-amber",  icon: "bi-person-x-fill",     label: "Faltou"     },
  };
  const b = map[status] || { cls: "badge-gray", icon: "bi-question-circle", label: status };
  return `<span class="badge ${b.cls}">${escapeHTML(b.label)}</span>`;
}

// Grava o estado atual em data/db.json (gravações próximas são agrupadas).
export function saveData() {
  if (_persistir) _persistir(snapshotDataset);
}
// ─────────────────────────────────────────────────────────────
// logAudit(tipo, acao, obj, meta)
// A trilha de auditoria é gravada SOMENTE pelo servidor:
//   - toda criação/alteração já é auditada quando o servidor aplica a
//     gravação (com usuário, IP e horário dele);
//   - leituras e impressões, que não passam por gravação, são
//     informadas aqui com meta.evento (ex.: "consulta_prontuario").
// Chamadas sem meta.evento são ignoradas (mantidas por compatibilidade).
// ─────────────────────────────────────────────────────────────
export function logAudit(tipo, acao, obj, meta) {
  if (!meta?.evento || !_persistir) return;
  servidor
    .evento(meta.evento, { pacienteId: meta.pacienteId ?? null, registroId: meta.registroId ?? null, complemento: meta.complemento })
    .catch((e) => console.warn("[PEP] Evento de auditoria não registrado:", e.message));
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
