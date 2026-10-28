// Garante que os dados de demonstração (data/seed.json) estão completos:
// anamnese finalizada, evoluções de pelo menos dois meses e diagnósticos
// externos com origem identificada.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const seed = JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf8"));
const CAMPOS_ANAMNESE = ["queixa", "historia", "historico_medico", "medicamentos", "contexto", "hipoteses"];

test("todo paciente tem anamnese finalizada com todos os campos preenchidos", () => {
  for (const p of seed.PACIENTES) {
    const a = seed.ANAMNESES[p.id];
    assert.ok(a, `paciente ${p.id} sem anamnese`);
    assert.equal(a.status, "finalizada", `anamnese de ${p.id} não finalizada`);
    for (const c of CAMPOS_ANAMNESE) assert.ok(a[c]?.trim(), `${p.id}.${c} vazio`);
  }
});

test("todo paciente tem pelo menos dois meses de evoluções", () => {
  for (const p of seed.PACIENTES) {
    const evs = seed.EVOLUCOES[p.id] || [];
    assert.ok(evs.length >= 8, `paciente ${p.id} com só ${evs.length} evoluções`);
    const primeira = new Date(evs[0].data.slice(0, 10));
    const ultima = new Date(evs.at(-1).data.slice(0, 10));
    assert.ok((ultima - primeira) / 86400000 >= 60, `evoluções de ${p.id} cobrem menos de 2 meses`);
  }
});

test("evoluções estão em ordem, numeradas e ligadas a sessões realizadas", () => {
  const realizadas = new Set(
    seed.AGENDAMENTOS.filter((a) => a.status === "confirmado").map((a) => `${a.pacienteId}_${a.data}`),
  );
  for (const p of seed.PACIENTES) {
    const evs = seed.EVOLUCOES[p.id];
    evs.forEach((e, i) => {
      assert.equal(e.num, i + 1);
      if (i > 0) assert.ok(e.data >= evs[i - 1].data, `evoluções de ${p.id} fora de ordem`);
      if (e.tipo === "atendimento")
        assert.ok(realizadas.has(`${p.id}_${e.data.slice(0, 10)}`), `evolução ${e.id} sem sessão realizada`);
    });
  }
  const ids = Object.values(seed.EVOLUCOES).flat().map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "IDs de evolução repetidos");
});

test("alguns pacientes têm diagnósticos de outros psicólogos, com origem e resumo", () => {
  const externos = Object.entries(seed.DOCUMENTOS).flatMap(([pid, docs]) =>
    docs.filter((d) => d.categoria === "diagnostico_externo").map((d) => ({ pid, ...d })),
  );
  const pacientes = new Set(externos.map((d) => d.pid));
  assert.ok(pacientes.size >= 4, "poucos pacientes com diagnóstico externo");
  for (const [, docs] of Object.entries(seed.DOCUMENTOS))
    assert.ok(docs.filter((d) => d.categoria === "diagnostico_externo").length <= 2);
  for (const d of externos) {
    assert.match(d.origem.crp, /^CRP \d{2}\/\d{5,6}$/);
    assert.ok(d.origem.profissional && d.resumo);
  }
});

test("toda falta registrada aponta para um agendamento com status faltou", () => {
  for (const f of seed.FALTAS) {
    const ag = seed.AGENDAMENTOS.find((a) => a.id === f.agId);
    assert.equal(ag?.status, "faltou");
  }
});
