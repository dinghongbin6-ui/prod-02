import test from "node:test";
import assert from "node:assert/strict";
import { extractSearchPhrases } from "../services/searchPhrases.js";

test("search phrases prefer the specific Chinese topic after the product name", () => {
  const phrases = extractSearchPhrases("平安产险恶性肿瘤医疗保险（互联网版）的特殊门诊医疗费用是什么？");
  assert.deepEqual(phrases.slice(0, 3), ["特殊门诊医疗费用", "特殊门诊医疗", "特殊门诊"]);
  assert.ok(phrases.includes("平安产险恶性肿瘤医疗保险"));
});

test("search phrases extract a topic when the question has no product prefix", () => {
  assert.deepEqual(extractSearchPhrases("特殊门诊费用包括什么"), ["特殊门诊费用", "特殊门诊"]);
});

test("search phrases retain short terms when they carry query meaning", () => {
  assert.deepEqual(extractSearchPhrases("天气如何"), ["天气"]);
});

test("search phrases discard a trailing question verb and keep the named clause", () => {
  assert.deepEqual(extractSearchPhrases("特殊门诊医疗费用怎么认定"), ["特殊门诊医疗费用", "特殊门诊医疗", "特殊门诊"]);
});
