import test from "node:test";
import assert from "node:assert/strict";
import { decodeMojibakeFilename } from "../services/filenameEncoding.js";

test("decodes UTF-8 multipart filenames interpreted as Latin-1", () => {
  const original = "健康医疗类产品.txt";
  const mojibake = Buffer.from(original, "utf8").toString("latin1");

  assert.equal(decodeMojibakeFilename(mojibake), original);
});

test("preserves already valid filenames and invalid byte sequences", () => {
  const valid = "健康医疗类产品.txt";
  const invalid = `name\u0081.txt`;

  assert.equal(decodeMojibakeFilename(valid), valid);
  assert.equal(decodeMojibakeFilename(invalid), invalid);
});