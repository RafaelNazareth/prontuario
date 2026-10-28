// Testes de segurança/autorização — Fase 29 do plano de refatoração:
// "usuário sem permissão não executa ação administrativa", "estudante não
// acessa paciente não autorizado", "ID alterado manualmente não concede
// acesso". Isto testa a autorização de UX (core/permissions.js) — a
// autorização REAL terá que ser replicada e re-validada no backend (ver
// docs/SECURITY_BACKEND_REQUIREMENTS.md); estes testes garantem que a regra
// do frontend está correta, não que o sistema é seguro fim-a-fim.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installBrowserStubs } from "./helpers/testEnv.mjs";

installBrowserStubs();

const { _setCurrentUserForTests } = await import("../assets/js/core/auth.js");
const { can, canAccessPage } = await import("../assets/js/core/permissions.js");
const store = await import("../assets/js/core/store.js");

// IMPORTANTE: acessar sempre via `store.USERS`/`store.PACIENTES` (não
// destructurar), porque mockData()/initData() REASSIGNAM esses arrays
// (`USERS = dataset.USERS`) em vez de mutá-los in-place. Um `const { USERS } =
// await import(...)` captura o valor (o array vazio inicial) uma única vez e
// para de refletir mudanças depois disso — só o import estático (usado pelo
// resto do app) ou o acesso via propriedade do namespace ficam "ao vivo".
store.loadDataset(JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf8")));

const tecnico = store.USERS.find((u) => u.papel === "tecnico");
const supervisor = store.USERS.find((u) => u.papel === "supervisor");
const estudante = store.USERS.find((u) => u.papel === "estudante");
const paciente = store.USERS.find((u) => u.papel === "paciente");

test("can() nega tudo quando não há usuário logado", () => {
  _setCurrentUserForTests(null);
  assert.equal(can("patient.create"), false);
  assert.equal(can("patient.read"), false);
  assert.equal(canAccessPage("dashboard"), false);
});

test("apenas técnico pode criar/editar paciente e criar usuário", () => {
  _setCurrentUserForTests(tecnico);
  assert.equal(can("patient.create"), true);
  assert.equal(can("patient.update"), true);
  assert.equal(can("user.create"), true);

  for (const user of [supervisor, estudante, paciente]) {
    _setCurrentUserForTests(user);
    assert.equal(can("patient.create"), false, `${user.papel} não deveria criar paciente`);
    assert.equal(can("user.create"), false, `${user.papel} não deveria criar usuário`);
  }
});

test("equipe clínica (não paciente) pode registrar evolução e criar agendamento", () => {
  for (const user of [tecnico, supervisor, estudante]) {
    _setCurrentUserForTests(user);
    assert.equal(can("evolution.create"), true, `${user.papel} deveria poder registrar evolução`);
    assert.equal(can("appointment.create"), true, `${user.papel} deveria poder criar agendamento`);
  }
  _setCurrentUserForTests(paciente);
  assert.equal(can("evolution.create"), false, "paciente nunca registra evolução");
  assert.equal(can("appointment.create"), false, "paciente nunca cria agendamento");
});

test("supervisor só lê pacientes onde é supervisorId — nunca pacientes de outro supervisor", () => {
  _setCurrentUserForTests(supervisor);
  const seuPaciente = store.PACIENTES.find((p) => p.supervisorId === supervisor.id);
  const pacienteDeOutroSupervisor = store.PACIENTES.find((p) => p.supervisorId !== supervisor.id);
  assert.ok(seuPaciente, "fixture inválida: supervisor sem paciente sob sua supervisão");
  assert.ok(pacienteDeOutroSupervisor, "fixture inválida: precisa de um paciente de outro supervisor");

  assert.equal(can("patient.read", seuPaciente), true);
  assert.equal(can("patient.read", pacienteDeOutroSupervisor), false);
});

test("estudante só lê pacientes onde está em estudantesIds — nunca o caso de outro estudante", () => {
  _setCurrentUserForTests(estudante);
  const seuCaso = store.PACIENTES.find((p) => p.estudantesIds?.includes(estudante.id));
  const casoDeOutroEstudante = store.PACIENTES.find((p) => !p.estudantesIds?.includes(estudante.id));
  assert.ok(seuCaso, "fixture inválida: estudante sem caso alocado");
  assert.ok(casoDeOutroEstudante, "fixture inválida: precisa de um caso de outro estudante");

  assert.equal(can("patient.read", seuCaso), true);
  assert.equal(can("patient.read", casoDeOutroEstudante), false);
});

test("paciente só lê o próprio registro — nunca o de outro paciente, mesmo alterando o ID manualmente", () => {
  _setCurrentUserForTests(paciente);
  const proprioRegistro = store.PACIENTES.find((p) => p.id === paciente.id);
  const outroPaciente = store.PACIENTES.find((p) => p.id !== paciente.id);
  assert.ok(proprioRegistro);
  assert.ok(outroPaciente);

  assert.equal(can("patient.read", proprioRegistro), true);
  // Simula "ID alterado manualmente": um paciente tentando ler outro paciente
  // só trocando o id no objeto passado para can() — deve continuar negado,
  // pois a checagem consulta getPacientesPermitidos(), não confia no objeto.
  assert.equal(can("patient.read", outroPaciente), false);
  assert.equal(can("patient.read", { id: 999999 }), false);
});

test("técnico lê qualquer paciente (RBAC amplo por papel)", () => {
  _setCurrentUserForTests(tecnico);
  for (const p of store.PACIENTES) {
    assert.equal(can("patient.read", p), true);
  }
});

test("canAccessPage bloqueia páginas administrativas para papéis não autorizados", () => {
  _setCurrentUserForTests(tecnico);
  assert.equal(canAccessPage("acesso"), true);
  assert.equal(canAccessPage("acesso-pac"), true);
  assert.equal(canAccessPage("auditoria"), true);

  for (const user of [supervisor, estudante, paciente]) {
    _setCurrentUserForTests(user);
    assert.equal(canAccessPage("acesso"), false, `${user.papel} não deveria acessar 'acesso'`);
    assert.equal(canAccessPage("acesso-pac"), false, `${user.papel} não deveria acessar 'acesso-pac'`);
    assert.equal(canAccessPage("auditoria"), false, `${user.papel} não deveria acessar 'auditoria'`);
  }
});

test("canAccessPage trata páginas de detalhe (prontuario_<id>) com a mesma regra de 'pacientes'", () => {
  _setCurrentUserForTests(estudante);
  assert.equal(canAccessPage("pacientes"), true);
  assert.equal(canAccessPage("prontuario_200"), true);

  _setCurrentUserForTests(paciente);
  assert.equal(canAccessPage("pacientes"), false);
  assert.equal(canAccessPage("prontuario_200"), false);
});

test("meu-prontuario é exclusivo do papel paciente", () => {
  _setCurrentUserForTests(paciente);
  assert.equal(canAccessPage("meu-prontuario"), true);
  for (const user of [tecnico, supervisor, estudante]) {
    _setCurrentUserForTests(user);
    assert.equal(canAccessPage("meu-prontuario"), false);
  }
});
