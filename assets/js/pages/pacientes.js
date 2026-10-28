// ============================================================
// pages/pacientes.js
// ------------------------------------------------------------
// Lista de pacientes e prontuário psicológico.
//
// Estrutura do prontuário (Res. CFP 001/2009, art. 2º; Res. CFP
// 05/2025, art. 12): identificação; avaliação de demanda; objetivos;
// evolução; encaminhamento/encerramento; cópias dos documentos
// emitidos. O registro documental (supervisão, anotações e material
// de testes) fica numa aba própria, visível só à equipe (Res. CFP
// 05/2025, arts. 14 e 17 §2º).
// ============================================================

import { currentUser } from "../core/auth.js";
import {
  AGENDAMENTOS,
  ANAMNESES,
  COMPARTILHAMENTOS,
  DOCUMENTOS,
  EVOLUCOES,
  FALTAS,
  PACIENTES,
  REGISTRO_DOCUMENTAL,
  USERS,
  badgeAgendamento,
  escapeHTML,
  getPacientesPermitidos,
} from "../core/store.js";
import { can } from "../core/permissions.js";
import { today, formatBR, formatLong, weekdayAbbrev, calculateAge } from "../core/dateService.js";
import {
  MODALIDADES_DOCUMENTO,
  MOTIVOS_ENCERRAMENTO,
  TIPOS_COMPARTILHAMENTO,
  TIPOS_CONSENTIMENTO,
  TIPOS_EVOLUCAO,
  TIPOS_REGISTRO_DOCUMENTAL,
  badgeValidacao,
  ehMenor,
  fmtDataHora,
  guardaAte,
  htmlAssinaturas,
  mascararCPF,
  textoHipotese,
} from "../core/clinico.js";

const e = escapeHTML;

// Filtros da lista combinados (busca + status) — antes um apagava o outro.
let _filtroTexto = "";
let _filtroStatus = "";

function _tipoEv(tipo) {
  return e(TIPOS_EVOLUCAO[tipo] || tipo || "");
}

// Evoluções são texto livre; as linhas "Rótulo: ..." (modelo usado no
// Serviço-Escola) ganham destaque. Sempre escapado antes de formatar.
const ROTULOS_EVOLUCAO = /^(Demanda|Intervenção|Observações|Plano|Discussão|Encaminhamentos|Motivo|Síntese|Destino|S \(Subjetivo\)|O \(Objetivo\)|A \(Avaliação\)|P \(Plano\)):/gm;
export function formatarEvolucao(conteudo) {
  return e(conteudo).replace(ROTULOS_EVOLUCAO, '<strong class="ev-label">$1:</strong>');
}
function _resumoEvolucao(conteudo) {
  const linha = (conteudo || "").split("\n").find((l) => l.trim()) || "";
  const txt = linha.replace(/^[^:]{1,30}:\s*/, "");
  return e(txt.length > 220 ? txt.substring(0, 220) + "…" : txt);
}
// "Hipótese diagnóstica: X (CID)." → "X (CID)"
function _hipotese(txt) {
  return txt.replace(/^Hip[óo]tese diagn[óo]stica:\s*/i, "").split(/\.\s+Plano:/)[0].replace(/\.$/, "");
}
function _fmtDataISO(iso) {
  return iso ? formatBR(String(iso).slice(0, 10)) : "—";
}
function _nomeUsuario(id) {
  return USERS.find((u) => u.id === id)?.nome || "—";
}

function _statusBadge(status) {
  return `<span class="badge ${status === "ativo" ? "badge-green" : "badge-gray"}">${status === "ativo" ? "Ativo" : "Encerrado"}</span>`;
}

// ── Lista ────────────────────────────────────────────────────
export function renderPacientes() {
  const role = currentUser.papel;
  const lista = getPacientesPermitidos();
  _filtroTexto = "";
  _filtroStatus = "";
  const ativos = lista.filter((p) => p.status === "ativo").length;

  return `<div class="page-header">
    <div class="page-header-left">
      <h1>${role === "estudante" ? "Meus casos" : "Pacientes"}</h1>
      <p>${ativos} ativos de ${lista.length} ${lista.length === 1 ? "caso" : "casos"}</p>
    </div>
    ${can("patient.create") ? `<button class="btn btn-primary" onclick="openModalNovoPaciente()"><i class="bi bi-plus-lg"></i> Novo paciente</button>` : ""}
  </div>
  <div class="card">
    <div class="card-header">
      <div class="filter-bar">
        <div class="search-box"><i class="bi bi-search"></i><input type="search" placeholder="Buscar por nome" id="pac-search" aria-label="Buscar paciente por nome" oninput="filterPacientes(this.value)"></div>
        <select class="filter-select" aria-label="Filtrar por status" onchange="filterPacienteStatus(this.value)"><option value="">Todos os status</option><option value="ativo">Ativos</option><option value="inativo">Encerrados</option></select>
        <span class="filter-count" id="pac-count">${lista.length} ${lista.length === 1 ? "resultado" : "resultados"}</span>
      </div>
    </div>
    <div class="table-responsive"><table><thead><tr><th>Paciente</th><th>CPF</th><th>Estudantes</th><th>Supervisão</th><th>Status</th><th></th></tr></thead><tbody id="pac-tbody">${lista.map(renderPacienteRow).join("")}</tbody></table></div>
  </div>`;
}

export function renderPacienteRow(p) {
  const estudantes = (p.estudantesIds || []).map((id) => USERS.find((u) => u.id === id)).filter(Boolean);
  const nomesEstudantes = estudantes.length > 0 ? estudantes.map((x) => e(x.nome)).join(", ") : `<span class="muted">Sem estudante</span>`;
  const sup = USERS.find((u) => u.id === p.supervisorId);
  const idade = p.nascimento ? ` · ${calculateAge(p.nascimento)} anos` : "";
  const nome = p.nomeSocial ? `${e(p.nomeSocial)}` : e(p.nome);
  // CPF completo só para o técnico; nas demais listas, mascarado (minimização).
  const cpf = currentUser.papel === "tecnico" ? e(p.cpf) : mascararCPF(p.cpf);
  return `<tr>
    <td><div class="cell-person"><div class="patient-avatar" style="background:${p.cor}" aria-hidden="true">${e(p.ini)}</div><div><button class="dash-link-btn cell-name" onclick="openProntuario(${p.id})">${nome}</button><div class="cell-sub">Caso ${p.id}${idade}${ehMenor(p) ? " · menor de idade" : ""}</div></div></div></td>
    <td class="num" style="color:var(--text2)">${cpf}</td>
    <td style="max-width:220px;color:var(--text2)">${nomesEstudantes}</td>
    <td style="color:var(--text2)">${sup ? e(sup.nome) : "—"}</td>
    <td>${_statusBadge(p.status)}</td>
    <td class="right"><div class="action-btns" style="justify-content:flex-end"><button class="btn btn-secondary btn-sm" onclick="openProntuario(${p.id})">Abrir prontuário</button>${can("patient.update") ? `<button class="btn btn-ghost btn-sm btn-icon" onclick="openModalEditarPaciente(${p.id})" title="Editar cadastro" aria-label="Editar cadastro de ${e(p.nome)}"><i class="bi bi-pencil"></i></button>` : ""}</div></td>
  </tr>`;
}

function _aplicarFiltros() {
  const q = _filtroTexto.toLowerCase();
  const lista = getPacientesPermitidos().filter(
    (p) => (!q || p.nome.toLowerCase().includes(q) || (p.nomeSocial || "").toLowerCase().includes(q)) && (!_filtroStatus || p.status === _filtroStatus),
  );
  document.getElementById("pac-tbody").innerHTML = lista.length
    ? lista.map(renderPacienteRow).join("")
    : `<tr><td colspan="6"><div class="empty-state compact"><i class="bi bi-search"></i><h3>Nenhum paciente encontrado</h3><p>Confira a grafia do nome ou limpe o filtro de status.</p></div></td></tr>`;
  const count = document.getElementById("pac-count");
  if (count) count.textContent = `${lista.length} ${lista.length === 1 ? "resultado" : "resultados"}`;
}

export function filterPacientes(q) {
  _filtroTexto = q || "";
  _aplicarFiltros();
}
export function filterPacienteStatus(s) {
  _filtroStatus = s || "";
  _aplicarFiltros();
}

// ── Prontuário ───────────────────────────────────────────────
function _fmtEvData(data) {
  const [d, h] = (data || "").split(" ");
  return { dia: d ? `${weekdayAbbrev(d)}, ${formatLong(d)} ${d.slice(0, 4)}` : "—", hora: h || "" };
}

const ABAS = [
  ["resumo", "Resumo"],
  ["anamnese", "Avaliação de demanda"],
  ["evolucoes", "Evoluções"],
  ["documentos", "Documentos"],
  ["termos", "Termos e comunicações"],
  ["registro", "Registro documental"],
  ["agenda", "Agenda"],
];

export function renderProntuario(pid, abaInicial = "resumo") {
  const p = PACIENTES.find((x) => x.id === pid);
  const sup = USERS.find((u) => u.id === p.supervisorId);
  const estudantes = (p.estudantesIds || []).map((id) => USERS.find((u) => u.id === id)).filter(Boolean);
  const evs = EVOLUCOES[pid] || [];
  const docs = (DOCUMENTOS[pid] || []).filter((d) => d.compartimento !== "restrito");
  const ags = AGENDAMENTOS.filter((a) => a.pacienteId === pid);
  const rd = (REGISTRO_DOCUMENTAL[pid] || []).length + (DOCUMENTOS[pid] || []).filter((d) => d.compartimento === "restrito").length;
  const pendentes = evs.filter((x) => x.validacao?.status === "pendente").length;
  const voltar = currentUser.papel === "estudante" ? "Meus casos" : "Pacientes";
  const idade = p.nascimento ? ` · ${calculateAge(p.nascimento)} anos` : "";
  const ativo = p.status === "ativo";
  const count = (n, aviso) => `<span class="ptab-count${aviso ? " is-warn" : ""}">${n}</span>`;
  const contagens = { evolucoes: count(evs.length, pendentes), documentos: count(docs.length), registro: count(rd), agenda: count(ags.length) };
  const abas = ABAS.filter(([id]) => id !== "registro" || can("registroDocumental.read"));
  const aba = abas.some(([id]) => id === abaInicial) ? abaInicial : "resumo";
  const cpf = currentUser.papel === "tecnico" ? e(p.cpf) : mascararCPF(p.cpf);

  return `
  <button type="button" class="back-btn" onclick="navigate('pacientes')"><i class="bi bi-arrow-left"></i> ${voltar}</button>
  <section class="patient-profile">
    <div class="patient-profile-avatar" style="background:${p.cor}" aria-hidden="true">${e(p.ini)}</div>
    <div class="patient-profile-info">
      <h2>${e(p.nomeSocial || p.nome)} ${_statusBadge(p.status)}</h2>
      <p>${p.nomeSocial ? `Nome civil: ${e(p.nome)} · ` : ""}Caso ${p.id}${idade}${ehMenor(p) ? " · menor de idade" : ""}</p>
    </div>
    <div class="patient-actions">
      <button class="btn btn-secondary" onclick="gerarPdfProntuario(${pid})" title="Imprimir prontuário"><i class="bi bi-printer"></i> Imprimir</button>
      ${can("document.emit") && ativo ? `<button class="btn btn-secondary" onclick="openModalEmitirDocumento(${pid})"><i class="bi bi-file-earmark-text"></i> Emitir documento</button>` : ""}
      ${can("case.close") && ativo ? `<button class="btn btn-secondary" onclick="openModalEncerramento(${pid})"><i class="bi bi-door-closed"></i> Encerrar</button>` : ""}
      ${can("evolution.create") && ativo ? `<button class="btn btn-primary" onclick="openModalEvolucao(${pid})"><i class="bi bi-plus-lg"></i> Nova evolução</button>` : ""}
    </div>
    <dl class="patient-facts">
      <div><dt>CPF</dt><dd>${cpf}</dd></div>
      <div><dt>${p.responsavel ? "Responsável legal" : "Telefone"}</dt><dd>${p.responsavel ? `${e(p.responsavel.nome)} (${e(p.responsavel.vinculo)})` : e(p.telefone || "—")}</dd></div>
      <div><dt>Estudantes</dt><dd>${e(estudantes.map((x) => x.nome).join(", ") || "Nenhum")}</dd></div>
      <div><dt>Supervisão</dt><dd>${e(sup ? `${sup.nome}${sup.crp ? ` (${sup.crp})` : ""}` : "—")}</dd></div>
    </dl>
  </section>
  <nav class="prontuario-tabs" role="tablist" aria-label="Seções do prontuário">
    ${abas.map(([id, rot]) => `<button class="ptab${id === aba ? " active" : ""}" role="tab" aria-selected="${id === aba}" data-aba="${id}" onclick="switchTab(this,'tab-${id}',${pid})">${rot} ${contagens[id] || ""}</button>`).join("")}
  </nav>
  <div id="tab-resumo" class="ptab-content${aba === "resumo" ? " active" : ""}">${renderTabResumo(pid)}</div>
  <div id="tab-anamnese" class="ptab-content${aba === "anamnese" ? " active" : ""}">${renderTabAnamnese(pid)}</div>
  <div id="tab-evolucoes" class="ptab-content${aba === "evolucoes" ? " active" : ""}">${renderTabEvolucoes(pid)}</div>
  <div id="tab-documentos" class="ptab-content${aba === "documentos" ? " active" : ""}">${renderTabDocumentos(pid)}</div>
  <div id="tab-termos" class="ptab-content${aba === "termos" ? " active" : ""}">${renderTabTermos(pid)}</div>
  ${can("registroDocumental.read") ? `<div id="tab-registro" class="ptab-content${aba === "registro" ? " active" : ""}">${renderTabRegistroDocumental(pid)}</div>` : ""}
  <div id="tab-agenda" class="ptab-content${aba === "agenda" ? " active" : ""}">${renderTabAgendaPaciente(pid)}</div>`;
}

export function switchTab(btn, tabId, pid) {
  document.querySelectorAll(".ptab").forEach((b) => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
  });
  document.querySelectorAll(".ptab-content").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  btn.setAttribute("aria-selected", "true");
  document.getElementById(tabId).classList.add("active");
  // Consulta ao registro documental fica auditada (SBIS NGS1.07.03)
  if (tabId === "tab-registro" && pid && typeof window.registrarConsulta === "function")
    window.registrarConsulta("consulta_registro_documental", pid);
}

function _abrirAba(aba) {
  return `switchTab(document.querySelector('.ptab[data-aba=${aba}]'),'tab-${aba}')`;
}

export function renderTabResumo(pid) {
  const p = PACIENTES.find((x) => x.id === pid),
    ams = ANAMNESES[pid],
    evs = (EVOLUCOES[pid] || []).slice(-3).reverse();
  const dados = [
    ["Nome civil", p.nome],
    p.nomeSocial ? ["Nome social", p.nomeSocial] : null,
    ["Nascimento", p.nascimento ? `${formatBR(p.nascimento)} (${calculateAge(p.nascimento)} anos)` : "—"],
    ["CPF", currentUser.papel === "tecnico" ? p.cpf : mascararCPF(p.cpf)],
    ["Telefone", p.telefone || "—"],
    ["E-mail", p.email || "—"],
    p.contatoEmergencia ? ["Contato de emergência", `${p.contatoEmergencia.nome} (${p.contatoEmergencia.vinculo}), ${p.contatoEmergencia.telefone}`] : null,
    p.responsavel ? ["Responsável legal", `${p.responsavel.nome} (${p.responsavel.vinculo}), ${p.responsavel.telefone || ""}`] : null,
    ["Guarda mínima até", `${formatBR(guardaAte(p))}`],
  ].filter(Boolean);
  const enc = p.encerramento;
  return `${
    enc
      ? `<section class="card encerramento-card"><div class="card-header"><h3 class="card-title">Atendimento encerrado</h3><span class="card-sub">${_fmtDataISO(enc.data)}</span></div>
      <div class="card-body"><dl class="data-list">
        <div><dt>Motivo</dt><dd>${e(MOTIVOS_ENCERRAMENTO[enc.motivo] || enc.motivo)}</dd></div>
        ${enc.destino ? `<div><dt>Encaminhado para</dt><dd>${e(enc.destino)}</dd></div>` : ""}
        <div><dt>Registrado por</dt><dd>${e(enc.registradoPor || "—")} em ${fmtDataHora(enc.registradoEm)}</dd></div>
      </dl>${enc.sintese ? `<p class="prose" style="margin-top:12px">${e(enc.sintese)}</p>` : ""}</div></section>`
      : ""
  }<div class="resumo-grid">
    <section class="card">
      <div class="card-header"><h3 class="card-title">Identificação</h3>${can("patient.update") ? `<button class="btn btn-ghost btn-sm" onclick="openModalEditarPaciente(${pid})">Editar</button>` : ""}</div>
      <div class="card-body" style="padding-top:8px;padding-bottom:8px"><dl class="data-list">${dados.map(([l, v]) => `<div><dt>${l}</dt><dd>${e(v)}</dd></div>`).join("")}</dl></div>
    </section>
    <section class="card">
      <div class="card-header"><h3 class="card-title">Demanda e objetivos</h3>${ams ? `<button class="btn btn-ghost btn-sm" onclick="${_abrirAba("anamnese")}">Ver avaliação</button>` : ""}</div>
      <div class="card-body">${
        ams
          ? `<p class="prose">${e(ams.queixa)}</p>${ams.hipoteses ? `<div class="resumo-hipotese"><span>Hipótese diagnóstica</span>${e(_hipotese(ams.hipoteses))}</div>` : ""}${ams.objetivos ? `<div class="resumo-hipotese"><span>Objetivos</span>${e(ams.objetivos)}</div>` : ""}`
          : `<p class="prose-empty">A avaliação de demanda ainda não foi registrada.</p>`
      }</div>
    </section>
  </div>
  <section class="card" style="margin-top:20px">
    <div class="card-header"><h3 class="card-title">Últimas evoluções</h3>${evs.length ? `<button class="btn btn-ghost btn-sm" onclick="${_abrirAba("evolucoes")}">Ver todas</button>` : ""}</div>
    ${
      evs.length
        ? `<div class="card-body" style="padding-top:4px;padding-bottom:4px"><div class="evolucao-list">${evs
            .map((ev) => {
              const f = _fmtEvData(ev.data);
              return `<article class="evolucao-card"><div class="evolucao-when">${f.dia}<small>${f.hora}</small></div><div><div class="evolucao-meta"><span class="tag tag-teal">${_tipoEv(ev.tipo)}</span><span class="evolucao-author">${e(ev.autor)}</span>${ev.validacao?.status === "pendente" ? badgeValidacao(ev) : ""}</div><p class="evolucao-content">${_resumoEvolucao(ev.conteudo)}</p></div></article>`;
            })
            .join("")}</div></div>`
        : `<div class="empty-state compact"><i class="bi bi-journal"></i><h3>Nenhuma evolução registrada</h3><p>As evoluções de cada sessão aparecem aqui em ordem cronológica.</p></div>`
    }
  </section>`;
}

export function renderTabAnamnese(pid) {
  const ams = ANAMNESES[pid],
    canEdit = can("anamnese.update");
  if (!ams)
    return `<div class="card"><div class="empty-state"><i class="bi bi-clipboard"></i><h3>Avaliação de demanda não registrada</h3><p>O CRP exige o registro da avaliação de demanda e dos objetivos do trabalho para todo caso em atendimento.</p>${canEdit ? `<button class="btn btn-primary" onclick="openModalAnamnese(${pid})">Registrar avaliação</button>` : ""}</div></div>`;
  const finalizada = ams.status === "finalizada";
  const pac = PACIENTES.find((x) => x.id === pid);
  const secoes = [
    ["Demanda (queixa principal)", ams.queixa, true],
    ["História do problema", ams.historia, true],
    ["Histórico médico e psicológico", ams.historico_medico],
    ["Medicamentos e substâncias", ams.medicamentos],
    ["Contexto familiar e social", ams.contexto, true],
    ["Hipótese diagnóstica", textoHipotese(ams.hipoteses), true],
    ["Objetivos do atendimento e plano terapêutico", ams.objetivos, true],
  ];
  const podeValidar = finalizada && ams.validacao?.status === "pendente" && can("record.validate", pac);
  return `<div class="section-bar">
    <div><h3>Avaliação de demanda e objetivos</h3><p>${finalizada ? "Finalizada. Não pode mais ser alterada." : "Rascunho. Finalize para cumprir a exigência do CRP."}</p></div>
    <div class="action-btns">${finalizada ? badgeValidacao(ams) || `<span class="badge badge-green">Finalizada</span>` : `<span class="badge badge-amber">Rascunho</span>`}
      ${podeValidar ? `<button class="btn btn-primary btn-sm" onclick="validarRegistro(${pid},'anamnese')"><i class="bi bi-patch-check"></i> Validar</button>` : ""}
      ${canEdit && ams.status === "rascunho" ? `<button class="btn btn-primary btn-sm" onclick="openModalAnamnese(${pid})"><i class="bi bi-pencil"></i> Continuar edição</button>` : ""}</div>
  </div>
  <div class="anamnese-grid">${secoes
    .map(
      ([tit, txt, largo]) =>
        `<section class="anamnese-section${largo ? " is-wide" : ""}"><h4 class="anamnese-section-title">${tit}</h4><div class="anamnese-text">${txt ? e(txt) : `<span class="muted">Não informado</span>`}</div></section>`,
    )
    .join("")}</div>
  ${finalizada ? `<p class="assinatura-linha">${htmlAssinaturas(ams)}</p>` : ""}`;
}

function _htmlEvolucao(pid, ev, pac) {
  const f = _fmtEvData(ev.data);
  const tags = (ev.tags || []).length ? `<div class="evolucao-tags">${ev.tags.map((t) => `<span class="badge badge-gray">${e(t)}</span>`).join("")}</div>` : "";
  const podeValidar = ev.validacao?.status === "pendente" && can("record.validate", pac);
  const podeRetificar = ev.autorId === currentUser.id && pac.status === "ativo";
  const versoes = (ev.versoes || []).length
    ? `<details class="ev-versoes"><summary>${ev.versoes.length === 1 ? "1 versão anterior" : `${ev.versoes.length} versões anteriores`} (retificada em ${fmtDataHora(ev.retificadaEm)})</summary>${ev.versoes
        .map(
          (v, i) =>
            `<div class="ev-versao"><div class="ev-versao-meta">Versão ${i + 1}, substituída em ${fmtDataHora(v.substituidaEm)}. Justificativa: ${e(v.justificativa)}</div><p class="evolucao-content">${formatarEvolucao(v.conteudo)}</p></div>`,
        )
        .join("")}</details>`
    : "";
  return `<article class="evolucao-card" id="ev-${ev.id}">
    <div class="evolucao-when">${f.dia}<small>${f.hora}</small></div>
    <div class="evolucao-body">
      <div class="evolucao-meta"><span class="tag tag-teal">${_tipoEv(ev.tipo)}</span><span class="evolucao-author"><i class="bi bi-person"></i>${e(ev.autor)}</span><span class="evolucao-num">#${ev.num ?? ""}</span>${badgeValidacao(ev)}${ev.versoes?.length ? `<span class="badge badge-gray">Retificada</span>` : ""}</div>
      <p class="evolucao-content">${formatarEvolucao(ev.conteudo)}</p>
      ${tags}
      <p class="assinatura-linha">${htmlAssinaturas(ev)}</p>
      ${versoes}
      ${podeValidar || podeRetificar ? `<div class="action-btns" style="margin-top:10px">${podeValidar ? `<button class="btn btn-primary btn-sm" onclick="validarRegistro(${pid},'evolucao','${ev.id}')"><i class="bi bi-patch-check"></i> Validar</button>` : ""}${podeRetificar ? `<button class="btn btn-ghost btn-sm" onclick="openModalRetificarEvolucao(${pid},'${ev.id}')"><i class="bi bi-pencil-square"></i> Retificar</button>` : ""}</div>` : ""}
    </div>
  </article>`;
}

export function renderTabEvolucoes(pid) {
  const pac = PACIENTES.find((x) => x.id === pid);
  const evs = (EVOLUCOES[pid] || []).slice().reverse(),
    canAdd = can("evolution.create") && pac.status === "ativo";
  const pend = evs.filter((x) => x.validacao?.status === "pendente").length;
  const bar = `<div class="section-bar"><div><h3>${evs.length} ${evs.length === 1 ? "evolução" : "evoluções"}${pend ? ` · ${pend} aguardando validação` : ""}</h3><p><i class="bi bi-lock"></i> Registros não podem ser apagados. Correções geram nova versão, com justificativa, e a versão anterior continua visível.</p></div>${canAdd ? `<button class="btn btn-primary" onclick="openModalEvolucao(${pid})"><i class="bi bi-plus-lg"></i> Nova evolução</button>` : ""}</div>`;
  if (!evs.length)
    return `${bar}<div class="card"><div class="empty-state"><i class="bi bi-journal"></i><h3>Nenhuma evolução registrada</h3><p>Registre a primeira sessão para iniciar o histórico do caso.</p></div></div>`;
  return `${bar}<div class="card"><div class="card-body"><div class="evolucao-list">${evs.map((ev) => _htmlEvolucao(pid, ev, pac)).join("")}</div></div></div>`;
}

// ── Documentos ───────────────────────────────────────────────
const CATEGORIA_DOC = {
  diagnostico_externo: "Diagnóstico externo",
  termo: "Termo",
  laudo: "Laudo",
  emitido: "Documento emitido",
  material_teste: "Material de teste (restrito)",
  outro: "Documento",
};

function _docCard(pid, d) {
  const externo = d.categoria === "diagnostico_externo";
  const emit = d.categoria === "emitido";
  let meta;
  if (externo && d.origem) meta = `${e(d.origem.profissional)} · ${e(d.origem.crp)}`;
  else if (emit) meta = `Para ${e(d.destinatario || "—")} · ${_fmtDataISO(d.dataEmissao)}`;
  else meta = [d.tamanho, d.data ? formatBR(d.data) : null].filter(Boolean).map(e).join(" · ");
  const status = emit
    ? [d.validacao?.status === "pendente" ? "Aguardando co-assinatura" : null, ["relatorio", "laudo"].includes(d.modalidade) && !d.devolutiva ? "Devolutiva pendente" : null, !d.entrega ? "Entrega pendente" : null].filter(Boolean)
    : [];
  return `<button type="button" class="doc-card${externo ? " is-external" : ""}${emit ? " is-emitted" : ""}" onclick="openModalDocumento(${pid}, '${e(String(d.id))}')">
    <div class="doc-icon doc-icon-pdf"><i class="bi ${externo ? "bi-file-earmark-medical" : emit ? "bi-file-earmark-check" : "bi-file-earmark-text"}"></i></div>
    <div style="min-width:0">
      <div class="doc-kind">${emit ? e(MODALIDADES_DOCUMENTO[d.modalidade]?.titulo || "Documento emitido") : CATEGORIA_DOC[d.categoria] || "Documento"}</div>
      <div class="doc-name">${e(d.titulo || d.nome)}</div>
      <div class="doc-meta">${meta}</div>
      ${status.length ? `<div class="doc-status">${status.map((s) => `<span>${s}</span>`).join("")}</div>` : ""}
    </div>
  </button>`;
}

export function renderTabDocumentos(pid) {
  const docs = (DOCUMENTOS[pid] || []).filter((d) => d.compartimento !== "restrito"),
    canUp = can("document.create");
  const pac = PACIENTES.find((x) => x.id === pid);
  const bar = `<div class="section-bar"><div><h3>${docs.length} ${docs.length === 1 ? "documento" : "documentos"}</h3><p>Cópias dos documentos emitidos (com data, finalidade e destinatário), documentos recebidos e termos.</p></div><div class="action-btns">${can("document.emit") && pac.status === "ativo" ? `<button class="btn btn-secondary" onclick="openModalEmitirDocumento(${pid})"><i class="bi bi-file-earmark-text"></i> Emitir documento</button>` : ""}${canUp ? `<button class="btn btn-primary" onclick="openModalUploadDocumento(${pid})"><i class="bi bi-upload"></i> Anexar arquivo</button>` : ""}</div></div>`;
  if (!docs.length)
    return `${bar}<div class="card"><div class="empty-state"><i class="bi bi-folder2"></i><h3>Nenhum documento</h3><p>Emita documentos psicológicos ou anexe o termo de consentimento e outros arquivos do caso.</p></div></div>`;
  const grupos = [
    ["Documentos emitidos pelo Serviço-Escola (Res. CFP 06/2019)", docs.filter((d) => d.categoria === "emitido")],
    ["Diagnósticos de outros profissionais", docs.filter((d) => d.categoria === "diagnostico_externo")],
    ["Termos e outros arquivos", docs.filter((d) => !["emitido", "diagnostico_externo"].includes(d.categoria))],
  ].filter(([, l]) => l.length);
  return `${bar}${grupos.map(([t, l]) => `<h4 class="doc-group-title">${t}</h4><div class="doc-grid" style="margin-bottom:24px">${l.map((d) => _docCard(pid, d)).join("")}</div>`).join("")}`;
}

// ── Termos e comunicações ────────────────────────────────────
export function renderTabTermos(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  const cons = p.consentimentos || [];
  const comps = (COMPARTILHAMENTOS[pid] || []).slice().reverse();
  const podeCons = can("consent.manage");
  const faltaResp = ehMenor(p) && !cons.some((c) => c.tipo === "autorizacao_responsavel" && !c.revogadoEm);
  const faltaTcle = !cons.some((c) => c.tipo === "tcle_atendimento" && !c.revogadoEm);
  return `${
    faltaTcle || faltaResp
      ? `<div class="callout callout-warn" style="margin-bottom:16px"><i class="bi bi-exclamation-triangle"></i><span>${faltaTcle ? "Falta o termo de consentimento do atendimento. " : ""}${faltaResp ? "Paciente menor de idade sem autorização do responsável legal registrada (Código de Ética, art. 8º)." : ""}</span></div>`
      : ""
  }
  <section class="card">
    <div class="card-header"><div><h3 class="card-title">Consentimentos e autorizações</h3><div class="card-sub">Usos opcionais podem ser revogados a qualquer momento (LGPD, art. 8º, §5º).</div></div>${podeCons ? `<button class="btn btn-secondary btn-sm" onclick="openModalConsentimento(${pid})"><i class="bi bi-plus-lg"></i> Registrar</button>` : ""}</div>
    ${
      cons.length
        ? `<div class="table-responsive"><table class="compact"><thead><tr><th>Termo</th><th>Data</th><th>Assinado por</th><th>Situação</th><th></th></tr></thead><tbody>${cons
            .map((c) => {
              const t = TIPOS_CONSENTIMENTO[c.tipo] || { rotulo: c.tipo };
              return `<tr class="${c.revogadoEm ? "row-muted" : ""}"><td><div class="cell-name">${e(t.rotulo)}</div><div class="cell-sub">${e(t.descricao || "")}</div></td><td class="cell-date">${_fmtDataISO(c.data)}</td><td>${e(c.assinadoPor || "—")}<div class="cell-sub">registrado por ${e(c.registradoPor || "—")}</div></td><td>${c.revogadoEm ? `<span class="badge badge-gray">Revogado em ${_fmtDataISO(c.revogadoEm)}</span><div class="cell-sub">${e(c.motivoRevogacao || "")}</div>` : `<span class="badge badge-green">Vigente</span>`}</td><td class="right">${podeCons && !c.revogadoEm && !t.obrigatorio ? `<button class="btn btn-ghost btn-sm" onclick="openModalRevogarConsentimento(${pid},'${e(c.id)}')">Revogar</button>` : ""}</td></tr>`;
            })
            .join("")}</tbody></table></div>`
        : `<div class="empty-state compact"><i class="bi bi-file-earmark-check"></i><h3>Nenhum termo registrado</h3><p>Registre o termo de consentimento assinado no início do atendimento.</p></div>`
    }
  </section>
  <section class="card">
    <div class="card-header"><div><h3 class="card-title">Comunicações e compartilhamentos</h3><div class="card-sub">Toda informação passada a terceiros fica registrada com data, destinatário, finalidade e fundamento.</div></div>${can("sharing.create") ? `<button class="btn btn-secondary btn-sm" onclick="openModalComunicacao(${pid})"><i class="bi bi-plus-lg"></i> Registrar</button>` : ""}</div>
    ${
      comps.length
        ? `<div class="table-responsive"><table class="compact"><thead><tr><th>Data</th><th>Tipo</th><th>Destinatário e finalidade</th><th>O que foi informado</th></tr></thead><tbody>${comps
            .map(
              (c) =>
                `<tr><td class="cell-date">${_fmtDataISO(c.data)}</td><td>${e(TIPOS_COMPARTILHAMENTO[c.tipo] || c.tipo)}${c.visivelAoTitular === false ? `<div class="cell-sub">Não exibido ao titular</div>` : ""}</td><td><div class="cell-name">${e(c.destinatario)}</div><div class="cell-sub">${e(c.finalidade)}</div>${c.fundamento ? `<div class="cell-sub">Fundamento: ${e(c.fundamento)}</div>` : ""}</td><td style="color:var(--text2)">${e(c.resumo || "—")}<div class="cell-sub">${e(c.autor || "")}, ${fmtDataHora(c.registradoEm)}</div></td></tr>`,
            )
            .join("")}</tbody></table></div>`
        : `<div class="empty-state compact"><i class="bi bi-send"></i><h3>Nenhuma comunicação registrada</h3><p>Encaminhamentos, respostas a ofícios e notificações compulsórias aparecem aqui.</p></div>`
    }
  </section>`;
}

// ── Registro documental (só equipe) ──────────────────────────
export function renderTabRegistroDocumental(pid) {
  const regs = (REGISTRO_DOCUMENTAL[pid] || []).slice().reverse();
  const restritos = (DOCUMENTOS[pid] || []).filter((d) => d.compartimento === "restrito");
  return `<div class="callout" style="margin-bottom:16px"><i class="bi bi-eye-slash"></i><span>Área compartilhada apenas entre supervisor, estagiários e responsável técnico. Não faz parte do prontuário acessado pelo paciente (Res. CFP 05/2025, arts. 14 e 17, §2º). Toda consulta a esta aba fica registrada.</span></div>
  <div class="section-bar"><div><h3>${regs.length} ${regs.length === 1 ? "registro" : "registros"}</h3><p>Supervisões, orientações e anotações que não são compartilhadas com o paciente.</p></div>${can("registroDocumental.create") ? `<button class="btn btn-primary" onclick="openModalRegistroDocumental(${pid})"><i class="bi bi-plus-lg"></i> Novo registro</button>` : ""}</div>
  ${
    regs.length
      ? `<div class="card"><div class="card-body"><div class="evolucao-list">${regs
          .map((r) => {
            const f = _fmtEvData(r.data || r.registradoEm?.slice(0, 16).replace("T", " "));
            return `<article class="evolucao-card"><div class="evolucao-when">${f.dia}<small>${f.hora}</small></div><div class="evolucao-body"><div class="evolucao-meta"><span class="tag tag-teal">${e(TIPOS_REGISTRO_DOCUMENTAL[r.tipo] || r.tipo)}</span><span class="evolucao-author"><i class="bi bi-person"></i>${e(r.autor)}</span></div><p class="evolucao-content">${formatarEvolucao(r.conteudo)}</p><p class="assinatura-linha">${htmlAssinaturas(r)}</p></div></article>`;
          })
          .join("")}</div></div></div>`
      : `<div class="card"><div class="empty-state compact"><i class="bi bi-journal-lock"></i><h3>Nenhum registro</h3><p>Registre as supervisões do caso aqui.</p></div></div>`
  }
  <h4 class="doc-group-title" style="margin-top:8px">Material de testes e instrumentos (pasta de acesso exclusivo)</h4>
  ${restritos.length ? `<div class="doc-grid">${restritos.map((d) => _docCard(pid, d)).join("")}</div>` : `<p class="prose-empty">Nenhum material de teste anexado. Use "Anexar arquivo" na aba Documentos com a categoria "Material de teste".</p>`}`;
}

// ── Agenda ───────────────────────────────────────────────────
export function renderTabAgendaPaciente(pid) {
  const ags = AGENDAMENTOS.filter((a) => a.pacienteId === pid).sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));
  const canManage = can("appointment.manage") && currentUser.papel !== "paciente";
  const hoje = today();
  const rows = ags
    .map((ag) => {
      const isPast = ag.data < hoje;
      const isCanceled = ag.status === "cancelado";
      const isFaltou = ag.status === "faltou";
      const faltaInfo = FALTAS.find((f) => f.agId === ag.id);
      const acoes =
        !isCanceled && !isFaltou && canManage
          ? `<div class="action-btns" style="justify-content:flex-end;flex-wrap:wrap">
           ${!isPast ? `<button class="btn btn-secondary btn-sm" onclick="openModalEditarAgendamento(${ag.id})">Editar</button>` : ""}
           <button class="btn btn-warn-soft btn-sm" onclick="registrarFalta(${ag.id})">Registrar falta</button>
           ${!isPast ? `<button class="btn btn-danger-soft btn-sm" onclick="confirmarCancelamentoAgendamento(${ag.id})">Cancelar</button>` : ""}
         </div>`
          : isFaltou
            ? faltaInfo && !faltaInfo.justificada && ["tecnico", "supervisor"].includes(currentUser.papel)
              ? `<div class="action-btns" style="justify-content:flex-end"><button class="btn btn-ok-soft btn-sm" onclick="justificarFalta('${faltaInfo?.id}')"><i class="bi bi-check2"></i> Justificar falta</button></div>`
              : `<span class="muted" style="font-size:13px">${faltaInfo?.justificada ? "Falta justificada" : "Falta registrada"}</span>`
            : `<span class="muted" style="font-size:13px">${isPast ? "Concluído" : "—"}</span>`;
      return `<tr class="${isCanceled ? "row-muted" : ""}${ag.data === hoje ? " row-today" : ""}">
      <td class="cell-date">${ag.data === hoje ? `<span class="today-mark">Hoje</span>` : `${weekdayAbbrev(ag.data)}, ${formatBR(ag.data)}`}</td>
      <td class="num">${e(ag.hora)}</td>
      <td>${e(ag.local)}</td>
      <td>${badgeAgendamento(ag.status)}</td>
      <td class="right">${acoes}</td>
    </tr>`;
    })
    .join("");
  const emptyState = `<tr><td colspan="5"><div class="empty-state compact"><i class="bi bi-calendar-x"></i><h3>Nenhum agendamento</h3><p>Os atendimentos deste caso aparecem aqui.</p></div></td></tr>`;
  return `<div class="card">
    <div class="card-header">
      <h3 class="card-title">Agendamentos</h3>
      ${can("appointment.create") && currentUser.papel !== "paciente" ? `<button class="btn btn-secondary btn-sm" onclick="openModalNovoAgendamento()"><i class="bi bi-plus-lg"></i> Agendar</button>` : ""}
    </div>
    <div class="table-responsive">
      <table>
        <thead><tr><th>Data</th><th>Hora</th><th>Local</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows || emptyState}</tbody>
      </table>
    </div>
  </div>`;
}

export { _nomeUsuario as nomeUsuario };
