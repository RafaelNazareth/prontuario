// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser, navigate } from "../core/auth.js";
import { openProntuario } from "./dashboard.js";
import { renderPacientes } from "./pacientes.js";
import { AGENDAMENTOS, ANAMNESES, EVOLUCOES, FALTAS, NOTIFICACOES, PACIENTES, escapeHTML, logAudit, saveData } from "../core/store.js";
import { globalSearch, toast } from "../core/utils.js";

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

export function marcarNotifLida(notifId) {
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

export function acionarNotif(notifId, acao) {
  marcarNotifLida(notifId);
  const panel = document.getElementById("notif-panel");
  if (panel) panel.remove();
  if (acao) {
    try { eval(acao); } catch(e) { console.warn("Ação de notificação inválida:", e); }
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

export function registrarFalta(agId) {
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

export function justificarFalta(faltaId) {
  const f = FALTAS.find((x) => x.id === faltaId);
  if (!f) return;
  f.justificada = true;
  const pac = PACIENTES.find((p) => p.id === f.pacienteId);
  logAudit("falta", "Justificou falta", pac?.nome || "");
  saveData();
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

export function executarTrocaPaciente(pacienteId) {
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
