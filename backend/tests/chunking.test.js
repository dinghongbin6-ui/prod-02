import test from "node:test";
import assert from "node:assert/strict";
import { splitText } from "../services/chunking.js";

test("chunking keeps a clause heading with its text and groups short paragraphs", () => {
  const chunks = splitText("第一条 保险责任\n本保险承担以下责任。\n\n【特殊门诊医疗费用】\n仅包括化学疗法、放射疗法。", 160, 10);
  assert.equal(chunks.length, 1);
  assert.match(chunks[0], /第一条 保险责任\n本保险承担以下责任/u);
  assert.match(chunks[0], /【特殊门诊医疗费用】\n仅包括化学疗法/u);
});

test("chunking splits oversized paragraphs without returning empty chunks", () => {
  const chunks = splitText("甲".repeat(2400), 500, 80);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length > 0));
  assert.ok(chunks.some((chunk) => chunk.includes("甲".repeat(400))));
});
