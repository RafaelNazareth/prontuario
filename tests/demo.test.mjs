// Modo demonstração (GitHub Pages): a API simulada no navegador aplica
// as mesmas regras do servidor real.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installBrowserStubs } from "./helpers/testEnv.mjs";

installBrowserStubs();
const seed = readFileSync(new URL("../data/seed.json", import.meta.url), "utf8");
globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(seed) });

const { atenderDemo, restaurarDemonstracao } = await import("../assets/js/infrastructure/servidorDemo.js");

test("login com erro genérico, bloqueio e sessão", async () => {
  restaurarDemonstracao();
  await assert.rejects(atenderDemo("/api/auth/login", "POST", { login: "tecnico", senha: "x" }), /Usuário ou senha incorretos/);
  await assert.rejects(atenderDemo("/api/data"), (e) => e.status === 401);
  const s = await atenderDemo("/api/auth/login", "POST", { login: "estudante", senha: "1234" });
  assert.equal(s.usuario.papel, "estudante");
  const dados = await atenderDemo("/api/data");
  assert.deepEqual(dados.PACIENTES.map((p) => p.id), [200]);
  assert.ok(!JSON.stringify(dados).includes('"senha"'));
});

test("mesmas regras de gravação do servidor: evolução não é editável", async () => {
  const dados = await atenderDemo("/api/data");
  dados.EVOLUCOES[200][0].conteudo = "alterado";
  await assert.rejects(atenderDemo("/api/data", "PUT", dados), (e) => e.status === 403);
});

test("auditoria simulada é íntegra e estudante não a consulta", async () => {
  await assert.rejects(atenderDemo("/api/audit"), (e) => e.status === 403);
  await atenderDemo("/api/auth/logout", "POST");
  await atenderDemo("/api/auth/login", "POST", { login: "tecnico", senha: "1234" });
  const r = await atenderDemo("/api/audit");
  assert.equal(r.verificacao.integra, true);
  assert.ok(r.entradas.some((e) => e.tipo === "login_falha"));
});

test("dados persistem no navegador e podem ser restaurados", async () => {
  assert.ok(localStorage.getItem("pep_demo_db_v1"));
  restaurarDemonstracao();
  assert.equal(localStorage.getItem("pep_demo_db_v1"), null);
});
