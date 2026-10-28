import test from "node:test";
import assert from "node:assert/strict";
import { createConcurrencyGate } from "../services/concurrencyGate.js";

test("concurrency gate rejects work at its limit and admits it after release", () => {
  const gate = createConcurrencyGate(2);

  assert.equal(gate.tryAcquire(), true);
  assert.equal(gate.tryAcquire(), true);
  assert.equal(gate.tryAcquire(), false);
  gate.release();
  assert.equal(gate.tryAcquire(), true);
});

test("concurrency gate requires a positive integer limit", () => {
  assert.throws(() => createConcurrencyGate(0), RangeError);
  assert.throws(() => createConcurrencyGate(1.5), RangeError);
});