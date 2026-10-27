import test from "node:test";
import assert from "node:assert/strict";
import { mapWithConcurrency } from "../services/embeddingBatch.js";

test("mapWithConcurrency preserves order and respects its limit", async () => {
  let active = 0;
  let peak = 0;
  const results = await mapWithConcurrency([10, 20, 30, 40, 50], 2, async (value) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return value * 2;
  });

  assert.deepEqual(results, [20, 40, 60, 80, 100]);
  assert.equal(peak, 2);
});

test("mapWithConcurrency validates its limit", async () => {
  await assert.rejects(mapWithConcurrency([], 0, async () => null), /positive integer/);
});

test("mapWithConcurrency waits for active work before returning an error", async () => {
  let siblingFinished = false;
  await assert.rejects(mapWithConcurrency([0, 1], 2, async (value) => {
    if (value === 0) throw new Error("mapper failed");
    await new Promise((resolve) => setTimeout(resolve, 10));
    siblingFinished = true;
  }), /mapper failed/);
  assert.equal(siblingFinished, true);
});
