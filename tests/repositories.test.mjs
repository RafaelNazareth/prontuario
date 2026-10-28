// Testes dos repositórios (Fase 28, prioridade P0/P1 do plano de
// refatoração: pacientes, agendamentos, evoluções, notificações).
// Usa o stub de navegador (tests/helpers/testEnv.mjs) para poder importar
// os módulos reais sem jsdom — ver o comentário em permissions.test.mjs
// sobre por que acessamos os arrays via `store.X`, nunca destructurando.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installBrowserStubs } from "./helpers/testEnv.mjs";

installBrowserStubs();

const { _setCurrentUserForTests } = await import("../assets/js/core/auth.js");
const store = await import("../assets/js/core/store.js");
const { patientRepository } = await import("../assets/js/repositories/patientRepository.js");
const { appointmentRepository } = await import("../assets/js/repositories/appointmentRepository.js");
const { clinicalRepository } = await import("../assets/js/repositories/clinicalRepository.js");
const { documentRepository } = await import("../assets/js/repositories/documentRepository.js");
const { absenceRepository } = await import("../assets/js/repositories/absenceRepository.js");
const { notificationRepository } = await import("../assets/js/repositories/notificationRepository.js");
const { AnamnesisStatus, NotificationType } = await import("../assets/js/core/enums.js");

store.loadDataset(JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf8")));
const tecnico = store.USERS.find((u) => u.papel === "tecnico");
_setCurrentUserForTests(tecnico); // logAudit() precisa de um autor

test("patientRepository.create inicializa evoluções/documentos vazios e persiste", () => {
  const before = store.PACIENTES.length;
  const patient = patientRepository.create({
    nome: "Paciente Teste",
    cpf: "000.000.000-00",
    estudantesIds: [],
    supervisorId: tecnico.id,
    status: "ativo",
    cor: "#1b5e20",
    ini: "PT",
  });
  assert.equal(store.PACIENTES.length, before + 1);
  assert.deepEqual(store.EVOLUCOES[patient.id], []);
  assert.deepEqual(store.DOCUMENTOS[patient.id], []);
  assert.equal(patientRepository.getById(patient.id).nome, "Paciente Teste");
});

test("patientRepository.update muda só os campos passados", () => {
  const patient = patientRepository.create({ nome: "Original", cpf: "1", estudantesIds: [], supervisorId: tecnico.id, status: "ativo", cor: "#1b5e20", ini: "OR" });
  patientRepository.update(patient.id, { status: "inativo" });
  const updated = patientRepository.getById(patient.id);
  assert.equal(updated.status, "inativo");
  assert.equal(updated.nome, "Original", "campos não passados devem permanecer intactos");
});

test("appointmentRepository.hasConflict detecta conflito de mesmo paciente+estudante+horário", () => {
  const a = appointmentRepository.create({ pacienteId: 1, estudanteId: 1, supervisorId: 1, data: "2026-12-01", hora: "10:00", local: "Sala 1", modalidade: "presencial" });
  const conflict = appointmentRepository.hasConflict({ pacienteId: 1, estudanteId: 1, data: "2026-12-01", hora: "10:00" });
  assert.equal(conflict, true);
  // Excluindo o próprio ID (caso de edição), não deve acusar conflito consigo mesmo
  assert.equal(appointmentRepository.hasConflict({ pacienteId: 1, estudanteId: 1, data: "2026-12-01", hora: "10:00", excludeId: a.id }), false);
});

test("appointmentRepository.hasConflict permite dois estudantes diferentes no mesmo horário", () => {
  appointmentRepository.create({ pacienteId: 2, estudanteId: 10, supervisorId: 1, data: "2026-12-02", hora: "11:00", local: "Sala 2", modalidade: "presencial" });
  const conflict = appointmentRepository.hasConflict({ pacienteId: 2, estudanteId: 11, data: "2026-12-02", hora: "11:00" });
  assert.equal(conflict, false);
});

test("appointmentRepository.hasConflict ignora agendamentos cancelados", () => {
  const a = appointmentRepository.create({ pacienteId: 3, estudanteId: 20, supervisorId: 1, data: "2026-12-03", hora: "12:00", local: "Sala 3", modalidade: "presencial" });
  appointmentRepository.cancel(a.id, "Paciente X");
  assert.equal(appointmentRepository.hasConflict({ pacienteId: 3, estudanteId: 20, data: "2026-12-03", hora: "12:00" }), false);
});

test("clinicalRepository.saveAnamnesis rejeita alteração de anamnese já finalizada (regra do CRP)", () => {
  const r1 = clinicalRepository.saveAnamnesis(500, { queixa: "q1", status: AnamnesisStatus.FINALIZADA }, "Dr. Teste", "Paciente 500");
  assert.equal(r1.ok, true);
  const r2 = clinicalRepository.saveAnamnesis(500, { queixa: "q2 (tentativa de alterar)", status: AnamnesisStatus.FINALIZADA }, "Dr. Teste", "Paciente 500");
  assert.equal(r2.ok, false);
  assert.equal(clinicalRepository.getAnamnesis(500).queixa, "q1", "conteúdo original deve permanecer intacto");
});

test("clinicalRepository.saveAnamnesis permite reescrever enquanto for rascunho", () => {
  clinicalRepository.saveAnamnesis(501, { queixa: "rascunho 1", status: AnamnesisStatus.RASCUNHO }, "Dr. Teste", "Paciente 501");
  const r = clinicalRepository.saveAnamnesis(501, { queixa: "rascunho 2", status: AnamnesisStatus.RASCUNHO }, "Dr. Teste", "Paciente 501");
  assert.equal(r.ok, true);
  assert.equal(clinicalRepository.getAnamnesis(501).queixa, "rascunho 2");
});

test("clinicalRepository.addEvolution numera sequencialmente e nunca sobrescreve o histórico", () => {
  const ev1 = clinicalRepository.addEvolution(502, { data: "2026-01-01 08:00", autor: "A", papel: "tecnico", tipo: "atendimento", conteudo: "primeira" }, "Paciente 502");
  const ev2 = clinicalRepository.addEvolution(502, { data: "2026-01-08 08:00", autor: "A", papel: "tecnico", tipo: "atendimento", conteudo: "segunda" }, "Paciente 502");
  assert.equal(ev1.num, 1);
  assert.equal(ev2.num, 2);
  assert.equal(clinicalRepository.listEvolutions(502).length, 2);
});

test("documentRepository.create gera tamanho determinístico (mesmo nome -> mesmo tamanho sempre)", () => {
  const d1 = documentRepository.create(503, { nome: "Laudo.pdf", tipo: "pdf" }, "Dr. Teste");
  const d2 = documentRepository.create(503, { nome: "Laudo.pdf", tipo: "pdf" }, "Dr. Teste");
  assert.equal(d1.tamanho, d2.tamanho, "o mesmo nome de arquivo deve sempre gerar o mesmo tamanho simulado");
  assert.match(d1.tamanho, /^\d+ KB$/);
});

test("absenceRepository dispara contagem correta e não conta faltas justificadas", () => {
  const a1 = absenceRepository.register({ agId: 900, pacienteId: 504, data: "2026-01-01", hora: "08:00", estudantesIds: [], registradoPor: "Dr. Teste" }, "Paciente 504");
  absenceRepository.register({ agId: 901, pacienteId: 504, data: "2026-01-08", hora: "08:00", estudantesIds: [], registradoPor: "Dr. Teste" }, "Paciente 504");
  assert.equal(absenceRepository.countUnjustified(504), 2);
  absenceRepository.justify(a1.id, "Paciente 504");
  assert.equal(absenceRepository.countUnjustified(504), 1, "falta justificada não deve contar mais");
});

test("notificationRepository.markRead funciona tanto para notificação persistida quanto calculada em tempo real", () => {
  const n = notificationRepository.push({ tipo: NotificationType.FALTA_REGISTRADA, titulo: "t", desc: "d", ts: "" });
  notificationRepository.markRead(n.id);
  assert.equal(notificationRepository.findById(n.id).lida, true);

  // Notificação "virtual" (nunca existiu no array) — deve criar um marcador sem lançar erro
  notificationRepository.markRead("id-nao-existente-calculado-em-tempo-real");
  assert.equal(notificationRepository.findById("id-nao-existente-calculado-em-tempo-real").lida, true);
});
