// ============================================================
// Módulo gerado automaticamente pela modularização do PEP
// Sistema de Prontuário Eletrônico Psicológico — FCMSCSP
// ============================================================

import { currentUser, navigate } from "../core/auth.js";
import { openModalNovoUsuario } from "../modals/modals.js";
import { ACESSO_PACIENTE, ANAMNESES, AUDITORIA, EVOLUCOES, PACIENTES, USERS, escapeHTML, logAudit, saveData } from "../core/store.js";
import { toast } from "../core/utils.js";

export function renderAcesso() {
  const RLABELS = {
    tecnico: "Psicólogo Técnico",
    supervisor: "Supervisor",
    estudante: "Estudante",
  };
  const RCOLORS = {
    tecnico: "#1b5e20",
    supervisor: "#2e7d32",
    estudante: "#388e3c",
  };
  const RBADGE = {
    tecnico: "badge-teal",
    supervisor: "badge-teal",
    estudante: "badge-green",
  };
  return `<div class="page-header"><div class="page-header-left"><h1>Acesso & Usuários</h1></div><button class="btn btn-primary" onclick="openModalNovoUsuario()"><i class="bi bi-person-plus-fill"></i> Novo usuário</button></div><div class="users-grid" style="margin-bottom:22px">${USERS.filter(
    (u) => u.papel !== "paciente",
  )
    .map(
      (u) =>
        `<div class="user-card"><div class="user-card-header"><div class="user-card-avatar" style="background:${RCOLORS[u.papel] || "#94a3b8"}">${escapeHTML(u.avatar)}</div><div><div class="user-card-name">${escapeHTML(u.nome)}</div><div class="user-card-email">${escapeHTML(u.login)}@fcmscsp.edu.br</div></div><span class="badge ${RBADGE[u.papel] || "badge-gray"}" style="margin-left:auto">${RLABELS[u.papel]}</span></div><div style="display:flex;gap:8px;margin-top:4px"><button class="btn btn-secondary btn-sm" style="flex:1" onclick="toast('Editando','info')"><i class="bi bi-pencil"></i> Editar</button></div></div>`,
    )
    .join(
      "",
    )}</div><div class="card"><div class="card-header"><span class="card-title"><i class="bi bi-table" style="color:var(--sc-green)"></i>Matriz de Permissões</span></div><div class="table-responsive"><table class="perm-table"><thead><tr><th>Funcionalidade</th><th>Técnico</th><th>Supervisor</th><th>Estudante</th></tr></thead><tbody>${[
    [
      "Ver Lista de Casos",
      '<i class="bi bi-check-circle-fill perm-yes"></i> Todos',
      '<span class="perm-cond">Somente seus</span>',
      '<span class="perm-cond">Somente seus</span>',
    ],
    [
      "Cadastrar paciente",
      '<i class="bi bi-check-circle-fill perm-yes"></i>',
      '<span class="perm-cond">Não</span>',
      '<span class="perm-cond">Não</span>',
    ],
    [
      "Registrar evolução",
      '<i class="bi bi-check-circle-fill perm-yes"></i>',
      '<i class="bi bi-check-circle-fill perm-yes"></i>',
      '<span class="perm-cond">Seu caso</span>',
    ],
    [
      "Remover evolução",
      '<span class="perm-never">NUNCA</span>',
      '<span class="perm-never">NUNCA</span>',
      '<span class="perm-never">NUNCA</span>',
    ],
  ]
    .map(
      ([f, ...cols]) =>
        `<tr><td style="font-weight:500">${f}</td>${cols.map((c) => `<td style="text-align:center">${c}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody></table></div></div>`;
}

/* ============================================================  ACESSO PACIENTE (BUSCA + PDF)  */
export function renderAcessoPaciente() {
  return `<div class="page-header"><div class="page-header-left"><h1>Acesso do Paciente</h1></div></div><div class="acesso-pac-grid"><div><div class="card" style="margin-bottom:18px"><div class="card-header"><span class="card-title">Solicitações Registradas</span></div><div class="card-body" style="padding:12px">${ACESSO_PACIENTE.map((req) => `<div class="access-request-card" style="margin-bottom:10px;display:flex;align-items:center;gap:12px;padding:14px;border:1px solid var(--border);border-radius:8px"><div style="flex:1"><div style="font-weight:600">${escapeHTML(req.nome)}</div><div style="font-size:12px;color:var(--text3)">Solicitado em: ${req.solicitacao}</div></div><span class="badge ${req.status === "liberado" ? "badge-green" : "badge-amber"}">${req.status}</span><div style="display:flex;gap:6px">${req.status === "pendente" ? `<button class="btn btn-primary btn-sm" onclick="liberarAcessoPaciente(${req.id})"><i class="bi bi-check"></i> Liberar</button>` : ""}<button class="btn btn-secondary btn-sm" onclick="gerarPdfProntuario(${req.pacienteId})"><i class="bi bi-file-pdf"></i> PDF</button></div></div>`).join("")}</div></div></div><div class="card" style="align-self:start"><div class="card-header"><span class="card-title">Nova Solicitação</span></div><div class="card-body"><div class="form-group" style="position:relative;"><label class="form-label">Buscar Paciente</label><input type="text" id="req-pac-busca" class="form-control" placeholder="Digite o nome..." oninput="filtrarPacientesSolicitacao(this.value)" autocomplete="off"><input type="hidden" id="req-pac-id"><div id="autocomplete-lista" style="position:absolute; top:100%; left:0; right:0; background:var(--surface); border:1px solid var(--border); border-radius:7px; max-height:200px; overflow-y:auto; z-index:100; display:none; box-shadow:var(--shadow-md); margin-top:4px;"></div></div><button class="btn btn-primary" style="width:100%" onclick="novaSolicitacaoPaciente()"><i class="bi bi-plus"></i> Registrar</button></div></div></div>`;
}

export function filtrarPacientesSolicitacao(termo) {
  const listaEl = document.getElementById("autocomplete-lista");
  if (!termo || termo.trim().length === 0) {
    listaEl.style.display = "none";
    document.getElementById("req-pac-id").value = "";
    return;
  }
  const filtrados = PACIENTES.filter((p) =>
    p.nome.toLowerCase().includes(termo.toLowerCase()),
  ).sort((a, b) => a.nome.localeCompare(b.nome));
  if (filtrados.length === 0) {
    listaEl.innerHTML =
      '<div style="padding:10px 12px; font-size:12px; color:var(--text3);">Nenhum paciente encontrado.</div>';
  } else {
    listaEl.innerHTML = filtrados
      .map(
        (p) =>
          `<div style="padding:10px 12px; font-size:13px; cursor:pointer; border-bottom:1px solid var(--border);" onclick="selecionarPacienteSolicitacao(${p.id}, '${escapeHTML(p.nome)}')" onmouseover="this.style.background='var(--sc-green-pale)'" onmouseout="this.style.background='transparent'"><strong>${escapeHTML(p.nome)}</strong> <br><small style="color:var(--text3)">CPF: ${escapeHTML(p.cpf)}</small></div>`,
      )
      .join("");
  }
  listaEl.style.display = "block";
}

export function selecionarPacienteSolicitacao(id, nome) {
  document.getElementById("req-pac-id").value = id;
  document.getElementById("req-pac-busca").value = nome;
  document.getElementById("autocomplete-lista").style.display = "none";
}
document.addEventListener("click", function (e) {
  const lista = document.getElementById("autocomplete-lista");
  if (lista && e.target.id !== "req-pac-busca") lista.style.display = "none";
});

export function liberarAcessoPaciente(reqId) {
  const req = ACESSO_PACIENTE.find((r) => r.id === reqId);
  if (req) {
    req.status = "liberado";
    req.liberacao = new Date().toISOString().split("T")[0];
    logAudit("cadastro", "Liberou acesso ao prontuário", req.nome);
    saveData();
    toast("Acesso liberado!", "success");
    navigate("acesso-pac");
  }
}
export function novaSolicitacaoPaciente() {
  const pid = parseInt(document.getElementById("req-pac-id").value);
  if (isNaN(pid)) return toast("Selecione um paciente", "error");
  const p = PACIENTES.find((x) => x.id === pid);
  if (p) {
    ACESSO_PACIENTE.push({
      id: Date.now(),
      pacienteId: p.id,
      nome: p.nome,
      status: "pendente",
      solicitacao: new Date().toISOString().split("T")[0],
      protocolo: "PROT-" + Date.now(),
    });
    logAudit("cadastro", "Registrou solicitação", p.nome);
    saveData();
    toast("Solicitação registrada!", "success");
    navigate("acesso-pac");
  }
}

export function gerarPdfProntuario(pid) {
  const p = PACIENTES.find((x) => x.id === pid);
  if (!p) return;
  const ams = ANAMNESES[pid] || {};
  const evs = EVOLUCOES[pid] || [];
  const printWindow = window.open("", "_blank", "width=800,height=900");
  let evsHtml =
    evs.length > 0
      ? evs
          .map(
            (e) =>
              `<div style="margin-bottom:15px; border-bottom:1px solid #ccc; padding-bottom:10px;"><p style="font-size:12px; color:#555; margin-bottom:5px;"><strong>Data:</strong> ${e.data} | <strong>Resp:</strong> ${escapeHTML(e.autor)}</p><p style="margin-top:0;">${escapeHTML(e.conteudo)}</p></div>`,
          )
          .join("")
      : "<p>Nenhuma evolução.</p>";
  const html = `<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Prontuário - ${escapeHTML(p.nome)}</title><style>body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; } h1 { color: #1b5e20; border-bottom: 2px solid #1b5e20; padding-bottom: 10px; margin-bottom: 5px; } .info-box { border: 1px solid #ddd; padding: 15px; background: #f9f9f9; }</style></head><body><h1>Prontuário Eletrônico</h1><div class="info-box"><strong>Paciente:</strong> ${escapeHTML(p.nome)} <br><strong>CPF:</strong> ${escapeHTML(p.cpf)}</div><h2>Anamnese</h2><div class="info-box"><p>${escapeHTML(ams.queixa || "Não registrada")}</p></div><h2>Evoluções</h2>${evsHtml}</body></html>`;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = function () {
    printWindow.print();
  };
  toast("PDF Gerado!", "success");
  logAudit("export", "Exportou PDF", p.nome);
  saveData();
}

/* ============================================================  AUDITORIA E MEU PRONTUARIO  */
export function renderAuditoria() {
  return `<div class="page-header"><div class="page-header-left"><h1>Trilha de Auditoria</h1></div></div><div class="card"><div class="card-body" style="padding:0 16px">${AUDITORIA.map((a, i) => `<div class="audit-item"><div class="audit-line"><div class="audit-dot" style="background:${a.dot}"></div>${i < AUDITORIA.length - 1 ? '<div class="audit-connector"></div>' : ""}</div><div class="audit-body"><div class="audit-action"><strong>${escapeHTML(a.ator)}</strong> ${escapeHTML(a.acao)} ${a.obj ? `<em>${escapeHTML(a.obj)}</em>` : ""}</div><div class="audit-time">${a.ts}</div></div></div>`).join("")}</div></div>`;
}
export function renderMeuProntuario() {
  // Usa o id do usuário logado (paciente), não hardcoded
  const pid = currentUser.id;
  const p = PACIENTES.find((x) => x.id === pid);
  const ams = ANAMNESES[pid];
  const evs = EVOLUCOES[pid] || [];
  const acessoInfo = ACESSO_PACIENTE.find((a) => a.pacienteId === pid);
  if (!acessoInfo || acessoInfo.status !== "liberado")
    return `<div class="empty-state"><h3>Acesso Restrito</h3></div>`;
  return `<div style="max-width:800px;margin:0 auto"><div style="background:var(--sc-green-dark);color:#fff;border-radius:12px;padding:22px;margin-bottom:22px;"><div><div style="font-size:17px;font-weight:700">${escapeHTML(p.nome)}</div></div></div><div class="card"><div class="card-header"><span class="card-title">Anamnese</span></div><div class="card-body">${ams ? `<p>${escapeHTML(ams.queixa)}</p>` : `<p>Sem registros.</p>`}</div></div></div>`;
}

/* ============================================================  MODAIS E ALERTAS (AÇÕES DE ESCRITA)  */
