// Regras compartilhadas de arquivos anexados (tipo real, tamanho, nome)
// e de gestão de usuários (cadastro, edição, redefinição de senha).

import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import {
  LIMITE_ARQUIVO_BYTES,
  base64ParaBytes,
  bytesParaBase64,
  detectarTipoArquivo,
  formatarTamanho,
  nomeArquivoSeguro,
  validarArquivo,
} from "../assets/js/shared/arquivos.js";
import {
  ErroUsuario,
  acessoExpirado,
  aplicarEdicaoUsuario,
  aplicarRedefinicaoSenha,
  gerarAcessoTemporario,
  montarNovoUsuario,
} from "../assets/js/shared/usuarios.js";
import { ACESSO_PORTAL } from "../assets/js/shared/configuracao.js";
import { cifrarArquivo, decifrarArquivo } from "../server/cofreArquivos.mjs";
import { randomBytes } from "node:crypto";

const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF\n");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);
const DOCX = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new TextEncoder().encode("....word/document.xml")]);
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0]);

test("tipo do arquivo vem do conteúdo, não da extensão", () => {
  assert.equal(detectarTipoArquivo(PDF), "pdf");
  assert.equal(detectarTipoArquivo(PNG), "png");
  assert.equal(detectarTipoArquivo(JPG), "jpg");
  assert.equal(detectarTipoArquivo(DOCX), "docx");
  assert.equal(detectarTipoArquivo(EXE), null);
  const exeDisfarcado = validarArquivo({ nome: "laudo.pdf", bytes: EXE });
  assert.equal(exeDisfarcado.ok, false);
  const ok = validarArquivo({ nome: "Laudo final.PDF", bytes: PDF });
  assert.equal(ok.ok, true);
  assert.equal(ok.mime, "application/pdf");
  assert.equal(ok.nome, "Laudo final.pdf");
});

test("arquivo vazio ou acima de 10 MB é recusado", () => {
  assert.equal(validarArquivo({ nome: "a.pdf", bytes: new Uint8Array() }).ok, false);
  const grande = new Uint8Array(LIMITE_ARQUIVO_BYTES + 1);
  grande.set(PDF);
  assert.match(validarArquivo({ nome: "a.pdf", bytes: grande }).erro, /10 MB/);
});

test("nome do arquivo é limpo (sem caminho nem caracteres reservados) e ganha a extensão real", () => {
  assert.equal(nomeArquivoSeguro("../../etc/passwd", "pdf"), "passwd.pdf");
  assert.equal(nomeArquivoSeguro("C:\\Users\\x\\Termo: <assinado>?.jpeg", "jpg"), "Termo assinado.jpg");
  assert.equal(nomeArquivoSeguro("", "png"), "documento.png");
  assert.equal(nomeArquivoSeguro("relatório.exe", "docx"), "relatório.docx");
});

test("base64 de ida e volta (usado no navegador) e tamanho legível", () => {
  const bytes = randomBytes(1000);
  for (const n of [0, 1, 2, 3, 999, 1000]) {
    const pedaco = new Uint8Array(bytes.subarray(0, n));
    const b64 = bytesParaBase64(pedaco);
    assert.equal(b64, Buffer.from(pedaco).toString("base64"));
    assert.deepEqual(base64ParaBytes(b64), pedaco);
  }
  assert.equal(formatarTamanho(2048), "2 KB");
  assert.equal(formatarTamanho(1572864), "1,5 MB");
});

test("arquivo cifrado em disco: AES-256-GCM detecta alteração e chave errada", () => {
  const chave = randomBytes(32);
  const cifrado = cifrarArquivo(Buffer.from(PDF), chave);
  assert.ok(!cifrado.includes(Buffer.from("%PDF")), "conteúdo não fica em claro");
  assert.deepEqual(new Uint8Array(decifrarArquivo(cifrado, chave)), PDF);
  const adulterado = Buffer.from(cifrado);
  adulterado[adulterado.length - 1] ^= 1;
  assert.throws(() => decifrarArquivo(adulterado, chave));
  assert.throws(() => decifrarArquivo(cifrado, randomBytes(32)));
});

// ── Usuários ─────────────────────────────────────────────────
const carregar = () => JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf8"));
const senhaFake = (s) => ({ senha: { fake: s } });

test("cadastro de equipe: login único, CRP/matrícula; senha inicial livre com troca obrigatória", () => {
  const d = carregar();
  const base = { nome: "Ana Lima", login: "alima", papel: "supervisor", crp: "CRP 06/123456", senhaInicial: "Ipe-amarelo-77" };
  const novo = montarNovoUsuario(d, base, { adminId: 1, senha: senhaFake });
  assert.equal(novo.papel, "supervisor");
  assert.equal(novo.seguranca.trocaObrigatoria, true);
  assert.ok(!d.USERS.some((u) => u.id === novo.id) && !d.PACIENTES.some((p) => p.id === novo.id), "id não colide");
  assert.throws(() => montarNovoUsuario(d, { ...base, login: "tecnico" }, { adminId: 1, senha: senhaFake }), ErroUsuario);
  assert.throws(() => montarNovoUsuario(d, { ...base, crp: "123" }, { adminId: 1, senha: senhaFake }), /CRP/);
  assert.throws(() => montarNovoUsuario(d, { ...base, senhaInicial: "123" }, { adminId: 1, senha: senhaFake }), /4 caracteres/);
  // o técnico pode usar qualquer senha inicial (até com o nome ou só números)
  assert.equal(montarNovoUsuario(d, { ...base, senhaInicial: "alima" }, { adminId: 1, senha: senhaFake }).seguranca.trocaObrigatoria, true);
  assert.ok(montarNovoUsuario(d, { ...base, senhaInicial: "1234" }, { adminId: 1, senha: senhaFake }));
  assert.throws(() => montarNovoUsuario(d, { papel: "paciente", pacienteId: 200, login: "x.y", senhaInicial: "1234" }, { adminId: 1, senha: senhaFake }), /temporário/);
});

test("acesso temporário do paciente: login e senha gerados, validade e renovação", () => {
  const d = carregar();
  const semAcesso = d.PACIENTES.find((p) => !d.USERS.some((u) => u.id === p.id));
  const agora = new Date("2026-11-19T12:00:00Z");
  const r = gerarAcessoTemporario(d, semAcesso.id, { adminId: 1, senha: senhaFake, agora });
  assert.equal(r.novo, true);
  assert.equal(r.usuario.id, semAcesso.id);
  assert.equal(r.usuario.login, `pac${semAcesso.id}`);
  assert.match(r.senhaGerada, /^[A-HJ-NP-Za-km-np-z2-9]{10}$/, "sem caracteres ambíguos");
  assert.ok(/[A-Za-z]/.test(r.senhaGerada) && /\d/.test(r.senhaGerada));
  assert.equal(r.usuario.acessoExpiraEm, new Date(agora.getTime() + ACESSO_PORTAL.validadeDias * 86400000).toISOString());
  assert.equal(r.usuario.seguranca.trocaObrigatoria, false);
  assert.equal(acessoExpirado(r.usuario, agora.getTime()), false);
  assert.equal(acessoExpirado(r.usuario, Date.parse(r.usuario.acessoExpiraEm) + 1), true);
  // renovação: mesmo usuário e login, senha nova, reativado
  r.usuario.ativo = false;
  const r2 = gerarAcessoTemporario(d, semAcesso.id, { adminId: 1, senha: senhaFake, agora });
  assert.equal(r2.novo, false);
  assert.equal(r2.usuario, r.usuario);
  assert.equal(r2.usuario.ativo, true);
  assert.equal(d.USERS.filter((u) => u.id === semAcesso.id).length, 1);
  // paciente sem validade registrada conta como vencido; equipe nunca expira
  assert.equal(acessoExpirado({ papel: "paciente" }), true);
  assert.equal(acessoExpirado({ papel: "supervisor" }), false);
  // senha de paciente não se redefine: renova-se o acesso
  assert.throws(() => aplicarRedefinicaoSenha(r.usuario, "abcd", senhaFake), /renove/);
});

test("edição: muda nome e CRP; papel só muda sem casos vinculados; sempre sobra um técnico", () => {
  const d = carregar();
  const sup = d.USERS.find((u) => u.id === 10);
  assert.throws(() => aplicarEdicaoUsuario(d, sup, { papel: "estudante", matricula: "123" }), /Transfira/);
  const r = aplicarEdicaoUsuario(d, sup, { nome: "Dra. Ana Souza Lima", crp: "CRP 06/654321" });
  assert.deepEqual(r.campos.sort(), ["crp", "nome"]);
  assert.equal(sup.avatar, "DA");
  const tec = d.USERS.find((u) => u.id === 1);
  assert.throws(() => aplicarEdicaoUsuario(d, tec, { papel: "supervisor" }), /ao menos um técnico/);
  const pac = d.USERS.find((u) => u.id === 200);
  assert.throws(() => aplicarEdicaoUsuario(d, pac, { nome: "Outro Nome" }), /só o login/);
  assert.deepEqual(aplicarEdicaoUsuario(d, pac, { login: "laura.assis" }).campos, ["login"]);
});

test("redefinição de senha: provisória, troca obrigatória e conta desbloqueada", () => {
  const u = { nome: "Fulano de Tal", login: "fulano", seguranca: { bloqueadoAte: "2999-01-01T00:00:00Z", tentativasFalhas: 4 } };
  assert.throws(() => aplicarRedefinicaoSenha(u, "abc", senhaFake), /4 caracteres/);
  aplicarRedefinicaoSenha(u, "fulano", senhaFake);
  assert.deepEqual(u.senha, { fake: "fulano" }, "o técnico pode usar qualquer senha provisória");
  assert.equal(u.seguranca.trocaObrigatoria, true);
  assert.equal(u.seguranca.bloqueadoAte, undefined);
  assert.equal(u.seguranca.tentativasFalhas, 0);
});
