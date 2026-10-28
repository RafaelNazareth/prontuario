// ============================================================
// pages/acesso.js
// ------------------------------------------------------------
// Gestão (técnico) e portal do paciente:
//   - Usuários e permissões: bloqueio, inativação (nunca exclusão,
//     SBIS NGS1.03.09), CRP/matrícula, último acesso.
//   - Solicitações dos titulares: prazo de resposta (LGPD art. 19).
//   - Auditoria: trilha gravada pelo servidor, com filtros, exportação
//     CSV e verificação de integridade (SBIS NGS1.07.07/08).
//   - Portal do paciente: acesso integral ao próprio prontuário (Res.
//     CFP 001/2009 art. 5º II), sem o registro documental.
//   - Impressão do prontuário completo, auditada.
// ============================================================

import { currentUser, navigate } from "../core/auth.js";
import {
  ACESSO_PACIENTE,
  ANAMNESES,
  COMPARTILHAMENTOS,
  DOCUMENTOS,
  EVOLUCOES,
  PACIENTES,
  SESSAO,
  USERS,
  escapeHTML,
  initData,
  logAudit,
} from "../core/store.js";
import { toast } from "../core/utils.js";
import { formatBR, calculateAge } from "../core/dateService.js";
import { servidor } from "../infrastructure/jsonDataSource.js";
import { openModal, closeModal } from "../modals/modals.js";
import { TIPOS_SOLICITACAO } from "../modals/registros.js";
import {
  MODALIDADES_DOCUMENTO,
  MOTIVOS_ENCERRAMENTO,
  TIPOS_COMPARTILHAMENTO,
  TIPOS_CONSENTIMENTO,
  TIPOS_EVOLUCAO,
  fmtDataHora,
  guardaAte,
  htmlAssinaturas,
  textoHipotese,
} from "../core/clinico.js";
import { formatarEvolucao } from "./pacientes.js";

const e = escapeHTML;
const hojeISO = () => new Date().toISOString().slice(0, 10);

/* ============================================================  USUÁRIOS E PERMISSÕES  */
const RLABELS = { tecnico: "Psicólogo técnico (responsável técnico)", supervisor: "Supervisor", estudante: "Estudante" };

function _statusUsuario(u) {
  if (u.ativo === false) return `<span class="badge badge-gray">Inativo</span>`;
  if (u.bloqueadoAte && new Date(u.bloqueadoAte) > new Date()) return `<span class="badge badge-red">Bloqueado até ${fmtDataHora(u.bloqueadoAte)}</span>`;
  if (u.trocaObrigatoria) return `<span class="badge badge-amber">Troca de senha pendente</span>`;
  return `<span class="badge badge-green">Ativo</span>`;
}

export function renderAcesso() {
  const RCOLORS = { tecnico: "#0f4c1e", supervisor: "#1a6b2e", estudante: "#2e8b46" };
  const ORDEM = { tecnico: 0, supervisor: 1, estudante: 2 };
  const equipe = USERS.filter((u) => u.papel !== "paciente").sort((a, b) => ORDEM[a.papel] - ORDEM[b.papel] || a.nome.localeCompare(b.nome));
  const contagem = (papel) => equipe.filter((u) => u.papel === papel && u.ativo !== false).length;

  const SIM = '<span class="perm-yes"><i class="bi bi-check-lg"></i>Sim</span>';
  const NAO = '<span class="perm-no">Não</span>';
  const matriz = [
    ["Ver lista de casos", '<span class="perm-yes"><i class="bi bi-check-lg"></i>Todos</span>', '<span class="perm-cond">Só os supervisionados</span>', '<span class="perm-cond">Só os alocados</span>'],
    ["Cadastrar paciente", SIM, NAO, NAO],
    ["Registrar evolução", SIM, SIM, '<span class="perm-cond">Sim, com validação do supervisor</span>'],
    ["Validar (co-assinar) registros de estagiários", SIM, '<span class="perm-cond">Dos seus casos</span>', NAO],
    ["Encerrar atendimento", SIM, '<span class="perm-cond">Dos seus casos</span>', NAO],
    ["Emitir documento psicológico", SIM, SIM, '<span class="perm-cond">Com co-assinatura do supervisor</span>'],
    ["Ver registro documental e material de testes", SIM, '<span class="perm-cond">Dos seus casos</span>', '<span class="perm-cond">Dos seus casos</span>'],
    ["Corrigir evolução", '<span class="perm-cond">Só o autor, por retificação</span>', '<span class="perm-cond">Só o autor, por retificação</span>', '<span class="perm-cond">Só o autor, por retificação</span>'],
    ["Apagar evolução ou documento", '<span class="perm-never">Nunca</span>', '<span class="perm-never">Nunca</span>', '<span class="perm-never">Nunca</span>'],
    ["Consultar trilha de auditoria", SIM, NAO, NAO],
  ];

  return `<div class="page-header">
    <div class="page-header-left"><h1>Usuários e permissões</h1><p>${contagem("tecnico")} ${contagem("tecnico") === 1 ? "técnico" : "técnicos"}, ${contagem("supervisor")} supervisores e ${contagem("estudante")} estudantes ativos. Usuários nunca são excluídos: ficam inativos e o histórico é preservado.</p></div>
    <button class="btn btn-primary" onclick="openModalNovoUsuario()"><i class="bi bi-plus-lg"></i> Novo usuário</button>
  </div>
  <section class="users-grid" aria-label="Equipe">${equipe
    .map(
      (u) =>
        `<div class="user-card${u.ativo === false ? " is-inactive" : ""}">
          <div class="user-card-header">
            <div class="user-card-avatar" style="background:${RCOLORS[u.papel] || "#6f7d72"}" aria-hidden="true">${e(u.avatar)}</div>
            <div style="min-width:0"><div class="user-card-name">${e(u.nome)}</div><div class="user-card-email">${e(u.login || "")} · ${e(u.crp || (u.matricula ? `Matrícula ${u.matricula}` : "sem registro"))}</div></div>
          </div>
          <div class="user-role hide-sm">${RLABELS[u.papel]}<div class="cell-sub">${u.ultimoAcesso ? `Último acesso ${fmtDataHora(u.ultimoAcesso)}` : "Nunca acessou"}</div></div>
          <div class="hide-sm">${_statusUsuario(u)}</div>
          <div class="action-btns">${u.bloqueadoAte && new Date(u.bloqueadoAte) > new Date() ? `<button class="btn btn-secondary btn-sm" onclick="desbloquearUsuario(${u.id})">Desbloquear</button>` : ""}${u.id !== currentUser.id ? `<button class="btn btn-ghost btn-sm" onclick="openModalAtivoUsuario(${u.id}, ${u.ativo === false})">${u.ativo === false ? "Reativar" : "Inativar"}</button>` : ""}</div>
        </div>`,
    )
    .join("")}</section>
  <h2 class="section-title">Matriz de permissões</h2>
  <section class="card">
    <div class="table-responsive"><table class="perm-table"><thead><tr><th>Ação</th><th>Técnico</th><th>Supervisor</th><th>Estudante</th></tr></thead><tbody>${matriz
      .map(([f, ...cols]) => `<tr><td class="cell-name">${f}</td>${cols.map((c) => `<td>${c}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></div>
    <div class="card-footer">As permissões são conferidas no servidor a cada leitura e gravação; a tela apenas reflete o que cada papel pode fazer.</div>
  </section>`;
}

export async function desbloquearUsuario(id) {
  try {
    await servidor.desbloquearUsuario(id);
    await initData();
    toast("Usuário desbloqueado.", "success");
    navigate("acesso");
  } catch (err) {
    toast(err.message, "error");
  }
}

export function openModalAtivoUsuario(id, reativar) {
  const u = USERS.find((x) => x.id === id);
  openModal(
    `${reativar ? "Reativar" : "Inativar"} ${e(u.nome)}`,
    `<p class="prose" style="margin-bottom:12px">${reativar ? "O usuário volta a acessar o sistema." : "O usuário perde o acesso imediatamente. Os registros que ele fez continuam no prontuário com a autoria preservada."}</p>
    <div class="form-group"><label class="form-label" for="ua-senha">Sua senha (confirmação) *</label><input type="password" id="ua-senha" class="form-control" autocomplete="off"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn ${reativar ? "btn-primary" : "btn-danger"}" onclick="salvarAtivoUsuario(${id}, ${reativar})">${reativar ? "Reativar" : "Inativar"}</button>`,
  );
}

export async function salvarAtivoUsuario(id, ativo) {
  try {
    await servidor.alterarAtivoUsuario(id, ativo, document.getElementById("ua-senha").value);
    closeModal();
    await initData();
    toast(ativo ? "Usuário reativado." : "Usuário inativado.", "success");
    navigate("acesso");
  } catch (err) {
    toast(err.message, "error");
  }
}

/* ============================================================  SOLICITAÇÕES DOS TITULARES  */
const STATUS_SOL = {
  pendente: ["badge-amber", "Pendente"],
  atendida: ["badge-green", "Atendida"],
  parcial: ["badge-green", "Atendida em parte"],
  negada: ["badge-gray", "Não atendida"],
  liberado: ["badge-green", "Atendida"],
};

function _prazoBadge(s) {
  if (s.status !== "pendente") return "";
  const dias = Math.round((new Date(s.prazo + "T12:00:00") - new Date(hojeISO() + "T12:00:00")) / 86400000);
  if (dias < 0) return `<span class="badge badge-red">Prazo vencido há ${-dias} ${-dias === 1 ? "dia" : "dias"}</span>`;
  return `<span class="badge ${dias <= 3 ? "badge-amber" : "badge-gray"}">${dias === 0 ? "Vence hoje" : `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`}</span>`;
}

export function renderAcessoPaciente() {
  const lista = ACESSO_PACIENTE.slice().sort((a, b) => (a.status === "pendente" ? 0 : 1) - (b.status === "pendente" ? 0 : 1) || String(b.solicitacao).localeCompare(String(a.solicitacao)));
  const pendentes = lista.filter((r) => r.status === "pendente").length;
  return `<div class="page-header"><div class="page-header-left"><h1>Solicitações dos titulares</h1><p>Pedidos de acesso, cópia, correção e informação feitos pelos pacientes ou responsáveis. Resposta completa em até ${SESSAO.institucional?.prazoRespostaTitularDias || 15} dias (LGPD, art. 19).</p></div>
  <button class="btn btn-primary" onclick="openModalSolicitacaoPeloTecnico()"><i class="bi bi-plus-lg"></i> Registrar pedido recebido</button></div>
  <section class="card">
    <div class="card-header"><h2 class="card-title">Solicitações</h2>${pendentes ? `<span class="count-pill is-warn">${pendentes} ${pendentes === 1 ? "pendente" : "pendentes"}</span>` : ""}</div>
    ${
      lista.length === 0
        ? `<div class="empty-state compact"><i class="bi bi-inbox"></i><h3>Nenhuma solicitação</h3><p>Pedidos feitos pelo portal do paciente aparecem aqui.</p></div>`
        : `<div class="table-responsive"><table class="compact"><thead><tr><th>Titular</th><th>Pedido</th><th>Solicitado em</th><th>Situação</th><th></th></tr></thead><tbody>${lista
            .map((s) => {
              const [cls, rot] = STATUS_SOL[s.status] || ["badge-gray", s.status];
              return `<tr><td><div class="cell-name">${e(s.nome)}</div><div class="cell-sub">${e(s.protocolo || s.id)}</div></td><td>${e(TIPOS_SOLICITACAO[s.tipo] || s.tipo)}<div class="cell-sub">${e(s.descricao || "")}</div></td><td class="cell-date">${formatBR(s.solicitacao)}</td><td><span class="badge ${cls}">${rot}</span> ${_prazoBadge(s)}${s.resposta ? `<div class="cell-sub">${e(s.resposta)}</div>` : ""}</td><td class="right"><div class="action-btns" style="justify-content:flex-end">${s.status === "pendente" ? `<button class="btn btn-primary btn-sm" onclick="openModalResponderSolicitacao('${e(String(s.id))}')">Responder</button>` : ""}<button class="btn btn-secondary btn-sm" onclick="gerarPdfProntuario(${s.pacienteId})"><i class="bi bi-printer"></i> Prontuário</button></div></td></tr>`;
            })
            .join("")}</tbody></table></div>`
    }
  </section>`;
}

export function openModalSolicitacaoPeloTecnico() {
  openModal(
    "Registrar pedido recebido",
    `<p class="prose" style="color:var(--text2);margin-bottom:12px">Use para pedidos recebidos por e-mail, telefone ou presencialmente.</p>
    <div class="form-group"><label class="form-label" for="sp-pac">Paciente *</label><select id="sp-pac" class="form-control">${PACIENTES.map((p) => `<option value="${p.id}">${e(p.nome)}</option>`).join("")}</select></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="openModalSolicitacaoTitular(parseInt(document.getElementById('sp-pac').value))">Continuar</button>`,
  );
}

// Compatibilidade com chamadas antigas
export function liberarAcessoPaciente(reqId) {
  window.openModalResponderSolicitacao?.(reqId);
}
export function novaSolicitacaoPaciente() {
  openModalSolicitacaoPeloTecnico();
}
export function filtrarPacientesSolicitacao() {}
export function selecionarPacienteSolicitacao() {}

/* ============================================================  IMPRESSÃO DO PRONTUÁRIO  */
// Prontuário completo (Res. CFP 001/2009 art. 2º I–V). O registro documental
// e o material de testes não entram (art. 2º VI; Res. CFP 05/2025 art. 17 §2º).
export function gerarPdfProntuario(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  if (!p) return;
  const inst = SESSAO.institucional || {};
  const ams = ANAMNESES[pid];
  const evs = (EVOLUCOES[pid] || []).filter((x) => currentUser.papel !== "paciente" || x.validacao?.status !== "pendente");
  const docs = (DOCUMENTOS[pid] || []).filter((d) => d.compartimento !== "restrito");
  const comps = COMPARTILHAMENTOS[pid] || [];
  const sup = USERS.find((u) => u.id === p.supervisorId);
  const est = (p.estudantesIds || []).map((id) => USERS.find((u) => u.id === id)?.nome).filter(Boolean);
  const linha = (l, v) => `<dt>${l}</dt><dd>${e(v || "—")}</dd>`;
  const html = `<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Prontuário - ${e(p.nome)}</title><style>
    @page { size: A4; margin: 20mm 18mm; @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 8pt Arial, sans-serif; color: #555; } }
    body{font-family:Georgia,"Times New Roman",serif;padding:24px;color:#16201a;line-height:1.55;max-width:720px;margin:0 auto;font-size:11pt}
    header{border-bottom:2px solid #0f4c1e;padding-bottom:10px;margin-bottom:20px} header small{font-family:Arial,sans-serif;color:#455248;font-size:9pt}
    h1{color:#0f4c1e;font-size:18pt;margin:4px 0 0} h2{font-family:Arial,sans-serif;font-size:11pt;color:#0f4c1e;margin:22px 0 8px;border-bottom:1px solid #d3d9d0;padding-bottom:3px}
    dl{display:grid;grid-template-columns:170px 1fr;gap:3px 12px;font-size:10.5pt;margin:0} dt{color:#6f7d72;font-family:Arial,sans-serif;font-size:9pt} dd{margin:0}
    .ev{padding:8px 0;border-bottom:1px solid #e3e7e1;page-break-inside:avoid} .meta{font-family:Arial,sans-serif;font-size:8.5pt;color:#6f7d72;margin:0 0 3px}
    .ev p{margin:0;white-space:pre-wrap} .sig{font-family:Arial,sans-serif;font-size:8pt;color:#455248;margin-top:3px}
    footer{margin-top:28px;font:8pt Arial,sans-serif;color:#666;border-top:1px solid #ccc;padding-top:6px}
  </style></head><body>
  <header><small>${e(inst.controlador || "")} · ${e(inst.servico || "")} · Responsável técnico: ${e(inst.responsavelTecnico ? `${inst.responsavelTecnico.nome} (${inst.responsavelTecnico.crp})` : "—")}</small><h1>Prontuário psicológico</h1></header>
  <h2>1. Identificação</h2><dl>${linha("Nome civil", p.nome)}${p.nomeSocial ? linha("Nome social", p.nomeSocial) : ""}${linha("Nascimento", p.nascimento ? `${formatBR(p.nascimento)} (${calculateAge(p.nascimento)} anos)` : "")}${linha("CPF", p.cpf)}${linha("Contato", [p.telefone, p.email].filter(Boolean).join(" · "))}${p.responsavel ? linha("Responsável legal", `${p.responsavel.nome} (${p.responsavel.vinculo})`) : ""}${linha("Caso", String(p.id))}${linha("Supervisão", sup ? `${sup.nome}${sup.crp ? ` (${sup.crp})` : ""}` : "")}${linha("Estagiários", est.join(", "))}${linha("Situação", p.status === "ativo" ? "Em atendimento" : "Encerrado")}</dl>
  <h2>2. Avaliação de demanda e objetivos</h2>${
    ams && (ams.status === "finalizada" || currentUser.papel !== "paciente")
      ? `<dl>${linha("Demanda", ams.queixa)}${linha("História", ams.historia)}${linha("Histórico de saúde", ams.historico_medico)}${linha("Medicamentos", ams.medicamentos)}${linha("Contexto", ams.contexto)}${linha("Hipótese diagnóstica", textoHipotese(ams.hipoteses))}${linha("Objetivos", ams.objetivos)}</dl><p class="sig">${htmlAssinaturas(ams)}</p>`
      : "<p>Não registrada.</p>"
  }
  <h2>3. Evolução dos atendimentos (${evs.length})</h2>${
    evs.length
      ? evs
          .map(
            (x) =>
              `<div class="ev"><p class="meta">#${x.num} · ${e(x.data)} · ${e(TIPOS_EVOLUCAO[x.tipo] || x.tipo)} · ${e(x.autor)}${x.validacao?.status === "pendente" ? " · aguardando validação" : ""}${x.versoes?.length ? ` · retificada (${x.versoes.length} versão anterior)` : ""}</p><p>${e(x.conteudo)}</p><p class="sig">${htmlAssinaturas(x)}</p></div>`,
          )
          .join("")
      : "<p>Nenhuma evolução registrada.</p>"
  }
  <h2>4. Encaminhamento ou encerramento</h2>${
    p.encerramento
      ? `<dl>${linha("Motivo", MOTIVOS_ENCERRAMENTO[p.encerramento.motivo])}${linha("Data", formatBR(p.encerramento.data))}${p.encerramento.destino ? linha("Encaminhado para", p.encerramento.destino) : ""}${linha("Síntese", p.encerramento.sintese)}${linha("Registrado por", `${p.encerramento.registradoPor || ""} em ${fmtDataHora(p.encerramento.registradoEm)}`)}</dl>`
      : "<p>Atendimento em curso.</p>"
  }
  <h2>5. Documentos emitidos e recebidos (${docs.length})</h2>${
    docs.length
      ? `<dl>${docs
          .map((d) =>
            d.categoria === "emitido"
              ? linha(formatBR(d.dataEmissao), `${MODALIDADES_DOCUMENTO[d.modalidade]?.titulo}. Finalidade: ${d.finalidade}. Destinatário: ${d.destinatario}.`)
              : linha(d.data ? formatBR(d.data) : "—", `${d.titulo || d.nome}${d.origem ? ` (emitido por ${d.origem.profissional}, ${d.origem.crp})` : ""}`),
          )
          .join("")}</dl>`
      : "<p>Nenhum documento.</p>"
  }
  <h2>6. Termos e comunicações</h2><dl>${(p.consentimentos || []).map((c) => linha(formatBR(c.data), `${TIPOS_CONSENTIMENTO[c.tipo]?.rotulo || c.tipo}${c.revogadoEm ? ` (revogado em ${formatBR(c.revogadoEm.slice(0, 10))})` : ""}`)).join("")}${comps
    .filter((c) => currentUser.papel !== "paciente" || c.visivelAoTitular !== false)
    .map((c) => linha(formatBR(c.data), `${TIPOS_COMPARTILHAMENTO[c.tipo] || c.tipo}: ${c.destinatario}. Finalidade: ${c.finalidade}.`))
    .join("")}</dl>
  <footer>${e(inst.software?.nome || "PEP")} ${e(inst.software?.versao || "")} · Impresso por ${e(currentUser.nome)} em ${new Date().toLocaleString("pt-BR")} · Guarda mínima até ${formatBR(guardaAte(p))} · Documento sigiloso (Código de Ética do Psicólogo, art. 9º).</footer>
  </body></html>`;
  const w = window.open("", "_blank", "width=820,height=1000");
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
  logAudit("impressao", "Imprimiu prontuário", null, { evento: "impressao", pacienteId: pid, complemento: "prontuário completo" });
}

/* ============================================================  AUDITORIA  */
let _filtrosAuditoria = {};

export function renderAuditoria() {
  setTimeout(() => carregarAuditoria(_filtrosAuditoria), 0);
  const usuarios = USERS.filter((u) => u.papel !== "paciente").sort((a, b) => a.nome.localeCompare(b.nome));
  return `<div class="page-header"><div class="page-header-left"><h1>Auditoria</h1><p>Toda consulta, impressão e alteração de prontuário fica registrada pelo servidor, com usuário, data, hora e IP. A trilha não pode ser alterada nem desligada.</p></div>
    <div class="page-header-actions"><button class="btn btn-secondary" onclick="exportarAuditoriaCsv()"><i class="bi bi-download"></i> Exportar CSV</button></div></div>
  <div id="aud-integridade"></div>
  <section class="card">
    <div class="card-header"><div class="filter-bar">
      <input type="date" id="af-de" class="filter-select" aria-label="De" value="${e(_filtrosAuditoria.de || "")}">
      <input type="date" id="af-ate" class="filter-select" aria-label="Até" value="${e(_filtrosAuditoria.ate || "")}">
      <select id="af-tipo" class="filter-select" aria-label="Evento"><option value="">Todos os eventos</option></select>
      <select id="af-user" class="filter-select" aria-label="Usuário"><option value="">Todos os usuários</option>${usuarios.map((u) => `<option value="${u.id}" ${String(_filtrosAuditoria.userId) === String(u.id) ? "selected" : ""}>${e(u.nome)}</option>`).join("")}</select>
      <select id="af-pac" class="filter-select" aria-label="Paciente"><option value="">Todos os pacientes</option>${PACIENTES.map((p) => `<option value="${p.id}" ${String(_filtrosAuditoria.pacienteId) === String(p.id) ? "selected" : ""}>${e(p.nome)}</option>`).join("")}</select>
      <button class="btn btn-secondary btn-sm" onclick="aplicarFiltrosAuditoria()">Filtrar</button>
      <span class="filter-count" id="aud-count"></span>
    </div></div>
    <div id="aud-lista"><div class="empty-state compact"><i class="bi bi-hourglass"></i><p>Carregando a trilha de auditoria…</p></div></div>
  </section>`;
}

function _lerFiltros() {
  const v = (id) => document.getElementById(id)?.value || "";
  return Object.fromEntries(
    Object.entries({ de: v("af-de"), ate: v("af-ate"), tipo: v("af-tipo"), userId: v("af-user"), pacienteId: v("af-pac") }).filter(([, x]) => x),
  );
}

export function aplicarFiltrosAuditoria() {
  _filtrosAuditoria = _lerFiltros();
  carregarAuditoria(_filtrosAuditoria);
}

export function exportarAuditoriaCsv() {
  servidor.baixarCsvAuditoria(_lerFiltros()).catch((err) => toast(err.message, "error"));
}

export async function carregarAuditoria(filtros = {}) {
  let r;
  try {
    r = await servidor.auditoria(filtros);
  } catch (err) {
    const lista = document.getElementById("aud-lista");
    if (lista) lista.innerHTML = `<div class="empty-state compact"><i class="bi bi-exclamation-circle"></i><h3>Não foi possível carregar</h3><p>${e(err.message)}</p></div>`;
    return;
  }
  const sel = document.getElementById("af-tipo");
  if (sel && sel.options.length <= 1)
    sel.innerHTML += Object.entries(r.eventos)
      .map(([k, v]) => `<option value="${k}" ${filtros.tipo === k ? "selected" : ""}>${e(v)}</option>`)
      .join("");
  const integ = document.getElementById("aud-integridade");
  if (integ)
    integ.innerHTML = r.verificacao.integra
      ? `<div class="callout" style="margin-bottom:16px"><i class="bi bi-shield-check" style="color:var(--sc-green)"></i><span><strong>Trilha íntegra.</strong> Os ${r.verificacao.total} registros foram conferidos pela cadeia de hashes: nenhum foi alterado ou removido.</span></div>`
      : `<div class="callout callout-warn" style="margin-bottom:16px"><i class="bi bi-shield-exclamation"></i><span><strong>Falha de integridade</strong> a partir do registro ${e(r.verificacao.falhaEm)}. A trilha pode ter sido adulterada fora do sistema.</span></div>`;
  const count = document.getElementById("aud-count");
  if (count) count.textContent = `${r.total} ${r.total === 1 ? "registro" : "registros"}${r.total > r.entradas.length ? ` (exibindo ${r.entradas.length})` : ""}`;
  const nomeU = (id) => USERS.find((u) => u.id === id)?.nome || (id == null ? "Sistema" : `Usuário ${id}`);
  const nomeP = (id) => (id == null ? "" : PACIENTES.find((p) => p.id === id)?.nome || `Paciente ${id}`);
  const lista = document.getElementById("aud-lista");
  if (!lista) return;
  lista.innerHTML = r.entradas.length
    ? `<div class="table-responsive"><table class="compact"><thead><tr><th>Data e hora</th><th>Evento</th><th>Usuário</th><th>Paciente</th><th>IP</th></tr></thead><tbody>${r.entradas
        .map(
          (a) =>
            `<tr><td class="cell-date">${fmtDataHora(a.ts)}</td><td><div class="cell-name">${e(r.eventos[a.tipo] || a.tipo)}</div>${a.complemento || a.registroId ? `<div class="cell-sub">${e([a.complemento, a.registroId ? `registro ${a.registroId}` : null].filter(Boolean).join(" · "))}</div>` : ""}</td><td>${e(nomeU(a.userId))}${a.papel ? `<div class="cell-sub">${e(a.papel)}</div>` : ""}</td><td>${e(nomeP(a.pacienteId))}</td><td class="num" style="color:var(--text3)">${e(a.ip || "—")}</td></tr>`,
        )
        .join("")}</tbody></table></div>`
    : `<div class="empty-state compact"><i class="bi bi-search"></i><h3>Nenhum registro</h3><p>Nenhum evento corresponde aos filtros.</p></div>`;
}

/* ============================================================  PORTAL DO PACIENTE  */
export function renderMeuProntuario() {
  const pid = currentUser.id;
  const p = PACIENTES.find((x) => x.id === pid);
  if (!p) return `<div class="portal"><div class="card"><div class="empty-state"><i class="bi bi-file-earmark-lock"></i><h3>Prontuário não encontrado</h3><p>Procure a recepção do Serviço-Escola.</p></div></div></div>`;
  const ams = ANAMNESES[pid];
  const evs = (EVOLUCOES[pid] || []).slice().reverse();
  const docs = DOCUMENTOS[pid] || [];
  const comps = COMPARTILHAMENTOS[pid] || [];
  const sols = ACESSO_PACIENTE.filter((s) => s.pacienteId === pid).slice().reverse();
  const inst = SESSAO.institucional || {};
  const sup = USERS.find((u) => u.id === p.supervisorId);
  // Leitura do próprio prontuário também fica auditada
  setTimeout(() => logAudit("consulta", "Consultou o próprio prontuário", null, { evento: "consulta_prontuario", pacienteId: pid, complemento: "portal do paciente" }), 0);
  return `<div class="portal">
    <header class="portal-head"><h1>${e(p.nomeSocial || p.nome)}</h1><p>Seu prontuário no ${e(inst.servico || "Serviço-Escola de Psicologia")} · Caso ${p.id}</p>
      <div class="action-btns" style="margin-top:14px"><button class="btn btn-secondary" onclick="gerarPdfProntuario(${pid})"><i class="bi bi-printer"></i> Imprimir ou salvar em PDF</button><button class="btn btn-primary" onclick="openModalSolicitacaoTitular(${pid})"><i class="bi bi-send"></i> Fazer uma solicitação</button></div></header>
    <div class="callout" style="margin-bottom:20px"><i class="bi bi-info-circle"></i><span>Você tem direito de acesso integral ao que está registrado no seu prontuário (Res. CFP 001/2009, art. 5º, II). Seu atendimento é feito por estagiários sob supervisão de ${e(sup ? `${sup.nome} (${sup.crp || "CRP"})` : "psicólogo supervisor")}. Responsável técnico: ${e(inst.responsavelTecnico ? `${inst.responsavelTecnico.nome}, ${inst.responsavelTecnico.crp}` : "—")}.</span></div>
    ${
      sols.length
        ? `<section class="card"><div class="card-header"><h2 class="card-title">Suas solicitações</h2></div><div class="table-responsive"><table class="compact"><thead><tr><th>Pedido</th><th>Data</th><th>Situação</th></tr></thead><tbody>${sols
            .map((s) => {
              const [cls, rot] = STATUS_SOL[s.status] || ["badge-gray", s.status];
              return `<tr><td>${e(TIPOS_SOLICITACAO[s.tipo] || s.tipo)}<div class="cell-sub">${e(s.descricao || "")}</div></td><td class="cell-date">${formatBR(s.solicitacao)}</td><td><span class="badge ${cls}">${rot}</span>${s.status === "pendente" ? `<div class="cell-sub">Resposta até ${formatBR(s.prazo)}</div>` : ""}${s.resposta ? `<div class="cell-sub">${e(s.resposta)}</div>` : ""}</td></tr>`;
            })
            .join("")}</tbody></table></div></section>`
        : ""
    }
    <section class="card"><div class="card-header"><h2 class="card-title">Avaliação de demanda e objetivos</h2></div><div class="card-body">${
      ams
        ? `<dl class="data-list"><div><dt>Demanda</dt><dd>${e(ams.queixa)}</dd></div><div><dt>Objetivos do atendimento</dt><dd>${e(ams.objetivos || "—")}</dd></div><div><dt>Hipótese diagnóstica</dt><dd>${e(textoHipotese(ams.hipoteses) || "—")}</dd></div></dl>`
        : `<p class="prose-empty">Ainda não há avaliação finalizada.</p>`
    }</div></section>
    ${p.encerramento ? `<section class="card"><div class="card-header"><h2 class="card-title">Encerramento</h2></div><div class="card-body"><dl class="data-list"><div><dt>Motivo</dt><dd>${e(MOTIVOS_ENCERRAMENTO[p.encerramento.motivo])}</dd></div>${p.encerramento.destino ? `<div><dt>Encaminhado para</dt><dd>${e(p.encerramento.destino)}</dd></div>` : ""}<div><dt>Data</dt><dd>${formatBR(p.encerramento.data)}</dd></div></dl></div></section>` : ""}
    <section class="card"><div class="card-header"><h2 class="card-title">Evoluções (${evs.length})</h2></div>${
      evs.length
        ? `<div class="card-body"><div class="evolucao-list">${evs.map((x) => `<article class="evolucao-card"><div class="evolucao-when">${formatBR(x.data.slice(0, 10))}<small>${e(x.data.slice(11, 16))}</small></div><div class="evolucao-body"><div class="evolucao-meta"><span class="tag tag-teal">${e(TIPOS_EVOLUCAO[x.tipo] || x.tipo)}</span><span class="evolucao-author">${e(x.autor)}</span></div><p class="evolucao-content">${formatarEvolucao(x.conteudo)}</p><p class="assinatura-linha">${htmlAssinaturas(x)}</p></div></article>`).join("")}</div></div>`
        : `<div class="empty-state compact"><p>Nenhuma evolução validada ainda.</p></div>`
    }</section>
    <section class="card"><div class="card-header"><h2 class="card-title">Documentos (${docs.length})</h2></div>${
      docs.length
        ? `<div class="table-responsive"><table class="compact"><tbody>${docs.map((d) => `<tr><td class="cell-name">${e(d.titulo || d.nome)}${d.origem ? `<div class="cell-sub">Emitido por ${e(d.origem.profissional)}, ${e(d.origem.crp)}</div>` : ""}${d.categoria === "emitido" ? `<div class="cell-sub">Finalidade: ${e(d.finalidade)} · Destinatário: ${e(d.destinatario)}</div>` : ""}</td><td class="cell-date">${formatBR(d.dataEmissao || d.data)}</td><td class="right">${d.categoria === "emitido" ? `<button class="btn btn-ghost btn-sm" onclick="imprimirDocumentoEmitido(${pid},'${e(String(d.id))}')">Imprimir</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`
        : `<div class="empty-state compact"><p>Nenhum documento.</p></div>`
    }</section>
    <section class="card"><div class="card-header"><h2 class="card-title">Termos e compartilhamentos</h2></div><div class="table-responsive"><table class="compact"><tbody>${(p.consentimentos || [])
      .map((c) => `<tr><td class="cell-name">${e(TIPOS_CONSENTIMENTO[c.tipo]?.rotulo || c.tipo)}</td><td class="cell-date">${formatBR(c.data)}</td><td>${c.revogadoEm ? `<span class="badge badge-gray">Revogado</span>` : `<span class="badge badge-green">Vigente</span>`}</td></tr>`)
      .join("")}${comps.map((c) => `<tr><td class="cell-name">${e(TIPOS_COMPARTILHAMENTO[c.tipo] || c.tipo)}<div class="cell-sub">Para ${e(c.destinatario)}: ${e(c.finalidade)}</div></td><td class="cell-date">${formatBR(c.data)}</td><td></td></tr>`).join("")}</tbody></table></div></section>
  </div>`;
}
