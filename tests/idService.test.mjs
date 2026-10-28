import test from "node:test";
import assert from "node:assert/strict";
import { generateId, generateSequentialId } from "../assets/js/core/idService.js";

test("generateId returns unique string values", () => {
  const ids = new Set(Array.from({ length: 1000 }, () => generateId()));
  assert.equal(ids.size, 1000);
  ids.forEach((id) => assert.equal(typeof id, "string"));
});

test("generateSequentialId is strictly increasing and never collides, even called synchronously in a loop", () => {
  const ids = Array.from({ length: 1000 }, () => generateSequentialId());
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, "all generated IDs must be unique");
  for (let i = 1; i < ids.length; i++) {
    assert.ok(ids[i] > ids[i - 1], "IDs must be strictly increasing");
  }
});

test("generateSequentialId returns a number (compat with legacy numeric IDs)", () => {
  assert.equal(typeof generateSequentialId(), "number");
});
