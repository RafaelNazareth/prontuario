import test from "node:test";
import assert from "node:assert/strict";
import { installBrowserStubs } from "./helpers/testEnv.mjs";

installBrowserStubs();
const { validarCPF, validarEmail } = await import("../assets/js/modals/modals.js");

test("validarCPF aceita CPFs válidos (dígito verificador correto)", () => {
  assert.equal(validarCPF("111.444.777-35"), true);
  assert.equal(validarCPF("11144477735"), true);
});

test("validarCPF rejeita dígito verificador incorreto", () => {
  assert.equal(validarCPF("111.444.777-36"), false);
});

test("validarCPF rejeita todos os dígitos iguais (000.000.000-00 etc.)", () => {
  assert.equal(validarCPF("000.000.000-00"), false);
  assert.equal(validarCPF("111.111.111-11"), false);
});

test("validarCPF rejeita tamanho incorreto", () => {
  assert.equal(validarCPF("123"), false);
  assert.equal(validarCPF(""), false);
});

test("validarEmail aceita vazio (campo opcional) e formatos válidos", () => {
  assert.equal(validarEmail(""), true);
  assert.equal(validarEmail(undefined), true);
  assert.equal(validarEmail("nome@dominio.com"), true);
});

test("validarEmail rejeita formatos claramente inválidos", () => {
  assert.equal(validarEmail("sem-arroba.com"), false);
  assert.equal(validarEmail("nome@sem-ponto"), false);
});
