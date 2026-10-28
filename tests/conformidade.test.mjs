// Testes das regras de conformidade aplicadas pelo SERVIDOR:
// senhas e bloqueio (SBIS NGS1.02), trilha de auditoria encadeada
// (NGS1.07), escopo por papel (LGPD art. 46; Res. CFP 05/2025 art. 17),
// regras de gravação (Res. CFP 001/2009 art. 3º; SBIS NGS1.12) e a API
// HTTP de ponta a ponta numa pasta de dados temporária.

import test from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { Buffer } from "node:buffer";
import process from "node:process";
import { join } from "node:path";
import { conferirSenha, gerarHashSenha, registrarFalhaLogin, estaBloqueado, validarPoliticaSenha } from "../server/security.mjs";
import { registrarEvento, verificarTrilha } from "../server/audit.mjs";
import { aplicarAlteracoes, escopo } from "../server/policy.mjs";

const SEED = new URL("../data/seed.json", import.meta.url);
const carregar = () => JSON.parse(readFileSync(SEED, "utf8"));
const clone = (x) => JSON.parse(JSON.stringify(x));

// ── Senhas e bloqueio ────────────────────────────────────────
test("senha é guardada com hash e salt únicos; conferência funciona", () => {
  const a = gerarHashSenha("Segura123");
  const b = gerarHashSenha("Segura123");
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
  assert.ok(Buffer.from(a.hash, "base64").length * 8 >= 160, "hash com pelo menos 160 bits (SBIS NGS1.02.02)");
  assert.equal(conferirSenha("Segura123", a), true);
  assert.equal(conferirSenha("errada", a), false);
});

test("seed não contém senha em texto puro", () => {
  const d = carregar();
  for (const u of d.USERS) {
    assert.equal(u.pass, undefined);
    assert.equal(u.senha.alg, "scrypt");
  }
});

test("política de senha: tamanho, letra, número e sem nome/login", () => {
  assert.match(validarPoliticaSenha("abc1"), /8 caracteres/);
  assert.match(validarPoliticaSenha("somenteletras"), /número/);
  assert.match(validarPoliticaSenha("12345678"), /letra/);
  assert.match(validarPoliticaSenha("carlos2026x", { nome: "Carlos Mendes", login: "cmendes" }), /nome ou login/);
  assert.equal(validarPoliticaSenha("Ipe-amarelo-77"), null);
});

test("conta bloqueia após 5 tentativas inválidas consecutivas", () => {
  const u = {};
  for (let i = 0; i < 4; i++) assert.equal(registrarFalhaLogin(u), false);
  assert.equal(registrarFalhaLogin(u), true);
  assert.equal(estaBloqueado(u), true);
});

// ── Auditoria ────────────────────────────────────────────────
test("trilha do seed é íntegra e sem nomes de pacientes", () => {
  const d = carregar();
  assert.equal(verificarTrilha(d.AUDITORIA).integra, true);
  const nomes = d.PACIENTES.map((p) => p.nome);
  for (const e of d.AUDITORIA) assert.ok(!nomes.some((n) => String(e.complemento || "").includes(n)), "log não pode ter identificação do paciente");
});

test("alterar ou remover um registro da trilha é detectado", () => {
  const db = { AUDITORIA: [] };
  for (let i = 0; i < 5; i++) registrarEvento(db, { tipo: "consulta_prontuario", userId: 1, pacienteId: 200 });
  assert.equal(verificarTrilha(db.AUDITORIA).integra, true);
  const adulterada = clone(db.AUDITORIA);
  adulterada[2].userId = 99;
  assert.equal(verificarTrilha(adulterada).integra, false);
  const removida = clone(db.AUDITORIA);
  removida.splice(1, 1);
  assert.equal(verificarTrilha(removida).integra, false);
});

// ── Escopo de leitura ────────────────────────────────────────
const user = (d, id) => d.USERS.find((u) => u.id === id);

test("estudante só recebe os pacientes do próprio grupo; ninguém recebe senhas", () => {
  const d = carregar();
  const v = escopo(user(d, 100), d);
  assert.deepEqual(v.PACIENTES.map((p) => p.id), [200]);
  assert.deepEqual(Object.keys(v.EVOLUCOES), ["200"]);
  assert.equal(v.AUDITORIA.length, 0);
  assert.ok(v.USERS.every((u) => u.senha === undefined && u.login === undefined));
});

test("paciente acessa o próprio prontuário sem registro documental, material restrito nem registros pendentes", () => {
  const d = carregar();
  d.EVOLUCOES[200][0].validacao = { status: "pendente" };
  d.DOCUMENTOS[200].push({ id: "rx", compartimento: "restrito", nome: "teste.pdf" });
  const v = escopo(user(d, 200), d);
  assert.deepEqual(v.PACIENTES.map((p) => p.id), [200]);
  assert.deepEqual(v.REGISTRO_DOCUMENTAL, {});
  assert.ok(!v.DOCUMENTOS[200].some((x) => x.compartimento === "restrito"));
  assert.ok(!v.EVOLUCOES[200].some((x) => x.validacao?.status === "pendente"));
  assert.equal(v.NOTIFICACOES.length, 0);
});

// ── Regras de gravação ───────────────────────────────────────
function gravar(d, uid, mutar) {
  const v = clone(escopo(user(d, uid), d));
  mutar(v);
  return aplicarAlteracoes(d, user(d, uid), v);
}

test("evolução existente não pode ser editada diretamente nem apagada", () => {
  const d = carregar();
  const r = gravar(d, 100, (v) => {
    v.EVOLUCOES[200][0].conteudo = "texto alterado";
  });
  assert.equal(r.ok, false);
  const r2 = gravar(d, 100, (v) => {
    v.EVOLUCOES[200].splice(0, 1);
  });
  assert.equal(r2.ok, true, "ausência não é exclusão");
  assert.equal(r2.db.EVOLUCOES[200].length, d.EVOLUCOES[200].length);
});

test("nova evolução de estudante fica pendente, com autoria e assinatura do servidor", () => {
  const d = carregar();
  const r = gravar(d, 100, (v) => {
    v.EVOLUCOES[200].push({ id: 1, data: "2026-10-27 08:50", tipo: "atendimento", conteudo: "Sessão de teste", autor: "Forjado", autorId: 1 });
  });
  assert.equal(r.ok, true);
  const nova = r.db.EVOLUCOES[200].at(-1);
  assert.equal(nova.autorId, 100);
  assert.equal(nova.autor, "Ana Rocha");
  assert.equal(nova.validacao.status, "pendente");
  assert.ok(nova.assinatura.hash.length === 64);
  assert.ok(r.eventos.some((e) => e.tipo === "evolucao_criada"));
});

test("só o supervisor do caso valida; estudante não", () => {
  const d = carregar();
  const pend = d.EVOLUCOES[200].find((x) => x.validacao.status === "pendente");
  const marcar = (v) => {
    v.EVOLUCOES[200].find((x) => x.id === pend.id).validacao = { status: "validada" };
  };
  assert.equal(gravar(d, 100, marcar).ok, false);
  // supervisor de outro caso nem recebe o paciente; uma gravação forjada é recusada
  const forjada = { EVOLUCOES: { 200: clone(d.EVOLUCOES[200]) } };
  forjada.EVOLUCOES[200].find((x) => x.id === pend.id).validacao = { status: "validada" };
  assert.equal(aplicarAlteracoes(d, user(d, 11), forjada).ok, false, "supervisor de outro caso");
  const r = gravar(d, 10, marcar);
  assert.equal(r.ok, true);
  assert.equal(r.db.EVOLUCOES[200].find((x) => x.id === pend.id).validacao.porId, 10);
});

test("retificação: só o autor, com justificativa, preservando a versão anterior", () => {
  const d = carregar();
  const ev = d.EVOLUCOES[200].find((x) => x.autorId === 100);
  const retificar = (just) => (v) => {
    const x = v.EVOLUCOES[200].find((y) => y.id === ev.id);
    x.conteudo = "Texto corrigido";
    x.justificativaRetificacao = just;
  };
  assert.equal(gravar(d, 100, retificar("curta")).ok, false);
  assert.equal(gravar(d, 10, retificar("Supervisor tentando corrigir")).ok, false);
  const r = gravar(d, 100, retificar("Nome da técnica estava errado"));
  assert.equal(r.ok, true);
  const x = r.db.EVOLUCOES[200].find((y) => y.id === ev.id);
  assert.equal(x.conteudo, "Texto corrigido");
  assert.equal(x.versoes.at(-1).conteudo, ev.conteudo);
  assert.equal(x.versoes.at(-1).justificativa, "Nome da técnica estava errado");
});

test("avaliação de demanda finalizada não muda", () => {
  const d = carregar();
  const r = gravar(d, 100, (v) => {
    v.ANAMNESES[200].queixa = "outra";
  });
  assert.equal(r.ok, false);
});

test("estudante não cadastra paciente nem acessa paciente de outro grupo", () => {
  const d = carregar();
  const r = gravar(d, 100, (v) => {
    v.PACIENTES.push({ ...clone(v.PACIENTES[0]), id: 999, cpf: "000.000.000-00" });
  });
  assert.equal(r.ok, false);
  const r2 = aplicarAlteracoes(d, user(d, 100), { EVOLUCOES: { 201: [{ id: 5, conteudo: "invasão", data: "2026-10-27 09:00" }] } });
  assert.equal(r2.ok, false);
});

test("paciente pode abrir solicitação, mas não registrar evolução", () => {
  const d = carregar();
  const r = gravar(d, 200, (v) => {
    v.ACESSO_PACIENTE.push({ id: "s1", pacienteId: 200, nome: "Laura Assis", tipo: "correcao", descricao: "Telefone errado" });
  });
  assert.equal(r.ok, true);
  const s = r.db.ACESSO_PACIENTE.find((x) => x.id === "s1");
  assert.equal(s.status, "pendente");
  assert.ok(s.prazo > s.solicitacao);
  const r2 = gravar(d, 200, (v) => {
    v.EVOLUCOES[200].push({ id: 7, conteudo: "x", data: "2026-10-27 09:00" });
  });
  assert.equal(r2.ok, false);
});

test("quebra de sigilo exige fundamento; registro de auditoria não vem do navegador", () => {
  const d = carregar();
  const r = gravar(d, 10, (v) => {
    (v.COMPARTILHAMENTOS[200] ||= []).push({ id: "c1", tipo: "quebra_sigilo", destinatario: "X", finalidade: "Y", resumo: "Z" });
  });
  assert.equal(r.ok, false);
  const r2 = aplicarAlteracoes(d, user(d, 1), { AUDITORIA: [] });
  assert.equal(r2.ok, true);
  assert.equal(r2.db.AUDITORIA.length, d.AUDITORIA.length);
});

// ── API HTTP de ponta a ponta ────────────────────────────────
test("API: login, bloqueio, escopo, CSRF e dados fora do alcance público", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "pep-http-"));
  copyFileSync(SEED, join(dir, "seed.json"));
  process.env.PEP_DATA_DIR = dir;
  const { server } = await import("../server/index.mjs");
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const post = (p, corpo, extra = {}) =>
    fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", "X-PEP-Request": "1", ...extra }, body: JSON.stringify(corpo) });

  // dados nunca são servidos como arquivo estático
  assert.equal((await fetch(base + "/data/db.json")).status, 404);
  assert.equal((await fetch(base + "/data/seed.json")).status, 404);
  // sem sessão não há dados
  assert.equal((await fetch(base + "/api/data")).status, 401);
  // erro genérico (não revela se o usuário existe)
  const r1 = await post("/api/auth/login", { login: "naoexiste", senha: "x" });
  const r2 = await post("/api/auth/login", { login: "tecnico", senha: "errada" });
  assert.equal(r1.status, 401);
  assert.equal((await r1.json()).erro, (await r2.json()).erro);
  // sem o cabeçalho do app, ações são recusadas (CSRF)
  const semCab = await fetch(base + "/api/auth/login", { method: "POST", body: JSON.stringify({ login: "tecnico", senha: "1234" }) });
  assert.equal(semCab.status, 403);
  // bloqueio após 5 falhas
  for (let i = 0; i < 5; i++) await post("/api/auth/login", { login: "sup2", senha: "errada" });
  assert.equal((await post("/api/auth/login", { login: "sup2", senha: "1234" })).status, 423);
  // login válido → cookie HttpOnly
  const ok = await post("/api/auth/login", { login: "estudante", senha: "1234" });
  assert.equal(ok.status, 200);
  const cookie = ok.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  const sid = cookie.split(";")[0];
  const corpo = await ok.json();
  assert.equal(corpo.termoPendente, true);
  const dados = await (await fetch(base + "/api/data", { headers: { cookie: sid } })).json();
  assert.deepEqual(dados.PACIENTES.map((p) => p.id), [200]);
  assert.ok(!JSON.stringify(dados).includes('"senha"'));
  // estudante não acessa auditoria
  assert.equal((await fetch(base + "/api/audit", { headers: { cookie: sid } })).status, 403);
  // eventos ficaram na trilha, sem senha nem nome
  const db = JSON.parse(readFileSync(join(dir, "db.json"), "utf8"));
  const tipos = db.AUDITORIA.map((e) => e.tipo);
  assert.ok(tipos.includes("login_falha") && tipos.includes("login_bloqueado") && tipos.includes("login_sucesso"));
  assert.equal(verificarTrilha(db.AUDITORIA).integra, true);
});
