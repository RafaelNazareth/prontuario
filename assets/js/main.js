// ============================================================
// main.js — Ponto de entrada da aplicação (ES Modules)
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
//
// Responsabilidades:
//  1) Importar todos os módulos da aplicação (o import já executa
//     cada módulo uma única vez, na ordem certa, resolvendo o grafo
//     de dependências automaticamente).
//  2) Expor no `window` as funções que o HTML ainda chama via
//     atributos inline (onclick="...", oninput="...", etc). Isso é
//     necessário porque módulos ES têm escopo próprio — nada dentro
//     deles é global por padrão, diferente do script.js original.
//  3) Disparar o boot da aplicação (restaurar sessão / mostrar login)
//     quando o DOM estiver pronto.
// ============================================================

import { boot, doLogin, doLogout, fillLogin, navigate, toggleMenu, togglePw } from "./core/auth.js";
import { globalSearch, toast } from "./core/utils.js";

import { openProntuario } from "./pages/dashboard.js";
import { filterPacienteStatus, filterPacientes, switchTab } from "./pages/pacientes.js";
import { agendaIrParaHoje, agendaProximaSemana, agendaSemanaAnterior } from "./pages/agenda.js";
import {
  filtrarPacientesSolicitacao,
  gerarPdfProntuario,
  liberarAcessoPaciente,
  novaSolicitacaoPaciente,
  selecionarPacienteSolicitacao,
} from "./pages/acesso.js";
import {
  acionarNotif,
  executarTrocaPaciente,
  justificarFalta,
  registrarFalta,
  toggleNotifPanel,
} from "./pages/notificacoes.js";

import {
  closeModal,
  confirmarCancelamentoAgendamento,
  confirmarSalvarEvolucao,
  executarCancelamentoAgendamento,
  executarSalvarEvolucao,
  inserirTemplateEvolucao,
  maskCPF,
  maskPhone,
  openModalAnamnese,
  openModalEditarAgendamento,
  openModalEditarPaciente,
  openModalEvolucao,
  openModalNovoAgendamento,
  openModalNovoPaciente,
  openModalNovoUsuario,
  openModalUploadDocumento,
  salvarAgendamento,
  salvarAnamnese,
  salvarEdicaoAgendamento,
  salvarEdicaoPaciente,
  salvarNovoPaciente,
  salvarNovoUsuario,
  salvarUploadDocumento,
} from "./modals/modals.js";

// ---------- Exposição no escopo global (necessário para onclick/oninput no HTML) ----------
Object.assign(window, {
  // auth / navegação
  doLogin,
  doLogout,
  fillLogin,
  navigate,
  toggleMenu,
  togglePw,
  // utils
  globalSearch,
  toast,
  // dashboard / pacientes
  openProntuario,
  filterPacienteStatus,
  filterPacientes,
  switchTab,
  // agenda
  agendaIrParaHoje,
  agendaProximaSemana,
  agendaSemanaAnterior,
  // acesso a prontuário / paciente
  filtrarPacientesSolicitacao,
  gerarPdfProntuario,
  liberarAcessoPaciente,
  novaSolicitacaoPaciente,
  selecionarPacienteSolicitacao,
  // notificações / faltas
  acionarNotif,
  executarTrocaPaciente,
  justificarFalta,
  registrarFalta,
  toggleNotifPanel,
  // modais
  closeModal,
  confirmarCancelamentoAgendamento,
  confirmarSalvarEvolucao,
  executarCancelamentoAgendamento,
  executarSalvarEvolucao,
  inserirTemplateEvolucao,
  maskCPF,
  maskPhone,
  openModalAnamnese,
  openModalEditarAgendamento,
  openModalEditarPaciente,
  openModalEvolucao,
  openModalNovoAgendamento,
  openModalNovoPaciente,
  openModalNovoUsuario,
  openModalUploadDocumento,
  salvarAgendamento,
  salvarAnamnese,
  salvarEdicaoAgendamento,
  salvarEdicaoPaciente,
  salvarNovoPaciente,
  salvarNovoUsuario,
  salvarUploadDocumento,
});

// ---------- Boot da aplicação ----------
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
