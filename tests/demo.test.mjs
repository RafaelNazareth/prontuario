// Modo demonstração (GitHub Pages): a API simulada no navegador aplica
// as mesmas regras do servidor real.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installBrowserStubs } from "./helpers/testEnv.mjs";

installBrowserStubs();
const seed = readFileSync(new URL("../data/seed.json", import.meta.url), "utf8");
globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(seed) });

const { atenderDemo, restaurarDemonstracao, enviarDocumentoDemo, baixarArquivoDemo } = await import("../assets/js/infrastructure/servidorDemo.js");

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

test("arquivo real na demonstração: envio, download íntegro e auditado", async () => {
  // técnico já está logado pelo teste anterior
  const pdf = new TextEncoder().encode("%PDF-1.4\n% teste da demonstração\n%%EOF\n");
  const r = await enviarDocumentoDemo(200, { categoria: "termo" }, { nome: "termo.pdf", bytes: pdf });
  assert.equal(r.documento.arquivo.tamanho, pdf.length);
  const baixado = await baixarArquivoDemo(200, r.documento.id);
  assert.deepEqual(new Uint8Array(baixado.bytes), pdf);
  assert.equal(baixado.mime, "application/pdf");
  await assert.rejects(enviarDocumentoDemo(200, {}, { nome: "x.pdf", bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]) }), (e) => e.status === 400);
  const trilha = await atenderDemo("/api/audit");
  assert.ok(trilha.entradas.some((e) => e.tipo === "arquivo_baixado"));
});

test("gestão de usuários na demonstração: edição e redefinição de senha", async () => {
  const ed = await atenderDemo("/api/usuarios/101", "PUT", { nome: "Nome Editado Teste", senhaAdmin: "1234" });
  assert.equal(ed.usuario.nome, "Nome Editado Teste");
  await atenderDemo("/api/usuarios/101/senha", "POST", { senhaProvisoria: "Jacaranda-31", senhaAdmin: "1234" });
  await atenderDemo("/api/auth/logout", "POST");
  const s = await atenderDemo("/api/auth/login", "POST", { login: "est02", senha: "Jacaranda-31" });
  assert.equal(s.trocaObrigatoria, true);
  await atenderDemo("/api/auth/logout", "POST");
  await atenderDemo("/api/auth/login", "POST", { login: "tecnico", senha: "1234" });
});

test("dados persistem no navegador e podem ser restaurados", async () => {
  assert.ok(localStorage.getItem("pep_demo_db_v1"));
  await restaurarDemonstracao();
  assert.equal(localStorage.getItem("pep_demo_db_v1"), null);
});
