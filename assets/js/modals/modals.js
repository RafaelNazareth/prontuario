// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser, navigate } from "../core/auth.js";
import { openProntuario } from "../pages/dashboard.js";
import { AGENDAMENTOS, DOCUMENTOS, PACIENTES, USERS, escapeHTML, getPacientesPermitidos, initData as recarregarDadosDoServidor, logAudit, saveData } from "../core/store.js";
import { toast } from "../core/utils.js";
import { patientRepository } from "../repositories/patientRepository.js";
import { appointmentRepository } from "../repositories/appointmentRepository.js";
import { clinicalRepository } from "../repositories/clinicalRepository.js";
import { documentRepository } from "../repositories/documentRepository.js";
import { AnamnesisStatus } from "../core/enums.js";
import { can } from "../core/permissions.js";
import { formatBR, calculateAge } from "../core/dateService.js";
import { descarregar, servidor } from "../infrastructure/jsonDataSource.js";
import { htmlDocumentoEmitido } from "./registros.js";
import { TIPOS_CONSENTIMENTO } from "../core/clinico.js";

export function openModal(title, body, footer = "") {
  document.getElementById("modal-title").innerHTML = title;
  document.getElementById("modal-body").innerHTML = body;
  document.getElementById("modal-footer").innerHTML = footer;
  document.getElementById("modal-overlay").classList.remove("hidden");
}
export function closeModal(e) {
  if (!e || e.target === document.getElementById("modal-overlay"))
    document.getElementById("modal-overlay").classList.add("hidden");
}

/* ============================================================  VALIDADORES E MÁSCARAS  */
export function maskCPF(input) {
  let v = input.value.replace(/\D/g, "");
  if (v.length > 11) v = v.substring(0, 11);
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  input.value = v;
}
export function maskPhone(input) {
  let v = input.value.replace(/\D/g, "");
  if (v.length > 11) v = v.substring(0, 11);
  v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  v = v.replace(/(\d)(\d{4})$/, "$1-$2");
  input.value = v;
}

export function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0,
    resto;
  for (let i = 1; i <= 9; i++)
    soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++)
    soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

export function validarEmail(email) {
  if (!email) return true; // permite vazio
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function showError(inputId, msg) {
  const el = document.getElementById(inputId);
  if (el) {
    const originalBorder = el.style.borderColor;
    el.style.borderColor = "var(--red)";
    setTimeout(() => (el.style.borderColor = originalBorder), 3000);
  }
  toast(msg, "error");
}

/* ============================================================  EVOLUÇÕES  */
export function inserirTemplateEvolucao(tipo) {
  const textarea = document.getElementById("ev-content");
  let texto = "";
  if (tipo === "SOAP")
    texto =
      "S (Subjetivo): [Escrever queixa do paciente]\nO (Objetivo): [Escrever comportamento observado]\nA (Avaliação): [Análise do psicólogo]\nP (Plano): [Próximos passos]";
  else if (tipo === "ACOLHIMENTO")
    texto =
      "1. Motivo da consulta:\n2. Breve histórico:\n3. Estado mental observado:\n4. Encaminhamento/Conclusão:";
  if (textarea.value.trim() !== "") textarea.value += "\n\n" + texto;
  else textarea.value = texto;
}

export function openModalEvolucao(pid) {
  openModal(
    `Nova evolução`,
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label">Data/hora</label><input type="datetime-local" class="form-control" id="ev-data" value="${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}"></div><div class="form-group"><label class="form-label">Tipo</label><select class="form-control" id="ev-tipo"><option value="atendimento">Atendimento</option><option value="acolhimento">Acolhimento</option></select><div class="form-hint">Supervisões vão para o registro documental.</div></div></div>${currentUser.papel === "estudante" ? `<div class="callout" style="margin-bottom:16px"><i class="bi bi-info-circle"></i><span>Seu registro será enviado para validação do supervisor do caso (Res. CFP 001/2009, art. 3º).</span></div>` : ""}<div class="form-group"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:6px"><label class="form-label" for="ev-content" style="margin:0">Conteúdo da sessão</label><div class="action-btns"><button class="btn btn-ghost btn-sm" onclick="inserirTemplateEvolucao('SOAP')">Inserir modelo SOAP</button><button class="btn btn-ghost btn-sm" onclick="inserirTemplateEvolucao('ACOLHIMENTO')">Inserir modelo de acolhimento</button></div></div><textarea class="form-control" id="ev-content" rows="6"></textarea></div><div class="form-group"><label class="form-label">Tags</label><input type="text" class="form-control" id="ev-tags" placeholder="ansiedade, TCC"><div class="form-hint">Separe por vírgula.</div></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="confirmarSalvarEvolucao(${pid})">Salvar evolução</button>`,
  );
}

export function confirmarSalvarEvolucao(pid) {
  const evContent = document.getElementById("ev-content").value.trim();
  if (!evContent) return toast("Preencha o conteúdo da evolução.", "error");
  // Remove instância anterior para evitar duplo disparo
  const existing = document.getElementById("custom-confirm");
  if (existing) existing.remove();
  const confirmDiv = document.createElement("div");
  confirmDiv.id = "custom-confirm";
  confirmDiv.className = "modal-overlay";
  confirmDiv.style.zIndex = "3000";
  confirmDiv.innerHTML = `<div class="modal confirm-dialog" role="alertdialog" aria-labelledby="cc-title" onclick="event.stopPropagation()"><div class="confirm-icon is-warn"><i class="bi bi-lock"></i></div><h3 id="cc-title">Salvar evolução?</h3><p>Depois de salva, a evolução <strong>não pode ser apagada</strong>. Correções só por retificação, que guarda a versão anterior com justificativa. Revise o texto antes de confirmar.</p><div class="confirm-actions"><button class="btn btn-secondary" onclick="document.getElementById('custom-confirm').remove()">Revisar texto</button><button class="btn btn-primary" onclick="executarSalvarEvolucao(${pid})">Salvar evolução</button></div></div>`;
  document.body.appendChild(confirmDiv);
}

export async function executarSalvarEvolucao(pid) {
  const conf = document.getElementById("custom-confirm");
  if (conf) conf.remove();
  if (!can("patient.read", { id: pid })) {
    return toast("Acesso negado. Você não tem permissão para este paciente.", "error");
  }
  const content = document.getElementById("ev-content").value.trim();
  const pacNomeEv = PACIENTES.find((p) => p.id === pid)?.nome || "Desconhecido";
  clinicalRepository.addEvolution(
    pid,
    {
      data: document.getElementById("ev-data").value.replace("T", " "),
      autor: currentUser.nome,
      papel: currentUser.papel,
      tipo: document.getElementById("ev-tipo").value,
      conteudo: content,
      tags: document
        .getElementById("ev-tags")
        .value.split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    },
    pacNomeEv,
  );
  closeModal();
  await descarregar();
  toast(currentUser.papel === "estudante" ? "Evolução salva. Aguardando validação do supervisor." : "Evolução salva.", "success");
  openProntuario(pid, "evolucoes", { registrar: false });
}

/* ============================================================  DOCUMENTOS E ANAMNESE  */
// Visualizador de documento (metadados + resumo; o arquivo em si é simulado).
export function openModalDocumento(pid, docId) {
  const doc = (DOCUMENTOS[pid] || []).find((d) => String(d.id) === String(docId));
  if (!doc) return toast("Documento não encontrado.", "error");
  logAudit("consulta", "Consultou documento", null, { evento: "consulta_documento", pacienteId: pid, registroId: doc.id });
  if (doc.categoria === "emitido") {
    const v = htmlDocumentoEmitido(pid, doc);
    return openModal(escapeHTML(doc.titulo || doc.nome), v.corpo, v.rodape);
  }
  const pac = PACIENTES.find((p) => p.id === pid);
  const o = doc.origem;
  const linhas = [
    ["Paciente", pac?.nome],
    ["Arquivo", `${doc.nome}${doc.tamanho ? ` (${doc.tamanho})` : ""}`],
    o ? ["Emitido por", `${o.profissional}, ${o.crp}`] : null,
    o?.instituicao ? ["Instituição", o.instituicao] : null,
    o?.emitidoEm ? ["Data de emissão", formatBR(o.emitidoEm)] : null,
    ["Anexado em", `${doc.data ? formatBR(doc.data) : "—"} por ${doc.autor || "—"}`],
  ].filter(Boolean);
  openModal(
    escapeHTML(doc.titulo || doc.nome),
    `${o ? `<div class="callout" style="margin-bottom:16px"><i class="bi bi-info-circle"></i><span>Documento emitido por profissional externo ao Serviço-Escola. As conclusões são de responsabilidade de quem o assinou.</span></div>` : ""}
    <dl class="data-list">${linhas.map(([l, v]) => `<div><dt>${l}</dt><dd>${escapeHTML(v || "—")}</dd></div>`).join("")}</dl>
    ${doc.resumo ? `<h4 class="doc-group-title" style="margin-top:20px">Resumo e conclusão</h4><p class="prose">${escapeHTML(doc.resumo)}</p>` : ""}
    ${doc.compartimento === "restrito" ? `<div class="callout" style="margin-top:16px"><i class="bi bi-eye-slash"></i><span>Material de teste: pasta de acesso exclusivo do psicólogo, fora do prontuário acessado pelo paciente (Res. CFP 001/2009, art. 2º, VI).</span></div>` : ""}`,
    `<button class="btn btn-secondary" onclick="closeModal()">Fechar</button><button class="btn btn-primary" onclick="baixarDocumento(${pid},'${escapeHTML(String(doc.id))}')"><i class="bi bi-download"></i> Baixar arquivo</button>`,
  );
}

// Download simulado (não há arquivo real), mas a exportação fica auditada.
export function baixarDocumento(pid, docId) {
  const doc = (DOCUMENTOS[pid] || []).find((d) => String(d.id) === String(docId));
  logAudit("exportacao", "Baixou documento", null, { evento: "exportacao", pacienteId: pid, registroId: docId, complemento: "download de documento" });
  toast(`Download simulado: ${doc?.nome || "documento"}`, "info");
}

export function alternarOrigemDocumento(categoria) {
  const el = document.getElementById("up-origem");
  if (el) el.style.display = categoria === "diagnostico_externo" ? "block" : "none";
}

export function openModalUploadDocumento(pid) {
  openModal(
    `Enviar documento`,
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="up-cat">Categoria</label><select id="up-cat" class="form-control" onchange="alternarOrigemDocumento(this.value)"><option value="outro">Documento do caso</option><option value="termo">Termo</option><option value="diagnostico_externo">Diagnóstico de outro profissional</option><option value="material_teste">Material de teste (acesso exclusivo do psicólogo)</option></select></div><div class="form-group"><label class="form-label" for="up-tipo">Formato</label><select id="up-tipo" class="form-control"><option value="pdf">PDF</option><option value="img">Imagem</option><option value="docx">Word</option></select></div></div><div class="form-group"><label class="form-label" for="up-nome">Nome do arquivo</label><input type="text" id="up-nome" class="form-control" placeholder="Laudo_psicologico.pdf"></div><div id="up-origem" style="display:none"><div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="up-prof">Profissional</label><input type="text" id="up-prof" class="form-control" placeholder="Dra. Nome Sobrenome"></div><div class="form-group"><label class="form-label" for="up-crp">CRP</label><input type="text" id="up-crp" class="form-control" placeholder="CRP 06/000000"></div></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="up-inst">Instituição</label><input type="text" id="up-inst" class="form-control"></div><div class="form-group"><label class="form-label" for="up-emissao">Data de emissão</label><input type="date" id="up-emissao" class="form-control"></div></div><div class="form-group"><label class="form-label" for="up-resumo">Resumo e conclusão</label><textarea id="up-resumo" class="form-control" rows="3" placeholder="Hipótese ou conclusão diagnóstica e recomendações do documento"></textarea></div></div><div class="form-group"><label class="form-label">Arquivo</label><input type="file" class="form-control"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarUploadDocumento(${pid})">Enviar documento</button>`,
  );
}
export function salvarUploadDocumento(pid) {
  const val = (id) => document.getElementById(id)?.value.trim() || "";
  const nome = val("up-nome") || "Documento.pdf";
  const tipo = val("up-tipo");
  const categoria = val("up-cat") || "outro";
  const extra = { categoria, compartimento: categoria === "material_teste" ? "restrito" : "prontuario" };
  if (categoria === "diagnostico_externo") {
    if (!val("up-prof") || !val("up-crp"))
      return toast("Informe o profissional e o CRP de quem emitiu o diagnóstico.", "error");
    extra.titulo = "Diagnóstico de outro profissional";
    extra.origem = { profissional: val("up-prof"), crp: val("up-crp"), instituicao: val("up-inst"), emitidoEm: val("up-emissao") };
    extra.resumo = val("up-resumo");
  }
  documentRepository.create(pid, { nome, tipo, ...extra }, currentUser.nome);
  closeModal();
  descarregar().then(() => {
    toast("Documento anexado.", "success");
    openProntuario(pid, extra.compartimento === "restrito" ? "registro" : "documentos", { registrar: false });
  });
}

export function openModalAnamnese(pid) {
  const ams = clinicalRepository.getAnamnesis(pid) || {};
  openModal(
    `Avaliação de demanda e objetivos`,
    `<div class="form-group"><label class="form-label">Queixa principal *</label><textarea class="form-control" id="am-queixa" rows="2">${escapeHTML(ams.queixa || "")}</textarea></div><div class="form-group"><label class="form-label">História do problema</label><textarea class="form-control" id="am-historia" rows="3">${escapeHTML(ams.historia || "")}</textarea></div><div class="form-group"><label class="form-label">Histórico médico/psicológico</label><textarea class="form-control" id="am-medico" rows="2">${escapeHTML(ams.historico_medico || "")}</textarea></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Medicamentos/substâncias</label><textarea class="form-control" id="am-med" rows="2">${escapeHTML(ams.medicamentos || "")}</textarea></div><div class="form-group"><label class="form-label">Contexto familiar/social</label><textarea class="form-control" id="am-ctx" rows="2">${escapeHTML(ams.contexto || "")}</textarea></div></div><div class="form-group"><label class="form-label">Hipótese diagnóstica</label><textarea class="form-control" id="am-hipo" rows="2">${escapeHTML(ams.hipoteses || "")}</textarea></div><div class="form-group"><label class="form-label">Objetivos do atendimento e plano terapêutico *</label><textarea class="form-control" id="am-obj" rows="3">${escapeHTML(ams.objetivos || "")}</textarea><div class="form-hint">Obrigatório no prontuário (Res. CFP 001/2009, art. 2º, II).</div></div>`,
    `<button class="btn btn-secondary" onclick="salvarAnamnese(${pid},'rascunho')">Salvar rascunho</button><button class="btn btn-primary" onclick="salvarAnamnese(${pid}, 'finalizada')">Finalizar avaliação</button>`,
  );
}
export async function salvarAnamnese(pid, status) {
  if (!can("patient.read", { id: pid })) {
    return toast("Acesso negado. Você não tem permissão para este paciente.", "error");
  }
  const queixa = document.getElementById("am-queixa").value.trim();
  if (!queixa) return toast("A queixa principal é obrigatória.", "error");
  if (status === AnamnesisStatus.FINALIZADA && !document.getElementById("am-obj").value.trim())
    return toast("Defina os objetivos do atendimento antes de finalizar.", "error");
  const pacNome = PACIENTES.find((p) => p.id === pid)?.nome || "";
  const result = clinicalRepository.saveAnamnesis(
    pid,
    {
      queixa: document.getElementById("am-queixa").value,
      historia: document.getElementById("am-historia").value,
      historico_medico: document.getElementById("am-medico").value,
      medicamentos: document.getElementById("am-med").value,
      contexto: document.getElementById("am-ctx").value,
      hipoteses: document.getElementById("am-hipo").value,
      objetivos: document.getElementById("am-obj").value,
      status,
    },
    currentUser.nome,
    pacNome,
  );
  if (!result.ok) return toast(result.error, "error");
  closeModal();
  await descarregar();
  toast(status === AnamnesisStatus.FINALIZADA ? "Avaliação finalizada." : "Rascunho salvo.", "success");
  openProntuario(pid, "anamnese", { registrar: false });
}

/* ============================================================  PACIENTE: CADASTRO E EDIÇÃO COM VALIDAÇÃO  */
export function alternarResponsavel() {
  const nasc = document.getElementById("np-nasc")?.value;
  const menor = nasc ? calculateAge(nasc) < 18 : false;
  const el = document.getElementById("np-resp-grupo");
  if (el) el.style.display = menor ? "block" : "none";
}

function _camposIdentificacao(prefixo, p = {}) {
  const v = (x) => escapeHTML(x || "");
  return `<div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="${prefixo}-social">Nome social</label><input class="form-control" id="${prefixo}-social" type="text" value="${v(p.nomeSocial)}"><div class="form-hint">Como a pessoa quer ser chamada, se diferente do nome civil.</div></div>
  <div class="form-group"><label class="form-label" for="${prefixo}-emerg-nome">Contato de emergência</label><input class="form-control" id="${prefixo}-emerg-nome" type="text" placeholder="Nome" value="${v(p.contatoEmergencia?.nome)}"></div></div>
  <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="${prefixo}-emerg-vinc">Vínculo do contato</label><input class="form-control" id="${prefixo}-emerg-vinc" type="text" placeholder="Ex.: irmã" value="${v(p.contatoEmergencia?.vinculo)}"></div>
  <div class="form-group"><label class="form-label" for="${prefixo}-emerg-tel">Telefone do contato</label><input class="form-control" id="${prefixo}-emerg-tel" type="tel" oninput="maskPhone(this)" value="${v(p.contatoEmergencia?.telefone)}"></div></div>
  <div id="${prefixo}-resp-grupo" style="display:${p.responsavel ? "block" : "none"}"><h4 class="doc-group-title">Responsável legal (menor de 18 anos)</h4>
  <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="${prefixo}-resp-nome">Nome do responsável *</label><input class="form-control" id="${prefixo}-resp-nome" type="text" value="${v(p.responsavel?.nome)}"></div>
  <div class="form-group"><label class="form-label" for="${prefixo}-resp-vinc">Vínculo *</label><input class="form-control" id="${prefixo}-resp-vinc" type="text" placeholder="Ex.: mãe" value="${v(p.responsavel?.vinculo)}"></div></div>
  <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="${prefixo}-resp-cpf">CPF do responsável *</label><input class="form-control" id="${prefixo}-resp-cpf" type="text" oninput="maskCPF(this)" value="${v(p.responsavel?.cpf)}"></div>
  <div class="form-group"><label class="form-label" for="${prefixo}-resp-tel">Telefone do responsável</label><input class="form-control" id="${prefixo}-resp-tel" type="tel" oninput="maskPhone(this)" value="${v(p.responsavel?.telefone)}"></div></div></div>`;
}

function _lerIdentificacao(prefixo) {
  const g = (id) => document.getElementById(`${prefixo}-${id}`)?.value.trim() || "";
  const emerg = g("emerg-nome") ? { nome: g("emerg-nome"), vinculo: g("emerg-vinc"), telefone: g("emerg-tel") } : null;
  const resp = g("resp-nome") ? { nome: g("resp-nome"), vinculo: g("resp-vinc"), cpf: g("resp-cpf"), telefone: g("resp-tel") } : null;
  return { nomeSocial: g("social") || null, contatoEmergencia: emerg, responsavel: resp };
}

export function openModalNovoPaciente() {
  const estudantesOptions = USERS.filter((u) => u.papel === "estudante" && u.ativo !== false)
    .map((u) => `<option value="${u.id}">${escapeHTML(u.nome)}</option>`)
    .join("");
  const opt = (k) => `<label class="login-check"><input type="checkbox" id="np-c-${k}"><span>${TIPOS_CONSENTIMENTO[k].rotulo}. <span class="muted">${TIPOS_CONSENTIMENTO[k].descricao}</span></span></label>`;
  openModal(
    "Novo paciente",
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label">Nome civil completo *</label><input class="form-control" id="np-nome" type="text"></div><div class="form-group"><label class="form-label">CPF *</label><input class="form-control" id="np-cpf" type="text" placeholder="000.000.000-00" autocomplete="off" oninput="maskCPF(this)"></div></div>
    <div class="form-row form-row-2"><div class="form-group"><label class="form-label">Data de nascimento *</label><input class="form-control" id="np-nasc" type="date" onchange="alternarResponsavel()"></div><div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="np-tel" type="tel" placeholder="(00) 00000-0000" oninput="maskPhone(this)"></div></div>
    <div class="form-group"><label class="form-label">E-mail</label><input class="form-control" id="np-email" type="email"></div>
    ${_camposIdentificacao("np")}
    <div class="form-group"><label class="form-label">Supervisor *</label><select class="form-control" id="np-sup">${USERS.filter((u) => u.papel === "supervisor" && u.ativo !== false)
      .map((u) => `<option value="${u.id}">${escapeHTML(u.nome)}</option>`)
      .join("")}</select></div><div class="form-row form-row-3"><div class="form-group"><label class="form-label">Estudante 1</label><select class="form-control" id="np-est1"><option value="">Nenhum</option>${estudantesOptions}</select></div><div class="form-group"><label class="form-label">Estudante 2</label><select class="form-control" id="np-est2"><option value="">Nenhum</option>${estudantesOptions}</select></div><div class="form-group"><label class="form-label">Estudante 3</label><select class="form-control" id="np-est3"><option value="">Nenhum</option>${estudantesOptions}</select></div></div>
    <h4 class="doc-group-title">Termos assinados no acolhimento</h4>
    <div class="consent-list">
      <label class="login-check"><input type="checkbox" id="np-c-tcle"><span><strong>Termo de consentimento do atendimento *</strong>. <span class="muted">${TIPOS_CONSENTIMENTO.tcle_atendimento.descricao}</span></span></label>
      <label class="login-check" id="np-c-resp-linha" style="display:none"><input type="checkbox" id="np-c-resp"><span><strong>Autorização escrita do responsável legal *</strong>. <span class="muted">${TIPOS_CONSENTIMENTO.autorizacao_responsavel.descricao}</span></span></label>
      ${opt("pesquisa")}${opt("gravacao")}${opt("ensino_identificavel")}
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarNovoPaciente()">Cadastrar</button>`,
  );
  // Linha de autorização do responsável acompanha a idade
  const nasc = document.getElementById("np-nasc");
  nasc.addEventListener("change", () => {
    const menor = nasc.value ? calculateAge(nasc.value) < 18 : false;
    document.getElementById("np-c-resp-linha").style.display = menor ? "flex" : "none";
  });
}

export async function salvarNovoPaciente() {
  const nome = document.getElementById("np-nome").value.trim();
  const cpf = document.getElementById("np-cpf").value.trim();
  const email = document.getElementById("np-email").value.trim();
  const nasc = document.getElementById("np-nasc").value;

  if (!nome) return showError("np-nome", "Informe o nome civil completo.");
  if (!cpf) return showError("np-cpf", "CPF é obrigatório.");
  if (!validarCPF(cpf)) return showError("np-cpf", "O CPF informado não é válido.");
  if (PACIENTES.some((p) => p.cpf.replace(/\D/g, "") === cpf.replace(/\D/g, "")))
    return showError("np-cpf", "Já existe um paciente com este CPF.");
  if (!nasc) return showError("np-nasc", "Informe a data de nascimento.");
  if (email && !validarEmail(email)) return showError("np-email", "O e-mail informado tem formato inválido.");
  const ident = _lerIdentificacao("np");
  const menor = calculateAge(nasc) < 18;
  if (menor && (!ident.responsavel || !ident.responsavel.vinculo || !validarCPF(ident.responsavel.cpf || "")))
    return toast("Paciente menor de idade: informe nome, vínculo e CPF válido do responsável legal.", "error");
  if (!document.getElementById("np-c-tcle").checked)
    return toast("O atendimento só começa com o termo de consentimento assinado.", "error");
  if (menor && !document.getElementById("np-c-resp").checked)
    return toast("Menor de idade: é obrigatória a autorização escrita do responsável (Código de Ética, art. 8º).", "error");

  const hoje = new Date().toISOString().slice(0, 10);
  const assinadoPor = menor ? `${ident.responsavel.nome} (${ident.responsavel.vinculo})` : "Paciente";
  const consentimentos = [["tcle", "tcle_atendimento"], ["resp", "autorizacao_responsavel"], ["pesquisa", "pesquisa"], ["gravacao", "gravacao"], ["ensino_identificavel", "ensino_identificavel"]]
    .filter(([k]) => document.getElementById(`np-c-${k}`)?.checked && (k !== "resp" || menor))
    .map(([, tipo], i) => ({ id: `cons_${Date.now().toString(36)}_${i}`, tipo, versao: "2026-1", data: hoje, aceito: true, assinadoPor }));

  const e1 = parseInt(document.getElementById("np-est1").value);
  const e2 = parseInt(document.getElementById("np-est2").value);
  const e3 = parseInt(document.getElementById("np-est3").value);
  const estudantesIds = [e1, e2, e3].filter((id) => !isNaN(id));

  patientRepository.create({
    nome,
    cpf,
    nascimento: nasc,
    telefone: document.getElementById("np-tel").value || "",
    email: email || "",
    ...ident,
    responsavel: menor ? ident.responsavel : null,
    estudantesIds,
    supervisorId: parseInt(document.getElementById("np-sup").value),
    status: "ativo",
    cor: "#1b5e20",
    ini: nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
    consentimentos,
    encerramento: null,
  });
  closeModal();
  await descarregar();
  toast(`Paciente ${nome} cadastrado.`, "success");
  navigate("pacientes");
}

export function openModalEditarPaciente(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  const estudantesOptions = USERS.filter((u) => u.papel === "estudante")
    .map((u) => `<option value="${u.id}">${escapeHTML(u.nome)}</option>`)
    .join("");
  const est1 = p.estudantesIds && p.estudantesIds[0] ? p.estudantesIds[0] : "";
  const est2 = p.estudantesIds && p.estudantesIds[1] ? p.estudantesIds[1] : "";
  const est3 = p.estudantesIds && p.estudantesIds[2] ? p.estudantesIds[2] : "";
  openModal(
    `Editar cadastro de ${escapeHTML(p.nome)}`,
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label">Nome completo</label><input class="form-control" id="ep-nome" type="text" value="${escapeHTML(p.nome)}"></div><div class="form-group"><label class="form-label">CPF</label><input class="form-control" id="ep-cpf" type="text" value="${escapeHTML(p.cpf)}" oninput="maskCPF(this)"></div></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="ep-tel" type="tel" value="${escapeHTML(p.telefone)}" oninput="maskPhone(this)"></div><div class="form-group"><label class="form-label">E-mail</label><input class="form-control" id="ep-email" type="email" value="${escapeHTML(p.email)}"></div></div><div class="form-row form-row-3"><div class="form-group"><label class="form-label">Estudante 1</label><select class="form-control" id="ep-est1"><option value="">Nenhum</option>${estudantesOptions}</select></div><div class="form-group"><label class="form-label">Estudante 2</label><select class="form-control" id="ep-est2"><option value="">Nenhum</option>${estudantesOptions}</select></div><div class="form-group"><label class="form-label">Estudante 3</label><select class="form-control" id="ep-est3"><option value="">Nenhum</option>${estudantesOptions}</select></div></div>${_camposIdentificacao("ep", p)}<div class="form-hint">Para encerrar o atendimento, use "Encerrar" no prontuário: o motivo fica registrado.</div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEdicaoPaciente(${pid})">Salvar alterações</button>`,
  );
  document.getElementById("ep-est1").value = est1;
  document.getElementById("ep-est2").value = est2;
  document.getElementById("ep-est3").value = est3;
}

export function salvarEdicaoPaciente(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  const nome = document.getElementById("ep-nome").value.trim();
  const cpf = document.getElementById("ep-cpf").value.trim();
  const email = document.getElementById("ep-email").value.trim();

  if (!nome) return showError("ep-nome", "Informe o nome completo.");
  if (cpf && !validarCPF(cpf))
    return showError("ep-cpf", "O CPF informado não é válido.");
  if (email && !validarEmail(email))
    return showError("ep-email", "O e-mail informado tem formato inválido.");

  p.nome = nome;
  p.cpf = cpf;
  p.telefone = document.getElementById("ep-tel").value;
  p.email = email;
  Object.assign(p, _lerIdentificacao("ep"));
  const e1 = parseInt(document.getElementById("ep-est1").value);
  const e2 = parseInt(document.getElementById("ep-est2").value);
  const e3 = parseInt(document.getElementById("ep-est3").value);
  p.estudantesIds = [e1, e2, e3].filter((id) => !isNaN(id));
  p.ini = p.nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  saveData();
  closeModal();
  descarregar().then(() => {
    toast("Cadastro atualizado.", "success");
    navigate("pacientes");
  });
}

/* ============================================================  USUÁRIO E AGENDAMENTO  */
export function alternarCamposUsuario(papel) {
  document.getElementById("nu-crp-grupo").style.display = papel === "estudante" ? "none" : "block";
  document.getElementById("nu-mat-grupo").style.display = papel === "estudante" ? "block" : "none";
}

export function openModalNovoUsuario() {
  openModal(
    "Novo usuário",
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="nu-nome">Nome completo *</label><input class="form-control" id="nu-nome" type="text"></div><div class="form-group"><label class="form-label" for="nu-login">Login *</label><input class="form-control" id="nu-login" type="text" autocomplete="off"></div></div>
    <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="nu-role">Papel *</label><select class="form-control" id="nu-role" onchange="alternarCamposUsuario(this.value)"><option value="estudante">Estudante</option><option value="supervisor">Supervisor</option><option value="tecnico">Psicólogo técnico</option></select></div>
    <div class="form-group" id="nu-mat-grupo"><label class="form-label" for="nu-mat">Matrícula *</label><input class="form-control" id="nu-mat" type="text"></div>
    <div class="form-group" id="nu-crp-grupo" style="display:none"><label class="form-label" for="nu-crp">CRP *</label><input class="form-control" id="nu-crp" type="text" placeholder="CRP 06/123456"></div></div>
    <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="nu-pass">Senha inicial *</label><input class="form-control" id="nu-pass" type="password" autocomplete="new-password"><div class="form-hint">Mínimo de 8 caracteres, com letras e números. A pessoa troca no primeiro acesso.</div></div>
    <div class="form-group"><label class="form-label" for="nu-admin">Sua senha (confirmação) *</label><input class="form-control" id="nu-admin" type="password" autocomplete="off"><div class="form-hint">Exigida para gerir usuários.</div></div></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarNovoUsuario()">Cadastrar</button>`,
  );
}
export async function salvarNovoUsuario() {
  const g = (id) => document.getElementById(id).value.trim();
  try {
    await servidor.criarUsuario({
      nome: g("nu-nome"),
      login: g("nu-login"),
      papel: g("nu-role"),
      crp: g("nu-crp"),
      matricula: g("nu-mat"),
      senhaInicial: document.getElementById("nu-pass").value,
      senhaAdmin: document.getElementById("nu-admin").value,
    });
  } catch (e) {
    return toast(e.message, "error");
  }
  closeModal();
  toast(`Usuário ${g("nu-nome")} cadastrado. A senha deverá ser trocada no primeiro acesso.`, "success");
  await recarregarDadosDoServidor();
  navigate("acesso");
}

export function openModalNovoAgendamento() {
  const meusPacientes = getPacientesPermitidos();
  openModal(
    `Novo agendamento`,
    `<div class="form-group"><label class="form-label">Paciente</label><select id="ag-pac" class="form-control">${meusPacientes.map((p) => `<option value="${p.id}">${escapeHTML(p.nome)}</option>`).join("")}</select></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Data</label><input type="date" id="ag-data" class="form-control"></div><div class="form-group"><label class="form-label">Hora</label><input type="time" id="ag-hora" class="form-control"></div></div><div class="form-group"><label class="form-label">Local</label><input type="text" id="ag-local" class="form-control" placeholder="Sala 02"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarAgendamento()">Agendar</button>`,
  );
}

export function salvarAgendamento() {
  const pacienteId = parseInt(document.getElementById("ag-pac").value);
  const agData = document.getElementById("ag-data").value;
  const agHora = document.getElementById("ag-hora").value;
  if (!agData) return toast("Selecione a data do agendamento.", "error");
  if (!agHora) return toast("Selecione o horário do agendamento.", "error");
  const pac = PACIENTES.find((p) => p.id === pacienteId);
  const estId = currentUser.papel === "estudante" ? currentUser.id : pac?.estudantesIds?.[0] || null;
  const supId = currentUser.papel === "supervisor" ? currentUser.id : pac?.supervisorId || null;
  if (appointmentRepository.hasConflict({ pacienteId, estudanteId: estId, data: agData, hora: agHora })) {
    return toast("Já existe um agendamento para este paciente com este estudante neste horário.", "error");
  }
  appointmentRepository.create({
    pacienteId,
    estudanteId: estId,
    supervisorId: supId,
    data: agData,
    hora: agHora,
    local: document.getElementById("ag-local").value.trim() || "Consultório",
    modalidade: "presencial",
  });
  logAudit("agenda", "Criou agendamento", pac?.nome || "");
  saveData();
  closeModal();
  toast("Agendamento criado.", "success");
  navigate("agenda");
}

/* ============================================================  EDITAR E CANCELAR AGENDAMENTO  */

// ─────────────────────────────────────────────────────────────
// openModalEditarAgendamento(agId)
// Abre modal de edição de data/hora/local de um agendamento.
// Valida: data obrigatória, hora obrigatória, conflito de horário.
// Auditoria: toda edição é registrada via logAudit().
// ─────────────────────────────────────────────────────────────
export function openModalEditarAgendamento(agId) {
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return toast("Agendamento não encontrado.", "error");
  if (ag.status === "cancelado") return toast("Não é possível editar um agendamento cancelado.", "error");

  openModal(
    `Editar agendamento`,
    `<div class="form-row form-row-2">
      <div class="form-group">
        <label class="form-label">Data *</label>
        <input type="date" id="eag-data" class="form-control" value="${escapeHTML(ag.data)}">
      </div>
      <div class="form-group">
        <label class="form-label">Hora *</label>
        <input type="time" id="eag-hora" class="form-control" value="${escapeHTML(ag.hora)}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Local</label>
      <input type="text" id="eag-local" class="form-control" value="${escapeHTML(ag.local)}" placeholder="Sala 02">
    </div>
    <div class="callout"><i class="bi bi-info-circle"></i><span>A alteração fica registrada na auditoria. O agendamento continua confirmado.</span></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="salvarEdicaoAgendamento(${agId})">Salvar alterações</button>`,
  );
}

export function salvarEdicaoAgendamento(agId) {
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return;
  const novaData = document.getElementById("eag-data").value;
  const novaHora = document.getElementById("eag-hora").value;
  const novoLocal = document.getElementById("eag-local").value.trim();
  if (!novaData) return showError("eag-data", "Informe a nova data.");
  if (!novaHora) return showError("eag-hora", "Informe o novo horário.");

  // Verifica conflito: mesmo PACIENTE + mesmo estudante + mesmo slot
  // Dois estudantes diferentes PODEM ter agendamentos no mesmo horário
  if (
    appointmentRepository.hasConflict({
      pacienteId: ag.pacienteId,
      estudanteId: ag.estudanteId,
      data: novaData,
      hora: novaHora,
      excludeId: agId,
    })
  ) {
    return toast("Já existe um agendamento para este paciente com este estudante neste horário.", "error");
  }

  appointmentRepository.update(agId, { data: novaData, hora: novaHora, local: novoLocal || "Consultório" });
  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
  logAudit("agenda", "Editou agendamento", pac?.nome || "");
  saveData();
  closeModal();
  toast("Agendamento atualizado.", "success");
  navigate("agenda");
}

// ─────────────────────────────────────────────────────────────
// confirmarCancelamentoAgendamento(agId)
// Exibe diálogo de confirmação antes de cancelar um agendamento.
// Cria overlay independente (não usa openModal) para não conflitar
// com modais já abertos (ex: prontuário com abas).
// executarCancelamentoAgendamento() faz o cancelamento de fato.
// ─────────────────────────────────────────────────────────────
export function confirmarCancelamentoAgendamento(agId) {
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return;
  if (ag.status === "cancelado") return toast("Este agendamento já está cancelado.", "warning");
  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
  const dataFmt = formatBR(ag.data);

  // Remove instância anterior para evitar duplo disparo
  const existing = document.getElementById("cancel-confirm");
  if (existing) existing.remove();

  const confirmDiv = document.createElement("div");
  confirmDiv.id = "cancel-confirm";
  confirmDiv.className = "modal-overlay";
  confirmDiv.style.zIndex = "3000";
  confirmDiv.innerHTML = `
    <div class="modal confirm-dialog" role="alertdialog" aria-labelledby="cancel-title" onclick="event.stopPropagation()">
      <div class="confirm-icon is-danger"><i class="bi bi-calendar-x"></i></div>
      <h3 id="cancel-title">Cancelar este atendimento?</h3>
      <p><strong>${escapeHTML(pac?.nome || "Paciente")}</strong>, ${dataFmt} às ${escapeHTML(ag.hora)}, ${escapeHTML(ag.local)}.</p>
      <p class="confirm-note">O cancelamento fica registrado na auditoria e não pode ser desfeito.</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary" onclick="document.getElementById('cancel-confirm').remove()">Manter atendimento</button>
        <button class="btn btn-danger" onclick="executarCancelamentoAgendamento(${agId})">Cancelar atendimento</button>
      </div>
    </div>`;
  document.body.appendChild(confirmDiv);
  confirmDiv.addEventListener("click", (e) => { if (e.target === confirmDiv) confirmDiv.remove(); });
}

export function executarCancelamentoAgendamento(agId) {
  const conf = document.getElementById("cancel-confirm");
  if (conf) conf.remove();
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return;
  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
  appointmentRepository.cancel(agId, pac?.nome || "");
  toast("Agendamento cancelado.", "warning");
  navigate("agenda");
}

