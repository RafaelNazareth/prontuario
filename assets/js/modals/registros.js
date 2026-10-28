// ============================================================
// modals/registros.js
// ------------------------------------------------------------
// Ações de registro clínico exigidas pelas normas do CFP e pela LGPD:
//
//   validarRegistro()              co-assinatura do supervisor (Res. CFP 001/2009 art. 3º)
//   openModalRetificarEvolucao()   correção com justificativa e nova versão (SBIS NGS1.12.01)
//   openModalEncerramento()        encaminhamento/encerramento (Res. CFP 001/2009 art. 2º IV)
//   openModalEmitirDocumento()     documentos psicológicos (Res. CFP 06/2019)
//   imprimirDocumentoEmitido()     documento com estrutura, laudas numeradas e protocolo
//   openModalComunicacao()         compartilhamentos, notificações e quebra de sigilo
//   openModalConsentimento()       termos e autorizações; revogação
//   openModalRegistroDocumental()  supervisão e anotações fora do prontuário
//   openModalSolicitacaoTitular()  pedidos do paciente (LGPD art. 18)
//
// Autor, horário e assinatura são carimbados pelo servidor; aqui só se
// monta o pedido. Depois de gravar, a tela é reaberta com o estado que o
// servidor devolveu.
// ============================================================

import { currentUser, navigate } from "../core/auth.js";
import {
  ACESSO_PACIENTE,
  AGENDAMENTOS,
  ANAMNESES,
  COMPARTILHAMENTOS,
  DOCUMENTOS,
  EVOLUCOES,
  PACIENTES,
  REGISTRO_DOCUMENTAL,
  SESSAO,
  USERS,
  escapeHTML,
  logAudit,
  saveData,
} from "../core/store.js";
import { toast } from "../core/utils.js";
import { can } from "../core/permissions.js";
import { formatBR } from "../core/dateService.js";
import { generateId, generateSequentialId } from "../core/idService.js";
import { descarregar } from "../infrastructure/jsonDataSource.js";
import { openModal, closeModal } from "./modals.js";
import { openProntuario } from "../pages/dashboard.js";
import {
  MODALIDADES_DOCUMENTO,
  MOTIVOS_ENCERRAMENTO,
  TIPOS_COMPARTILHAMENTO,
  TIPOS_CONSENTIMENTO,
  TIPOS_REGISTRO_DOCUMENTAL,
  ehMenor,
  fmtDataHora,
} from "../core/clinico.js";

const e = escapeHTML;
const val = (id) => document.getElementById(id)?.value.trim() || "";
const hojeISO = () => new Date().toISOString().slice(0, 10);

/** Grava agora e reabre o prontuário na aba indicada com o estado do servidor. */
async function gravarEReabrir(pid, aba, msg) {
  saveData();
  await descarregar();
  if (msg) toast(msg, "success");
  openProntuario(pid, aba, { registrar: false });
}

function confirmar({ titulo, texto, botao, icone = "bi-patch-check", tom = "is-warn" }) {
  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.className = "modal-overlay";
    el.style.zIndex = "3000";
    el.innerHTML = `<div class="modal confirm-dialog" role="alertdialog" aria-labelledby="cf-t"><div class="confirm-icon ${tom}"><i class="bi ${icone}"></i></div><h3 id="cf-t">${titulo}</h3><p>${texto}</p><div class="confirm-actions"><button class="btn btn-secondary" data-r="0">Voltar</button><button class="btn btn-primary" data-r="1">${botao}</button></div></div>`;
    el.onclick = (x) => {
      const r = x.target.closest("[data-r]")?.dataset.r;
      if (r !== undefined || x.target === el) {
        el.remove();
        resolve(r === "1");
      }
    };
    document.body.appendChild(el);
  });
}

// ── Validação (co-assinatura) ────────────────────────────────
export async function validarRegistro(pid, tipo, id) {
  const pac = PACIENTES.find((p) => p.id === pid);
  if (!can("record.validate", pac)) return toast("Só o supervisor do caso ou o técnico responsável pode validar.", "error");
  let reg, aba;
  if (tipo === "anamnese") {
    reg = ANAMNESES[pid];
    aba = "anamnese";
  } else if (tipo === "documento") {
    reg = (DOCUMENTOS[pid] || []).find((d) => String(d.id) === String(id));
    aba = "documentos";
  } else {
    reg = (EVOLUCOES[pid] || []).find((x) => String(x.id) === String(id));
    aba = "evolucoes";
  }
  if (!reg || reg.validacao?.status !== "pendente") return;
  const ok = await confirmar({
    titulo: "Validar e co-assinar este registro?",
    texto: `Ao validar, você assina o registro junto com ${e(reg.autor)} como supervisor responsável (Res. CFP 001/2009, art. 3º). Depois disso, só o autor pode corrigi-lo, por retificação.`,
    botao: "Validar e assinar",
  });
  if (!ok) return;
  reg.validacao = { status: "validada" };
  closeModal();
  await gravarEReabrir(pid, aba, "Registro validado.");
}

// ── Retificação de evolução ──────────────────────────────────
export function openModalRetificarEvolucao(pid, evId) {
  const ev = (EVOLUCOES[pid] || []).find((x) => String(x.id) === String(evId));
  if (!ev) return;
  if (ev.autorId !== currentUser.id) return toast("Só o autor pode retificar a própria evolução.", "error");
  openModal(
    `Retificar evolução #${ev.num}`,
    `<div class="callout" style="margin-bottom:16px"><i class="bi bi-info-circle"></i><span>A versão atual não é apagada: ela fica guardada e visível no prontuário, com a justificativa. ${ev.validacao?.status === "validada" && currentUser.papel === "estudante" ? "A nova versão volta para validação do supervisor." : ""}</span></div>
    <div class="form-group"><label class="form-label" for="rt-conteudo">Novo texto da evolução</label><textarea id="rt-conteudo" class="form-control" rows="9">${e(ev.conteudo)}</textarea></div>
    <div class="form-group"><label class="form-label" for="rt-just">Justificativa da retificação *</label><textarea id="rt-just" class="form-control" rows="2" placeholder="O que estava incorreto e por que está sendo corrigido"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarRetificacao(${pid},'${e(String(ev.id))}')">Salvar nova versão</button>`,
  );
}

export async function salvarRetificacao(pid, evId) {
  const ev = (EVOLUCOES[pid] || []).find((x) => String(x.id) === String(evId));
  const novo = document.getElementById("rt-conteudo").value.trim();
  const just = val("rt-just");
  if (!novo) return toast("O texto da evolução não pode ficar vazio.", "error");
  if (novo === ev.conteudo) return toast("O texto não foi alterado.", "warning");
  if (just.length < 10) return toast("Escreva a justificativa da retificação (mínimo de 10 caracteres).", "error");
  ev.conteudo = novo;
  ev.justificativaRetificacao = just;
  closeModal();
  await gravarEReabrir(pid, "evolucoes", "Evolução retificada. A versão anterior foi preservada.");
}

// ── Encerramento / encaminhamento ────────────────────────────
export function alternarDestinoEncerramento(motivo) {
  const el = document.getElementById("enc-destino-grupo");
  if (el) el.style.display = ["encaminhamento", "transferencia"].includes(motivo) ? "block" : "none";
}

export function openModalEncerramento(pid) {
  const pac = PACIENTES.find((p) => p.id === pid);
  const futuros = AGENDAMENTOS.filter((a) => a.pacienteId === pid && a.data >= hojeISO() && a.status === "confirmado").length;
  openModal(
    `Encerrar atendimento de ${e(pac.nomeSocial || pac.nome)}`,
    `<p class="prose" style="margin-bottom:16px;color:var(--text2)">O registro de encaminhamento ou encerramento é parte obrigatória do prontuário (Res. CFP 001/2009, art. 2º, IV). Registre também abandono, desistência e interrupção.</p>
    <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="enc-motivo">Motivo *</label><select id="enc-motivo" class="form-control" onchange="alternarDestinoEncerramento(this.value)">${Object.entries(MOTIVOS_ENCERRAMENTO).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
    <div class="form-group"><label class="form-label" for="enc-data">Data do encerramento *</label><input type="date" id="enc-data" class="form-control" value="${hojeISO()}"></div></div>
    <div class="form-group" id="enc-destino-grupo" style="display:none"><label class="form-label" for="enc-destino">Encaminhado para *</label><input type="text" id="enc-destino" class="form-control" placeholder="Serviço, profissional ou instituição"></div>
    <div class="form-group"><label class="form-label" for="enc-sintese">Síntese do processo e orientações dadas *</label><textarea id="enc-sintese" class="form-control" rows="4"></textarea></div>
    ${futuros ? `<div class="callout callout-warn"><i class="bi bi-calendar-x"></i><span>${futuros} ${futuros === 1 ? "atendimento futuro será cancelado" : "atendimentos futuros serão cancelados"}.</span></div>` : ""}`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEncerramento(${pid})">Registrar encerramento</button>`,
  );
}

export async function salvarEncerramento(pid) {
  const pac = PACIENTES.find((p) => p.id === pid);
  const motivo = val("enc-motivo");
  const destino = val("enc-destino");
  const sintese = val("enc-sintese");
  const data = val("enc-data");
  if (!sintese) return toast("Escreva a síntese do processo.", "error");
  if (["encaminhamento", "transferencia"].includes(motivo) && !destino) return toast("Informe para onde o paciente foi encaminhado.", "error");
  pac.encerramento = { motivo, data, destino: destino || null, sintese };
  pac.status = "inativo";
  AGENDAMENTOS.filter((a) => a.pacienteId === pid && a.data >= hojeISO() && a.status === "confirmado").forEach((a) => (a.status = "cancelado"));
  // Registro do encerramento também na linha do tempo de evoluções
  (EVOLUCOES[pid] ||= []).push({
    id: generateSequentialId(),
    data: `${data} ${new Date().toTimeString().slice(0, 5)}`,
    tipo: "encerramento",
    conteudo: `Motivo: ${MOTIVOS_ENCERRAMENTO[motivo]}${destino ? `\nDestino: ${destino}` : ""}\nSíntese: ${sintese}`,
    tags: ["encerramento"],
  });
  closeModal();
  await gravarEReabrir(pid, "resumo", "Encerramento registrado.");
}

// ── Documentos psicológicos (Res. CFP 06/2019) ──────────────
const CAMPOS_DOC = {
  declaracao: [["texto", "Informações sobre o acompanhamento *", "Local, dias e horários do acompanhamento. Não inclua sintomas, diagnóstico ou situação clínica (art. 9º).", 4]],
  atestado: [
    ["condicoes", "Descrição das condições psicológicas *", "Fundamentada no registro documental. Texto corrido, sem parágrafos (art. 10).", 4],
    ["cid", "CID (opcional)", "", 1],
  ],
  relatorio: [
    ["demanda", "Descrição da demanda *", "", 3],
    ["procedimento", "Procedimento *", "Recursos técnico-científicos usados, número de encontros e pessoas ouvidas.", 3],
    ["analise", "Análise *", "Exposição descritiva, metódica e objetiva, em terceira pessoa.", 4],
    ["conclusao", "Conclusão *", "", 3],
  ],
  laudo: [
    ["demanda", "Descrição da demanda *", "", 3],
    ["procedimento", "Procedimento *", "Instrumentos e técnicas utilizados.", 3],
    ["analise", "Análise *", "", 4],
    ["conclusao", "Conclusão *", "", 3],
    ["referencias", "Referências *", "Referências bibliográficas usadas (art. 13).", 2],
  ],
  parecer: [
    ["demanda", "Questão a ser respondida (demanda) *", "", 3],
    ["analise", "Análise *", "", 4],
    ["conclusao", "Conclusão *", "", 3],
    ["referencias", "Referências *", "", 2],
  ],
};

export function alternarModalidadeDocumento(mod) {
  const alvo = document.getElementById("doc-campos");
  if (!alvo) return;
  alvo.innerHTML = CAMPOS_DOC[mod]
    .map(([k, rot, dica, linhas]) =>
      linhas === 1
        ? `<div class="form-group"><label class="form-label" for="doc-${k}">${rot}</label><input type="text" id="doc-${k}" class="form-control">${dica ? `<div class="form-hint">${dica}</div>` : ""}</div>`
        : `<div class="form-group"><label class="form-label" for="doc-${k}">${rot}</label><textarea id="doc-${k}" class="form-control" rows="${linhas}"></textarea>${dica ? `<div class="form-hint">${dica}</div>` : ""}</div>`,
    )
    .join("");
  const validade = document.getElementById("doc-validade-grupo");
  if (validade) validade.style.display = mod === "declaracao" ? "none" : "block";
}

export function openModalEmitirDocumento(pid) {
  const pac = PACIENTES.find((p) => p.id === pid);
  openModal(
    "Emitir documento psicológico",
    `<div class="callout" style="margin-bottom:16px"><i class="bi bi-info-circle"></i><span>Estrutura conforme a Res. CFP 06/2019. Escreva em terceira pessoa, de forma impessoal. Uma cópia fica no prontuário com data de emissão, finalidade e destinatário.${currentUser.papel === "estudante" ? " Documentos de estagiários só valem após a co-assinatura do supervisor (Res. CFP 05/2025, art. 19)." : ""}</span></div>
    <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="doc-mod">Modalidade *</label><select id="doc-mod" class="form-control" onchange="alternarModalidadeDocumento(this.value)">${Object.entries(MODALIDADES_DOCUMENTO).map(([k, v]) => `<option value="${k}">${v.titulo} (${v.artigo})</option>`).join("")}</select></div>
    <div class="form-group"><label class="form-label" for="doc-solic">Solicitante *</label><input type="text" id="doc-solic" class="form-control" value="${e(pac.responsavel ? `${pac.responsavel.nome} (responsável legal)` : pac.nome)}"></div></div>
    <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="doc-final">Finalidade *</label><input type="text" id="doc-final" class="form-control" placeholder="Para que o documento será usado"></div>
    <div class="form-group"><label class="form-label" for="doc-dest">Destinatário *</label><input type="text" id="doc-dest" class="form-control" placeholder="A quem será entregue"></div></div>
    <div id="doc-campos"></div>
    <div class="form-row form-row-2"><div class="form-group" id="doc-validade-grupo" style="display:none"><label class="form-label" for="doc-validade">Prazo de validade do conteúdo *</label><input type="text" id="doc-validade" class="form-control" placeholder="Ex.: 6 (seis) meses"><div class="form-hint">Vai no último parágrafo do documento (art. 17).</div></div>
    <div class="form-group"><label class="form-label" for="doc-local">Local</label><input type="text" id="doc-local" class="form-control" value="São Paulo"></div></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarDocumentoEmitido(${pid})">Emitir documento</button>`,
  );
  alternarModalidadeDocumento("declaracao");
}

export async function salvarDocumentoEmitido(pid) {
  const pac = PACIENTES.find((p) => p.id === pid);
  const mod = val("doc-mod");
  const conteudo = {};
  for (const [k, rot] of CAMPOS_DOC[mod]) {
    conteudo[k] = val(`doc-${k}`);
    if (rot.endsWith("*") && !conteudo[k]) return toast(`Preencha: ${rot.replace(" *", "")}.`, "error");
  }
  if (!val("doc-solic") || !val("doc-final") || !val("doc-dest")) return toast("Informe solicitante, finalidade e destinatário.", "error");
  if (mod !== "declaracao" && !val("doc-validade")) return toast("Informe o prazo de validade do conteúdo.", "error");
  if (mod === "declaracao" && /\b(F\d{2}|CID|diagn|sintom|transtorno|depress|ansiedad)/i.test(conteudo.texto))
    return toast("A declaração não pode conter sintomas, diagnóstico ou situação clínica (Res. CFP 06/2019, art. 9º).", "error");
  const titulo = MODALIDADES_DOCUMENTO[mod].titulo;
  const id = `doc_${generateId()}`;
  (DOCUMENTOS[pid] ||= []).push({
    id,
    categoria: "emitido",
    compartimento: "prontuario",
    modalidade: mod,
    titulo,
    nome: `${titulo.replace(/\s+/g, "_")}_${pac.nome.replace(/\s+/g, "_")}.pdf`,
    tipo: "pdf",
    solicitante: val("doc-solic"),
    finalidade: val("doc-final"),
    destinatario: val("doc-dest"),
    validade: mod === "declaracao" ? null : `O conteúdo deste documento tem validade de ${val("doc-validade")} a partir da data de emissão.`,
    local: val("doc-local") || "São Paulo",
    dataEmissao: hojeISO(),
    data: hojeISO(),
    conteudo,
  });
  closeModal();
  await gravarEReabrir(pid, "documentos", currentUser.papel === "estudante" ? "Documento emitido. Aguardando co-assinatura do supervisor." : "Documento emitido.");
}

function _laudaHtml(pac, doc) {
  const inst = SESSAO.institucional || {};
  const mod = doc.modalidade;
  const c = doc.conteudo || {};
  const assin = (doc.assinaturas || [])
    .map((a) => `<div class="assin"><div class="linha"></div><strong>${e(a.nome)}</strong><br>${a.papel === "estudante" ? "Estagiário(a) de Psicologia" : "Psicólogo(a)"}${a.registro ? ` · ${e(a.registro)}` : ""}<br><small>Assinatura eletrônica em ${fmtDataHora(a.em)} · ${e(a.hash.slice(0, 16))}</small></div>`)
    .join("");
  const autores = (doc.assinaturas || []).map((a) => `${e(a.nome)}${a.registro ? ` (${e(a.registro)})` : ""}`).join("; ");
  const ident = `<section><h2>1. Identificação</h2><p><strong>Autor(es):</strong> ${autores}<br><strong>Interessado:</strong> ${e(pac.nomeSocial || pac.nome)}<br><strong>Solicitante:</strong> ${e(doc.solicitante)}<br><strong>Finalidade:</strong> ${e(doc.finalidade)}</p></section>`;
  let corpo;
  if (mod === "declaracao")
    corpo = `<p>${e(c.texto)}</p><p><strong>Solicitante:</strong> ${e(doc.solicitante)}. <strong>Finalidade:</strong> ${e(doc.finalidade)}.</p>`;
  else if (mod === "atestado")
    corpo = `<p class="corrido">Atesto, para fins de ${e(doc.finalidade)}, a pedido de ${e(doc.solicitante)}, que ${e(pac.nomeSocial || pac.nome)} ${e(c.condicoes)}${c.cid ? ` (CID ${e(c.cid)})` : ""}.</p>`;
  else {
    const secs = [
      ["demanda", "Descrição da demanda"],
      ["procedimento", "Procedimento"],
      ["analise", "Análise"],
      ["conclusao", "Conclusão"],
      ["referencias", "Referências"],
    ].filter(([k]) => c[k]);
    corpo = ident + secs.map(([k, t], i) => `<section><h2>${i + 2}. ${t}</h2><p>${e(c[k])}</p></section>`).join("");
  }
  return `<header><small>${e(inst.controlador || "")} · ${e(inst.servico || "")}</small><h1>${e(MODALIDADES_DOCUMENTO[mod]?.titulo || doc.titulo).toUpperCase()}</h1></header>
  ${corpo}
  ${doc.validade ? `<p>${e(doc.validade)}</p>` : ""}
  <p class="local">${e(doc.local || "São Paulo")}, ${new Date(doc.dataEmissao + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}.</p>
  <div class="assinaturas">${assin}</div>
  ${doc.validacao?.status === "pendente" ? `<p class="aviso">Documento ainda sem co-assinatura do supervisor: não pode ser entregue.</p>` : ""}
  <section class="protocolo"><h2>Protocolo de entrega (Res. CFP 06/2019, art. 16, §1º)</h2><p>Recebi o documento "${e(MODALIDADES_DOCUMENTO[mod]?.titulo || doc.titulo)}" referente a ${e(pac.nomeSocial || pac.nome)}.</p><p>Nome: ______________________________________ Data: ____/____/______</p><p>Assinatura: _________________________________</p></section>`;
}

export function imprimirDocumentoEmitido(pid, docId) {
  const pac = PACIENTES.find((p) => p.id === pid);
  const doc = (DOCUMENTOS[pid] || []).find((d) => String(d.id) === String(docId));
  if (!doc) return;
  const inst = SESSAO.institucional || {};
  const w = window.open("", "_blank", "width=820,height=1000");
  w.document.write(`<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>${e(doc.titulo)} - ${e(pac.nome)}</title><style>
    @page { size: A4; margin: 25mm 22mm 25mm 25mm;
      @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 9pt Arial, sans-serif; color: #555; }
      @bottom-left { content: "Rubrica: ________"; font: 9pt Arial, sans-serif; color: #555; } }
    body { font-family: "Times New Roman", Georgia, serif; font-size: 12pt; line-height: 1.6; color: #111; max-width: 680px; margin: 0 auto; padding: 24px; }
    header { text-align: center; margin-bottom: 28px; } header small { font-family: Arial, sans-serif; font-size: 9pt; color: #444; }
    h1 { font-size: 14pt; letter-spacing: .04em; margin: 10px 0 0; } h2 { font-size: 12pt; margin: 18px 0 6px; }
    p { text-align: justify; margin: 0 0 10px; } .corrido { text-indent: 2em; }
    .local { text-align: right; margin-top: 24px; } .assinaturas { display: flex; gap: 32px; margin-top: 48px; flex-wrap: wrap; }
    .assin { flex: 1; min-width: 220px; font-size: 10.5pt; text-align: center; } .assin .linha { border-top: 1px solid #111; margin-bottom: 6px; }
    .assin small { font-family: Arial, sans-serif; font-size: 8pt; color: #555; }
    .protocolo { page-break-before: always; } .aviso { color: #a00; font-weight: bold; text-align: center; }
    footer { margin-top: 40px; font: 8pt Arial, sans-serif; color: #666; border-top: 1px solid #ccc; padding-top: 6px; }
  </style></head><body>${_laudaHtml(pac, doc)}<footer>${e(inst.software?.nome || "PEP")} ${e(inst.software?.versao || "")} · Documento ${e(doc.id)} · Impresso por ${e(currentUser.nome)} em ${new Date().toLocaleString("pt-BR")}</footer></body></html>`);
  w.document.close();
  w.onload = () => w.print();
  logAudit("impressao", "Imprimiu documento", null, { evento: "impressao", pacienteId: pid, registroId: doc.id, complemento: doc.modalidade });
}

export function openModalDevolutivaEntrega(pid, docId, tipo) {
  const doc = (DOCUMENTOS[pid] || []).find((d) => String(d.id) === String(docId));
  const dev = tipo === "devolutiva";
  openModal(
    dev ? "Registrar devolutiva" : "Registrar entrega",
    dev
      ? `<p class="prose" style="color:var(--text2);margin-bottom:12px">A devolutiva é obrigatória para relatório e laudo. Se não ocorrer, registre o motivo (Res. CFP 06/2019, art. 18).</p>
      <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="dv-real">Devolutiva realizada?</label><select id="dv-real" class="form-control"><option value="sim">Sim</option><option value="nao">Não</option></select></div><div class="form-group"><label class="form-label" for="dv-data">Data</label><input type="date" id="dv-data" class="form-control" value="${hojeISO()}"></div></div>
      <div class="form-group"><label class="form-label" for="dv-obs">Observação ou motivo *</label><textarea id="dv-obs" class="form-control" rows="3"></textarea></div>`
      : `<div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="dv-data">Data da entrega</label><input type="date" id="dv-data" class="form-control" value="${hojeISO()}"></div><div class="form-group"><label class="form-label" for="dv-rec">Recebido por *</label><input type="text" id="dv-rec" class="form-control" value="${e(doc.solicitante || "")}"></div></div>
      <div class="form-hint">Guarde o protocolo de entrega assinado (última página da impressão).</div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarDevolutivaEntrega(${pid},'${e(String(docId))}','${tipo}')">Registrar</button>`,
  );
}

export async function salvarDevolutivaEntrega(pid, docId, tipo) {
  const doc = (DOCUMENTOS[pid] || []).find((d) => String(d.id) === String(docId));
  if (tipo === "devolutiva") {
    if (!val("dv-obs")) return toast("Escreva a observação ou o motivo.", "error");
    doc.devolutiva = { realizada: val("dv-real") === "sim", data: val("dv-data"), observacao: val("dv-obs") };
  } else {
    if (!val("dv-rec")) return toast("Informe quem recebeu o documento.", "error");
    doc.entrega = { data: val("dv-data"), recebidoPor: val("dv-rec") };
  }
  closeModal();
  await gravarEReabrir(pid, "documentos", tipo === "devolutiva" ? "Devolutiva registrada." : "Entrega registrada.");
}

/** Conteúdo do modal de um documento emitido (usado por openModalDocumento). */
export function htmlDocumentoEmitido(pid, doc) {
  const pac = PACIENTES.find((p) => p.id === pid);
  const pendente = doc.validacao?.status === "pendente";
  const linhas = [
    ["Modalidade", MODALIDADES_DOCUMENTO[doc.modalidade]?.titulo],
    ["Data de emissão", formatBR(doc.dataEmissao)],
    ["Solicitante", doc.solicitante],
    ["Finalidade", doc.finalidade],
    ["Destinatário", doc.destinatario],
    ["Assinaturas", (doc.assinaturas || []).map((a) => `${a.nome}${a.registro ? ` (${a.registro})` : ""}`).join("; ")],
    ["Co-assinatura do supervisor", pendente ? "Pendente" : doc.validacao?.por ? `${doc.validacao.por}, ${fmtDataHora(doc.validacao.em)}` : "—"],
    ["Devolutiva", doc.devolutiva ? `${doc.devolutiva.realizada ? "Realizada" : "Não realizada"} em ${formatBR(doc.devolutiva.data)}: ${doc.devolutiva.observacao}` : ["relatorio", "laudo"].includes(doc.modalidade) ? "Pendente" : "Não se aplica"],
    ["Entrega", doc.entrega ? `${formatBR(doc.entrega.data)} a ${doc.entrega.recebidoPor}` : "Pendente"],
  ];
  const equipe = currentUser.papel !== "paciente";
  const acoes = [
    `<button class="btn btn-secondary" onclick="imprimirDocumentoEmitido(${pid},'${e(String(doc.id))}')"><i class="bi bi-printer"></i> Imprimir</button>`,
    equipe && pendente && can("record.validate", pac) ? `<button class="btn btn-primary" onclick="validarRegistro(${pid},'documento','${e(String(doc.id))}')"><i class="bi bi-patch-check"></i> Co-assinar</button>` : "",
    equipe && !pendente && ["relatorio", "laudo"].includes(doc.modalidade) && !doc.devolutiva ? `<button class="btn btn-secondary" onclick="openModalDevolutivaEntrega(${pid},'${e(String(doc.id))}','devolutiva')">Registrar devolutiva</button>` : "",
    equipe && !pendente && !doc.entrega ? `<button class="btn btn-secondary" onclick="openModalDevolutivaEntrega(${pid},'${e(String(doc.id))}','entrega')">Registrar entrega</button>` : "",
  ].join("");
  return {
    corpo: `${pendente ? `<div class="callout callout-warn" style="margin-bottom:16px"><i class="bi bi-hourglass-split"></i><span>Documento de estagiário aguardando co-assinatura do supervisor. Não pode ser entregue antes disso.</span></div>` : ""}
      <dl class="data-list">${linhas.map(([l, v]) => `<div><dt>${l}</dt><dd>${e(v || "—")}</dd></div>`).join("")}</dl>
      <h4 class="doc-group-title" style="margin-top:20px">Conteúdo</h4>
      ${Object.entries(doc.conteudo || {})
        .filter(([, v]) => v)
        .map(([k, v]) => `<p class="prose"><strong class="ev-label">${e({ texto: "Texto", condicoes: "Condições", cid: "CID", demanda: "Demanda", procedimento: "Procedimento", analise: "Análise", conclusao: "Conclusão", referencias: "Referências" }[k] || k)}:</strong> ${e(v)}</p>`)
        .join("")}
      ${doc.validade ? `<p class="prose muted">${e(doc.validade)}</p>` : ""}`,
    rodape: `<button class="btn btn-ghost" onclick="closeModal()">Fechar</button>${acoes}`,
  };
}

// ── Comunicações / compartilhamentos ─────────────────────────
export function alternarTipoComunicacao(tipo) {
  const vis = document.getElementById("cm-visivel");
  const fund = document.getElementById("cm-fund-rot");
  const exige = ["quebra_sigilo", "notificacao_compulsoria", "resposta_judicial"].includes(tipo);
  if (fund) fund.textContent = exige ? "Fundamento legal ou ético *" : "Fundamento (autorização, consentimento)";
  if (vis) vis.checked = tipo !== "notificacao_compulsoria";
}

export function openModalComunicacao(pid) {
  openModal(
    "Registrar comunicação de informações",
    `<p class="prose" style="color:var(--text2);margin-bottom:12px">Informe apenas o estritamente necessário (Código de Ética, arts. 10 e 13). Pedidos judiciais são respondidos por documento psicológico, não por cópia do prontuário.</p>
    <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="cm-tipo">Tipo *</label><select id="cm-tipo" class="form-control" onchange="alternarTipoComunicacao(this.value)">${Object.entries(TIPOS_COMPARTILHAMENTO).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
    <div class="form-group"><label class="form-label" for="cm-data">Data *</label><input type="date" id="cm-data" class="form-control" value="${hojeISO()}"></div></div>
    <div class="form-group"><label class="form-label" for="cm-dest">Destinatário *</label><input type="text" id="cm-dest" class="form-control" placeholder="Pessoa, serviço ou órgão"></div>
    <div class="form-group"><label class="form-label" for="cm-final">Finalidade *</label><input type="text" id="cm-final" class="form-control"></div>
    <div class="form-group"><label class="form-label" for="cm-fund" id="cm-fund-rot">Fundamento (autorização, consentimento)</label><input type="text" id="cm-fund" class="form-control" placeholder="Ex.: autorização escrita do paciente em 10/10/2026; ECA, art. 13"></div>
    <div class="form-group"><label class="form-label" for="cm-resumo">O que foi informado *</label><textarea id="cm-resumo" class="form-control" rows="3"></textarea></div>
    <label class="login-check"><input type="checkbox" id="cm-visivel" checked><span>Exibir este registro ao paciente no portal (LGPD, art. 18, VII)</span></label>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarComunicacao(${pid})">Registrar</button>`,
  );
}

export async function salvarComunicacao(pid) {
  const tipo = val("cm-tipo");
  if (!val("cm-dest") || !val("cm-final") || !val("cm-resumo")) return toast("Preencha destinatário, finalidade e o que foi informado.", "error");
  if (["quebra_sigilo", "notificacao_compulsoria", "resposta_judicial"].includes(tipo) && !val("cm-fund"))
    return toast("Informe o fundamento legal ou ético.", "error");
  (COMPARTILHAMENTOS[pid] ||= []).push({
    id: `comp_${generateId()}`,
    tipo,
    data: val("cm-data"),
    destinatario: val("cm-dest"),
    finalidade: val("cm-final"),
    fundamento: val("cm-fund") || null,
    resumo: val("cm-resumo"),
    visivelAoTitular: document.getElementById("cm-visivel").checked,
  });
  closeModal();
  await gravarEReabrir(pid, "termos", "Comunicação registrada.");
}

// ── Consentimentos ───────────────────────────────────────────
export function openModalConsentimento(pid) {
  const pac = PACIENTES.find((p) => p.id === pid);
  const tipos = Object.entries(TIPOS_CONSENTIMENTO).filter(([k]) => k !== "autorizacao_responsavel" || ehMenor(pac));
  openModal(
    "Registrar consentimento",
    `<div class="form-group"><label class="form-label" for="cs-tipo">Termo *</label><select id="cs-tipo" class="form-control">${tipos.map(([k, v]) => `<option value="${k}">${v.rotulo}</option>`).join("")}</select></div>
    <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="cs-data">Data da assinatura *</label><input type="date" id="cs-data" class="form-control" value="${hojeISO()}"></div>
    <div class="form-group"><label class="form-label" for="cs-por">Assinado por *</label><input type="text" id="cs-por" class="form-control" value="${e(pac.responsavel ? `${pac.responsavel.nome} (${pac.responsavel.vinculo})` : "Paciente")}"></div></div>
    <div class="form-hint">Guarde o termo assinado na aba Documentos (categoria "Termo").</div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarConsentimento(${pid})">Registrar</button>`,
  );
}

export async function salvarConsentimento(pid) {
  const pac = PACIENTES.find((p) => p.id === pid);
  if (!val("cs-por")) return toast("Informe quem assinou.", "error");
  (pac.consentimentos ||= []).push({ id: `cons_${generateId()}`, tipo: val("cs-tipo"), versao: "2026-1", data: val("cs-data"), aceito: true, assinadoPor: val("cs-por") });
  closeModal();
  await gravarEReabrir(pid, "termos", "Consentimento registrado.");
}

export function openModalRevogarConsentimento(pid, consId) {
  const pac = PACIENTES.find((p) => p.id === pid);
  const c = (pac.consentimentos || []).find((x) => x.id === consId);
  openModal(
    "Registrar revogação",
    `<p class="prose" style="margin-bottom:12px">Revogar: <strong>${e(TIPOS_CONSENTIMENTO[c.tipo]?.rotulo || c.tipo)}</strong>. A revogação não afeta o atendimento e fica registrada com data e motivo.</p>
    <div class="form-group"><label class="form-label" for="rv-motivo">Motivo / como foi solicitada *</label><textarea id="rv-motivo" class="form-control" rows="3"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarRevogacao(${pid},'${e(consId)}')">Registrar revogação</button>`,
  );
}

export async function salvarRevogacao(pid, consId) {
  const pac = PACIENTES.find((p) => p.id === pid);
  const c = (pac.consentimentos || []).find((x) => x.id === consId);
  if (!val("rv-motivo")) return toast("Informe o motivo.", "error");
  c.revogadoEm = new Date().toISOString();
  c.motivoRevogacao = val("rv-motivo");
  closeModal();
  await gravarEReabrir(pid, "termos", "Revogação registrada.");
}

// ── Registro documental ──────────────────────────────────────
export function openModalRegistroDocumental(pid) {
  const tipos = Object.entries(TIPOS_REGISTRO_DOCUMENTAL).filter(([k]) => k !== "instrucao" || currentUser.papel !== "estudante");
  openModal(
    "Novo registro documental",
    `<div class="callout" style="margin-bottom:16px"><i class="bi bi-eye-slash"></i><span>Este registro não aparece para o paciente. Use para supervisões, orientações e hipóteses que não serão compartilhadas.</span></div>
    <div class="form-row form-row-2"><div class="form-group"><label class="form-label" for="rd-tipo">Tipo *</label><select id="rd-tipo" class="form-control">${tipos.map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
    <div class="form-group"><label class="form-label" for="rd-data">Data/hora *</label><input type="datetime-local" id="rd-data" class="form-control" value="${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}"></div></div>
    <div class="form-group"><label class="form-label" for="rd-conteudo">Conteúdo *</label><textarea id="rd-conteudo" class="form-control" rows="6"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarRegistroDocumental(${pid})">Registrar</button>`,
  );
}

export async function salvarRegistroDocumental(pid) {
  if (!val("rd-conteudo")) return toast("Escreva o conteúdo do registro.", "error");
  (REGISTRO_DOCUMENTAL[pid] ||= []).push({ id: `rd_${generateId()}`, tipo: val("rd-tipo"), data: val("rd-data").replace("T", " "), conteudo: val("rd-conteudo") });
  closeModal();
  await gravarEReabrir(pid, "registro", "Registro documental salvo.");
}

// ── Solicitações do titular (LGPD art. 18) ───────────────────
export const TIPOS_SOLICITACAO = {
  acesso: "Acesso ao prontuário",
  copia: "Cópia do prontuário",
  correcao: "Correção de dados incorretos",
  compartilhamentos: "Informação sobre compartilhamentos",
  revogacao: "Revogação de consentimento opcional",
  outro: "Outra solicitação",
};

export function openModalSolicitacaoTitular(pid) {
  const alvo = pid ?? currentUser.id;
  const prazo = SESSAO.institucional?.prazoRespostaTitularDias || 15;
  openModal(
    "Nova solicitação",
    `<p class="prose" style="color:var(--text2);margin-bottom:12px">Sua solicitação é gratuita e será respondida em até ${prazo} dias (LGPD, art. 19).</p>
    <div class="form-group"><label class="form-label" for="st-tipo">O que você precisa? *</label><select id="st-tipo" class="form-control">${Object.entries(TIPOS_SOLICITACAO).filter(([k]) => k !== "acesso").map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
    <div class="form-group"><label class="form-label" for="st-desc">Detalhes *</label><textarea id="st-desc" class="form-control" rows="4" placeholder="Ex.: qual dado está incorreto e qual é o correto"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarSolicitacaoTitular(${alvo})">Enviar solicitação</button>`,
  );
}

export async function salvarSolicitacaoTitular(pid) {
  const pac = PACIENTES.find((p) => p.id === pid);
  if (!val("st-desc")) return toast("Descreva sua solicitação.", "error");
  ACESSO_PACIENTE.push({ id: `sol_${generateId()}`, pacienteId: pid, nome: pac?.nome || "", tipo: val("st-tipo"), descricao: val("st-desc"), protocolo: `PROT-${Date.now().toString(36).toUpperCase()}` });
  closeModal();
  saveData();
  await descarregar();
  toast("Solicitação registrada. Acompanhe o prazo nesta página.", "success");
  navigate(currentUser.papel === "paciente" ? "meu-prontuario" : "acesso-pac");
}

export function openModalResponderSolicitacao(solId) {
  const s = ACESSO_PACIENTE.find((x) => String(x.id) === String(solId));
  openModal(
    `Responder: ${e(TIPOS_SOLICITACAO[s.tipo] || s.tipo)}`,
    `<dl class="data-list" style="margin-bottom:16px"><div><dt>Titular</dt><dd>${e(s.nome)}</dd></div><div><dt>Solicitada em</dt><dd>${formatBR(s.solicitacao)}</dd></div><div><dt>Prazo</dt><dd>${formatBR(s.prazo)}</dd></div><div><dt>Detalhes</dt><dd>${e(s.descricao || "—")}</dd></div></dl>
    <div class="form-group"><label class="form-label" for="rs-status">Resultado *</label><select id="rs-status" class="form-control"><option value="atendida">Atendida</option><option value="parcial">Atendida em parte</option><option value="negada">Não atendida (com justificativa)</option></select></div>
    <div class="form-group"><label class="form-label" for="rs-resp">Resposta ao titular *</label><textarea id="rs-resp" class="form-control" rows="4" placeholder="Ex.: correção feita no cadastro; ou: o prontuário não pode ser eliminado antes do prazo legal de guarda (LGPD, art. 16, I)."></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarRespostaSolicitacao('${e(String(solId))}')">Registrar resposta</button>`,
  );
}

export async function salvarRespostaSolicitacao(solId) {
  const s = ACESSO_PACIENTE.find((x) => String(x.id) === String(solId));
  if (!val("rs-resp")) return toast("Escreva a resposta.", "error");
  s.status = val("rs-status");
  s.resposta = val("rs-resp");
  closeModal();
  saveData();
  await descarregar();
  toast("Resposta registrada.", "success");
  navigate("acesso-pac");
}

export function nomeUsuarioPorId(id) {
  return USERS.find((u) => u.id === id)?.nome || "—";
}
