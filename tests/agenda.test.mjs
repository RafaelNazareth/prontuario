// Testes do gerador de agenda (scripts/gerar-agenda.mjs) e da agenda
// de 28/10/2026 até o último dia útil de dezembro/2026 em data/seed.json.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FERIADOS_2026, gerarAgenda, isDiaUtil, ultimoDiaUtil } from "../scripts/gerar-agenda.mjs";

const seed = JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf8"));
const INICIO = "2026-10-28";
const FIM = ultimoDiaUtil("2026-12");
const periodo = seed.AGENDAMENTOS.filter((a) => a.data >= INICIO && a.data <= FIM);

test("último dia útil de dezembro/2026 é 31/12 (quinta-feira)", () => {
  assert.equal(FIM, "2026-12-31");
  assert.equal(ultimoDiaUtil("2026-11"), "2026-11-30");
});

test("isDiaUtil ignora fins de semana e feriados", () => {
  assert.equal(isDiaUtil("2026-10-31"), false); // sábado
  assert.equal(isDiaUtil("2026-11-02"), false); // Finados
  assert.equal(isDiaUtil("2026-11-20"), false); // Consciência Negra
  assert.equal(isDiaUtil("2026-12-25"), false); // Natal
  assert.equal(isDiaUtil("2026-10-28"), true);
});

test("seed tem agenda para todos os pacientes ativos no período", () => {
  const ativos = seed.PACIENTES.filter((p) => p.status === "ativo").map((p) => p.id);
  const comAgenda = new Set(periodo.map((a) => a.pacienteId));
  for (const id of ativos) assert.ok(comAgenda.has(id), `paciente ${id} sem agenda`);
  assert.equal(periodo[0].data, INICIO);
  assert.equal(periodo.at(-1).data, FIM);
});

test("nenhum atendimento do período cai em fim de semana ou feriado", () => {
  for (const a of periodo) assert.ok(isDiaUtil(a.data, FERIADOS_2026), `${a.data} não é dia útil`);
});

test("cada caso mantém dia da semana, horário e sala; estudante é do grupo", () => {
  for (const pac of seed.PACIENTES) {
    const ags = periodo.filter((a) => a.pacienteId === pac.id);
    assert.equal(new Set(ags.map((a) => new Date(a.data + "T12:00Z").getUTCDay())).size <= 1, true);
    assert.equal(new Set(ags.map((a) => a.hora)).size <= 1, true);
    assert.equal(new Set(ags.map((a) => a.local)).size <= 1, true);
    for (const a of ags) assert.ok(pac.estudantesIds.includes(a.estudanteId));
  }
});

test("IDs de agendamento são únicos e o gerador é idempotente", () => {
  const ids = seed.AGENDAMENTOS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(gerarAgenda(seed, { inicio: INICIO, fim: FIM }), []);
});
