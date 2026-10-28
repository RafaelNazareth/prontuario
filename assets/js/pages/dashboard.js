// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser, navigate, saveSession } from "../core/auth.js";
import { renderProntuario } from "./pacientes.js";
import { ACESSO_PACIENTE, AGENDAMENTOS, ANAMNESES, EVOLUCOES, FALTAS, PACIENTES, USERS, badgeAgendamento, escapeHTML, getPacientesPermitidos } from "../core/store.js";
import { toast } from "../core/utils.js";
import { calculateAge, formatShort, formatLong, weekdayAbbrev, today } from "../core/dateService.js";
import { can } from "../core/permissions.js";
import { logAudit } from "../core/store.js";

/**
 * Abre o prontuário. Cada abertura é auditada como consulta (SBIS
 * NGS1.07.03); reaberturas internas (após salvar) passam
 * `{ registrar: false }` para não duplicar o evento.
 */
export function openProntuario(pid, aba, { registrar = true } = {}) {
  if (!can("patient.read", { id: pid })) {
    toast("Acesso negado. Paciente não alocado ao seu usuário.", "error");
    return navigate("pacientes");
  }

  const p = PACIENTES.find((x) => x.id === pid);
  if (!p) return navigate("pacientes");
  const crumb = currentUser.papel === "estudante" ? "Meus casos" : "Pacientes";
  document.getElementById("topbar-title").innerHTML =
    `<span class="topbar-crumb">${crumb}</span>${escapeHTML(p.nome)}`;
  saveSession(currentUser, `prontuario_${pid}`);
  const y = window.scrollY;
  document.getElementById("page-content").innerHTML = renderProntuario(pid, aba);
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.toggle("active", el.dataset.page === "pacientes"));
  if (registrar) {
    window.scrollTo(0, 0);
    logAudit("consulta", "Consultou prontuário", null, { evento: "consulta_prontuario", pacienteId: pid });
  } else window.scrollTo(0, y);
}

// calcIdade/_dashFmtData/_dashFmtDataLonga/_dashDiaSemana mantidos como
// aliases finos de core/dateService.js (nomes preservados por serem
// exportados — ver docs/FRONTEND_AUDIT.md sobre duplicação de datas).
export function calcIdade(nasc) {
  return calculateAge(nasc);
}

/* ============================================================  DASHBOARD  */

export function _dashFmtData(iso) {
  return formatShort(iso);
}
export function _dashFmtDataLonga(iso) {
  return formatLong(iso);
}
export function _dashDiaSemana(iso) {
  return weekdayAbbrev(iso);
}
// Nível de urgência por quantidade de dias sem registro.
// Retorna a classe de status (.due-*) e um rótulo — a cor nunca vai sozinha.
export function _dashUrgenciaCor(n) {
  if (n === 0) return { cls: "", label: "Em dia" };
  if (n <= 1) return { cls: "due-warn", label: "Atenção" };
  return { cls: "due-crit", label: "Crítico" };
}

// ── Helpers de apresentação ──────────────────────────────────
const TITULOS = /^(dr|dra|prof|profa|sr|sra)\.?$/i;

function _primeiroNome(nome) {
  const partes = (nome || "").split(" ").filter(Boolean);
  const semTitulo = partes.filter((p) => !TITULOS.test(p));
  return semTitulo[0] || partes[0] || "";
}

function _saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function _dataPorExtenso() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function _plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`;
}

function _fmtDecimal(n) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function _diasDesde(isoData, hojeDate) {
  return Math.round((hojeDate - new Date(isoData + "T12:00:00")) / 86400000);
}

function _ultimaEvolucao(pid) {
  const evs = EVOLUCOES[pid] || [];
  return evs.length > 0 ? evs[evs.length - 1].data?.substring(0, 10) : null;
}

function _avatar(p, size = "sm") {
  return `<div class="patient-avatar ${size}" style="background:${p?.cor || "#6f7d72"}" aria-hidden="true">${escapeHTML(p?.ini || "?")}</div>`;
}

function _kpi({ label, value, unit = "", meter = null, warn = false, note = "", noteCls = "" }) {
  return `<div class="kpi">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${value}${unit ? `<small>${unit}</small>` : ""}</div>
    ${meter !== null ? `<div class="kpi-meter${warn ? " is-warn" : ""}" role="presentation"><span style="width:${Math.max(0, Math.min(100, meter))}%"></span></div>` : ""}
    ${note ? `<div class="kpi-note ${noteCls}">${note}</div>` : ""}
  </div>`;
}

function _taskList(tarefas) {
  return `<ul class="task-list">${tarefas
    .map((t) => {
      const acao = t.acao
        ? t.acao
        : t.targetPage
        ? `navigate('${t.targetPage}')`
        : t.pacienteId
          ? `openProntuario(${t.pacienteId})`
          : "";
      return `<li class="task task-${t.nivel}">
        <div class="task-icon"><i class="bi ${t.icon}" aria-hidden="true"></i></div>
        <div class="task-body">
          <div class="task-title">${t.titulo}</div>
          <div class="task-desc">${t.desc}</div>
        </div>
        ${acao && t.label ? `<button class="btn btn-secondary btn-sm" onclick="${acao}">${t.label}</button>` : ""}
      </li>`;
    })
    .join("")}</ul>`;
}

// Agenda do dia como linha do tempo, com marcador de "agora".
function _dayTimeline(agsHoje, { mostrarEstudante = true, limite = 8 } = {}) {
  if (agsHoje.length === 0) {
    return `<div class="empty-state compact"><i class="bi bi-calendar4"></i><h3>Nenhum atendimento hoje</h3><p>Os atendimentos do dia aparecem aqui em ordem de horário.</p></div>`;
  }
  const agora = new Date();
  const agoraHM = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  let nowInserted = false;
  const itens = agsHoje.slice(0, limite).map((ag) => {
    const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
    const est = USERS.find((u) => u.id === ag.estudanteId);
    const passado = ag.hora < agoraHM;
    let now = "";
    if (!passado && !nowInserted) {
      nowInserted = true;
      now = `<li class="day-now" aria-label="Agora, ${agoraHM}">${agoraHM}</li>`;
    }
    const meta = [ag.local, mostrarEstudante && est ? _primeiroNome(est.nome) : null, ag.status !== "confirmado" ? ag.status : null]
      .filter(Boolean)
      .map(escapeHTML)
      .join(" · ");
    return `${now}<li class="day-slot${passado ? " is-past" : ""}">
      <div class="day-time">${ag.hora}</div>
      <button type="button" class="day-entry" onclick="openProntuario(${ag.pacienteId})">
        <strong>${escapeHTML(pac?.nome || "—")}</strong><span>${meta}</span>
      </button>
    </li>`;
  });
  const mais = agsHoje.length > limite
    ? `<div class="day-more">e mais ${agsHoje.length - limite} na agenda</div>`
    : "";
  return `<ol class="day-timeline">${itens.join("")}</ol>${mais}`;
}

function _proximosTable(proximos, hoje, { mostrarEstudante = true } = {}) {
  if (proximos.length === 0) {
    return `<div class="empty-state compact"><i class="bi bi-calendar-x"></i><h3>Nenhum atendimento agendado</h3><p>Novos agendamentos aparecem aqui assim que forem criados.</p></div>`;
  }
  const rows = proximos
    .map((ag) => {
      const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
      const est = USERS.find((u) => u.id === ag.estudanteId);
      const isHoje = ag.data === hoje;
      return `<tr class="${isHoje ? "row-today" : ""}">
        <td class="cell-date">${isHoje ? `<span class="today-mark">Hoje</span>` : `${_dashDiaSemana(ag.data)}, ${_dashFmtDataLonga(ag.data)}`}</td>
        <td class="num">${ag.hora}</td>
        <td><div class="cell-person">${_avatar(pac)}<button class="dash-link-btn" onclick="openProntuario(${ag.pacienteId})">${escapeHTML(pac?.nome || "—")}</button></div></td>
        <td class="hide-sm">${escapeHTML(ag.local)}</td>
        ${mostrarEstudante ? `<td class="hide-sm">${escapeHTML(est ? _primeiroNome(est.nome) : "—")}</td>` : ""}
        <td>${badgeAgendamento(ag.status)}</td>
      </tr>`;
    })
    .join("");
  return `<div class="table-responsive"><table class="compact"><thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th class="hide-sm">Local</th>${mostrarEstudante ? `<th class="hide-sm">Estudante</th>` : ""}<th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// Série mensal (últimos 6 meses) usada pelo gráfico e pela legenda.
function _serieMensal() {
  const labMeses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const hoje = new Date();
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({ y: d.getFullYear(), m: d.getMonth(), label: labMeses[d.getMonth()] });
  }
  // Só datas até hoje: agendamentos futuros ainda não foram realizados.
  const ate = today();
  const contar = (filtro) =>
    meses.map(({ y, m }) =>
      AGENDAMENTOS.filter((a) => {
        const d = new Date(a.data + "T12:00:00");
        return a.data <= ate && d.getFullYear() === y && d.getMonth() === m && filtro(a);
      }).length,
    );
  return {
    labels: meses.map((m) => m.label),
    realizados: contar((a) => a.status === "confirmado"),
    cancelados: contar((a) => a.status === "cancelado" || a.status === "faltou"),
  };
}

const _soma = (arr) => arr.reduce((a, b) => a + b, 0);

export function renderDashboard() {
  const role = currentUser.papel;
  const hoje = today();
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

  const nome = escapeHTML(_primeiroNome(currentUser.nome));
  const hojeAtivos = agsHoje.filter((a) => a.status !== "cancelado").length;

  // ── DASHBOARD GERENCIAL (técnico / supervisor) ────────────────────────────
  if (role === "tecnico" || role === "supervisor") {
    // Técnico vê a alocação de todo o serviço; supervisor, só os estudantes dos seus casos
    // (o servidor já entrega apenas os pacientes que ele supervisiona).
    const estudantes = USERS.filter(
      (u) =>
        u.papel === "estudante" &&
        u.ativo !== false &&
        (role === "tecnico" || meusPacientes.some((p) => (p.estudantesIds || []).includes(u.id))),
    );
    const acessosPendentes = ACESSO_PACIENTE.filter(
      (a) => a.status === "pendente",
    ).length;
    const estSemCaso = estudantes.filter(
      (e) =>
        !PACIENTES.some(
          (p) => p.estudantesIds && p.estudantesIds.includes(e.id),
        ),
    ).length;
    const estAlocados = estudantes.length - estSemCaso;
    const totalPacientes =
      role === "tecnico" ? PACIENTES.length : meusPacientes.length;
    const inativos = meusPacientes.filter((p) => p.status === "inativo").length;
    const faltasInj = FALTAS.filter((f) => !f.justificada).length;

    const tarefas = [];
    // Co-assinatura de registros de estagiários (Res. CFP 001/2009, art. 3º)
    const aValidar = meusPacientes
      .filter((p) => role === "tecnico" || p.supervisorId === currentUser.id)
      .map((p) => ({ p, n: (EVOLUCOES[p.id] || []).filter((x) => x.validacao?.status === "pendente").length }))
      .filter((x) => x.n > 0);
    const totalAValidar = aValidar.reduce((s, x) => s + x.n, 0);
    if (totalAValidar > 0)
      tarefas.push({
        nivel: "critico",
        icon: "bi-patch-check",
        titulo: `${_plural(totalAValidar, "evolução de estagiário aguardando", "evoluções de estagiários aguardando")} sua validação`,
        desc: `Em ${_plural(aValidar.length, "caso", "casos")}. O registro só é válido com a assinatura do supervisor.`,
        acao: `openProntuario(${aValidar[0].p.id},'evolucoes')`,
        label: "Validar",
      });
    if (role === "tecnico" && acessosPendentes > 0)
      tarefas.push({
        nivel: "critico",
        icon: "bi-file-earmark-lock",
        titulo: `${_plural(acessosPendentes, "solicitação de titular aguardando", "solicitações de titulares aguardando")} resposta`,
        desc: "Prazo legal de 15 dias para resposta completa (LGPD, art. 19).",
        targetPage: "acesso-pac",
        label: "Revisar",
      });
    if (anamnesesPendentes > 0)
      tarefas.push({
        nivel: "atencao",
        icon: "bi-clipboard",
        titulo: `${_plural(anamnesesPendentes, "caso ativo", "casos ativos")} sem anamnese finalizada`,
        desc: "O CRP exige anamnese concluída para todo caso em atendimento.",
        targetPage: "pacientes",
        label: "Ver casos",
      });
    if (estSemCaso > 0)
      tarefas.push({
        nivel: "atencao",
        icon: "bi-person-dash",
        titulo: `${_plural(estSemCaso, "estudante", "estudantes")} sem caso alocado`,
        desc: "Sem caso, o estudante não cumpre a carga horária de estágio.",
        targetPage: "pacientes",
        label: "Alocar",
      });
    if (faltasInj > 0)
      tarefas.push({
        nivel: "atencao",
        icon: "bi-person-x",
        titulo: `${_plural(faltasInj, "falta sem justificativa", "faltas sem justificativa")}`,
        desc: "Duas faltas injustificadas no mesmo caso geram pedido de troca.",
        targetPage: "agenda",
        label: "Ver agenda",
      });
    const qtdPend = tarefas.length;
    if (qtdPend === 0)
      tarefas.push({
        nivel: "ok",
        icon: "bi-check2",
        titulo: "Nada pendente",
        desc: "Documentação, alocação e acessos estão em dia.",
      });

    const semEvolucao = listaAtivos
      .map((p) => {
        const ultima = _ultimaEvolucao(p.id);
        return { p, ultima, dias: ultima ? _diasDesde(ultima, hojeDate) : null };
      })
      .filter((x) => x.dias === null || x.dias > 14)
      .sort((a, b) => (b.dias ?? 9999) - (a.dias ?? 9999));

    const serie = _serieMensal();
    const totReal = _soma(serie.realizados);
    const totCanc = _soma(serie.cancelados);

    const resumo =
      `Hoje há <strong>${_plural(hojeAtivos, "atendimento", "atendimentos")}</strong> na agenda` +
      (qtdPend > 0
        ? ` e <strong>${_plural(qtdPend, "pendência", "pendências")}</strong> para resolver.`
        : ". Nenhuma pendência no momento.");

    return `
    <section class="dash-head">
      <div>
        <div class="dash-date">${_dataPorExtenso()}</div>
        <h1 class="dash-greeting">${_saudacao()}, ${nome}</h1>
        <p class="dash-summary">${resumo}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" onclick="navigate('agenda')"><i class="bi bi-calendar3"></i> Agenda</button>
        ${can("patient.create") ? `<button class="btn btn-primary" onclick="openModalNovoPaciente()"><i class="bi bi-plus-lg"></i> Novo paciente</button>` : ""}
      </div>
    </section>

    <section class="kpi-strip" aria-label="Indicadores">
      ${_kpi({
        label: "Pacientes ativos",
        value: listaAtivos.length,
        unit: `de ${totalPacientes}`,
        note: inativos > 0 ? `${_plural(inativos, "caso encerrado", "casos encerrados")}` : "Nenhum caso encerrado",
      })}
      ${_kpi({
        label: "Anamneses finalizadas",
        value: `${taxaConformidade}%`,
        unit: `${anamnesesFeitas} de ${listaAtivos.length}`,
        meter: taxaConformidade,
        warn: taxaConformidade < 80,
        note: anamnesesPendentes > 0 ? `${_plural(anamnesesPendentes, "caso pendente", "casos pendentes")} no CRP` : "Todos em conformidade com o CRP",
        noteCls: anamnesesPendentes > 0 ? "is-warn" : "is-ok",
      })}
      ${_kpi({
        label: "Estudantes com caso",
        value: estAlocados,
        unit: `de ${estudantes.length}`,
        meter: estudantes.length ? (estAlocados / estudantes.length) * 100 : 100,
        warn: estSemCaso > 0,
        note: estSemCaso > 0 ? `${_plural(estSemCaso, "aguardando alocação", "aguardando alocação")}` : "Todos alocados",
        noteCls: estSemCaso > 0 ? "is-warn" : "is-ok",
      })}
      ${_kpi({
        label: "Evoluções registradas",
        value: totalEvs.toLocaleString("pt-BR"),
        note: listaAtivos.length > 0 ? `${_fmtDecimal(totalEvs / listaAtivos.length)} por caso ativo` : "Sem casos ativos",
      })}
    </section>

    <div class="dash-layout">
      <div class="dash-col">
        <section class="card">
          <div class="card-header" style="flex-wrap:wrap">
            <div>
              <h2 class="card-title">Atendimentos por mês</h2>
              <div class="card-sub">Últimos 6 meses, ${role === "tecnico" ? "todo o Serviço-Escola" : "seus casos"}</div>
            </div>
            <div class="chart-legend">
              <span class="chart-legend-item"><i style="background:var(--chart-1)"></i>Realizados <b>${totReal}</b></span>
              <span class="chart-legend-item"><i style="background:var(--chart-2)"></i>Cancelados ou faltas <b>${totCanc}</b></span>
            </div>
          </div>
          <div class="card-body" style="padding:16px 16px 12px 8px">
            <div class="chart-container"><canvas id="chartAtendMes" role="img" aria-label="Atendimentos por mês: ${serie.labels.map((l, i) => `${l}, ${serie.realizados[i]} realizados e ${serie.cancelados[i]} cancelados ou faltas`).join("; ")}"></canvas></div>
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Casos sem evolução recente</h2>
              <div class="card-sub">Sem registro há mais de 14 dias</div>
            </div>
            ${semEvolucao.length > 0 ? `<span class="count-pill is-warn">${semEvolucao.length}</span>` : ""}
          </div>
          ${
            semEvolucao.length === 0
              ? `<div class="empty-state compact"><i class="bi bi-check2-circle"></i><h3>Todos os casos estão em dia</h3><p>Cada caso ativo teve evolução registrada nas últimas duas semanas.</p></div>`
              : `<div class="table-responsive"><table class="compact"><thead><tr><th>Paciente</th><th>Última evolução</th><th class="hide-sm">Estudantes</th><th></th></tr></thead><tbody>
              ${semEvolucao
                .slice(0, 6)
                .map(({ p, ultima, dias }) => {
                  const ests = (p.estudantesIds || [])
                    .map((id) => USERS.find((u) => u.id === id))
                    .filter(Boolean)
                    .map((u) => escapeHTML(_primeiroNome(u.nome)))
                    .join(", ");
                  const urg = _dashUrgenciaCor(dias === null || dias > 30 ? 2 : 1);
                  return `<tr>
                  <td><div class="cell-person">${_avatar(p)}<span class="cell-name">${escapeHTML(p.nome)}</span></div></td>
                  <td><span class="due ${urg.cls}">${ultima ? `<strong>há ${dias} dias</strong> · ${_dashFmtDataLonga(ultima)}` : "<strong>Nenhuma evolução</strong>"}</span></td>
                  <td class="hide-sm" style="color:var(--text2)">${ests || "—"}</td>
                  <td class="right"><button class="btn btn-ghost btn-sm" onclick="openProntuario(${p.id})">Abrir</button></td>
                </tr>`;
                })
                .join("")}
            </tbody></table></div>${semEvolucao.length > 6 ? `<div class="card-footer">e mais ${semEvolucao.length - 6} casos</div>` : ""}`
          }
        </section>

        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Próximos atendimentos</h2>
            <button class="btn btn-ghost btn-sm" onclick="navigate('agenda')">Abrir agenda</button>
          </div>
          ${_proximosTable(proximos7, hoje)}
        </section>
      </div>

      <div class="dash-col">
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Hoje</h2>
            <span class="card-sub">${_plural(hojeAtivos, "atendimento", "atendimentos")}</span>
          </div>
          ${_dayTimeline(agsHoje)}
        </section>

        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Pendências</h2>
            ${qtdPend > 0 ? `<span class="count-pill is-warn">${qtdPend}</span>` : ""}
          </div>
          ${_taskList(tarefas)}
        </section>
      </div>
    </div>`;
  }

  // ── DASHBOARD ESTUDANTE ───────────────────────────────────────────────────
  else {
    const meusCasos = listaAtivos;
    const anamnesesOk = meusCasos.filter(
      (p) => ANAMNESES[p.id]?.status === "finalizada",
    ).length;
    const proximaConsulta = proximos7.find((a) => a.status !== "cancelado");
    const futuras = meusAgs.filter((a) => a.data >= hoje && a.status !== "cancelado").length;

    let diasProxima = null;
    if (proximaConsulta) {
      diasProxima = Math.max(
        0,
        Math.round(
          (new Date(proximaConsulta.data + "T12:00:00") - new Date(hoje + "T12:00:00")) / 86400000,
        ),
      );
    }

    const tarefas = [];
    if (anamnesesPendentes > 0)
      tarefas.push({
        nivel: "atencao",
        icon: "bi-clipboard",
        titulo: `${_plural(anamnesesPendentes, "anamnese pendente", "anamneses pendentes")}`,
        desc: "Finalize a anamnese antes da próxima sessão. Exigência do CRP.",
        targetPage: "pacientes",
        label: "Ver casos",
      });
    const minhasPendentes = meusCasos.flatMap((p) => (EVOLUCOES[p.id] || []).filter((x) => x.autorId === currentUser.id && x.validacao?.status === "pendente"));
    if (minhasPendentes.length)
      tarefas.push({
        nivel: "atencao",
        icon: "bi-hourglass-split",
        titulo: `${_plural(minhasPendentes.length, "evolução sua aguardando", "evoluções suas aguardando")} validação`,
        desc: "O supervisor precisa co-assinar. Lembre-o na próxima supervisão.",
      });
    meusCasos.forEach((p) => {
      if ((EVOLUCOES[p.id] || []).length === 0) {
        tarefas.push({
          nivel: "atencao",
          icon: "bi-journal",
          titulo: `Primeira evolução de ${escapeHTML(_primeiroNome(p.nome))}`,
          desc: "Este caso ainda não tem nenhuma evolução registrada.",
          pacienteId: p.id,
          label: "Registrar",
        });
      }
    });
    const qtdPend = tarefas.length;
    if (qtdPend === 0)
      tarefas.push({
        nivel: "ok",
        icon: "bi-check2",
        titulo: "Documentação em dia",
        desc: "Todos os seus casos têm anamnese e evoluções registradas.",
      });

    const quando =
      diasProxima === 0 ? "Hoje" : diasProxima === 1 ? "Amanhã" : `Em ${diasProxima} dias`;
    const pacProx = proximaConsulta
      ? PACIENTES.find((p) => p.id === proximaConsulta.pacienteId)
      : null;

    const resumo =
      `Você acompanha <strong>${_plural(meusCasos.length, "caso", "casos")}</strong>` +
      (hojeAtivos > 0
        ? ` e tem <strong>${_plural(hojeAtivos, "atendimento", "atendimentos")} hoje</strong>.`
        : ` e não tem atendimentos hoje.`);

    const linhasCasos = meusCasos
      .map((p) => {
        const evs = EVOLUCOES[p.id] || [];
        const ultimaEv = _ultimaEvolucao(p.id);
        const diffDias = ultimaEv ? _diasDesde(ultimaEv, hojeDate) : null;
        const anamOk = ANAMNESES[p.id]?.status === "finalizada";
        const urgCls =
          diffDias === null || diffDias > 21 ? "due-crit" : diffDias > 7 ? "due-warn" : "";
        const rotulo =
          diffDias === null ? "Sem registro" : diffDias === 0 ? "Hoje" : `há ${diffDias} dias`;
        return `<tr>
          <td><div class="cell-person">${_avatar(p, "")}<div><div class="cell-name">${escapeHTML(p.nome)}</div><div class="cell-sub">${calcIdade(p.nascimento)} anos</div></div></div></td>
          <td>${anamOk ? `<span class="badge badge-green"><i class="bi bi-check-lg"></i>Finalizada</span>` : `<span class="badge badge-amber"><i class="bi bi-clock"></i>Pendente</span>`}</td>
          <td class="num">${evs.length}</td>
          <td><span class="due ${urgCls}"><strong>${rotulo}</strong></span></td>
          <td class="right"><button class="btn btn-secondary btn-sm" onclick="openProntuario(${p.id})">Abrir prontuário</button></td>
        </tr>`;
      })
      .join("");

    return `
    <section class="dash-head">
      <div>
        <div class="dash-date">${_dataPorExtenso()}</div>
        <h1 class="dash-greeting">${_saudacao()}, ${nome}</h1>
        <p class="dash-summary">${resumo}</p>
      </div>
      ${
        proximaConsulta
          ? `<button type="button" class="next-up" onclick="openProntuario(${proximaConsulta.pacienteId})" style="text-align:left;cursor:pointer">
        <div class="next-up-when"><b>${proximaConsulta.hora}</b><span>${quando}</span></div>
        <div class="next-up-what">
          <small>Próximo atendimento</small>
          <strong>${escapeHTML(pacProx?.nome || "—")}</strong>
          <small>${escapeHTML(proximaConsulta.local)}</small>
        </div>
        <i class="bi bi-chevron-right" style="color:var(--text4)" aria-hidden="true"></i>
      </button>`
          : ""
      }
    </section>

    <section class="kpi-strip" aria-label="Indicadores">
      ${_kpi({
        label: "Casos ativos",
        value: meusCasos.length,
        note: "Alocados a você",
      })}
      ${_kpi({
        label: "Anamneses finalizadas",
        value: anamnesesOk,
        unit: `de ${meusCasos.length}`,
        meter: meusCasos.length ? (anamnesesOk / meusCasos.length) * 100 : 100,
        warn: anamnesesPendentes > 0,
        note: anamnesesPendentes > 0 ? `${_plural(anamnesesPendentes, "pendente", "pendentes")}` : "Todas concluídas",
        noteCls: anamnesesPendentes > 0 ? "is-warn" : "is-ok",
      })}
      ${_kpi({
        label: "Evoluções registradas",
        value: totalEvs,
        note: meusCasos.length > 0 ? `${_fmtDecimal(totalEvs / meusCasos.length)} por caso` : "Sem casos ativos",
      })}
      ${_kpi({
        label: "Atendimentos agendados",
        value: futuras,
        note: hojeAtivos > 0 ? `${hojeAtivos} hoje` : "Nenhum hoje",
      })}
    </section>

    <div class="dash-layout">
      <div class="dash-col">
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Meus casos</h2>
            <button class="btn btn-ghost btn-sm" onclick="navigate('pacientes')">Ver todos</button>
          </div>
          ${
            meusCasos.length === 0
              ? `<div class="empty-state compact"><i class="bi bi-folder2"></i><h3>Nenhum caso alocado</h3><p>Quando a coordenação alocar um paciente a você, ele aparece aqui.</p></div>`
              : `<div class="table-responsive"><table><thead><tr><th>Paciente</th><th>Anamnese</th><th>Evoluções</th><th>Última evolução</th><th></th></tr></thead><tbody>${linhasCasos}</tbody></table></div>`
          }
        </section>

        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Próximos atendimentos</h2>
            <button class="btn btn-ghost btn-sm" onclick="navigate('agenda')">Abrir agenda</button>
          </div>
          ${_proximosTable(proximos7, hoje, { mostrarEstudante: false })}
        </section>
      </div>

      <div class="dash-col">
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Hoje</h2>
            <span class="card-sub">${_plural(hojeAtivos, "atendimento", "atendimentos")}</span>
          </div>
          ${_dayTimeline(agsHoje, { mostrarEstudante: false })}
        </section>

        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Pendências</h2>
            ${qtdPend > 0 ? `<span class="count-pill is-warn">${qtdPend}</span>` : ""}
          </div>
          ${_taskList(tarefas.slice(0, 4))}
        </section>
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
// Renderiza os gráficos do dashboard após o HTML estar no DOM.
//
//   chartAtendMes → barras agrupadas: realizados × cancelados/faltas
//                   (últimos 6 meses). Cores validadas para daltonismo
//                   e contraste (--chart-1 / --chart-2 no CSS); a
//                   legenda é HTML, no cabeçalho do card, com totais.
//
// MANUTENÇÃO: para adicionar um gráfico, crie o <canvas> no renderDashboard()
// e adicione o bloco new Chart() aqui. Use _destroyChart(id) antes para evitar
// instâncias duplicadas ao navegar.
// ─────────────────────────────────────────────────────────────
export function renderDashboardCharts() {
  if (typeof Chart === "undefined") return;

  const css = window.getComputedStyle(document.documentElement);
  const tok = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const C1 = tok("--chart-1", "#1a6b2e");
  const C2 = tok("--chart-2", "#b97a1e");
  const INK3 = tok("--text3", "#6f7d72");
  const GRID = tok("--bg2", "#eef0ec");

  Chart.defaults.font.family = tok("--font", "system-ui");
  Chart.defaults.font.size = 12;
  Chart.defaults.color = INK3;

  const ctxAtend = document.getElementById("chartAtendMes");
  if (ctxAtend) {
    _destroyChart("atendMes");
    const serie = _serieMensal();
    const barra = {
      borderRadius: { topLeft: 4, topRight: 4 },
      borderSkipped: "bottom",
      maxBarThickness: 22,
      categoryPercentage: 0.62,
      barPercentage: 0.86,
    };

    _chartInsts["atendMes"] = new Chart(ctxAtend, {
      type: "bar",
      data: {
        labels: serie.labels,
        datasets: [
          { label: "Realizados", data: serie.realizados, backgroundColor: C1, hoverBackgroundColor: "#0f4c1e", ...barra },
          { label: "Cancelados ou faltas", data: serie.cancelados, backgroundColor: C2, hoverBackgroundColor: "#94601a", ...barra },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        animation: { duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#18221b",
            padding: { x: 12, y: 10 },
            cornerRadius: 8,
            titleFont: { weight: "600", size: 12.5 },
            bodyFont: { size: 12.5 },
            titleColor: "#fff",
            bodyColor: "rgba(255,255,255,0.86)",
            boxWidth: 8,
            boxHeight: 8,
            boxPadding: 5,
            usePointStyle: true,
            callbacks: {
              title: (items) => items[0].label.charAt(0).toUpperCase() + items[0].label.slice(1),
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: GRID, drawTicks: false },
            ticks: { precision: 0, maxTicksLimit: 5, padding: 10 },
          },
          x: {
            border: { color: tok("--border2", "#d3d9d0") },
            grid: { display: false },
            ticks: { padding: 6 },
          },
        },
      },
    });
    chartTendenciaInst = _chartInsts["atendMes"];
  }
}

/* ============================================================  PACIENTES  */
