// ============================================================
// core/dateService.js
// ------------------------------------------------------------
// Ponto único para manipulação de datas no PEP.
//
// POR QUE ISTO EXISTE:
//   `new Date()`, `.toISOString().split("T")[0]` e
//   `.split("-").reverse().join("/")` apareciam repetidos em
//   dashboard.js, agenda.js, pacientes.js e acesso.js. Além de
//   duplicação, isso espalha uma decisão importante — qual é o
//   fuso horário "oficial" da aplicação — por vários arquivos.
//
// CONVENÇÕES DESTA APLICAÇÃO (documentadas para o futuro backend):
//   - Formato interno de data (sem hora):        "AAAA-MM-DD"  (ISO 8601 date)
//   - Formato interno de data+hora:               "AAAA-MM-DD HH:mm"
//   - Formato de exibição (pt-BR, sem hora):       "DD/MM/AAAA"
//   - Fuso horário assumido: horário local do navegador do usuário
//     (America/Sao_Paulo, na prática). O backend Java deverá
//     padronizar tudo em UTC e converter na borda da API — ver
//     docs/SECURITY_BACKEND_REQUIREMENTS.md e docs/API_DTOS.md.
//
// Este módulo NÃO resolve o problema de fuso horário (o frontend
// mock não tem como saber o fuso do servidor); ele apenas evita
// que a mesma lógica de formatação seja reescrita em cada arquivo,
// para que a futura correção de fuso horário aconteça em um único
// lugar.
// ============================================================

const MESES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const DIAS_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Data de hoje no formato interno "AAAA-MM-DD" (horário local). */
export function today() {
  return new Date().toISOString().split("T")[0];
}

/** Converte "AAAA-MM-DD" -> "DD/MM/AAAA". Retorna "—" se vazio. */
export function formatBR(isoDate) {
  if (!isoDate) return "—";
  return isoDate.split("-").reverse().join("/");
}

/** Converte "AAAA-MM-DD" -> "DD/MM" (sem ano). Retorna "—" se vazio. */
export function formatShort(isoDate) {
  if (!isoDate) return "—";
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

/** Converte "AAAA-MM-DD" -> "DD mmm" (ex.: "8 jun"). Retorna "—" se vazio. */
export function formatLong(isoDate) {
  if (!isoDate) return "—";
  const [, m, d] = isoDate.split("-");
  return `${parseInt(d, 10)} ${MESES_ABREV[parseInt(m, 10) - 1]}`;
}

/** Nome abreviado do dia da semana (ex.: "Seg") para uma data "AAAA-MM-DD". */
export function weekdayAbbrev(isoDate) {
  return DIAS_SEMANA_ABREV[new Date(isoDate + "T12:00:00").getDay()];
}

/** Diferença em dias inteiros entre duas datas "AAAA-MM-DD" (a - b). */
export function diffInDays(isoDateA, isoDateB) {
  const a = new Date(isoDateA + "T12:00:00");
  const b = new Date(isoDateB + "T12:00:00");
  return Math.round((a - b) / 86400000);
}

/** Idade em anos completos a partir de uma data de nascimento "AAAA-MM-DD". */
export function calculateAge(isoBirthDate) {
  const hoje = new Date();
  const nasc = new Date(isoBirthDate);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mDiff = hoje.getMonth() - nasc.getMonth();
  if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}
