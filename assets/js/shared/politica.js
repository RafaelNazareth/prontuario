// ============================================================
// shared/politica.js
// ------------------------------------------------------------
// Autorização no SERVIDOR (SBIS NGS1.05.02; LGPD art. 46).
// O navegador só recebe o que o papel do usuário pode ver e cada
// gravação é conferida item a item antes de ir para o disco.
//
// Leitura (escopo):
//   técnico    → todos os pacientes (é o responsável técnico)
//   supervisor → pacientes que supervisiona
//   estudante  → pacientes do seu grupo
//   paciente   → o próprio prontuário (acesso integral, Res. CFP
//                001/2009 art. 5º II), SEM o registro documental e
//                sem material restrito de testes (Res. CFP 05/2025
//                arts. 14 e 17 §2º)
//
// Escrita (regras que o navegador não consegue contornar):
//   - nada é excluído: registro ausente na gravação continua no banco
//     (SBIS NGS1.12.03; Lei 13.787 art. 6º);
//   - evolução: só criação, validação (co-assinatura do supervisor,
//     Res. CFP 001/2009 art. 3º) e retificação pelo próprio autor com
//     justificativa, guardando a versão anterior (SBIS NGS1.12.01);
//   - avaliação de demanda (anamnese) finalizada não muda;
//   - autor, data/hora de registro e assinatura são carimbados aqui;
//   - trilha de auditoria e usuários não são gravados por esta rota.
// ============================================================

import { sha256Hex } from "./sha256.js";

export const PAPEIS_EQUIPE = ["tecnico", "supervisor", "estudante"];

// ── Utilidades ───────────────────────────────────────────────
export function estavel(v) {
  if (Array.isArray(v)) return `[${v.map(estavel).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .filter((k) => v[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${estavel(v[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}
const igual = (a, b) => estavel(a) === estavel(b);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const agoraISO = () => new Date().toISOString();

export function hashRegistro(...partes) {
  return sha256Hex(partes.map((p) => estavel(p)).join("|"));
}

function identificacaoProfissional(user) {
  return user.crp ? user.crp : user.matricula ? `Matrícula ${user.matricula}` : null;
}

function assinaturaDe(user, conteudoHash) {
  return {
    userId: user.id,
    nome: user.nome,
    papel: user.papel,
    registro: identificacaoProfissional(user),
    em: agoraISO(),
    hash: conteudoHash,
  };
}

// ── Escopo de leitura ────────────────────────────────────────
export function pacientesPermitidos(user, db) {
  switch (user.papel) {
    case "tecnico":
      return db.PACIENTES.map((p) => p.id);
    case "supervisor":
      return db.PACIENTES.filter((p) => p.supervisorId === user.id).map((p) => p.id);
    case "estudante":
      return db.PACIENTES.filter((p) => (p.estudantesIds || []).includes(user.id)).map((p) => p.id);
    case "paciente":
      return db.PACIENTES.filter((p) => p.id === user.id).map((p) => p.id);
    default:
      return [];
  }
}

export function usuarioPublico(u, { completo = false } = {}) {
  const base = {
    id: u.id,
    nome: u.nome,
    papel: u.papel,
    avatar: u.avatar,
    color: u.color,
    crp: u.crp || null,
    matricula: u.matricula || null,
    ativo: u.ativo !== false,
  };
  if (!completo) return base;
  return {
    ...base,
    login: u.login,
    ultimoAcesso: u.seguranca?.ultimoAcesso || null,
    bloqueadoAte: u.seguranca?.bloqueadoAte || null,
    trocaObrigatoria: Boolean(u.seguranca?.trocaObrigatoria),
  };
}

function filtrarMapa(mapa = {}, ids, filtroItem) {
  const out = {};
  for (const id of ids) {
    if (mapa[id] === undefined) continue;
    out[id] = filtroItem && Array.isArray(mapa[id]) ? mapa[id].filter(filtroItem) : mapa[id];
  }
  return out;
}

/** Dataset que o usuário pode ver. */
export function escopo(user, db) {
  const ids = pacientesPermitidos(user, db);
  const idSet = new Set(ids);
  const naEquipe = PAPEIS_EQUIPE.includes(user.papel);

  if (!naEquipe) {
    // Paciente: acesso integral ao próprio prontuário (sem registro
    // documental, sem material restrito e sem registros não finalizados).
    const pac = db.PACIENTES.find((p) => idSet.has(p.id));
    const equipe = new Set([pac?.supervisorId, ...(pac?.estudantesIds || [])]);
    const anamnese = db.ANAMNESES?.[user.id];
    return {
      USERS: db.USERS.filter((u) => equipe.has(u.id) || u.papel === "tecnico" || u.id === user.id).map((u) => usuarioPublico(u)),
      PACIENTES: pac ? [pac] : [],
      ANAMNESES: anamnese && anamnese.status === "finalizada" ? { [user.id]: anamnese } : {},
      EVOLUCOES: filtrarMapa(db.EVOLUCOES, ids, (e) => e.validacao?.status !== "pendente"),
      DOCUMENTOS: filtrarMapa(
        db.DOCUMENTOS,
        ids,
        (d) => d.compartimento !== "restrito" && d.validacao?.status !== "pendente",
      ),
      REGISTRO_DOCUMENTAL: {},
      COMPARTILHAMENTOS: filtrarMapa(db.COMPARTILHAMENTOS, ids, (c) => c.visivelAoTitular !== false),
      AGENDAMENTOS: db.AGENDAMENTOS.filter((a) => idSet.has(a.pacienteId)),
      FALTAS: db.FALTAS.filter((f) => idSet.has(f.pacienteId)),
      NOTIFICACOES: [],
      ACESSO_PACIENTE: db.ACESSO_PACIENTE.filter((r) => idSet.has(r.pacienteId)),
      AUDITORIA: [],
    };
  }

  const tecnico = user.papel === "tecnico";
  return {
    USERS: db.USERS.filter((u) => u.papel !== "paciente" || idSet.has(u.id)).map((u) => usuarioPublico(u, { completo: tecnico })),
    PACIENTES: db.PACIENTES.filter((p) => idSet.has(p.id)),
    ANAMNESES: filtrarMapa(db.ANAMNESES, ids),
    EVOLUCOES: filtrarMapa(db.EVOLUCOES, ids),
    DOCUMENTOS: filtrarMapa(db.DOCUMENTOS, ids),
    REGISTRO_DOCUMENTAL: filtrarMapa(db.REGISTRO_DOCUMENTAL, ids),
    COMPARTILHAMENTOS: filtrarMapa(db.COMPARTILHAMENTOS, ids),
    AGENDAMENTOS: db.AGENDAMENTOS.filter((a) => idSet.has(a.pacienteId)),
    FALTAS: db.FALTAS.filter((f) => idSet.has(f.pacienteId)),
    NOTIFICACOES: db.NOTIFICACOES.filter(
      (n) => tecnico || idSet.has(n.pacienteId) || (n.estudantesIds || []).includes(user.id),
    ),
    ACESSO_PACIENTE: tecnico ? db.ACESSO_PACIENTE : [],
    AUDITORIA: [],
  };
}

// ── Escrita ──────────────────────────────────────────────────
class Recusa extends Error {}
const recusar = (msg) => {
  throw new Recusa(msg);
};

function camposAlterados(antes, depois) {
  const chaves = new Set([...Object.keys(antes || {}), ...Object.keys(depois || {})]);
  return [...chaves].filter((k) => !igual(antes?.[k], depois?.[k]));
}

function exigirPaciente(ctx, pid) {
  if (!ctx.permitidos.has(Number(pid))) recusar(`Sem permissão para o paciente ${pid}.`);
}

function exigirEquipe(ctx) {
  if (!PAPEIS_EQUIPE.includes(ctx.user.papel)) recusar("Operação permitida apenas à equipe do Serviço-Escola.");
}

function podeValidar(ctx, pid) {
  const pac = ctx.db.PACIENTES.find((p) => p.id === Number(pid));
  return ctx.user.papel === "tecnico" || (ctx.user.papel === "supervisor" && pac?.supervisorId === ctx.user.id);
}

function validacaoInicial(user) {
  if (user.papel === "estudante") return { status: "pendente" };
  return { status: "validada", porId: user.id, por: user.nome, registro: identificacaoProfissional(user), em: agoraISO() };
}

function idsEmUso(mapa) {
  return new Set(Object.values(mapa || {}).flat().map((x) => String(x.id)));
}

// PACIENTES
function mesclarPacientes(ctx, entrada = []) {
  const { db, user } = ctx;
  for (const p of entrada) {
    const atual = db.PACIENTES.find((x) => x.id === p.id);
    if (!atual) {
      if (user.papel !== "tecnico") recusar("Apenas o técnico responsável cadastra pacientes.");
      if (db.PACIENTES.some((x) => x.cpf && x.cpf === p.cpf)) recusar("Já existe paciente com este CPF.");
      const novo = clone(p);
      novo.cadastradoEm = agoraISO();
      novo.cadastradoPorId = user.id;
      (novo.consentimentos || []).forEach((c) => carimbarConsentimento(c, user));
      db.PACIENTES.push(novo);
      ctx.ev("paciente_criado", novo.id, novo.id);
      (novo.consentimentos || []).forEach((c) => ctx.ev("consentimento_registrado", novo.id, c.id, c.tipo));
      continue;
    }
    if (igual(atual, p)) continue;
    exigirPaciente(ctx, atual.id);
    const alterados = camposAlterados(atual, p);
    if (alterados.includes("id")) recusar("O identificador do paciente não pode mudar.");

    // Consentimentos: lista só cresce; revogação = marcar revogadoEm com motivo.
    if (alterados.includes("consentimentos")) {
      exigirEquipe(ctx);
      const antes = atual.consentimentos || [];
      const depois = p.consentimentos || [];
      antes.forEach((c, i) => {
        const d = depois.find((x) => x.id === c.id);
        if (!d) recusar("Consentimentos não podem ser apagados; registre a revogação.");
        if (!igual(c, d)) {
          const mud = camposAlterados(c, d);
          if (c.revogadoEm || mud.some((k) => !["revogadoEm", "motivoRevogacao", "revogadoPorId"].includes(k)))
            recusar("Consentimento registrado só pode receber revogação.");
          if (!String(d.motivoRevogacao || "").trim()) recusar("Informe o motivo da revogação.");
          d.revogadoEm = agoraISO();
          d.revogadoPorId = user.id;
          ctx.ev("consentimento_revogado", atual.id, c.id, c.tipo);
        }
        depois[i] = d;
      });
      depois
        .filter((d) => !antes.some((c) => c.id === d.id))
        .forEach((d) => {
          carimbarConsentimento(d, user);
          ctx.ev("consentimento_registrado", atual.id, d.id, d.tipo);
        });
    }

    const resto = alterados.filter((k) => k !== "consentimentos");
    if (resto.length) {
      const encerramento = resto.every((k) => ["status", "encerramento"].includes(k));
      if (user.papel === "tecnico") {
        // pode alterar o cadastro
      } else if (user.papel === "supervisor" && encerramento) {
        // supervisor do caso pode registrar encerramento
      } else recusar("Sem permissão para alterar o cadastro deste paciente.");
      if (resto.includes("encerramento") && p.encerramento) {
        if (atual.encerramento) recusar("O encerramento já foi registrado e não pode ser alterado.");
        p.encerramento = { ...p.encerramento, registradoPorId: user.id, registradoPor: user.nome, registradoEm: agoraISO() };
        ctx.ev("caso_encerrado", atual.id, atual.id, p.encerramento.motivo);
      } else ctx.ev("paciente_atualizado", atual.id, atual.id, resto.join(","));
    }
    Object.keys(atual).forEach((k) => delete atual[k]);
    Object.assign(atual, clone(p));
  }
}

function carimbarConsentimento(c, user) {
  c.registradoEm = agoraISO();
  c.registradoPorId = user.id;
  c.registradoPor = user.nome;
}

// ANAMNESES (avaliação de demanda e objetivos)
function mesclarAnamneses(ctx, entrada = {}) {
  const { db, user } = ctx;
  db.ANAMNESES ||= {};
  for (const [pid, a] of Object.entries(entrada)) {
    const atual = db.ANAMNESES[pid];
    if (igual(atual, a)) continue;
    exigirPaciente(ctx, pid);
    exigirEquipe(ctx);
    if (atual?.status === "finalizada") {
      // Única alteração possível: co-assinatura do supervisor.
      const mud = camposAlterados(atual, a);
      if (mud.length === 1 && mud[0] === "validacao" && atual.validacao?.status === "pendente" && a.validacao?.status === "validada") {
        if (!podeValidar(ctx, pid)) recusar("Só o supervisor do caso ou o técnico pode validar.");
        atual.validacao = { status: "validada", porId: user.id, por: user.nome, registro: identificacaoProfissional(user), em: agoraISO() };
        ctx.ev("evolucao_validada", Number(pid), `anamnese_${pid}`, "avaliação de demanda");
        continue;
      }
      recusar("A avaliação de demanda já foi finalizada e não pode ser alterada (Res. CFP 001/2009).");
    }
    const nova = clone(a);
    nova.criadoPorId = atual?.criadoPorId ?? user.id;
    nova.criadoPor = atual?.criadoPor ?? user.nome;
    nova.criadoEm = atual?.criadoEm ?? agoraISO();
    nova.atualizadoEm = agoraISO();
    nova.atualizadoPorId = user.id;
    nova.rascunho = nova.status !== "finalizada";
    if (nova.status === "finalizada") {
      nova.validacao = validacaoInicial(user);
      nova.assinatura = assinaturaDe(user, hashRegistro(pid, nova.queixa, nova.historia, nova.objetivos, nova.hipoteses));
    }
    db.ANAMNESES[pid] = nova;
    ctx.ev(nova.status === "finalizada" ? "anamnese_finalizada" : "anamnese_salva", Number(pid), `anamnese_${pid}`);
  }
}

// EVOLUÇÕES (append-only + validação + retificação versionada)
function mesclarEvolucoes(ctx, entrada = {}) {
  const { db, user } = ctx;
  db.EVOLUCOES ||= {};
  const usados = idsEmUso(db.EVOLUCOES);
  for (const [pid, lista] of Object.entries(entrada)) {
    const atuais = (db.EVOLUCOES[pid] ||= []);
    for (const e of lista || []) {
      const atual = atuais.find((x) => String(x.id) === String(e.id));
      if (atual && igual(atual, e)) continue;
      exigirPaciente(ctx, pid);
      exigirEquipe(ctx);

      if (!atual) {
        if (!String(e.conteudo || "").trim()) recusar("A evolução precisa ter conteúdo.");
        const nova = {
          id: usados.has(String(e.id)) ? Date.now() + Math.floor(Math.random() * 1000) : e.id,
          num: atuais.length + 1,
          data: String(e.data || "").slice(0, 16),
          tipo: e.tipo || "atendimento",
          conteudo: String(e.conteudo),
          tags: Array.isArray(e.tags) ? e.tags.map(String) : [],
          autorId: user.id,
          autor: user.nome,
          papel: user.papel,
          registradoEm: agoraISO(),
          versoes: [],
        };
        nova.assinatura = assinaturaDe(user, hashRegistro(pid, nova.id, nova.data, nova.tipo, nova.conteudo, nova.autorId));
        nova.validacao = validacaoInicial(user);
        usados.add(String(nova.id));
        atuais.push(nova);
        ctx.ev("evolucao_criada", Number(pid), nova.id, `#${nova.num} ${nova.tipo}`);
        continue;
      }

      const mud = camposAlterados(atual, e).filter((k) => k !== "justificativaRetificacao");
      // Validação (co-assinatura) pelo supervisor do caso
      if (mud.length === 1 && mud[0] === "validacao") {
        if (atual.validacao?.status !== "pendente" || e.validacao?.status !== "validada") recusar("Validação inválida.");
        if (!podeValidar(ctx, pid)) recusar("Só o supervisor do caso ou o técnico pode validar evoluções.");
        atual.validacao = { status: "validada", porId: user.id, por: user.nome, registro: identificacaoProfissional(user), em: agoraISO() };
        ctx.ev("evolucao_validada", Number(pid), atual.id, `#${atual.num}`);
        continue;
      }
      // Retificação pelo próprio autor, com justificativa
      if (mud.every((k) => ["conteudo", "tags", "versoes", "validacao", "assinatura"].includes(k)) && mud.includes("conteudo")) {
        if (atual.autorId !== user.id) recusar("Só o autor pode retificar a própria evolução (SBIS NGS1.12.01).");
        const just = String(e.justificativaRetificacao || "").trim();
        if (just.length < 10) recusar("Informe a justificativa da retificação (mínimo de 10 caracteres).");
        const anterior = {
          conteudo: atual.conteudo,
          tags: atual.tags,
          assinatura: atual.assinatura,
          validacao: atual.validacao,
          substituidaEm: agoraISO(),
          justificativa: just,
        };
        atual.versoes = [...(atual.versoes || []), anterior];
        atual.conteudo = String(e.conteudo);
        atual.tags = Array.isArray(e.tags) ? e.tags.map(String) : atual.tags;
        atual.retificadaEm = anterior.substituidaEm;
        atual.assinatura = assinaturaDe(user, hashRegistro(pid, atual.id, atual.data, atual.tipo, atual.conteudo, atual.autorId, atual.versoes.length));
        atual.validacao = validacaoInicial(user);
        ctx.ev("evolucao_retificada", Number(pid), atual.id, `#${atual.num} versão ${atual.versoes.length + 1}`);
        continue;
      }
      recusar("Evoluções registradas não podem ser alteradas nem apagadas; use a retificação.");
    }
  }
}

// DOCUMENTOS (anexados, recebidos de outros profissionais e emitidos)
const CAMPOS_DOC_ATUALIZAVEIS = ["devolutiva", "entrega", "validacao"];
function mesclarDocumentos(ctx, entrada = {}) {
  const { db, user } = ctx;
  db.DOCUMENTOS ||= {};
  const usados = idsEmUso(db.DOCUMENTOS);
  for (const [pid, lista] of Object.entries(entrada)) {
    const atuais = (db.DOCUMENTOS[pid] ||= []);
    for (const d of lista || []) {
      const atual = atuais.find((x) => String(x.id) === String(d.id));
      if (atual && igual(atual, d)) continue;
      exigirPaciente(ctx, pid);
      exigirEquipe(ctx);
      if (!atual) {
        const novo = clone(d);
        if (usados.has(String(novo.id))) novo.id = `d${Date.now()}${Math.floor(Math.random() * 1000)}`;
        novo.autor = user.nome;
        novo.autorId = user.id;
        novo.registradoEm = agoraISO();
        if (novo.categoria === "emitido") {
          novo.dataEmissao = novo.dataEmissao || agoraISO().slice(0, 10);
          const h = hashRegistro(pid, novo.id, novo.modalidade, novo.conteudo, novo.finalidade, novo.destinatario);
          novo.assinaturas = [assinaturaDe(user, h)];
          novo.validacao = validacaoInicial(user);
          ctx.ev("documento_emitido", Number(pid), novo.id, novo.modalidade);
        } else ctx.ev("documento_anexado", Number(pid), novo.id, novo.categoria || "documento");
        usados.add(String(novo.id));
        atuais.push(novo);
        continue;
      }
      const mud = camposAlterados(atual, d);
      if (!mud.every((k) => CAMPOS_DOC_ATUALIZAVEIS.includes(k))) recusar("Documentos anexados ou emitidos não podem ser alterados.");
      if (mud.includes("validacao")) {
        if (atual.validacao?.status !== "pendente" || d.validacao?.status !== "validada") recusar("Validação inválida.");
        if (!podeValidar(ctx, pid)) recusar("Só o supervisor do caso ou o técnico pode co-assinar documentos.");
        const h = hashRegistro(pid, atual.id, atual.modalidade, atual.conteudo, atual.finalidade, atual.destinatario);
        atual.assinaturas = [...(atual.assinaturas || []), assinaturaDe(user, h)];
        atual.validacao = { status: "validada", porId: user.id, por: user.nome, registro: identificacaoProfissional(user), em: agoraISO() };
        ctx.ev("documento_validado", Number(pid), atual.id);
      }
      for (const k of ["devolutiva", "entrega"]) {
        if (!mud.includes(k)) continue;
        if (atual[k]) recusar("Devolutiva e entrega, uma vez registradas, não podem ser alteradas.");
        atual[k] = { ...d[k], registradoPorId: user.id, registradoEm: agoraISO() };
        ctx.ev("documento_atualizado", Number(pid), atual.id, k);
      }
    }
  }
}

// Coleções só de inclusão (registro documental e compartilhamentos)
function mesclarSoInclusao(ctx, nomeColecao, evento, entrada = {}, validar) {
  const { db, user } = ctx;
  db[nomeColecao] ||= {};
  const usados = idsEmUso(db[nomeColecao]);
  for (const [pid, lista] of Object.entries(entrada)) {
    const atuais = (db[nomeColecao][pid] ||= []);
    for (const r of lista || []) {
      const atual = atuais.find((x) => String(x.id) === String(r.id));
      if (atual) {
        if (!igual(atual, r)) recusar("Registros deste tipo não podem ser alterados nem apagados.");
        continue;
      }
      exigirPaciente(ctx, pid);
      exigirEquipe(ctx);
      if (validar) validar(r);
      const novo = { ...clone(r), autorId: user.id, autor: user.nome, papel: user.papel, registradoEm: agoraISO() };
      if (usados.has(String(novo.id))) novo.id = `${nomeColecao.slice(0, 3).toLowerCase()}_${Date.now()}`;
      novo.assinatura = assinaturaDe(user, hashRegistro(pid, novo.id, novo.conteudo || novo.resumo, novo.tipo));
      usados.add(String(novo.id));
      atuais.push(novo);
      ctx.ev(evento, Number(pid), novo.id, novo.tipo);
    }
  }
}

// Listas operacionais (agenda, faltas, notificações)
function mesclarLista(ctx, nome, entrada, { pid, criar, atualizar }) {
  const { db } = ctx;
  for (const item of entrada || []) {
    const atual = db[nome].find((x) => String(x.id) === String(item.id));
    if (atual && igual(atual, item)) continue;
    const p = pid(item, atual);
    if (p != null) exigirPaciente(ctx, p);
    exigirEquipe(ctx);
    if (!atual) {
      db[nome].push(clone(item));
      ctx.ev(criar, p ?? null, item.id, item.status || item.tipo);
    } else {
      if (pid(atual) !== pid(item)) recusar("Não é permitido mover o registro para outro paciente.");
      Object.keys(atual).forEach((k) => delete atual[k]);
      Object.assign(atual, clone(item));
      ctx.ev(atualizar, p ?? null, item.id, item.status || item.tipo);
    }
  }
}

// Solicitações do titular (acesso, cópia, correção...) — LGPD art. 18/19
function mesclarSolicitacoes(ctx, entrada = [], prazoDias) {
  const { db, user } = ctx;
  for (const s of entrada) {
    const atual = db.ACESSO_PACIENTE.find((x) => String(x.id) === String(s.id));
    if (atual && igual(atual, s)) continue;
    exigirPaciente(ctx, s.pacienteId);
    if (!atual) {
      if (!["tecnico", "paciente"].includes(user.papel)) recusar("Solicitações são registradas pelo titular ou pelo técnico.");
      const nova = clone(s);
      const hoje = new Date();
      nova.solicitacao = hoje.toISOString().slice(0, 10);
      nova.prazo = new Date(hoje.getTime() + prazoDias * 86400000).toISOString().slice(0, 10);
      nova.status = "pendente";
      nova.registradaPorId = user.id;
      db.ACESSO_PACIENTE.push(nova);
      ctx.ev("solicitacao_titular_criada", nova.pacienteId, nova.id, nova.tipo);
      continue;
    }
    if (user.papel !== "tecnico") recusar("Só o técnico responsável responde solicitações.");
    const mud = camposAlterados(atual, s);
    if (!mud.every((k) => ["status", "resposta", "liberacao", "respondidoEm", "respondidoPorId"].includes(k)))
      recusar("Só é possível registrar a resposta da solicitação.");
    Object.assign(atual, { status: s.status, resposta: s.resposta, liberacao: s.liberacao, respondidoEm: agoraISO(), respondidoPorId: user.id });
    ctx.ev("solicitacao_titular_respondida", atual.pacienteId, atual.id, atual.status);
  }
}

/**
 * Aplica a gravação do navegador sobre uma CÓPIA do banco. Se qualquer
 * item violar as regras, nada é gravado.
 * @returns {{ok:true, db:object, eventos:object[]} | {ok:false, erro:string}}
 */
export function aplicarAlteracoes(dbAtual, user, entrada, { prazoRespostaTitularDias = 15 } = {}) {
  const db = clone(dbAtual);
  const eventos = [];
  const ctx = {
    db,
    user,
    permitidos: new Set(pacientesPermitidos(user, dbAtual)),
    ev: (tipo, pacienteId, registroId, complemento) => eventos.push({ tipo, pacienteId, registroId, complemento }),
  };
  try {
    mesclarPacientes(ctx, entrada.PACIENTES);
    // pacientes recém-criados pelo técnico entram no escopo desta gravação
    if (user.papel === "tecnico") db.PACIENTES.forEach((p) => ctx.permitidos.add(p.id));
    mesclarAnamneses(ctx, entrada.ANAMNESES);
    mesclarEvolucoes(ctx, entrada.EVOLUCOES);
    mesclarDocumentos(ctx, entrada.DOCUMENTOS);
    mesclarSoInclusao(ctx, "REGISTRO_DOCUMENTAL", "registro_documental_criado", entrada.REGISTRO_DOCUMENTAL, (r) => {
      if (!String(r.conteudo || "").trim()) recusar("O registro documental precisa ter conteúdo.");
    });
    mesclarSoInclusao(ctx, "COMPARTILHAMENTOS", "compartilhamento_registrado", entrada.COMPARTILHAMENTOS, (r) => {
      if (!r.destinatario || !r.finalidade) recusar("Informe destinatário e finalidade da comunicação.");
      if (["quebra_sigilo", "notificacao_compulsoria"].includes(r.tipo) && !String(r.fundamento || "").trim())
        recusar("Quebra de sigilo e notificação compulsória exigem fundamento (Código de Ética, art. 10).");
    });
    mesclarLista(ctx, "AGENDAMENTOS", entrada.AGENDAMENTOS, {
      pid: (a) => a?.pacienteId,
      criar: "agendamento_criado",
      atualizar: "agendamento_atualizado",
    });
    mesclarLista(ctx, "FALTAS", entrada.FALTAS, { pid: (f) => f?.pacienteId, criar: "falta_registrada", atualizar: "falta_atualizada" });
    mesclarNotificacoes(ctx, entrada.NOTIFICACOES);
    mesclarSolicitacoes(ctx, entrada.ACESSO_PACIENTE, prazoRespostaTitularDias);
  } catch (e) {
    if (e instanceof Recusa) return { ok: false, erro: e.message };
    throw e;
  }
  return { ok: true, db, eventos };
}

function mesclarNotificacoes(ctx, entrada = []) {
  const { db, user } = ctx;
  for (const n of entrada) {
    const atual = db.NOTIFICACOES.find((x) => String(x.id) === String(n.id));
    if (atual && igual(atual, n)) continue;
    exigirEquipe(ctx);
    const alcance =
      user.papel === "tecnico" ||
      (n.pacienteId != null && ctx.permitidos.has(Number(n.pacienteId))) ||
      (n.estudantesIds || []).includes(user.id);
    if (!alcance) recusar("Sem permissão para esta notificação.");
    if (!atual) {
      db.NOTIFICACOES.push(clone(n));
      ctx.ev("notificacao_criada", n.pacienteId ?? null, n.id, n.tipo);
    } else {
      const mud = camposAlterados(atual, n);
      if (user.papel !== "tecnico" && !mud.every((k) => k === "lida")) recusar("Só é possível marcar a notificação como lida.");
      Object.assign(atual, clone(n));
    }
  }
}
