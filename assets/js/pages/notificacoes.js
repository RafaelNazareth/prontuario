// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser, navigate } from "../core/auth.js";
import { openProntuario } from "./dashboard.js";
import { AGENDAMENTOS, EVOLUCOES, FALTAS, NOTIFICACOES, PACIENTES, escapeHTML, logAudit, saveData } from "../core/store.js";
import { toast } from "../core/utils.js";
import { absenceRepository } from "../repositories/absenceRepository.js";
import { notificationRepository } from "../repositories/notificationRepository.js";
import { appointmentRepository } from "../repositories/appointmentRepository.js";
import { NotificationType, AppointmentStatus } from "../core/enums.js";
import { today, formatBR } from "../core/dateService.js";

export function getNotificacoesAtivas() {
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

      const notifId = "ev_pend_" + ag.id;
      const jaLida = NOTIFICACOES.find((n) => n.id === notifId && n.lida);
      if (!jaLida) {
        notifs.push({
          id: notifId,
          tipo: "evolucao_pendente",
          icone: "bi-exclamation-circle-fill",
          cor: "#f59e0b",
          titulo: "Evolução pendente",
          desc: `Consulta com ${escapeHTML(pac.nome)} em ${formatBR(ag.data)} às ${ag.hora}. Registre a evolução.`,
          tipoAcao: "OPEN_PRONTUARIO",
          pacienteId: pac.id,
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

export function renderNotifPanel() {
  const notifs = getNotificacoesAtivas();
  const count = notifs.length;

  // Atualizar o badge do sininho
  const dot = document.querySelector(".notif-dot");
  if (dot) {
    dot.style.display = count > 0 ? "block" : "none";
    dot.textContent = count > 9 ? "9+" : (count > 0 ? count : "");
  }

  if (count === 0) {
    return `<div class="notif-empty">
      <i class="bi bi-bell"></i>
      Nada novo por aqui.
    </div>`;
  }

  return notifs.map((n) => `
    <div class="notif-item" onclick="acionarNotif('${n.id}')">
      <div class="notif-icon" style="background:${n.cor || "#1a6b2e"}1a;color:${n.cor || "#1a6b2e"}">
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

export function toggleNotifPanel() {
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
      <span>Notificações</span>
      <button class="btn btn-ghost btn-sm btn-icon" aria-label="Fechar notificações" onclick="document.getElementById('notif-panel').remove()">
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

export function marcarNotifLida(notifId) {
  notificationRepository.markRead(notifId);
  // Recriar painel
  const panel = document.getElementById("notif-panel");
  if (panel) {
    const body = panel.querySelector(".notif-panel-body");
    if (body) body.innerHTML = renderNotifPanel();
  }
}

export function acionarNotif(notifId) {
  const notifsAtivas = getNotificacoesAtivas();
  const notif = notifsAtivas.find((n) => n.id === notifId) || NOTIFICACOES.find((n) => n.id === notifId);

  marcarNotifLida(notifId);
  const panel = document.getElementById("notif-panel");
  if (panel) panel.remove();

  if (!notif) return;

  // Despachante seguro sem uso de eval()
  if (notif.tipoAcao === "OPEN_PRONTUARIO" && notif.pacienteId) {
    openProntuario(notif.pacienteId);
  } else if (notif.tipoAcao === "CONFIRMAR_TROCA" && notif.pacienteId) {
    confirmarTrocaPaciente(notif.pacienteId);
  } else if (notif.pacienteId) {
    openProntuario(notif.pacienteId);
  }
}

// Atualiza o badge do sininho a cada 60s (sem recarregar tela)
export function _updateNotifBadge() {
  const notifs = getNotificacoesAtivas();
  const count = notifs.length;
  const dot = document.querySelector(".notif-dot");
  if (dot) {
    dot.style.display = count > 0 ? "flex" : "none";
    dot.textContent = count > 9 ? "9+" : (count > 0 ? String(count) : "");
  }
}
// Chamada por auth.js::initApp() após o primeiro login/restauração de sessão
// — não no carregamento do módulo. Um setInterval solto no topo do módulo
// (como era antes) roda mesmo antes de qualquer usuário logar e, mais
// importante, torna impossível importar este arquivo (mesmo indiretamente)
// em testes automatizados sem travar o processo por causa do timer aberto.
// A guarda evita criar um segundo interval se initApp() rodar de novo
// (ex.: logout seguido de novo login na mesma sessão do navegador).
let _pollingStarted = false;
export function startNotifBadgePolling() {
  if (_pollingStarted) return;
  _pollingStarted = true;
  setInterval(_updateNotifBadge, 60000);
}


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

export function registrarFalta(agId) {
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return;
  if (ag.status === AppointmentStatus.FALTOU) return toast("Falta já registrada.", "warning");
  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);

  appointmentRepository.update(ag.id, { status: AppointmentStatus.FALTOU });

  absenceRepository.register(
    {
      agId: ag.id,
      pacienteId: ag.pacienteId,
      data: ag.data,
      hora: ag.hora,
      estudantesIds: pac?.estudantesIds || [],
      registradoPor: currentUser.nome,
    },
    pac?.nome,
  );

  // Notificar supervisor e técnico
  notificationRepository.push({
    id: "notif_falta_" + ag.id,
    tipo: NotificationType.FALTA_REGISTRADA,
    pacienteId: ag.pacienteId,
    icone: "bi-person-x-fill",
    cor: "#f59e0b",
    titulo: "Falta registrada",
    desc: `${escapeHTML(pac?.nome || "Paciente")} faltou em ${formatBR(ag.data)} às ${ag.hora}.`,
    tipoAcao: "OPEN_PRONTUARIO",
    ts: new Date().toLocaleDateString("pt-BR"),
  });

  // Verificar limite: 2 faltas injustificadas → pedir troca
  const faltasInj = absenceRepository.countUnjustified(ag.pacienteId);

  if (faltasInj >= 2) {
    // Verificar se já tem pedido de troca pendente
    const jaTem = NOTIFICACOES.some(
      (n) => n.tipo === NotificationType.TROCA_SOLICITADA && n.pacienteId === ag.pacienteId && !n.lida
    );
    if (!jaTem) {
      notificationRepository.push({
        tipo: NotificationType.TROCA_SOLICITADA,
        pacienteId: ag.pacienteId,
        icone: "bi-arrow-left-right",
        cor: "#dc2626",
        titulo: "Troca de paciente recomendada",
        desc: `${escapeHTML(pac?.nome || "Paciente")} acumulou ${faltasInj} faltas injustificadas. Considere a troca do caso.`,
        tipoAcao: "CONFIRMAR_TROCA",
        ts: new Date().toLocaleDateString("pt-BR"),
        estudantesIds: pac?.estudantesIds || [],
      });
      toast(`${pac?.nome} acumulou 2 faltas. O técnico foi avisado para avaliar a troca.`, "warning");
    }
  }

  toast("Falta registrada.", "warning");
  _updateNotifBadge();
  openProntuario(ag.pacienteId);
}

export function justificarFalta(faltaId) {
  const f = FALTAS.find((x) => x.id === faltaId);
  if (!f) return;
  const pac = PACIENTES.find((p) => p.id === f.pacienteId);
  absenceRepository.justify(faltaId, pac?.nome);
  toast("Falta justificada.", "success");
  openProntuario(f.pacienteId);
}

export function confirmarTrocaPaciente(pacienteId) {
  const pac = PACIENTES.find((p) => p.id === pacienteId);
  if (!pac) return;
  const faltasInj = FALTAS.filter((f) => f.pacienteId === pacienteId && !f.justificada).length;

  // Fechar painel de notificações se aberto
  const panel = document.getElementById("notif-panel");
  if (panel) panel.remove();

  const confirmDiv = document.createElement("div");
  confirmDiv.id = "troca-confirm";
  confirmDiv.className = "modal-overlay";
  confirmDiv.style.zIndex = "3100";
  confirmDiv.innerHTML = `
    <div class="modal confirm-dialog" role="alertdialog" aria-labelledby="troca-title" onclick="event.stopPropagation()">
      <div class="confirm-icon is-danger"><i class="bi bi-arrow-left-right"></i></div>
      <h3 id="troca-title">Encerrar o caso de ${escapeHTML(pac.nome)}?</h3>
      <p>O paciente tem ${faltasInj} ${faltasInj === 1 ? "falta injustificada" : "faltas injustificadas"}. Ao confirmar, o caso fica <strong>encerrado</strong>, os atendimentos futuros são cancelados e os estudantes do grupo são avisados.</p>
      <p class="confirm-note">A ação não pode ser desfeita e fica registrada na auditoria.</p>
      <div class="form-group" style="margin-top:16px;margin-bottom:0">
        <label class="form-label" for="troca-motivo">Motivo <span class="muted" style="font-weight:400">(opcional)</span></label>
        <textarea id="troca-motivo" class="form-control" rows="2" placeholder="Paciente informou que não poderá continuar"></textarea>
      </div>
      <div class="confirm-actions">
        <button class="btn btn-secondary" onclick="document.getElementById('troca-confirm').remove()">Voltar</button>
        <button class="btn btn-danger" onclick="executarTrocaPaciente(${pacienteId})">Encerrar caso</button>
      </div>
    </div>`;
  document.body.appendChild(confirmDiv);
  confirmDiv.addEventListener("click", (e) => { if (e.target === confirmDiv) confirmDiv.remove(); });
}

export function executarTrocaPaciente(pacienteId) {
  const confirmEl = document.getElementById("troca-confirm");
  const motivo = document.getElementById("troca-motivo")?.value || "";
  if (confirmEl) confirmEl.remove();

  const pac = PACIENTES.find((p) => p.id === pacienteId);
  if (!pac) return;

  pac.status = "inativo";
  // Encerramento registrado no prontuário (Res. CFP 001/2009, art. 2º IV)
  pac.encerramento = {
    motivo: "interrupcao",
    data: today(),
    destino: null,
    sintese: `Caso encerrado por ${FALTAS.filter((f) => f.pacienteId === pacienteId && !f.justificada).length} faltas injustificadas.${motivo ? " " + motivo : ""}`,
  };

  // Cancelar todos os agendamentos futuros do paciente
  const hojeISO = today();
  AGENDAMENTOS.filter((a) => a.pacienteId === pacienteId && a.data >= hojeISO && a.status === AppointmentStatus.CONFIRMADO)
    .forEach((a) => { a.status = AppointmentStatus.CANCELADO; });

  // Marcar notificação de troca como lida
  NOTIFICACOES.filter((n) => n.tipo === NotificationType.TROCA_SOLICITADA && n.pacienteId === pacienteId)
    .forEach((n) => { n.lida = true; });

  // Notificar os estudantes do grupo
  const estudantesIds = pac.estudantesIds || [];
  if (estudantesIds.length > 0) {
    notificationRepository.push({
      tipo: NotificationType.TROCA_REALIZADA,
      pacienteId: pacienteId,
      estudantesIds: estudantesIds,
      icone: "bi-person-dash-fill",
      cor: "#dc2626",
      titulo: "Troca de paciente confirmada",
      desc: `O caso de ${escapeHTML(pac.nome)} foi encerrado pelo técnico.${motivo ? " Motivo: " + escapeHTML(motivo) : ""} Aguarde a alocação de um novo paciente.`,
      ts: new Date().toLocaleDateString("pt-BR"),
    });
  }

  logAudit("troca", "Executou troca de paciente" + (motivo ? ": " + motivo : ""), pac.nome);
  saveData();
  toast(`Caso de ${pac.nome} encerrado. Estudantes avisados.`, "success");
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
