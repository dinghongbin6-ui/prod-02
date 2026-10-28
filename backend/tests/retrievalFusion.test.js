import test from "node:test";
import assert from "node:assert/strict";
import { reciprocalRankFusion } from "../services/retrievalFusion.js";

test("reciprocal rank fusion promotes documents supported by both retrieval lists", () => {
  const semantic = [{ id: "semantic" }, { id: "both" }];
  const lexical = [{ id: "both" }, { id: "lexical" }];
  const results = reciprocalRankFusion([semantic, lexical], (item) => item.id);
  assert.equal(results[0].item.id, "both");
});
