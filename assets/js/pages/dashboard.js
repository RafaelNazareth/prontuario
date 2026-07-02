// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser, navigate, saveSession } from "../core/auth.js";
import { renderProntuario } from "./pacientes.js";
import { ACESSO_PACIENTE, AGENDAMENTOS, ANAMNESES, EVOLUCOES, FALTAS, PACIENTES, USERS, escapeHTML, getPacientesPermitidos } from "../core/store.js";
import { toast } from "../core/utils.js";

export function openProntuario(pid) {
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

export function calcIdade(nasc) {
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
export function _dashFmtData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}
export function _dashFmtDataLonga(iso) {
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
export function _dashDiaSemana(iso) {
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return dias[new Date(iso + "T12:00:00").getDay()];
}
export function _dashUrgenciaCor(n) {
  if (n === 0) return { bg: "#dcfce7", text: "#14532d", label: "Zerado" };
  if (n <= 1) return { bg: "#fef3c7", text: "#78350f", label: "Atenção" };
  return { bg: "#fee2e2", text: "#7f1d1d", label: "Crítico" };
}

export function renderDashboard() {
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
          <div class="card-header"><span class="card-title"><i class="bi bi-diagram-3-fill" style="color:#6d28d9"></i> Situação atual</span></div>
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

export let _chartInsts = {};
export function _destroyChart(id) {
  if (_chartInsts[id]) {
    _chartInsts[id].destroy();
    delete _chartInsts[id];
  }
}

export let chartTendenciaInst = null;
export let chartEvolucoesInst = null;
export let chartCasosEstudanteInst = null;

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
export function renderDashboardCharts() {
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
