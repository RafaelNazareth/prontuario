// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser, navigate } from "../core/auth.js";
import { openProntuario } from "./dashboard.js";
import { confirmarCancelamentoAgendamento, openModalEditarAgendamento, openModalNovoAgendamento } from "../modals/modals.js";
import { AGENDAMENTOS, PACIENTES, USERS, badgeAgendamento, escapeHTML, getPacientesPermitidos } from "../core/store.js";

export function _renderProximosList(proximos, hoje) {
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
export function renderAgenda() {
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
    '<button class="btn btn-secondary btn-sm" onclick="agendaSemanaAnterior()" title="Semana anterior"><i class="bi bi-chevron-left"></i></button>' +
    '<span class="card-title" style="flex:1;text-align:center;font-size:13px">' +
    semLabel +
    "</span>" +
    '<button class="btn btn-ghost btn-sm" onclick="agendaIrParaHoje()">Hoje</button>' +
    '<button class="btn btn-secondary btn-sm" onclick="agendaProximaSemana()" title="Próxima semana"><i class="bi bi-chevron-right"></i></button>' +
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

export function agendaSemanaAnterior(){ _agendaSemanaOffset--; navigate('agenda'); }
export function agendaIrParaHoje(){ _agendaSemanaOffset = 0; navigate('agenda'); }
export function agendaProximaSemana(){ _agendaSemanaOffset++; navigate('agenda'); }
