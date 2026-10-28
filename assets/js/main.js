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
import { detectarModo, gravarAoOcultarAba } from "./infrastructure/jsonDataSource.js";
import { logAudit } from "./core/store.js";
import * as modRegistros from "./modals/registros.js";
import * as modModais from "./modals/modals.js";
import * as pagAcesso from "./pages/acesso.js";
import * as pagPrivacidade from "./pages/privacidade.js";

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
  alternarOrigemDocumento,
  openModalAnamnese,
  openModalDocumento,
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
  alternarOrigemDocumento,
  openModalAnamnese,
  openModalDocumento,
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

// ---------- Handlers estáticos do index.html (Fase 8 da refatoração) ----------
// index.html usava atributos onclick/oninput inline para estes elementos.
// Eles NÃO são regenerados a cada render (diferente do HTML dinâmico de
// pages/*.js e modals/*.js — ver docs/FRONTEND_AUDIT.md, item 12, e
// docs/ARCHITECTURE_TARGET.md para por que só estes foram migrados agora),
// então é seguro trocá-los por addEventListener aqui, uma única vez no boot.
document.getElementById("toggle-pw-icon").addEventListener("click", togglePw);
document.getElementById("toggle-pw-icon").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    togglePw();
  }
});
document.getElementById("btn-login").addEventListener("click", doLogin);
document.getElementById("login-hint-box").addEventListener("click", (e) => {
  const el = e.target.closest(".login-hint-fill");
  if (el) fillLogin(el.dataset.login, el.dataset.pass);
});
document.getElementById("sidebar-overlay").addEventListener("click", toggleMenu);
document.getElementById("sidebar-logout").addEventListener("click", doLogout);
document.getElementById("menu-toggle").addEventListener("click", toggleMenu);
document.getElementById("global-search").addEventListener("input", (e) => globalSearch(e.target.value));
document.getElementById("notif-bell-btn").addEventListener("click", toggleNotifPanel);
document.getElementById("notif-bell-btn").addEventListener("keydown", (e) => {
  if (e.key === "Enter") toggleNotifPanel();
});
document.getElementById("modal-overlay").addEventListener("click", closeModal);
document.getElementById("modal-box").addEventListener("click", (e) => e.stopPropagation());
document.getElementById("modal-close-btn").addEventListener("click", () => closeModal());

// Módulos cujas funções são chamadas por atributos onclick no HTML gerado:
// todas as funções exportadas ficam disponíveis no escopo global.
const somenteFuncoes = (m) => Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v === "function"));
Object.assign(window, somenteFuncoes(modModais), somenteFuncoes(modRegistros), somenteFuncoes(pagAcesso), somenteFuncoes(pagPrivacidade));

// Consultas a áreas sensíveis (ex.: registro documental) ficam auditadas.
window.registrarConsulta = (evento, pacienteId) =>
  logAudit("consulta", evento, null, { evento, pacienteId });

// Sessão encerrada no servidor (inatividade, usuário inativado, servidor reiniciado)
window.addEventListener("pep:unauthorized", (e) => {
  const msg = e.detail?.motivo === "inatividade" ? "Sua sessão foi encerrada por inatividade. Entre novamente." : "Sua sessão terminou. Entre novamente.";
  doLogout({ motivo: "inatividade", mensagem: msg });
});

document.getElementById("link-aviso-privacidade")?.addEventListener("click", pagPrivacidade.abrirAvisoPrivacidadePublico);
document.getElementById("sidebar-senha")?.addEventListener("click", pagPrivacidade.openModalAlterarSenha);

// ---------- Modo demonstração (GitHub Pages / sem servidor) ----------
// Sinaliza na tela que os dados são fictícios e ficam só neste navegador.
detectarModo().then((modo) => {
  if (modo !== "demo") return;
  document.body.classList.add("modo-demo");
  const card = document.querySelector(".login-card");
  if (card)
    card.insertAdjacentHTML(
      "afterbegin",
      `<div class="demo-aviso"><i class="bi bi-info-circle"></i><span><strong>Versão de demonstração.</strong> Todos os dados são fictícios e as alterações ficam salvas só neste navegador.</span></div>`,
    );
  const acoes = document.querySelector(".topbar-actions");
  if (acoes) {
    acoes.insertAdjacentHTML("afterbegin", `<button type="button" class="demo-selo" id="demo-selo" title="Sobre a demonstração">Demonstração</button>`);
    document.getElementById("demo-selo").addEventListener("click", abrirSobreDemonstracao);
  }
});

function abrirSobreDemonstracao() {
  modModais.openModal(
    "Versão de demonstração",
    `<p class="prose" style="margin-bottom:12px">Esta versão roda inteiramente no navegador, sem servidor. As regras do sistema (permissões por papel, co-assinatura do supervisor, retificação, auditoria) funcionam como na versão completa, mas <strong>não há segurança real</strong>: use apenas dados fictícios.</p>
    <p class="prose" style="margin-bottom:12px">As alterações que você fizer ficam salvas só neste navegador. Para voltar ao estado original, restaure os dados de exemplo.</p>
    <p class="prose muted">Logins de teste: tecnico, supervisor, estudante e paciente, todos com a senha 1234.</p>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Fechar</button><button class="btn btn-primary" onclick="restaurarDadosDemonstracao()">Restaurar dados de exemplo</button>`,
  );
}

window.restaurarDadosDemonstracao = async () => {
  if (!confirm("Apagar as alterações feitas nesta demonstração e voltar aos dados de exemplo?")) return;
  const { restaurarDemonstracao } = await import("./infrastructure/servidorDemo.js");
  restaurarDemonstracao();
  location.reload();
};

// ---------- Persistência em JSON (data/db.json) ----------
// Grava pendências ao ocultar a aba e avisa o usuário quando a gravação
// não é possível (servidor parado ou página servida sem a API).
gravarAoOcultarAba();
let _avisoGravacao = 0;
window.addEventListener("pep:save-error", (e) => {
  if (Date.now() - _avisoGravacao < 15000) return; // evita repetir o aviso
  _avisoGravacao = Date.now();
  toast(`Alteração não gravada: ${e.detail || "verifique se o servidor (npm run dev) está rodando"}`, "error");
});

// ---------- Sinaliza sucesso para a rede de segurança em index.html ----------
// Se este ponto foi alcançado, o módulo carregou e todos os imports acima
// foram resolvidos com sucesso (nenhum bloqueio de CORS/rede/parse).
window.__PEP_BOOTED__ = true;
if (window.__PEP_BOOT_TIMEOUT__) clearTimeout(window.__PEP_BOOT_TIMEOUT__);

// ---------- Boot da aplicação ----------
const _iniciar = () => boot().catch((e) => console.error("[PEP] Falha no boot:", e));
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _iniciar);
} else {
  _iniciar();
}
