import test from "node:test";
import assert from "node:assert/strict";
import { assertIndexBuildCanCommit } from "../services/indexBuildPolicy.js";

test("a partial indexing run cannot replace the existing index", () => {
  assert.throws(
    () => assertIndexBuildCanCommit([{ file: "broken.pdf" }], [{ id: "good-0" }]),
    /旧索引保持不变/
  );
});

test("an empty indexing run cannot replace the existing index", () => {
  assert.throws(() => assertIndexBuildCanCommit([], []), /旧索引保持不变/);
});

test("a fully successful indexing run can be committed", () => {
  assert.equal(assertIndexBuildCanCommit([], [{ id: "file-0" }]), undefined);
});
