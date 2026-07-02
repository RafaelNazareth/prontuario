// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser, navigate } from "../core/auth.js";
import { openProntuario } from "../pages/dashboard.js";
import { getNotificacoesAtivas, marcarNotifLida, renderNotifPanel } from "../pages/notificacoes.js";
import { AGENDAMENTOS, ANAMNESES, DOCUMENTOS, EVOLUCOES, PACIENTES, USERS, escapeHTML, getPacientesPermitidos, logAudit, saveData } from "../core/store.js";
import { toast } from "../core/utils.js";

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
  if (resto == 10 || resto == 11) resto = 0;
  if (resto != parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++)
    soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto == 10 || resto == 11) resto = 0;
  if (resto != parseInt(cpf.substring(10, 11))) return false;
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
    `Nova Evolução`,
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label">Data/hora</label><input type="datetime-local" class="form-control" id="ev-data" value="${new Date().toISOString().slice(0, 16)}"></div><div class="form-group"><label class="form-label">Tipo</label><select class="form-control" id="ev-tipo"><option value="atendimento">Atendimento</option><option value="supervisao">Supervisão</option></select></div></div><div class="form-group"><div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 5px;"><label class="form-label" style="margin:0;">Conteúdo *</label><div style="display:flex; gap:6px;"><button class="btn btn-secondary btn-sm" onclick="inserirTemplateEvolucao('SOAP')"><i class="bi bi-layout-text-window"></i> Modelo SOAP</button><button class="btn btn-secondary btn-sm" onclick="inserirTemplateEvolucao('ACOLHIMENTO')"><i class="bi bi-layout-text-window"></i> Acolhimento</button></div></div><textarea class="form-control" id="ev-content" rows="6"></textarea></div><div class="form-group"><label class="form-label">Tags (separadas por vírgula)</label><input type="text" class="form-control" id="ev-tags"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="confirmarSalvarEvolucao(${pid})">Salvar Imutável</button>`,
  );
}

export function confirmarSalvarEvolucao(pid) {
  const evContent = document.getElementById("ev-content").value.trim();
  if (!evContent) return toast("Preencha o conteúdo da evolução!", "error");
  // Remove instância anterior para evitar duplo disparo
  const existing = document.getElementById("custom-confirm");
  if (existing) existing.remove();
  const confirmDiv = document.createElement("div");
  confirmDiv.id = "custom-confirm";
  confirmDiv.className = "modal-overlay";
  confirmDiv.style.cssText =
    "z-index:3000;display:flex;align-items:center;justify-content:center;padding:15px";
  confirmDiv.innerHTML = `<div class="modal" style="max-width:400px;text-align:center;padding:28px 24px" onclick="event.stopPropagation()"><i class="bi bi-exclamation-triangle-fill" style="font-size:44px;color:var(--amber);display:block;margin-bottom:14px"></i><h3 style="margin-bottom:8px;font-size:18px">Confirmar Evolução</h3><p style="font-size:13px;color:var(--text2);margin-bottom:24px;line-height:1.6">Uma vez salva, esta evolução <strong>não poderá ser alterada ou apagada</strong>, conforme normas do CRP.</p><div style="display:flex;gap:10px;justify-content:center"><button class="btn btn-secondary" onclick="document.getElementById('custom-confirm').remove()">Cancelar</button><button class="btn btn-primary" onclick="executarSalvarEvolucao(${pid})">Confirmar</button></div></div>`;
  document.body.appendChild(confirmDiv);
}

export function executarSalvarEvolucao(pid) {
  const conf = document.getElementById("custom-confirm");
  if (conf) conf.remove();
  const content = document.getElementById("ev-content").value.trim();
  if (!EVOLUCOES[pid]) EVOLUCOES[pid] = [];
  const num = EVOLUCOES[pid].length + 1;
  EVOLUCOES[pid].push({
    id: Date.now(),
    num: num,
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
  });
  const pacNomeEv = PACIENTES.find((p) => p.id === pid)?.nome || "Desconhecido";
  logAudit("evolucao", `Registrou evolução #${num}`, pacNomeEv);
  saveData();
  closeModal();
  toast("Salvo com sucesso!", "success");
  openProntuario(pid);
}

/* ============================================================  DOCUMENTOS E ANAMNESE  */
export function openModalUploadDocumento(pid) {
  openModal(
    `Upload de Documento (Simulado)`,
    `<div class="form-group"><label class="form-label">Nome do arquivo</label><input type="text" id="up-nome" class="form-control" placeholder="Ex: Laudo_Medico.pdf"></div><div class="form-group"><label class="form-label">Tipo</label><select id="up-tipo" class="form-control"><option value="pdf">PDF</option><option value="img">Imagem</option><option value="docx">Word</option></select></div><div class="form-group"><label class="form-label">Arquivo</label><input type="file" class="form-control"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarUploadDocumento(${pid})">Enviar Arquivo</button>`,
  );
}
export function salvarUploadDocumento(pid) {
  let nome = document.getElementById("up-nome").value || "Documento.pdf";
  let tipo = document.getElementById("up-tipo").value;
  if (!DOCUMENTOS[pid]) DOCUMENTOS[pid] = [];
  DOCUMENTOS[pid].push({
    id: `d${Date.now()}`,
    nome: nome,
    tipo: tipo,
    tamanho: Math.floor(Math.random() * 900 + 50) + " KB",
    data: new Date().toISOString().split("T")[0],
    autor: currentUser.nome,
  });
  logAudit("export", "Fez upload de documento", nome);
  saveData();
  closeModal();
  toast("Documento enviado e salvo!", "success");
  openProntuario(pid);
  setTimeout(() => {
    document.querySelectorAll(".ptab")[3].click();
  }, 100);
}

export function openModalAnamnese(pid) {
  const ams = ANAMNESES[pid] || {};
  openModal(
    `Anamnese`,
    `<div class="form-group"><label class="form-label">Queixa principal *</label><textarea class="form-control" id="am-queixa" rows="2">${escapeHTML(ams.queixa || "")}</textarea></div><div class="form-group"><label class="form-label">História do problema</label><textarea class="form-control" id="am-historia" rows="3">${escapeHTML(ams.historia || "")}</textarea></div><div class="form-group"><label class="form-label">Histórico médico/psicológico</label><textarea class="form-control" id="am-medico" rows="2">${escapeHTML(ams.historico_medico || "")}</textarea></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Medicamentos/substâncias</label><textarea class="form-control" id="am-med" rows="2">${escapeHTML(ams.medicamentos || "")}</textarea></div><div class="form-group"><label class="form-label">Contexto familiar/social</label><textarea class="form-control" id="am-ctx" rows="2">${escapeHTML(ams.contexto || "")}</textarea></div></div><div class="form-group"><label class="form-label">Hipóteses / Plano terapêutico</label><textarea class="form-control" id="am-hipo" rows="2">${escapeHTML(ams.hipoteses || "")}</textarea></div>`,
    `<button class="btn btn-secondary" onclick="salvarAnamnese(${pid},'rascunho')">Salvar rascunho</button><button class="btn btn-primary" onclick="salvarAnamnese(${pid}, 'finalizada')">Finalizar Anamnese</button>`,
  );
}
export function salvarAnamnese(pid, status) {
  // Guard CRP: anamnese finalizada é imutável
  const existente = ANAMNESES[pid];
  if (
    existente &&
    existente.status === "finalizada" &&
    status === "finalizada"
  ) {
    toast(
      "Esta anamnese já foi finalizada e não pode ser alterada (CRP).",
      "error",
    );
    return;
  }
  const queixa = document.getElementById("am-queixa").value.trim();
  if (!queixa) return toast("A queixa principal é obrigatória!", "error");
  ANAMNESES[pid] = {
    queixa: document.getElementById("am-queixa").value,
    historia: document.getElementById("am-historia").value,
    historico_medico: document.getElementById("am-medico").value,
    medicamentos: document.getElementById("am-med").value,
    contexto: document.getElementById("am-ctx").value,
    hipoteses: document.getElementById("am-hipo").value,
    status,
    rascunho: status === "rascunho",
    criadoPor: currentUser.nome,
    criadoEm: existente?.criadoEm || new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  logAudit(
    "anamnese",
    "Atualizou anamnese",
    PACIENTES.find((p) => p.id === pid).nome,
  );
  saveData();
  closeModal();
  toast(
    status === "finalizada" ? "Anamnese finalizada!" : "Rascunho salvo!",
    "success",
  );
  openProntuario(pid);
}

/* ============================================================  PACIENTE: CADASTRO E EDIÇÃO COM VALIDAÇÃO  */
export function openModalNovoPaciente() {
  const estudantesOptions = USERS.filter((u) => u.papel === "estudante")
    .map((u) => `<option value="${u.id}">${escapeHTML(u.nome)}</option>`)
    .join("");
  openModal(
    '<i class="bi bi-person-plus-fill" style="color:var(--sc-green)"></i> Novo Paciente',
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label">Nome completo *</label><input class="form-control" id="np-nome" type="text"></div><div class="form-group"><label class="form-label">CPF *</label><input class="form-control" id="np-cpf" type="text" placeholder="000.000.000-00" autocomplete="off" oninput="maskCPF(this)"></div></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Data de nascimento</label><input class="form-control" id="np-nasc" type="date"></div><div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="np-tel" type="tel" placeholder="(00) 00000-0000" oninput="maskPhone(this)"></div></div><div class="form-group"><label class="form-label">E-mail</label><input class="form-control" id="np-email" type="email"></div><div class="form-group"><label class="form-label">Supervisor</label><select class="form-control" id="np-sup">${USERS.filter(
      (u) => u.papel === "supervisor",
    )
      .map((u) => `<option value="${u.id}">${escapeHTML(u.nome)}</option>`)
      .join(
        "",
      )}</select></div><div class="form-row form-row-3"><div class="form-group"><label class="form-label">Estudante 1</label><select class="form-control" id="np-est1"><option value="">Nenhum</option>${estudantesOptions}</select></div><div class="form-group"><label class="form-label">Estudante 2</label><select class="form-control" id="np-est2"><option value="">Nenhum</option>${estudantesOptions}</select></div><div class="form-group"><label class="form-label">Estudante 3</label><select class="form-control" id="np-est3"><option value="">Nenhum</option>${estudantesOptions}</select></div></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarNovoPaciente()"><i class="bi bi-check-lg"></i> Cadastrar</button>`,
  );
}

export function salvarNovoPaciente() {
  const nome = document.getElementById("np-nome").value.trim();
  const cpf = document.getElementById("np-cpf").value.trim();
  const email = document.getElementById("np-email").value.trim();

  if (!nome) return showError("np-nome", "Informe o nome completo!");
  if (!cpf) return showError("np-cpf", "CPF é obrigatório!");
  if (!validarCPF(cpf))
    return showError("np-cpf", "O CPF informado não é válido!");
  if (
    PACIENTES.some((p) => p.cpf.replace(/\D/g, "") === cpf.replace(/\D/g, ""))
  )
    return showError("np-cpf", "Já existe um paciente com este CPF!");
  if (email && !validarEmail(email))
    return showError("np-email", "O e-mail informado tem formato inválido!");

  const e1 = parseInt(document.getElementById("np-est1").value);
  const e2 = parseInt(document.getElementById("np-est2").value);
  const e3 = parseInt(document.getElementById("np-est3").value);
  const estudantesIds = [e1, e2, e3].filter((id) => !isNaN(id));
  const CORES = [
    "#1b5e20",
    "#1b5e20",
    "#1b5e20",
    "#1b5e20",
    "#1b5e20",
    "#1b5e20",
    "#1b5e20",
  ];
  const newId = Date.now();
  PACIENTES.push({
    id: newId,
    nome,
    cpf: cpf || "",
    nascimento: document.getElementById("np-nasc").value || "2000-01-01",
    telefone: document.getElementById("np-tel").value || "",
    email: email || "",
    estudantesIds: estudantesIds,
    supervisorId: parseInt(document.getElementById("np-sup").value),
    status: "ativo",
    cor: CORES[PACIENTES.length % CORES.length],
    ini: nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
  });
  EVOLUCOES[newId] = [];
  DOCUMENTOS[newId] = [];
  logAudit("cadastro", "Cadastrou paciente", nome);
  saveData();
  closeModal();
  toast(`Paciente ${nome} cadastrado!`, "success");
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
    `<i class="bi bi-pencil" style="color:var(--sc-green)"></i> Editar Paciente — ${escapeHTML(p.nome)}`,
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label">Nome completo</label><input class="form-control" id="ep-nome" type="text" value="${escapeHTML(p.nome)}"></div><div class="form-group"><label class="form-label">CPF</label><input class="form-control" id="ep-cpf" type="text" value="${escapeHTML(p.cpf)}" oninput="maskCPF(this)"></div></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="ep-tel" type="tel" value="${escapeHTML(p.telefone)}" oninput="maskPhone(this)"></div><div class="form-group"><label class="form-label">E-mail</label><input class="form-control" id="ep-email" type="email" value="${escapeHTML(p.email)}"></div></div><div class="form-row form-row-3"><div class="form-group"><label class="form-label">Estudante 1</label><select class="form-control" id="ep-est1"><option value="">Nenhum</option>${estudantesOptions}</select></div><div class="form-group"><label class="form-label">Estudante 2</label><select class="form-control" id="ep-est2"><option value="">Nenhum</option>${estudantesOptions}</select></div><div class="form-group"><label class="form-label">Estudante 3</label><select class="form-control" id="ep-est3"><option value="">Nenhum</option>${estudantesOptions}</select></div></div><div class="form-group"><label class="form-label">Status</label><select class="form-control" id="ep-status"><option ${p.status === "ativo" ? "selected" : ""}>ativo</option><option ${p.status === "inativo" ? "selected" : ""}>inativo</option></select></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEdicaoPaciente(${pid})"><i class="bi bi-check-lg"></i> Salvar</button>`,
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

  if (!nome) return showError("ep-nome", "Informe o nome completo!");
  if (cpf && !validarCPF(cpf))
    return showError("ep-cpf", "O CPF informado não é válido!");
  if (email && !validarEmail(email))
    return showError("ep-email", "O e-mail informado tem formato inválido!");

  p.nome = nome;
  p.cpf = cpf;
  p.telefone = document.getElementById("ep-tel").value;
  p.email = email;
  p.status = document.getElementById("ep-status").value;
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
  logAudit("cadastro", "Atualizou dados do paciente", p.nome);
  saveData();
  closeModal();
  toast("Paciente atualizado!", "success");
  navigate("pacientes");
}

/* ============================================================  USUÁRIO E AGENDAMENTO  */
export function openModalNovoUsuario() {
  openModal(
    '<i class="bi bi-person-plus-fill" style="color:var(--sc-green)"></i> Novo Usuário',
    `<div class="form-row form-row-2"><div class="form-group"><label class="form-label">Nome completo *</label><input class="form-control" id="nu-nome" type="text"></div><div class="form-group"><label class="form-label">Login *</label><input class="form-control" id="nu-login" type="text"></div></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Senha *</label><input class="form-control" id="nu-pass" type="password"></div><div class="form-group"><label class="form-label">Papel *</label><select class="form-control" id="nu-role"><option value="estudante">Estudante</option><option value="supervisor">Supervisor</option><option value="tecnico">Psicólogo Técnico</option></select></div></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarNovoUsuario()"><i class="bi bi-check-lg"></i> Cadastrar</button>`,
  );
}
export function salvarNovoUsuario() {
  const nome = document.getElementById("nu-nome").value.trim();
  const login = document.getElementById("nu-login").value.trim();
  const pass = document.getElementById("nu-pass").value.trim();
  if (!nome) return toast("Informe o nome completo!", "error");
  if (!login) return toast("Informe o login!", "error");
  if (!pass || pass.length < 4)
    return toast("Senha deve ter no mínimo 4 caracteres!", "error");
  if (USERS.some((u) => u.login === login))
    return toast("Este login já está em uso!", "error");
  USERS.push({
    id: Date.now(),
    login,
    pass: pass,
    nome,
    papel: document.getElementById("nu-role").value,
    avatar: nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
    color: "#388e3c",
  });
  logAudit("cadastro", "Cadastrou usuário", nome);
  saveData();
  closeModal();
  toast(`Usuário ${nome} cadastrado!`, "success");
  navigate("acesso");
}

export function openModalNovoAgendamento() {
  const meusPacientes = getPacientesPermitidos();
  openModal(
    `Novo Agendamento`,
    `<div class="form-group"><label class="form-label">Paciente</label><select id="ag-pac" class="form-control">${meusPacientes.map((p) => `<option value="${p.id}">${escapeHTML(p.nome)}</option>`).join("")}</select></div><div class="form-row form-row-2"><div class="form-group"><label class="form-label">Data</label><input type="date" id="ag-data" class="form-control"></div><div class="form-group"><label class="form-label">Hora</label><input type="time" id="ag-hora" class="form-control"></div></div><div class="form-group"><label class="form-label">Local</label><input type="text" id="ag-local" class="form-control" placeholder="Ex: Sala 02"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarAgendamento()">Agendar</button>`,
  );
}

export function salvarAgendamento() {
  const pacienteId = parseInt(document.getElementById("ag-pac").value);
  const agData = document.getElementById("ag-data").value;
  const agHora = document.getElementById("ag-hora").value;
  if (!agData) return toast("Selecione a data do agendamento!", "error");
  if (!agHora) return toast("Selecione o horário do agendamento!", "error");
  const pac = PACIENTES.find((p) => p.id === pacienteId);
  const estId = currentUser.papel === "estudante" ? currentUser.id : pac?.estudantesIds?.[0] || null;
  const supId = currentUser.papel === "supervisor" ? currentUser.id : pac?.supervisorId || null;
  // Conflito: mesmo paciente + mesmo estudante + mesmo slot
  const conflito = AGENDAMENTOS.find(
    (a) => a.pacienteId === pacienteId && a.estudanteId === estId &&
           a.data === agData && a.hora === agHora && a.status !== "cancelado"
  );
  if (conflito) return toast("Já existe um agendamento para este paciente com este estudante neste horário!", "error");
  AGENDAMENTOS.push({
    id: Date.now(),
    pacienteId,
    estudanteId: estId,
    supervisorId: supId,
    data: agData,
    hora: agHora,
    local: document.getElementById("ag-local").value.trim() || "Consultório",
    modalidade: "presencial",
    status: "confirmado",
  });
  const pacNome = pac?.nome || "";
  logAudit("agenda", "Criou agendamento", pacNome);
  saveData();
  closeModal();
  toast("Agendamento criado!", "success");
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
    `<i class="bi bi-pencil-square" style="color:var(--sc-green)"></i> Editar Agendamento`,
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
      <input type="text" id="eag-local" class="form-control" value="${escapeHTML(ag.local)}" placeholder="Ex: Sala 02">
    </div>
    <div class="form-group">
      <div style="padding:10px 14px;background:#fffbeb;border:1px solid #f59e0b;border-radius:7px;font-size:12px;color:#78350f;display:flex;align-items:flex-start;gap:8px">
        <i class="bi bi-info-circle-fill" style="flex-shrink:0;margin-top:1px;color:#d97706"></i>
        <span>Alterações serão registradas na trilha de auditoria. O status do agendamento será mantido como <strong>confirmado</strong>.</span>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="salvarEdicaoAgendamento(${agId})"><i class="bi bi-check-lg"></i> Salvar Alterações</button>`,
  );
}

export function salvarEdicaoAgendamento(agId) {
  const ag = AGENDAMENTOS.find((a) => a.id === agId);
  if (!ag) return;
  const novaData = document.getElementById("eag-data").value;
  const novaHora = document.getElementById("eag-hora").value;
  const novoLocal = document.getElementById("eag-local").value.trim();
  if (!novaData) return showError("eag-data", "Informe a nova data!");
  if (!novaHora) return showError("eag-hora", "Informe o novo horário!");

  // Verifica conflito: mesmo PACIENTE + mesmo estudante + mesmo slot
  // Dois estudantes diferentes PODEM ter agendamentos no mesmo horário
  const conflito = AGENDAMENTOS.find(
    (a) => a.id !== agId && a.pacienteId === ag.pacienteId &&
           a.estudanteId === ag.estudanteId &&
           a.data === novaData && a.hora === novaHora && a.status !== "cancelado"
  );
  if (conflito) return toast("Já existe um agendamento para este paciente com este estudante neste horário!", "error");

  ag.data = novaData;
  ag.hora = novaHora;
  ag.local = novoLocal || "Consultório";
  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
  logAudit("agenda", "Editou agendamento", pac?.nome || "");
  saveData();
  closeModal();
  toast("Agendamento atualizado!", "success");
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
  const dataFmt = ag.data.split("-").reverse().join("/");

  // Remove instância anterior para evitar duplo disparo
  const existing = document.getElementById("cancel-confirm");
  if (existing) existing.remove();

  const confirmDiv = document.createElement("div");
  confirmDiv.id = "cancel-confirm";
  confirmDiv.className = "modal-overlay";
  confirmDiv.style.cssText = "z-index:3000;display:flex;align-items:center;justify-content:center;padding:15px";
  confirmDiv.innerHTML = `
    <div class="modal" style="max-width:420px;text-align:center;padding:32px 28px" onclick="event.stopPropagation()">
      <div style="width:56px;height:56px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <i class="bi bi-calendar-x-fill" style="font-size:26px;color:#dc2626"></i>
      </div>
      <h3 style="margin-bottom:8px;font-size:18px;font-weight:700">Cancelar Agendamento?</h3>
      <p style="font-size:13px;color:var(--text2);margin-bottom:6px;line-height:1.6">
        <strong>${escapeHTML(pac?.nome || "Paciente")}</strong><br>
        ${dataFmt} às ${escapeHTML(ag.hora)} · ${escapeHTML(ag.local)}
      </p>
      <p style="font-size:12px;color:var(--text3);margin-bottom:24px">
        O cancelamento será registrado na trilha de auditoria e não poderá ser desfeito.
      </p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-secondary" onclick="document.getElementById('cancel-confirm').remove()">Voltar</button>
        <button class="btn" style="background:#dc2626;color:#fff" onclick="executarCancelamentoAgendamento(${agId})">
          <i class="bi bi-x-circle-fill"></i> Confirmar Cancelamento
        </button>
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
  ag.status = "cancelado";
  const pac = PACIENTES.find((p) => p.id === ag.pacienteId);
  logAudit("agenda", "Cancelou agendamento", pac?.nome || "");
  saveData();
  toast("Agendamento cancelado.", "warning");
  navigate("agenda");
}


/* ============================================================  SISTEMA DE NOTIFICAÇÕES  */
// ─────────────────────────────────────────────────────────────
// NOTIFICAÇÕES DO SININHO
//
// Tipos implementados:
//  1. "evolucao_pendente"   → estudante não registrou evolução 1h após consulta
//  2. "troca_solicitada"    → técnico: paciente faltou 2x sem justificativa
//  3. "troca_realizada"     → estudantes: paciente foi trocado
//  4. "falta_registrada"    → técnico/supervisor: falta registrada no prontuário
//
// getNotificacoesAtivas() → calcula notificações em tempo real + persistentes
// renderNotifPanel()      → HTML do painel do sininho
// marcarNotifLida(id)     → marca como lida e salva
// ─────────────────────────────────────────────────────────────

