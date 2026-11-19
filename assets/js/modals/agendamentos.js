// ============================================================
// modals/agendamentos.js
// ------------------------------------------------------------
// Agenda do Serviço-Escola.
//
//   - Só o técnico responsável cria, altera e cancela atendimentos
//     (a regra vale também no servidor, em shared/politica.js).
//   - O paciente não agenda nem pede nada pelo sistema: ele procura o
//     Serviço-Escola presencialmente, por telefone ou e-mail. O técnico
//     pode registrar o pedido (para não esquecer) e depois agendar,
//     remarcar, cancelar ou recusar, explicando o motivo.
//   - A equipe do caso registra faltas (pages/notificacoes.js).
// ============================================================

import { navigate } from "../core/auth.js";
import { AGENDAMENTOS, PACIENTES, SOLICITACOES_AGENDAMENTO, USERS, escapeHTML, saveData } from "../core/store.js";
import { toast } from "../core/utils.js";
import { can } from "../core/permissions.js";
import { formatBR, today, weekdayAbbrev } from "../core/dateService.js";
import { generateId } from "../core/idService.js";
import { appointmentRepository } from "../repositories/appointmentRepository.js";
import { descarregar } from "../infrastructure/jsonDataSource.js";
import { openModal, closeModal, showError } from "./modals.js";

const e = escapeHTML;

export const TIPOS_PEDIDO = {
  agendar: "Novo agendamento",
  remarcar: "Remarcação",
  cancelar: "Cancelamento",
};

export const CANAIS_PEDIDO = { presencial: "Presencial", telefone: "Telefone", email: "E-mail" };

const _negado = () => toast("Somente o técnico responsável cria, altera ou cancela agendamentos.", "error");

function _opcoesEstudantes(pac, selecionado) {
  const ids = pac?.estudantesIds || [];
  if (!ids.length) return `<option value="">Sem estagiário alocado</option>`;
  return ids
    .map((id) => USERS.find((u) => u.id === id))
    .filter(Boolean)
    .map((u) => `<option value="${u.id}" ${u.id === selecionado ? "selected" : ""}>${e(u.nome)}</option>`)
    .join("");
}

function _descreverAgendamento(ag) {
  return ag ? `${weekdayAbbrev(ag.data)}, ${formatBR(ag.data)} às ${ag.hora}` : "";
}

/** Marca o pedido como atendido (na mesma gravação do agendamento). */
function _concluirPedido(pedidoId, resposta, agendamentoId) {
  const p = SOLICITACOES_AGENDAMENTO.find((x) => String(x.id) === String(pedidoId));
  if (!p || p.status !== "pendente") return;
  p.status = "atendida";
  p.resposta = resposta;
  p.agendamentoResultanteId = agendamentoId ?? null;
}

/* ── Novo agendamento (técnico) ───────────────────────────── */
/**
 * @param {{pacienteId?:number, pedidoId?:string}} [opts] vindo de um pedido do paciente
 */
export function openModalNovoAgendamento(opts = {}) {
  if (!can("appointment.create")) return _negado();
  const ativos = PACIENTES.filter((p) => p.status !== "inativo").sort((a, b) => a.nome.localeCompare(b.nome));
  const pidInicial = opts.pacienteId ?? ativos[0]?.id;
  const pedido = opts.pedidoId ? SOLICITACOES_AGENDAMENTO.find((x) => String(x.id) === String(opts.pedidoId)) : null;
  openModal(
    "Novo agendamento",
    `${pedido ? `<div class="callout" style="margin-bottom:16px"><i class="bi bi-chat-left-text"></i><span><strong>Pedido do paciente.</strong> ${e(pedido.preferencia || "Sem preferência de horário informada.")}${pedido.observacao ? ` · ${e(pedido.observacao)}` : ""}</span></div>` : ""}
    <div class="form-group"><label class="form-label" for="ag-pac">Paciente *</label><select id="ag-pac" class="form-control" onchange="atualizarEstudantesAgendamento()" ${pedido ? "disabled" : ""}>${ativos
      .map((p) => `<option value="${p.id}" ${p.id === pidInicial ? "selected" : ""}>${e(p.nome)}</option>`)
      .join("")}</select></div>
    <div class="form-group"><label class="form-label" for="ag-est">Estagiário responsável</label><select id="ag-est" class="form-control">${_opcoesEstudantes(PACIENTES.find((p) => p.id === pidInicial))}</select></div>
    <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="ag-data">Data *</label><input type="date" id="ag-data" class="form-control" min="${today()}"></div><div class="form-group"><label class="form-label" for="ag-hora">Hora *</label><input type="time" id="ag-hora" class="form-control" step="1800"></div></div>
    <div class="form-group"><label class="form-label" for="ag-local">Local</label><input type="text" id="ag-local" class="form-control" placeholder="Sala 02"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarAgendamento(${pedido ? `'${e(String(pedido.id))}'` : "null"})">Agendar</button>`,
  );
}

export function atualizarEstudantesAgendamento() {
  const pac = PACIENTES.find((p) => p.id === Number(document.getElementById("ag-pac")?.value));
  const sel = document.getElementById("ag-est");
  if (sel) sel.innerHTML = _opcoesEstudantes(pac);
}

export async function salvarAgendamento(pedidoId = null) {
  if (!can("appointment.create")) return _negado();
  const pacienteId = Number(document.getElementById("ag-pac").value);
  const data = document.getElementById("ag-data").value;
  const hora = document.getElementById("ag-hora").value;
  const estVal = document.getElementById("ag-est").value;
  const estudanteId = estVal ? Number(estVal) : null;
  if (!data) return showError("ag-data", "Selecione a data do agendamento.");
  if (!hora) return showError("ag-hora", "Selecione o horário do agendamento.");
  if (data < today()) return showError("ag-data", "A data do agendamento já passou.");
  const pac = PACIENTES.find((p) => p.id === pacienteId);
  if (appointmentRepository.hasConflict({ pacienteId, estudanteId, data, hora }))
    return toast("Já existe atendimento confirmado neste horário para este paciente ou estagiário.", "error");
  const ag = appointmentRepository.create({
    pacienteId,
    estudanteId,
    supervisorId: pac?.supervisorId || null,
    data,
    hora,
    local: document.getElementById("ag-local").value.trim() || "Consultório",
    modalidade: "presencial",
  });
  if (pedidoId) _concluirPedido(pedidoId, `Agendado para ${_descreverAgendamento(ag)}, ${ag.local}.`, ag.id);
  saveData();
  closeModal();
  await descarregar();
  toast(pedidoId ? "Agendamento criado e pedido respondido." : "Agendamento criado.", "success");
  navigate("agenda");
}

/* ── Editar (remarcar) agendamento (técnico) ──────────────── */
export function openModalEditarAgendamento(agId, pedidoId = null) {
  if (!can("appointment.update")) return _negado();
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return toast("Agendamento não encontrado.", "error");
  if (ag.status !== "confirmado") return toast("Só é possível alterar atendimentos confirmados.", "error");
  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
  const pedido = pedidoId ? SOLICITACOES_AGENDAMENTO.find((x) => String(x.id) === String(pedidoId)) : null;
  openModal(
    `Alterar agendamento de ${e(pac?.nome || "paciente")}`,
    `${pedido ? `<div class="callout" style="margin-bottom:16px"><i class="bi bi-chat-left-text"></i><span><strong>Pedido de remarcação.</strong> ${e(pedido.preferencia || "Sem preferência de horário informada.")}${pedido.observacao ? ` · ${e(pedido.observacao)}` : ""}</span></div>` : ""}
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label" for="eag-data">Data *</label><input type="date" id="eag-data" class="form-control" value="${e(ag.data)}"></div>
      <div class="form-group"><label class="form-label" for="eag-hora">Hora *</label><input type="time" id="eag-hora" class="form-control" value="${e(ag.hora)}" step="1800"></div>
    </div>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label" for="eag-local">Local</label><input type="text" id="eag-local" class="form-control" value="${e(ag.local)}" placeholder="Sala 02"></div>
      <div class="form-group"><label class="form-label" for="eag-est">Estagiário responsável</label><select id="eag-est" class="form-control">${_opcoesEstudantes(pac, ag.estudanteId)}</select></div>
    </div>
    <div class="callout"><i class="bi bi-info-circle"></i><span>A alteração fica registrada na auditoria. O agendamento continua confirmado.</span></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="salvarEdicaoAgendamento(${agId}, ${pedido ? `'${e(String(pedido.id))}'` : "null"})">Salvar alterações</button>`,
  );
}

export async function salvarEdicaoAgendamento(agId, pedidoId = null) {
  if (!can("appointment.update")) return _negado();
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return;
  const data = document.getElementById("eag-data").value;
  const hora = document.getElementById("eag-hora").value;
  const local = document.getElementById("eag-local").value.trim();
  const estVal = document.getElementById("eag-est").value;
  const estudanteId = estVal ? Number(estVal) : null;
  if (!data) return showError("eag-data", "Informe a nova data.");
  if (!hora) return showError("eag-hora", "Informe o novo horário.");
  if (appointmentRepository.hasConflict({ pacienteId: ag.pacienteId, estudanteId, data, hora, excludeId: agId }))
    return toast("Já existe atendimento confirmado neste horário para este paciente ou estagiário.", "error");
  appointmentRepository.update(agId, { data, hora, local: local || "Consultório", estudanteId });
  if (pedidoId) _concluirPedido(pedidoId, `Remarcado para ${_descreverAgendamento(ag)}, ${ag.local}.`, ag.id);
  saveData();
  closeModal();
  await descarregar();
  toast(pedidoId ? "Atendimento remarcado e pedido respondido." : "Agendamento atualizado.", "success");
  navigate("agenda");
}

/* ── Cancelar agendamento (técnico) ───────────────────────── */
export function confirmarCancelamentoAgendamento(agId, pedidoId = null) {
  if (!can("appointment.cancel")) return _negado();
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return;
  if (ag.status !== "confirmado") return toast("Só é possível cancelar atendimentos confirmados.", "warning");
  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
  document.getElementById("cancel-confirm")?.remove();
  const div = document.createElement("div");
  div.id = "cancel-confirm";
  div.className = "modal-overlay";
  div.style.zIndex = "3000";
  div.innerHTML = `
    <div class="modal confirm-dialog" role="alertdialog" aria-labelledby="cancel-title" onclick="event.stopPropagation()">
      <div class="confirm-icon is-danger"><i class="bi bi-calendar-x"></i></div>
      <h3 id="cancel-title">Cancelar este atendimento?</h3>
      <p><strong>${e(pac?.nome || "Paciente")}</strong>, ${formatBR(ag.data)} às ${e(ag.hora)}, ${e(ag.local)}.</p>
      <p class="confirm-note">O cancelamento fica registrado na auditoria e não pode ser desfeito.</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary" onclick="document.getElementById('cancel-confirm').remove()">Manter atendimento</button>
        <button class="btn btn-danger" onclick="executarCancelamentoAgendamento(${agId}, ${pedidoId ? `'${e(String(pedidoId))}'` : "null"})">Cancelar atendimento</button>
      </div>
    </div>`;
  document.body.appendChild(div);
  div.addEventListener("click", (ev) => {
    if (ev.target === div) div.remove();
  });
}

export async function executarCancelamentoAgendamento(agId, pedidoId = null) {
  document.getElementById("cancel-confirm")?.remove();
  if (!can("appointment.cancel")) return _negado();
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return;
  appointmentRepository.cancel(agId);
  if (pedidoId) _concluirPedido(pedidoId, `Atendimento de ${_descreverAgendamento(ag)} cancelado, como pedido.`, ag.id);
  saveData();
  await descarregar();
  toast(pedidoId ? "Atendimento cancelado e pedido respondido." : "Agendamento cancelado.", "warning");
  navigate("agenda");
}

/* ── Pedidos de agendamento: técnico responde ─────────────── */
export function atenderPedidoAgendamento(pedidoId) {
  const p = SOLICITACOES_AGENDAMENTO.find((x) => String(x.id) === String(pedidoId));
  if (!p || p.status !== "pendente") return toast("Este pedido já foi respondido.", "warning");
  if (p.tipo === "agendar") return openModalNovoAgendamento({ pacienteId: p.pacienteId, pedidoId: p.id });
  const ag = AGENDAMENTOS.find((a) => String(a.id) === String(p.agendamentoId));
  if (!ag || ag.status !== "confirmado")
    return toast("O atendimento deste pedido não está mais confirmado. Recuse o pedido explicando a situação.", "warning");
  if (p.tipo === "remarcar") return openModalEditarAgendamento(ag.id, p.id);
  return confirmarCancelamentoAgendamento(ag.id, p.id);
}

export function openModalRecusarPedido(pedidoId) {
  if (!can("appointment.respondRequest")) return _negado();
  const p = SOLICITACOES_AGENDAMENTO.find((x) => String(x.id) === String(pedidoId));
  if (!p) return;
  const pac = PACIENTES.find((x) => x.id === p.pacienteId);
  openModal(
    "Recusar pedido",
    `<p class="prose" style="margin-bottom:12px">${e(TIPOS_PEDIDO[p.tipo])} pedido por <strong>${e(pac?.nome || "paciente")}</strong>. Registre o motivo e avise o paciente pelo mesmo canal do pedido.</p>
    <div class="form-group"><label class="form-label" for="rp-resp">Motivo *</label><textarea id="rp-resp" class="form-control" rows="3" placeholder="Não há horário disponível na semana pedida. Entraremos em contato para combinar outra data."></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Voltar</button><button class="btn btn-danger" onclick="salvarRecusaPedido('${e(String(p.id))}')">Recusar pedido</button>`,
  );
}

export async function salvarRecusaPedido(pedidoId) {
  const resp = document.getElementById("rp-resp").value.trim();
  if (resp.length < 5) return showError("rp-resp", "Explique por que o pedido foi recusado.");
  const p = SOLICITACOES_AGENDAMENTO.find((x) => String(x.id) === String(pedidoId));
  if (!p) return;
  p.status = "recusada";
  p.resposta = resp;
  saveData();
  closeModal();
  await descarregar();
  toast("Pedido recusado. Avise o paciente pelo mesmo canal do pedido.", "success");
  navigate("agenda");
}

/** Cartão com os pedidos pendentes (página Agenda do técnico). */
export function htmlPedidosAgendamento() {
  if (!can("appointment.respondRequest")) return "";
  const pend = SOLICITACOES_AGENDAMENTO.filter((p) => p.status === "pendente").sort((a, b) => String(a.criadoEm).localeCompare(String(b.criadoEm)));
  const botao = `<button class="btn btn-secondary btn-sm" onclick="openModalRegistrarPedido()"><i class="bi bi-telephone"></i> Registrar pedido</button>`;
  if (!pend.length)
    return `<section class="card"><div class="card-header"><div><h2 class="card-title">Pedidos dos pacientes</h2><div class="card-sub">Pedidos recebidos presencialmente, por telefone ou e-mail. Nenhum aguardando.</div></div>${botao}</div></section>`;
  const linhas = pend
    .map((p) => {
      const pac = PACIENTES.find((x) => x.id === p.pacienteId);
      const ag = AGENDAMENTOS.find((a) => String(a.id) === String(p.agendamentoId));
      return `<tr><td><button class="dash-link-btn cell-name" onclick="openProntuario(${p.pacienteId})">${e(pac?.nome || `Paciente ${p.pacienteId}`)}</button><div class="cell-sub">${e(CANAIS_PEDIDO[p.canal] || "Registrado")} em ${formatBR(String(p.criadoEm).slice(0, 10))}</div></td>
        <td>${e(TIPOS_PEDIDO[p.tipo] || p.tipo)}${ag ? `<div class="cell-sub">${e(_descreverAgendamento(ag))}</div>` : ""}</td>
        <td>${e(p.preferencia || "—")}${p.observacao ? `<div class="cell-sub">${e(p.observacao)}</div>` : ""}</td>
        <td class="right"><div class="action-btns" style="justify-content:flex-end"><button class="btn btn-primary btn-sm" onclick="atenderPedidoAgendamento('${e(String(p.id))}')">${p.tipo === "cancelar" ? "Cancelar atendimento" : p.tipo === "remarcar" ? "Remarcar" : "Agendar"}</button><button class="btn btn-ghost btn-sm" onclick="openModalRecusarPedido('${e(String(p.id))}')">Recusar</button></div></td></tr>`;
    })
    .join("");
  return `<section class="card"><div class="card-header"><h2 class="card-title">Pedidos dos pacientes</h2><div style="display:flex;gap:8px;align-items:center"><span class="count-pill is-warn">${pend.length} aguardando</span>${botao}</div></div>
    <div class="table-responsive"><table class="compact"><thead><tr><th>Paciente</th><th>Pedido</th><th>Preferência</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div></section>`;
}

/* ── Pedido recebido fora do sistema (técnico registra) ───── */
export function openModalRegistrarPedido() {
  if (!can("appointment.respondRequest")) return _negado();
  const ativos = PACIENTES.filter((p) => p.status !== "inativo").sort((a, b) => a.nome.localeCompare(b.nome));
  openModal(
    "Registrar pedido do paciente",
    `<p class="prose" style="margin-bottom:12px">O paciente pede agendamento presencialmente, por telefone ou e-mail. Registre o pedido para atendê-lo depois na lista de pedidos.</p>
    <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="rp-pac">Paciente *</label><select id="rp-pac" class="form-control" onchange="atualizarAtendimentosPedido()">${ativos.map((p) => `<option value="${p.id}">${e(p.nome)}</option>`).join("")}</select></div>
    <div class="form-group"><label class="form-label" for="rp-canal">Recebido por *</label><select id="rp-canal" class="form-control">${Object.entries(CANAIS_PEDIDO).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div></div>
    <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="rp-tipo">Pedido *</label><select id="rp-tipo" class="form-control" onchange="atualizarAtendimentosPedido()">${Object.entries(TIPOS_PEDIDO).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
    <div class="form-group" id="rp-ag-grupo" style="display:none"><label class="form-label" for="rp-ag">Atendimento *</label><select id="rp-ag" class="form-control"></select></div></div>
    <div class="form-group"><label class="form-label" for="rp-pref">Dias e horários de preferência</label><input id="rp-pref" class="form-control" type="text" maxlength="300" placeholder="Terças ou quintas, à tarde"></div>
    <div class="form-group"><label class="form-label" for="rp-obs">Observação</label><textarea id="rp-obs" class="form-control" rows="2" maxlength="500"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarRegistroPedido()">Registrar</button>`,
  );
  atualizarAtendimentosPedido();
}

export function atualizarAtendimentosPedido() {
  const pid = Number(document.getElementById("rp-pac")?.value);
  const tipo = document.getElementById("rp-tipo")?.value;
  const grupo = document.getElementById("rp-ag-grupo");
  if (!grupo) return;
  grupo.style.display = tipo === "agendar" ? "none" : "block";
  const hoje = today();
  const ags = AGENDAMENTOS.filter((a) => a.pacienteId === pid && a.status === "confirmado" && a.data >= hoje).sort(
    (a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora),
  );
  document.getElementById("rp-ag").innerHTML = ags.length
    ? ags.map((a) => `<option value="${a.id}">${e(_descreverAgendamento(a))}</option>`).join("")
    : `<option value="">Nenhum atendimento confirmado</option>`;
}

export async function salvarRegistroPedido() {
  const pid = Number(document.getElementById("rp-pac").value);
  const tipo = document.getElementById("rp-tipo").value;
  const agId = tipo === "agendar" ? null : Number(document.getElementById("rp-ag").value) || null;
  if (tipo !== "agendar" && !agId) return showError("rp-ag", "Escolha o atendimento.");
  SOLICITACOES_AGENDAMENTO.push({
    id: `pag_${generateId()}`,
    pacienteId: pid,
    tipo,
    agendamentoId: agId,
    canal: document.getElementById("rp-canal").value,
    preferencia: document.getElementById("rp-pref").value.trim(),
    observacao: document.getElementById("rp-obs").value.trim(),
    status: "pendente",
  });
  saveData();
  closeModal();
  await descarregar();
  toast("Pedido registrado.", "success");
  navigate("agenda");
}

/** Seção "Seus atendimentos" do portal do paciente (só consulta). */
export function htmlAtendimentosPaciente(pid) {
  const hoje = today();
  const proximos = AGENDAMENTOS.filter((a) => a.pacienteId === pid && a.status === "confirmado" && a.data >= hoje).sort(
    (a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora),
  );
  return `<section class="card"><div class="card-header"><h2 class="card-title">Seus próximos atendimentos</h2></div>
    ${
      proximos.length
        ? `<div class="table-responsive"><table class="compact"><tbody>${proximos
            .map(
              (a) =>
                `<tr><td class="cell-date">${a.data === hoje ? `<span class="today-mark">Hoje</span>` : `${weekdayAbbrev(a.data)}, ${formatBR(a.data)}`}</td><td class="num">${e(a.hora)}</td><td>${e(a.local)}</td></tr>`,
            )
            .join("")}</tbody></table></div>`
        : `<div class="empty-state compact"><i class="bi bi-calendar"></i><p>Nenhum atendimento marcado.</p></div>`
    }
    <div class="card-footer">Para agendar, remarcar ou cancelar, procure o Serviço-Escola presencialmente, por telefone ou e-mail.</div></section>`;
}
