// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser, navigate } from "../core/auth.js";
import { openProntuario } from "./dashboard.js";
import { confirmarCancelamentoAgendamento, openModalAnamnese, openModalEditarAgendamento, openModalEditarPaciente, openModalEvolucao, openModalNovoPaciente, openModalUploadDocumento } from "../modals/modals.js";
import { justificarFalta, registrarFalta } from "./notificacoes.js";
import { AGENDAMENTOS, ANAMNESES, DOCUMENTOS, EVOLUCOES, FALTAS, PACIENTES, USERS, escapeHTML, getPacientesPermitidos } from "../core/store.js";
import { toast } from "../core/utils.js";

export function renderPacientes() {
  const role = currentUser.papel;
  // Agora utiliza a função centralizada que bloqueia quem não tem acesso.
  const lista = getPacientesPermitidos();

  return `<div class="page-header"><div class="page-header-left"><h1>${role === "estudante" ? "Meus Casos" : "Pacientes"}</h1><p>${lista.length} casos listados</p></div>${role === "tecnico" ? `<button class="btn btn-primary" onclick="openModalNovoPaciente()"><i class="bi bi-person-plus-fill"></i> Novo paciente</button>` : ""}</div>
  <div class="card"><div class="card-header" style="padding:12px 18px"><div class="filter-bar"><div class="search-box"><i class="bi bi-search"></i><input type="text" placeholder="Buscar por nome..." id="pac-search" oninput="filterPacientes(this.value)"></div><select class="filter-select" onchange="filterPacienteStatus(this.value)"><option value="">Todos os status</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option></select></div></div>
  <div class="table-responsive"><table><thead><tr><th>Paciente</th><th>CPF</th><th>Estudantes</th><th>Supervisor</th><th>Status</th><th>Ações</th></tr></thead><tbody id="pac-tbody">${lista.map(renderPacienteRow).join("")}</tbody></table></div></div>`;
}

export function renderPacienteRow(p) {
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

export function filterPacientes(q) {
  const lista = getPacientesPermitidos();
  document.getElementById("pac-tbody").innerHTML = lista
    .filter((p) => p.nome.toLowerCase().includes(q.toLowerCase()))
    .map(renderPacienteRow)
    .join("");
}
export function filterPacienteStatus(s) {
  const lista = getPacientesPermitidos();
  document.getElementById("pac-tbody").innerHTML = (
    s ? lista.filter((p) => p.status === s) : lista
  )
    .map(renderPacienteRow)
    .join("");
}

/* ============================================================  PRONTUÁRIO  */
export function renderProntuario(pid) {
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

export function switchTab(btn, tabId) {
  document
    .querySelectorAll(".ptab")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".ptab-content")
    .forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(tabId).classList.add("active");
}

export function renderTabResumo(pid) {
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

export function renderTabAnamnese(pid) {
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

export function renderTabEvolucoes(pid) {
  const evs = (EVOLUCOES[pid] || []).slice().reverse(),
    canAdd = ["tecnico", "supervisor", "estudante"].includes(currentUser.papel);
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><div><strong>${evs.length}</strong> evoluções</div>${canAdd ? `<button class="btn btn-primary" onclick="openModalEvolucao(${pid})"><i class="bi bi-plus-lg"></i> Nova evolução</button>` : ""}</div><div class="evolucao-list">${evs.map((ev) => `<div class="evolucao-card"><div class="evolucao-header"><span class="badge badge-teal">${ev.tipo}</span><span class="evolucao-date"><i class="bi bi-calendar3"></i> ${ev.data}</span><span class="evolucao-author"><i class="bi bi-person-fill"></i> ${escapeHTML(ev.autor)}</span></div><div class="evolucao-body"><p class="evolucao-content">${escapeHTML(ev.conteudo)}</p></div></div>`).join("")}</div>`;
}

export function renderTabDocumentos(pid) {
  const docs = DOCUMENTOS[pid] || [],
    canUp = ["tecnico", "supervisor", "estudante"].includes(currentUser.papel);
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><strong>${docs.length} documentos</strong>${canUp ? `<button class="btn btn-primary" onclick="openModalUploadDocumento(${pid})"><i class="bi bi-upload"></i> Upload</button>` : ""}</div><div class="doc-grid">${docs.map((d) => `<div class="doc-card" onclick="toast('Visualizando: ${escapeHTML(d.nome)}','info')"><div class="doc-icon doc-icon-pdf"><i class="bi bi-file-earmark-fill"></i></div><div class="doc-name">${escapeHTML(d.nome)}</div></div>`).join("")}</div>`;
}

export function renderTabAgendaPaciente(pid) {
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

