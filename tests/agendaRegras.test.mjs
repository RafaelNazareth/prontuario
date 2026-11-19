// Regras da agenda aplicadas pelo SERVIDOR (shared/politica.js):
// só o técnico cria, altera e cancela; a equipe do caso só registra
// falta; o paciente pede fora do sistema (presencial, telefone ou e-mail)
// e só o técnico registra e responde. Também: vínculo de arquivo não vem
// do navegador.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aplicarAlteracoes, escopo } from "../server/policy.mjs";

const carregar = () => JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf8"));
const clone = (x) => JSON.parse(JSON.stringify(x));
const user = (d, id) => d.USERS.find((u) => u.id === id);
const TECNICO = 1;
const SUPERVISOR = 10;
const ESTUDANTE = 100;
const PACIENTE = 200;

function futuroConfirmado(d, pid = PACIENTE) {
  return d.AGENDAMENTOS.find((a) => a.pacienteId === pid && a.status === "confirmado" && a.data > "2026-11-20");
}

function novoAgendamento(d, extra = {}) {
  const pac = d.PACIENTES.find((p) => p.id === PACIENTE);
  return { id: 990001, pacienteId: PACIENTE, estudanteId: pac.estudantesIds[0], data: "2026-12-29", hora: "15:30", local: "Sala 03", status: "confirmado", ...extra };
}

test("estudante e supervisor não criam agendamento; técnico cria", () => {
  const d = carregar();
  for (const id of [ESTUDANTE, SUPERVISOR]) {
    const r = aplicarAlteracoes(d, user(d, id), { AGENDAMENTOS: [novoAgendamento(d)] });
    assert.equal(r.ok, false, `papel ${user(d, id).papel} não deveria criar`);
    assert.match(r.erro, /técnico/);
  }
  const r = aplicarAlteracoes(d, user(d, TECNICO), { AGENDAMENTOS: [novoAgendamento(d)] });
  assert.equal(r.ok, true, r.erro);
  const criado = r.db.AGENDAMENTOS.find((a) => a.id === 990001);
  assert.equal(criado.criadoPorId, TECNICO);
  assert.equal(criado.supervisorId, d.PACIENTES.find((p) => p.id === PACIENTE).supervisorId, "supervisor vem do cadastro do caso");
  assert.ok(r.eventos.some((e) => e.tipo === "agendamento_criado"));
});

test("paciente não cria nem cancela agendamento", () => {
  const d = carregar();
  assert.equal(aplicarAlteracoes(d, user(d, PACIENTE), { AGENDAMENTOS: [novoAgendamento(d)] }).ok, false);
  const ag = clone(futuroConfirmado(d));
  ag.status = "cancelado";
  assert.equal(aplicarAlteracoes(d, user(d, PACIENTE), { AGENDAMENTOS: [ag] }).ok, false);
});

test("equipe do caso só registra falta; não remarca nem cancela", () => {
  const d = carregar();
  const est = user(d, ESTUDANTE);
  const base = futuroConfirmado(d);
  const remarcado = { ...clone(base), data: "2026-12-30" };
  assert.equal(aplicarAlteracoes(d, est, { AGENDAMENTOS: [remarcado] }).ok, false);
  const cancelado = { ...clone(base), status: "cancelado" };
  assert.equal(aplicarAlteracoes(d, est, { AGENDAMENTOS: [cancelado] }).ok, false);
  const faltou = { ...clone(base), status: "faltou" };
  const r = aplicarAlteracoes(d, est, { AGENDAMENTOS: [faltou] });
  assert.equal(r.ok, true, r.erro);
  assert.equal(r.db.AGENDAMENTOS.find((a) => a.id === base.id).status, "faltou");
});

test("técnico remarca e cancela; conflito de horário é recusado", () => {
  const d = carregar();
  const tec = user(d, TECNICO);
  const base = futuroConfirmado(d);
  const cancelado = { ...clone(base), status: "cancelado" };
  const r = aplicarAlteracoes(d, tec, { AGENDAMENTOS: [cancelado] });
  assert.equal(r.ok, true, r.erro);
  assert.equal(r.db.AGENDAMENTOS.find((a) => a.id === base.id).canceladoPorId, TECNICO);
  // conflito: outro atendimento confirmado do mesmo paciente no mesmo horário
  const outro = d.AGENDAMENTOS.find((a) => a.pacienteId === PACIENTE && a.status === "confirmado" && a.id !== base.id);
  const choque = { ...clone(base), data: outro.data, hora: outro.hora };
  const r2 = aplicarAlteracoes(d, tec, { AGENDAMENTOS: [choque] });
  assert.equal(r2.ok, false);
  assert.match(r2.erro, /Já existe atendimento/);
});

test("estagiário de fora do grupo do caso é recusado", () => {
  const d = carregar();
  const pac = d.PACIENTES.find((p) => p.id === PACIENTE);
  const forasteiro = d.USERS.find((u) => u.papel === "estudante" && !pac.estudantesIds.includes(u.id));
  const r = aplicarAlteracoes(d, user(d, TECNICO), { AGENDAMENTOS: [novoAgendamento(d, { estudanteId: forasteiro.id })] });
  assert.equal(r.ok, false);
});

test("pedido recebido por telefone: só o técnico registra e responde", () => {
  const d = carregar();
  d.SOLICITACOES_AGENDAMENTO = [];
  const ag = futuroConfirmado(d);
  const pedido = { id: "pag_t1", pacienteId: PACIENTE, tipo: "remarcar", agendamentoId: ag.id, canal: "telefone", preferencia: "Quinta à tarde", status: "atendida" };
  // paciente e estudante não registram pedidos
  assert.equal(aplicarAlteracoes(d, user(d, PACIENTE), { SOLICITACOES_AGENDAMENTO: [pedido] }).ok, false);
  assert.equal(aplicarAlteracoes(d, user(d, ESTUDANTE), { SOLICITACOES_AGENDAMENTO: [pedido] }).ok, false);
  // canal obrigatório: presencial, telefone ou e-mail (nunca "portal")
  assert.equal(aplicarAlteracoes(d, user(d, TECNICO), { SOLICITACOES_AGENDAMENTO: [{ ...pedido, canal: "portal" }] }).ok, false);
  const r = aplicarAlteracoes(d, user(d, TECNICO), { SOLICITACOES_AGENDAMENTO: [pedido] });
  assert.equal(r.ok, true, r.erro);
  const salvo = r.db.SOLICITACOES_AGENDAMENTO[0];
  assert.equal(salvo.status, "pendente", "o servidor ignora o status enviado");
  assert.equal(salvo.canal, "telefone");
  // duplicado é recusado
  assert.equal(aplicarAlteracoes(r.db, user(d, TECNICO), { SOLICITACOES_AGENDAMENTO: [{ ...pedido, id: "pag_t2" }] }).ok, false);
  // recusa exige motivo
  const semMotivo = { ...clone(salvo), status: "recusada", resposta: "" };
  assert.equal(aplicarAlteracoes(r.db, user(d, TECNICO), { SOLICITACOES_AGENDAMENTO: [semMotivo] }).ok, false);
  const comMotivo = { ...clone(salvo), status: "recusada", resposta: "Sem horário na quinta; ligaremos." };
  const r2 = aplicarAlteracoes(r.db, user(d, TECNICO), { SOLICITACOES_AGENDAMENTO: [comMotivo] });
  assert.equal(r2.ok, true, r2.erro);
  assert.equal(r2.db.SOLICITACOES_AGENDAMENTO[0].respondidoPorId, TECNICO);
});

test("paciente não grava nada, nem enviando o próprio dataset alterado", () => {
  const d = carregar();
  const ag = clone(futuroConfirmado(d));
  ag.local = "Outra sala";
  assert.equal(aplicarAlteracoes(d, user(d, PACIENTE), { AGENDAMENTOS: [ag] }).ok, false);
  // dataset sem alteração passa (nada a gravar)
  assert.equal(aplicarAlteracoes(d, user(d, PACIENTE), {}).ok, true);
});

test("escopo: pedidos de agendamento só para o técnico", () => {
  const d = carregar();
  assert.ok(escopo(user(d, TECNICO), d).SOLICITACOES_AGENDAMENTO.length >= 1);
  assert.equal(escopo(user(d, SUPERVISOR), d).SOLICITACOES_AGENDAMENTO.length, 0);
  assert.equal(escopo(user(d, ESTUDANTE), d).SOLICITACOES_AGENDAMENTO.length, 0);
  assert.equal(escopo(user(d, PACIENTE), d).SOLICITACOES_AGENDAMENTO.length, 0);
  assert.equal(escopo(user(d, PACIENTE), d).ACESSO_PACIENTE.length, 0);
});

test("vínculo de arquivo enviado pelo navegador é descartado", () => {
  const d = carregar();
  const doc = { id: "d_teste", nome: "x.pdf", tipo: "pdf", categoria: "outro", arquivo: { id: "a_de_outro_paciente", sha256: "f".repeat(64) }, tamanho: "999 KB" };
  const r = aplicarAlteracoes(d, user(d, TECNICO), { DOCUMENTOS: { [PACIENTE]: [doc] } });
  assert.equal(r.ok, true, r.erro);
  const salvo = r.db.DOCUMENTOS[PACIENTE].find((x) => x.id === "d_teste");
  assert.equal(salvo.arquivo, undefined);
  assert.equal(salvo.tamanho, undefined);
});

test("supervisor do caso precisa ser um supervisor cadastrado", () => {
  const d = carregar();
  const p = clone(d.PACIENTES.find((x) => x.id === PACIENTE));
  p.supervisorId = ESTUDANTE;
  assert.equal(aplicarAlteracoes(d, user(d, TECNICO), { PACIENTES: [p] }).ok, false);
  p.supervisorId = 11;
  assert.equal(aplicarAlteracoes(d, user(d, TECNICO), { PACIENTES: [p] }).ok, true);
});

test("id de registro novo com aspas ou parênteses é recusado (XSS armazenado)", () => {
  const d = carregar();
  d.SOLICITACOES_AGENDAMENTO = [];
  const malicioso = { id: "x');alert(document.cookie);//", pacienteId: PACIENTE, tipo: "agendar", canal: "telefone" };
  const r = aplicarAlteracoes(d, user(d, TECNICO), { SOLICITACOES_AGENDAMENTO: [malicioso] });
  assert.equal(r.ok, false);
  assert.match(r.erro, /Identificador/);
  const titular = { id: "1');alert(1);//", pacienteId: PACIENTE, tipo: "acesso", descricao: "x" };
  assert.equal(aplicarAlteracoes(d, user(d, TECNICO), { ACESSO_PACIENTE: [titular] }).ok, false);
  const doc = { id: "d\" onmouseover=\"x", nome: "a.pdf", tipo: "pdf", categoria: "outro" };
  assert.equal(aplicarAlteracoes(d, user(d, TECNICO), { DOCUMENTOS: { [PACIENTE]: [doc] } }).ok, false);
});

test("falta nasce sem justificativa e só de atendimento do mesmo paciente", () => {
  const d = carregar();
  const est = user(d, ESTUDANTE);
  const ag = futuroConfirmado(d);
  const forjada = { id: "falta_t1", agId: ag.id, pacienteId: PACIENTE, justificada: true, justificativa: "atestado", justificadaPorId: 1 };
  const r = aplicarAlteracoes(d, est, { AGENDAMENTOS: [{ ...clone(ag), status: "faltou" }], FALTAS: [forjada] });
  assert.equal(r.ok, true, r.erro);
  const salva = r.db.FALTAS.find((f) => f.id === "falta_t1");
  assert.equal(salva.justificada, false);
  assert.equal(salva.justificativa, undefined);
  assert.equal(salva.justificadaPorId, undefined);
  assert.equal(salva.registradoPorId, ESTUDANTE);
  // atendimento de outro paciente é recusado
  const alheio = d.AGENDAMENTOS.find((a) => a.pacienteId !== PACIENTE);
  assert.equal(aplicarAlteracoes(d, user(d, TECNICO), { FALTAS: [{ id: "falta_t2", agId: alheio.id, pacienteId: PACIENTE }] }).ok, false);
});
