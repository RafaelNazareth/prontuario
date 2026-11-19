// API HTTP de ponta a ponta (servidor real numa pasta de dados
// temporária): envio e download de arquivo real, cifrado em disco;
// edição de usuário e redefinição de senha; troca de senha obrigatória
// no primeiro acesso; acesso temporário do paciente (só consulta);
// agenda só do técnico.

import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const SEED = new URL("../data/seed.json", import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "pep-api-"));
copyFileSync(SEED, join(dir, "seed.json"));
// dados institucionais informados na implantação
writeFileSync(join(dir, "instituicao.json"), JSON.stringify({ encarregado: { nome: "Maria Encarregada", email: "dpo@exemplo.org" } }));
process.env.PEP_DATA_DIR = dir;
process.env.PEP_BANCO = "json";
const { server } = await import("../server/index.mjs");
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

const PDF = Buffer.from("%PDF-1.4\n% documento de teste do PEP\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF\n");

async function entrar(login, senha = "1234") {
  const r = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-PEP-Request": "1" },
    body: JSON.stringify({ login, senha }),
  });
  assert.equal(r.status, 200, `login ${login}`);
  const cookie = r.headers.get("set-cookie").split(";")[0];
  const chamar = async (metodo, caminho, corpo) => {
    const resp = await fetch(base + caminho, {
      method: metodo,
      headers: { cookie, ...(metodo !== "GET" ? { "Content-Type": "application/json", "X-PEP-Request": "1" } : {}) },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
    return resp;
  };
  return { cookie, chamar, json: async (...a) => (await chamar(...a)).json() };
}

const lerDb = () => JSON.parse(readFileSync(join(dir, "db.json"), "utf8"));

test("dados institucionais da implantação substituem os de demonstração", async () => {
  const r = await (await fetch(base + "/api/institucional")).json();
  assert.equal(r.encarregado.nome, "Maria Encarregada");
  assert.ok(!r.pendencias.includes("encarregado.nome"));
});

test("arquivo real: envio, gravação cifrada, download íntegro e auditado", async () => {
  const est = await entrar("estudante");
  const r = await est.chamar("POST", "/api/pacientes/200/documentos", {
    documento: { categoria: "termo", titulo: "Termo assinado" },
    arquivo: { nome: "../termo assinado.pdf", conteudoBase64: PDF.toString("base64") },
  });
  assert.equal(r.status, 201);
  const { documento, data } = await r.json();
  assert.equal(documento.arquivo.nome, "termo assinado.pdf");
  assert.equal(documento.arquivo.tamanho, PDF.length);
  assert.equal(documento.autorId, 100, "autoria carimbada pelo servidor");
  assert.ok(data.DOCUMENTOS[200].some((d) => d.id === documento.id));
  // no disco, só o conteúdo cifrado
  const arquivos = readdirSync(join(dir, "arquivos"));
  assert.equal(arquivos.length, 1);
  assert.ok(!readFileSync(join(dir, "arquivos", arquivos[0])).includes(Buffer.from("%PDF")));
  // download confere o conteúdo
  const d = await est.chamar("GET", `/api/pacientes/200/documentos/${documento.id}/arquivo`);
  assert.equal(d.status, 200);
  assert.equal(d.headers.get("content-type"), "application/pdf");
  assert.match(d.headers.get("content-disposition"), /attachment/);
  assert.deepEqual(Buffer.from(await d.arrayBuffer()), PDF);
  const trilha = lerDb().AUDITORIA;
  assert.ok(trilha.some((e) => e.tipo === "documento_anexado" && e.registroId === documento.id));
  assert.ok(trilha.some((e) => e.tipo === "arquivo_baixado" && e.registroId === documento.id && e.userId === 100));
  // o paciente baixa o próprio documento
  const pac = await entrar("paciente");
  assert.equal((await pac.chamar("GET", `/api/pacientes/200/documentos/${documento.id}/arquivo`)).status, 200);
});

test("arquivo: tipo falso, paciente de outro grupo e material restrito são barrados", async () => {
  const est = await entrar("estudante");
  const exe = Buffer.from([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0]);
  const r1 = await est.chamar("POST", "/api/pacientes/200/documentos", { documento: { categoria: "outro" }, arquivo: { nome: "laudo.pdf", conteudoBase64: exe.toString("base64") } });
  assert.equal(r1.status, 400);
  const outro = lerDb().PACIENTES.find((p) => !(p.estudantesIds || []).includes(100));
  const r2 = await est.chamar("POST", `/api/pacientes/${outro.id}/documentos`, { documento: { categoria: "outro" }, arquivo: { nome: "a.pdf", conteudoBase64: PDF.toString("base64") } });
  assert.equal(r2.status, 403);
  // material de teste: equipe baixa, paciente não vê
  const r3 = await est.chamar("POST", "/api/pacientes/200/documentos", { documento: { categoria: "material_teste" }, arquivo: { nome: "teste.pdf", conteudoBase64: PDF.toString("base64") } });
  const { documento } = await r3.json();
  assert.equal(documento.compartimento, "restrito");
  const pac = await entrar("paciente");
  assert.equal((await pac.chamar("GET", `/api/pacientes/200/documentos/${documento.id}/arquivo`)).status, 404);
  // documento antigo sem arquivo digital
  const antigo = lerDb().DOCUMENTOS[200].find((d) => !d.arquivo);
  assert.equal((await est.chamar("GET", `/api/pacientes/200/documentos/${antigo.id}/arquivo`)).status, 404);
});

test("usuários: técnico edita e redefine senha; a pessoa entra com a provisória e precisa trocar", async () => {
  const tec = await entrar("tecnico");
  const semSenha = await tec.chamar("PUT", "/api/usuarios/101", { nome: "Nome Novo" });
  assert.equal(semSenha.status, 403, "exige reautenticação");
  const ed = await tec.json("PUT", "/api/usuarios/101", { nome: "Beatriz Nova Silva", senhaAdmin: "1234" });
  assert.equal(ed.usuario.nome, "Beatriz Nova Silva");
  assert.deepEqual(ed.alterados, ["nome"]);
  const papel = await tec.chamar("PUT", "/api/usuarios/10", { papel: "estudante", matricula: "1", senhaAdmin: "1234" });
  assert.equal(papel.status, 409, "supervisor com casos não muda de papel");
  const rs = await tec.chamar("POST", "/api/usuarios/101/senha", { senhaProvisoria: "Jacaranda-31", senhaAdmin: "1234" });
  assert.equal(rs.status, 200);
  const login = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-PEP-Request": "1" },
    body: JSON.stringify({ login: "est02", senha: "Jacaranda-31" }),
  });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).trocaObrigatoria, true);
  const est = await entrar("estudante");
  assert.equal((await est.chamar("PUT", "/api/usuarios/101", { nome: "x", senhaAdmin: "1234" })).status, 403, "só o técnico gere usuários");
  const tipos = lerDb().AUDITORIA.map((e) => e.tipo);
  assert.ok(tipos.includes("usuario_atualizado") && tipos.includes("senha_redefinida"));
});

test("acesso temporário: o sistema gera login e senha; paciente só consulta; vencido não entra", async () => {
  const tec = await entrar("tecnico");
  const db = lerDb();
  const semAcesso = db.PACIENTES.find((p) => !db.USERS.some((u) => u.id === p.id));
  // não se cria mais paciente com senha escolhida
  const antigo = await tec.chamar("POST", "/api/usuarios", { papel: "paciente", pacienteId: semAcesso.id, login: "x.y", senhaInicial: "abcd", senhaAdmin: "1234" });
  assert.equal(antigo.status, 400);
  assert.equal((await tec.chamar("POST", `/api/pacientes/${semAcesso.id}/acesso-temporario`, {})).status, 403, "exige reautenticação");
  const r = await tec.json("POST", `/api/pacientes/${semAcesso.id}/acesso-temporario`, { senhaAdmin: "1234" });
  assert.equal(r.login, `pac${semAcesso.id}`);
  assert.match(r.senha, /^[A-Za-z0-9]{10}$/);
  assert.ok(Date.parse(r.expiraEm) > Date.now());
  assert.ok(lerDb().AUDITORIA.some((e) => e.tipo === "acesso_temporario_gerado" && e.pacienteId === semAcesso.id));
  const pac = await entrar(r.login, r.senha);
  const dados = await pac.json("GET", "/api/data");
  assert.deepEqual(dados.PACIENTES.map((p) => p.id), [semAcesso.id]);
  assert.deepEqual(dados.SOLICITACOES_AGENDAMENTO, []);
  assert.deepEqual(dados.ACESSO_PACIENTE, []);
  // só consulta: qualquer gravação é recusada
  const pedido = { id: "pag_api_1", pacienteId: semAcesso.id, tipo: "agendar", canal: "telefone" };
  assert.equal((await pac.chamar("PUT", "/api/data", { ...dados, SOLICITACOES_AGENDAMENTO: [pedido] })).status, 403);
  const titular = { id: "sol_api_1", pacienteId: semAcesso.id, tipo: "copia", descricao: "Quero cópia" };
  assert.equal((await pac.chamar("PUT", "/api/data", { ...dados, ACESSO_PACIENTE: [titular] })).status, 403);
  assert.equal((await pac.chamar("POST", `/api/pacientes/${semAcesso.id}/documentos`, { documento: { categoria: "outro" }, arquivo: { nome: "a.pdf", conteudoBase64: PDF.toString("base64") } })).status, 403);
  // nova senha: a anterior deixa de valer e a sessão aberta cai
  const r2 = await tec.json("POST", `/api/pacientes/${semAcesso.id}/acesso-temporario`, { senhaAdmin: "1234" });
  assert.equal(r2.login, r.login);
  assert.notEqual(r2.senha, r.senha);
  assert.equal((await pac.chamar("GET", "/api/data")).status, 401);
  // acesso vencido: login recusado
  const d = lerDb();
  d.USERS.find((u) => u.id === semAcesso.id).acessoExpiraEm = "2020-01-01T00:00:00.000Z";
  writeFileSync(join(dir, "db.json"), JSON.stringify(d));
  const vencido = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-PEP-Request": "1" },
    body: JSON.stringify({ login: r2.login, senha: r2.senha }),
  });
  assert.equal(vencido.status, 401);
  assert.match((await vencido.json()).erro, /expirou/);
});

test("primeiro acesso da equipe: qualquer senha inicial; nada funciona antes da troca", async () => {
  const tec = await entrar("tecnico");
  const r = await tec.chamar("POST", "/api/usuarios", { nome: "Paula Supervisora", login: "paula.sup", papel: "supervisor", crp: "CRP 06/654321", senhaInicial: "abcd", senhaAdmin: "1234" });
  assert.equal(r.status, 201, "o técnico pode usar qualquer senha inicial");
  const sup = await entrar("paula.sup", "abcd");
  const me = await sup.json("GET", "/api/auth/me");
  assert.equal(me.trocaObrigatoria, true);
  const bloqueado = await sup.chamar("GET", "/api/data");
  assert.equal(bloqueado.status, 403, "sem trocar a senha, o sistema não libera os dados");
  assert.equal((await bloqueado.json()).motivo, "troca_senha");
  const fraca = await sup.chamar("POST", "/api/auth/senha", { senhaAtual: "abcd", novaSenha: "abcd" });
  assert.equal(fraca.status, 400, "a senha própria segue a política");
  const ok = await sup.chamar("POST", "/api/auth/senha", { senhaAtual: "abcd", novaSenha: "Ipe-amarelo-77" });
  assert.equal(ok.status, 200);
  assert.equal((await sup.chamar("GET", "/api/data")).status, 200);
});

test("agenda: estudante não cria agendamento; técnico registra pedido recebido por telefone e agenda", async () => {
  const est = await entrar("estudante");
  const dados = await est.json("GET", "/api/data");
  const novo = { id: 777001, pacienteId: 200, estudanteId: 100, data: "2026-12-29", hora: "16:30", local: "Sala 1", status: "confirmado" };
  const r = await est.chamar("PUT", "/api/data", { ...dados, AGENDAMENTOS: [...dados.AGENDAMENTOS, novo] });
  assert.equal(r.status, 403);
  const tec = await entrar("tecnico");
  const dt = await tec.json("GET", "/api/data");
  const semCanal = { id: "pag_api_2", pacienteId: 200, tipo: "agendar" };
  assert.equal((await tec.chamar("PUT", "/api/data", { ...dt, SOLICITACOES_AGENDAMENTO: [...dt.SOLICITACOES_AGENDAMENTO, semCanal] })).status, 403);
  const pedido = { ...semCanal, canal: "telefone", preferencia: "Sexta de manhã" };
  assert.equal((await tec.chamar("PUT", "/api/data", { ...dt, SOLICITACOES_AGENDAMENTO: [...dt.SOLICITACOES_AGENDAMENTO, pedido] })).status, 200);
  const dt2 = await tec.json("GET", "/api/data");
  assert.ok(dt2.SOLICITACOES_AGENDAMENTO.some((p) => p.id === "pag_api_2" && p.status === "pendente" && p.canal === "telefone"));
  const rt = await tec.chamar("PUT", "/api/data", { ...dt2, AGENDAMENTOS: [...dt2.AGENDAMENTOS, novo] });
  assert.equal(rt.status, 200, "técnico agenda");
});

test("auditoria paginada", async () => {
  const tec = await entrar("tecnico");
  const p1 = await tec.json("GET", "/api/audit?porPagina=10&pagina=1");
  const p2 = await tec.json("GET", "/api/audit?porPagina=10&pagina=2");
  assert.equal(p1.entradas.length, 10);
  assert.equal(p1.pagina, 1);
  assert.ok(p1.paginas >= 2);
  assert.notEqual(p1.entradas[0].id, p2.entradas[0].id);
  // toda página consultada fica registrada, inclusive com número fora do padrão
  await tec.json("GET", "/api/audit?porPagina=10&pagina=01");
  const consultas = lerDb().AUDITORIA.filter((e) => e.tipo === "consulta_auditoria");
  assert.ok(consultas.some((e) => /página 2/.test(e.complemento)));
  assert.equal(consultas.filter((e) => /página 1$/.test(e.complemento)).length >= 2, true);
});
