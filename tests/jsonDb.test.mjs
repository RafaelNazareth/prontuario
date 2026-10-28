// Testes da persistência em JSON (server/jsonDb.mjs): criação do db a
// partir do seed, gravação atômica, validação e restauração.

import test from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJsonDb, validarDataset } from "../server/jsonDb.mjs";

const SEED = new URL("../data/seed.json", import.meta.url);

function dirTemporario() {
  const dir = mkdtempSync(join(tmpdir(), "pep-db-"));
  copyFileSync(SEED, join(dir, "seed.json"));
  return dir;
}

test("ler() cria db.json a partir do seed quando ele não existe", () => {
  const dir = dirTemporario();
  try {
    const db = createJsonDb(dir);
    assert.equal(existsSync(db.dbPath), false);
    const data = db.ler();
    assert.equal(existsSync(db.dbPath), true);
    assert.ok(data.USERS.length > 0);
    assert.ok(data.AGENDAMENTOS.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("gravar() persiste em disco e não deixa arquivo temporário", () => {
  const dir = dirTemporario();
  try {
    const db = createJsonDb(dir);
    const data = db.ler();
    data.AGENDAMENTOS.push({ id: 999999, pacienteId: 200, data: "2026-12-30", hora: "09:00", status: "confirmado" });
    db.gravar(data);
    const relido = JSON.parse(readFileSync(db.dbPath, "utf8"));
    assert.ok(relido.AGENDAMENTOS.some((a) => a.id === 999999));
    assert.deepEqual(readdirSync(dir).filter((f) => f.endsWith(".tmp")), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("gravar() recusa estrutura inválida sem tocar no arquivo", () => {
  const dir = dirTemporario();
  try {
    const db = createJsonDb(dir);
    const antes = JSON.stringify(db.ler());
    assert.throws(() => db.gravar({ USERS: "x" }), /USERS/);
    assert.equal(JSON.stringify(db.ler()), antes);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("restaurarSeed() volta aos dados de demonstração", () => {
  const dir = dirTemporario();
  try {
    const db = createJsonDb(dir);
    const data = db.ler();
    data.PACIENTES = [];
    db.gravar(data);
    db.restaurarSeed();
    assert.ok(db.ler().PACIENTES.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validarDataset aceita o seed e rejeita USERS vazio", () => {
  const seed = JSON.parse(readFileSync(SEED, "utf8"));
  assert.equal(validarDataset(seed), null);
  assert.match(validarDataset({ ...seed, USERS: [] }), /USERS/);
});
