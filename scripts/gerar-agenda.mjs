// ============================================================
// scripts/gerar-agenda.mjs
// ------------------------------------------------------------
// Gera a agenda de atendimentos de um período a partir do padrão
// semanal de cada caso já existente nos dados (dia da semana,
// horário, sala e supervisor do último agendamento do paciente).
//
// Regras:
//   - só pacientes ativos;
//   - um atendimento por semana, no mesmo dia/horário/sala;
//   - pula sábados, domingos e feriados nacionais do período;
//   - o estudante responsável reveza semanalmente dentro do grupo
//     do paciente (estudantesIds), para todos terem agenda;
//   - não duplica: se já existe agendamento do paciente naquela
//     data/hora, mantém o existente (o script é idempotente).
//
// Uso:
//   node scripts/gerar-agenda.mjs [arquivo.json] [inicio] [fim]
//   padrão: data/seed.json 2026-10-28 2026-12-31
//
// Depois de gerar no seed, rode `npm run data:reset` para copiar
// o seed para data/db.json (os dados que o sistema usa).
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Feriados nacionais de 2026 que caem em dia útil.
// (15/11/2026 cai num domingo e já é ignorado como fim de semana.)
export const FERIADOS_2026 = [
  "2026-01-01", // Confraternização Universal
  "2026-04-03", // Sexta-feira Santa
  "2026-04-21", // Tiradentes
  "2026-05-01", // Dia do Trabalho
  "2026-09-07", // Independência
  "2026-10-12", // Nossa Senhora Aparecida
  "2026-11-02", // Finados
  "2026-11-20", // Dia Nacional de Zumbi e da Consciência Negra
  "2026-12-25", // Natal
];

function addDias(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function diaSemana(iso) {
  return new Date(iso + "T12:00:00Z").getUTCDay();
}

export function isDiaUtil(iso, feriados = FERIADOS_2026) {
  const dow = diaSemana(iso);
  return dow !== 0 && dow !== 6 && !feriados.includes(iso);
}

/** Último dia útil de um mês ("AAAA-MM"). */
export function ultimoDiaUtil(anoMes, feriados = FERIADOS_2026) {
  const [a, m] = anoMes.split("-").map(Number);
  let iso = new Date(Date.UTC(a, m, 0, 12)).toISOString().slice(0, 10);
  while (!isDiaUtil(iso, feriados)) iso = addDias(iso, -1);
  return iso;
}

/**
 * Retorna os novos agendamentos (não altera o dataset recebido).
 * @param {object} dataset  conteúdo do JSON (PACIENTES, AGENDAMENTOS, ...)
 * @param {{inicio: string, fim: string, feriados?: string[]}} opts
 */
export function gerarAgenda(dataset, { inicio, fim, feriados = FERIADOS_2026 }) {
  const existentes = new Set(
    dataset.AGENDAMENTOS.map((a) => `${a.pacienteId}_${a.data}_${a.hora}`),
  );
  let proximoId = Math.max(0, ...dataset.AGENDAMENTOS.map((a) => Number(a.id) || 0)) + 1;
  const novos = [];

  for (const pac of dataset.PACIENTES.filter((p) => p.status === "ativo")) {
    const historico = dataset.AGENDAMENTOS
      .filter((a) => a.pacienteId === pac.id)
      .sort((a, b) => a.data.localeCompare(b.data));
    const modelo = historico.at(-1);
    if (!modelo) continue; // caso sem padrão semanal definido

    const dow = diaSemana(modelo.data);
    const grupo = pac.estudantesIds?.length ? pac.estudantesIds : [modelo.estudanteId];

    // primeira data do período que cai no dia da semana do caso
    let data = inicio;
    while (diaSemana(data) !== dow) data = addDias(data, 1);

    for (let semana = 0; data <= fim; data = addDias(data, 7), semana++) {
      if (!isDiaUtil(data, feriados)) continue;
      if (existentes.has(`${pac.id}_${data}_${modelo.hora}`)) continue;
      novos.push({
        id: proximoId++,
        pacienteId: pac.id,
        estudanteId: grupo[semana % grupo.length],
        supervisorId: pac.supervisorId ?? modelo.supervisorId,
        data,
        hora: modelo.hora,
        local: modelo.local,
        modalidade: modelo.modalidade || "presencial",
        status: "confirmado",
      });
    }
  }
  return novos;
}

// ── CLI ─────────────────────────────────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [arquivo = "data/seed.json", inicio = "2026-10-28", fim = ultimoDiaUtil("2026-12")] =
    process.argv.slice(2);
  const dataset = JSON.parse(readFileSync(arquivo, "utf8"));
  const novos = gerarAgenda(dataset, { inicio, fim });
  dataset.AGENDAMENTOS.push(...novos);
  dataset.AGENDAMENTOS.sort(
    (a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora) || a.id - b.id,
  );
  writeFileSync(arquivo, JSON.stringify(dataset, null, 2) + "\n", "utf8");
  console.log(`${novos.length} agendamentos criados em ${arquivo} (${inicio} a ${fim}).`);
}
