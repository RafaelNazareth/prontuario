// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser, navigate } from "../core/auth.js";
import { AGENDAMENTOS, PACIENTES, USERS, badgeAgendamento, escapeHTML, getPacientesPermitidos } from "../core/store.js";
import { can } from "../core/permissions.js";
import { formatBR, formatLong, weekdayAbbrev } from "../core/dateService.js";

export function _renderProximosList(proximos, hoje) {
  if (proximos.length === 0)
    return '<div class="empty-state compact"><i class="bi bi-calendar-x"></i><h3>Nenhum atendimento agendado</h3><p>Novos agendamentos aparecem aqui assim que forem criados.</p></div>';
  const rows = proximos
    .map((ag) => {
      const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
      const isHj = ag.data === hoje;
      const isCanceled = ag.status === "cancelado";
      const dataCell = isHj
        ? '<span class="today-mark">Hoje</span>'
        : `${weekdayAbbrev(ag.data)}, ${formatBR(ag.data)}`;
      const acoesCell = !isCanceled
        ? `<div class="action-btns" style="justify-content:flex-end">
             <button class="btn btn-ghost btn-sm btn-icon" onclick="openModalEditarAgendamento(${ag.id})" title="Editar" aria-label="Editar agendamento"><i class="bi bi-pencil"></i></button>
             <button class="btn btn-ghost btn-sm btn-icon" onclick="confirmarCancelamentoAgendamento(${ag.id})" title="Cancelar" aria-label="Cancelar agendamento"><i class="bi bi-x-lg"></i></button>
           </div>`
        : "";
      return `<tr class="${isHj ? "row-today" : ""}${isCanceled ? " row-muted" : ""}">
      <td class="cell-date">${dataCell}</td>
      <td class="num">${ag.hora}</td>
      <td><div class="cell-person"><div class="patient-avatar sm" style="background:${pac?.cor || "#6f7d72"}" aria-hidden="true">${escapeHTML(pac?.ini || "?")}</div><button class="dash-link-btn cell-name" onclick="openProntuario(${ag.pacienteId})">${escapeHTML(pac?.nome || "—")}</button></div></td>
      <td>${escapeHTML(ag.local)}</td>
      <td>${badgeAgendamento(ag.status)}</td>
      <td class="right">${acoesCell}</td>
    </tr>`;
    })
    .join("");
  return `<div class="table-responsive"><table><thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Local</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ============================================================  AGENDA  */
export function _agendaGetSemana(offsetSemanas) {
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

export let _agendaSemanaOffset = 0;

// ─────────────────────────────────────────────────────────────
// renderAgenda()
// Renderiza a view semanal de agendamentos.
//
// ESTRUTURA:
//   - _agendaGetSemana(offset) → array de 5 datas ISO (seg-sex)
//   - slotMapMulti: dicionário { 'ISO_HH:MM' → [{ pac, ag, est }] }
//   - headerCols: <th> por dia (dia da semana + número), hoje destacado
//   - rows: <tr> por horário; linha de intervalo entre 11:30 e 13:00
//
// ACESSIBILIDADE:
//   - Nome do paciente é um <button> (abre o prontuário)
//   - Cancelado/faltou: texto explícito + estilo — não depende de cor
//   - Ações de editar/cancelar aparecem no hover/foco (sempre visíveis
//     em telas de toque)
//
// MANUTENÇÃO:
//   Para adicionar novos horários, edite o array HOURS abaixo.
//   Para alterar aparência dos eventos, edite as classes
//   .agenda-td-slot, .cal-event-accessible, .agenda-ev-* no CSS.
// ─────────────────────────────────────────────────────────────
export function renderAgenda() {
  const DIAS_LABEL = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  // Slots de 30 min das 8h às 17h
  const HOURS = [
    "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
    "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30",
  ];
  const semana = _agendaGetSemana(_agendaSemanaOffset);
  const hoje = new Date().toISOString().split("T")[0];

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

  const isHoje = (iso) => iso === hoje;
  const diaNum = (iso) => parseInt(iso.split("-")[2], 10);
  const semLabel = formatLong(semana[0]) + " – " + formatLong(semana[4]) + " de " + semana[4].slice(0, 4);

  const headerCols = semana
    .map((iso, i) => {
      const ativo = isHoje(iso);
      return (
        '<th class="agenda-th"' + (ativo ? ' data-today="true" aria-current="date"' : "") + ">" +
        '<span class="dow">' + DIAS_LABEL[i] + "</span>" +
        '<span class="dom">' + diaNum(iso) + "</span>" +
        "</th>"
      );
    })
    .join("");

  const renderEvento = (ev) => {
    const isCan = ev.ag.status === "cancelado";
    const isFaltou = ev.ag.status === "faltou";
    const estNome = ev.est ? ev.est.nome.split(" ")[0] : "";
    const estado = isCan ? " is-canceled" : isFaltou ? " is-absent" : "";
    const meta = isCan
      ? "Cancelado"
      : isFaltou
        ? "Faltou"
        : escapeHTML(ev.ag.local) + (estNome ? " · " + escapeHTML(estNome) : "");
    const acoes = !isCan && !isFaltou
      ? '<div class="agenda-ev-actions">' +
          '<button class="agenda-ev-btn" onclick="openModalEditarAgendamento(' + ev.ag.id + ')" title="Editar" aria-label="Editar agendamento de ' + escapeHTML(ev.pac.nome) + '"><i class="bi bi-pencil"></i></button>' +
          '<button class="agenda-ev-btn agenda-ev-btn-cancel" onclick="confirmarCancelamentoAgendamento(' + ev.ag.id + ')" title="Cancelar" aria-label="Cancelar agendamento de ' + escapeHTML(ev.pac.nome) + '"><i class="bi bi-x-lg"></i></button>' +
        "</div>"
      : "";
    return (
      '<div class="cal-event-accessible' + estado + '">' +
      '<button type="button" class="ev-name" onclick="openProntuario(' + ev.pac.id + ')" aria-label="Abrir prontuário de ' + escapeHTML(ev.pac.nome) + ", " + ev.ag.hora + '">' +
      escapeHTML(ev.pac.nome) +
      "</button>" +
      '<span class="ev-meta">' + meta + "</span>" +
      acoes +
      "</div>"
    );
  };

  let rows = "";
  HOURS.forEach((hora, idx) => {
    if (hora === "13:00" && HOURS[idx - 1] === "11:30") {
      rows += '<tr class="agenda-row-break"><td></td><td colspan="5">Intervalo de almoço</td></tr>';
    }
    const isHalf = hora.endsWith(":30");
    const cells = semana
      .map((iso) => {
        const evs = slotMapMulti[iso + "_" + hora] || [];
        const todayClass = isHoje(iso) ? " agenda-td-today" : "";
        if (evs.length > 0)
          return '<td class="agenda-td-slot' + todayClass + '">' + evs.map(renderEvento).join("") + "</td>";
        return '<td class="agenda-td-slot agenda-td-empty' + todayClass + '"></td>';
      })
      .join("");
    rows +=
      '<tr class="' + (isHalf ? "agenda-row-half" : "") + '"><td class="agenda-td-hour' + (isHalf ? " is-half" : "") + '">' +
      hora + "</td>" + cells + "</tr>";
  });

  const proximos = meusAgendamentos
    .filter((a) => a.data >= hoje)
    .sort(
      (a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora),
    )
    .slice(0, 8);

  const canAdd = can("appointment.create");
  const naSemana = meusAgendamentos.filter(
    (a) => semana.includes(a.data) && a.status !== "cancelado",
  ).length;

  return (
    '<div class="page-header"><div class="page-header-left"><h1>' +
    (currentUser.papel === "estudante" ? "Minha agenda" : "Agenda") +
    "</h1><p>" + naSemana + (naSemana === 1 ? " atendimento" : " atendimentos") + " nesta semana</p></div>" +
    (canAdd
      ? '<button class="btn btn-primary" onclick="openModalNovoAgendamento()"><i class="bi bi-plus-lg"></i> Novo agendamento</button>'
      : "") +
    "</div>" +
    '<section class="card">' +
    '<div class="card-header agenda-toolbar">' +
    '<span class="agenda-range">' + semLabel + "</span>" +
    '<button class="btn btn-secondary btn-sm" onclick="agendaIrParaHoje()"' + (_agendaSemanaOffset === 0 ? " disabled" : "") + ">Hoje</button>" +
    '<div class="btn-group">' +
    '<button class="btn btn-secondary btn-sm btn-icon" onclick="agendaSemanaAnterior()" title="Semana anterior" aria-label="Semana anterior"><i class="bi bi-chevron-left"></i></button>' +
    '<button class="btn btn-secondary btn-sm btn-icon" onclick="agendaProximaSemana()" title="Próxima semana" aria-label="Próxima semana"><i class="bi bi-chevron-right"></i></button>' +
    "</div>" +
    "</div>" +
    '<div class="agenda-calendar-wrap"><table class="agenda-table">' +
    '<thead><tr><th class="agenda-th-corner"></th>' +
    headerCols +
    "</tr></thead>" +
    "<tbody>" +
    rows +
    "</tbody>" +
    "</table></div></section>" +
    '<section class="card"><div class="card-header"><h2 class="card-title">Próximos atendimentos</h2></div>' +
    _renderProximosList(proximos, hoje) +
    "</section>"
  );
}

/* ============================================================  ACESSO & USUÁRIOS  */

export function agendaSemanaAnterior(){ _agendaSemanaOffset--; navigate('agenda'); }
export function agendaIrParaHoje(){ _agendaSemanaOffset = 0; navigate('agenda'); }
export function agendaProximaSemana(){ _agendaSemanaOffset++; navigate('agenda'); }
