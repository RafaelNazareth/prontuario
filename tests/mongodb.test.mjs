// Banco MongoDB (server/banco/mongodb.mjs) contra um MongoDB simulado
// em memória, com o subconjunto da API do driver que o adaptador usa.
// Confere: conversão ida e volta sem perda, gravação só do que mudou,
// um documento por registro e arquivos anexados.

import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { criarBancoMongo, deDocumentos, paraDocumentos, NOMES_COLECOES } from "../server/banco/mongodb.mjs";
import { normalizar } from "../server/jsonDb.mjs";

const SEED = fileURLToPath(new URL("../data/seed.json", import.meta.url));
const carregar = () => normalizar(JSON.parse(readFileSync(SEED, "utf8")));

function mongoFalso() {
  const colecoes = new Map();
  const ops = [];
  const col = (nome) => {
    if (!colecoes.has(nome)) colecoes.set(nome, new Map());
    const dados = colecoes.get(nome);
    return {
      async createIndex() {},
      async countDocuments() {
        return dados.size;
      },
      find() {
        return { toArray: async () => [...dados.values()].map((d) => globalThis.structuredClone(d)) };
      },
      async findOne({ _id }) {
        return dados.has(_id) ? globalThis.structuredClone(dados.get(_id)) : null;
      },
      async insertOne(doc) {
        if (dados.has(doc._id)) throw Object.assign(new Error("duplicate key"), { code: 11000 });
        dados.set(doc._id, globalThis.structuredClone(doc));
      },
      async bulkWrite(lista) {
        for (const op of lista) {
          ops.push([nome, Object.keys(op)[0]]);
          if (op.replaceOne) dados.set(op.replaceOne.filter._id, globalThis.structuredClone(op.replaceOne.replacement));
          else if (op.deleteOne) dados.delete(op.deleteOne.filter._id);
          else if (op.deleteMany) dados.clear();
        }
      },
    };
  };
  return { db: { collection: col }, colecoes, ops };
}

test("conversão dataset ⇄ documentos é sem perda, para todas as coleções", () => {
  const d = carregar();
  for (const chave of Object.keys(NOMES_COLECOES)) {
    const docs = paraDocumentos(chave, d[chave]);
    assert.ok(docs.every((x) => x._id != null), `${chave}: todo documento tem _id`);
    assert.equal(new Set(docs.map((x) => String(x._id))).size, docs.length, `${chave}: _id único`);
    assert.deepEqual(deDocumentos(chave, docs), d[chave], `${chave}: ida e volta`);
  }
});

test("banco vazio começa com o seed; ler devolve o mesmo dataset", async () => {
  const m = mongoFalso();
  const banco = await criarBancoMongo({ seedPath: SEED, conectar: async () => ({ db: m.db }) });
  assert.equal(banco.tipo, "mongodb");
  const lido = await banco.ler();
  assert.deepEqual(lido, carregar());
  // evoluções ficam um documento por registro, não um documento por paciente
  const evolucoes = Object.values(carregar().EVOLUCOES).flat().length;
  assert.equal(m.colecoes.get("evolucoes").size, evolucoes);
});

test("gravar envia só os documentos que mudaram", async () => {
  const m = mongoFalso();
  const banco = await criarBancoMongo({ seedPath: SEED, conectar: async () => ({ db: m.db }) });
  const d = await banco.ler();
  m.ops.length = 0;
  d.PACIENTES[0].telefone = "(11) 99999-0000";
  d.AUDITORIA.unshift({ id: "aud_999999", seq: 999999, ts: "2026-11-19T10:00:00.000Z", tipo: "logout" });
  await banco.gravar(d);
  assert.deepEqual(m.ops.sort(), [["auditoria", "replaceOne"], ["pacientes", "replaceOne"]].sort());
  const relido = await banco.ler();
  assert.equal(relido.PACIENTES[0].telefone, "(11) 99999-0000");
  assert.equal(relido.AUDITORIA[0].id, "aud_999999", "auditoria volta da mais recente para a mais antiga");
});

test("gravar recusa dataset inválido sem tocar no banco", async () => {
  const m = mongoFalso();
  const banco = await criarBancoMongo({ seedPath: SEED, conectar: async () => ({ db: m.db }) });
  const d = await banco.ler();
  m.ops.length = 0;
  await assert.rejects(banco.gravar({ ...d, USERS: [] }), /USERS/);
  assert.equal(m.ops.length, 0);
});

test("arquivos anexados: grava, lê e não sobrescreve", async () => {
  const m = mongoFalso();
  const banco = await criarBancoMongo({ seedPath: SEED, conectar: async () => ({ db: m.db }) });
  const conteudo = Buffer.from("conteúdo já cifrado");
  await banco.arquivos.salvar("a_12345678", conteudo);
  assert.deepEqual(await banco.arquivos.ler("a_12345678"), conteudo);
  assert.equal(await banco.arquivos.ler("a_inexistente"), null);
  await assert.rejects(banco.arquivos.salvar("a_12345678", conteudo));
  await assert.rejects(banco.arquivos.salvar("../fora", conteudo), /inválido/);
});

test("migração: importar substitui todo o conteúdo", async () => {
  const m = mongoFalso();
  const banco = await criarBancoMongo({ seedPath: SEED, conectar: async () => ({ db: m.db }), semearSeVazio: false });
  assert.equal((await banco.ler()).USERS.length, 0);
  const d = carregar();
  await banco.importar(d);
  assert.deepEqual(await banco.ler(), d);
});
