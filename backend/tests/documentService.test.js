import test from "node:test";
import assert from "node:assert/strict";
import XLSX from "xlsx";
import { createDocument } from "../services/documentService.js";

const validData = {
  format: "xlsx",
  question: "=1+1",
  answer: "回答",
  sources: [{ file: "guide.txt", content: "资料内容", productName: "产品", subject: "规则" }],
  toolResults: [],
};

test("document export rejects object-shaped spreadsheet cells", async () => {
  await assert.rejects(
    createDocument({ ...validData, sources: [{ file: { f: "1+1" }, content: "资料内容" }] }),
    { code: "INVALID_DOCUMENT" }
  );
});

test("formula-looking text remains a text cell in exported XLSX", async () => {
  const document = await createDocument(validData);
  const workbook = XLSX.read(document.buffer, { type: "buffer" });
  const questionCell = workbook.Sheets["问答"].B1;

  assert.equal(questionCell.t, "s");
  assert.equal(questionCell.f, undefined);
});

test("document export rejects inherited format names", async () => {
  await assert.rejects(
    createDocument({ ...validData, format: "toString" }),
    { code: "UNSUPPORTED_FORMAT" }
  );
});