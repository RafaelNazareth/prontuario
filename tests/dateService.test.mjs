import test from "node:test";
import assert from "node:assert/strict";
import {
  formatBR,
  formatShort,
  formatLong,
  weekdayAbbrev,
  diffInDays,
  calculateAge,
  today,
} from "../assets/js/core/dateService.js";

test("formatBR converts ISO date to DD/MM/AAAA", () => {
  assert.equal(formatBR("2026-06-08"), "08/06/2026");
});
test("formatBR handles empty input", () => {
  assert.equal(formatBR(""), "—");
  assert.equal(formatBR(null), "—");
});

test("formatShort converts ISO date to DD/MM", () => {
  assert.equal(formatShort("2026-06-08"), "08/06");
});

test("formatLong converts ISO date to 'D mmm' without leading zero on day", () => {
  assert.equal(formatLong("2026-06-08"), "8 jun");
  assert.equal(formatLong("2026-01-01"), "1 jan");
  assert.equal(formatLong("2026-12-25"), "25 dez");
});

test("weekdayAbbrev returns correct pt-BR abbreviation", () => {
  // 2026-06-08 is a Monday
  assert.equal(weekdayAbbrev("2026-06-08"), "Seg");
});

test("diffInDays computes whole-day difference regardless of time-of-day rounding", () => {
  assert.equal(diffInDays("2026-06-10", "2026-06-08"), 2);
  assert.equal(diffInDays("2026-06-08", "2026-06-08"), 0);
  assert.equal(diffInDays("2026-06-08", "2026-06-10"), -2);
});

test("calculateAge computes full years, accounting for month/day not yet reached", () => {
  const now = new Date();
  const isoToday = now.toISOString().split("T")[0];
  const [y] = isoToday.split("-");
  // Birthday exactly 30 years ago today -> 30
  assert.equal(calculateAge(`${Number(y) - 30}-${isoToday.slice(5)}`), 30);
});

test("today returns an ISO date string (AAAA-MM-DD)", () => {
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});
