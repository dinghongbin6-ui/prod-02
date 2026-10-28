import XLSX from "xlsx";
import { deflateRawSync } from "node:zlib";

const FORMAT_INFO = {
  docx: { extension: "docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  xlsx: { extension: "xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  csv: { extension: "csv", contentType: "text/csv; charset=utf-8" },
  md: { extension: "md", contentType: "text/markdown; charset=utf-8" },
  txt: { extension: "txt", contentType: "text/plain; charset=utf-8" },
};

function invalidDocumentData() {
  const error = new Error("文档内容格式无效");
  error.code = "INVALID_DOCUMENT";
  return error;
}

function validateDocumentData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)
    || typeof data.question !== "string" || typeof data.answer !== "string"
    || !Array.isArray(data.sources) || !Array.isArray(data.toolResults)
    || data.sources.length > 100 || data.toolResults.length > 100) {
    throw invalidDocumentData();
  }

  const textFields = ["productName", "subject", "matchType", "matchedPhrase"];
  for (const source of data.sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)
      || typeof source.file !== "string" || typeof source.content !== "string"
      || textFields.some((field) => source[field] != null && typeof source[field] !== "string")
      || (source.chunkId != null && !["string", "number"].includes(typeof source.chunkId))
      || (source.distance != null && typeof source.distance !== "number")) {
      throw invalidDocumentData();
    }
  }
  for (const toolResult of data.toolResults) {
    if (!toolResult || typeof toolResult !== "object" || Array.isArray(toolResult)
      || typeof toolResult.tool !== "string") {
      throw invalidDocumentData();
    }
  }
}

function sections(data) {
  return [
    ["问题", data.question],
    ["回答", data.answer],
    ["检索来源", ...(data.sources.length ? data.sources.map((s) => `${s.file}${s.chunkId ? `（片段 ${s.chunkId}）` : ""}；匹配方式：${s.matchType || "语义匹配"}${s.matchedPhrase ? `（${s.matchedPhrase}）` : ""}；主体/产品：${s.productName || "未标注"}；主题/规则：${s.subject || "未标注"}：${s.content}`) : ["无"])],
    ["工具查询结果", ...(data.toolResults.length ? data.toolResults.map((t) => `${t.tool} ${JSON.stringify(t.result)}`) : ["无"])],
  ];
}

function xmlEscape(value) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameBuffer = Buffer.from(name, "utf8");
    const source = Buffer.from(content, "utf8");
    const compressed = deflateRawSync(source);
    const checksum = crc32(source);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(source.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    localParts.push(local, nameBuffer, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(source.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + compressed.length;
  }
  const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function makeDocx(data) {
  const paragraphs = ["AI 知识库问答结果", ...sections(data).flatMap(([title, ...items]) => [title, ...items])];
  const body = paragraphs.map((line, index) => {
    const style = index === 0 ? '<w:pPr><w:pStyle w:val="Title"/></w:pPr>' : "";
    return `<w:p>${style}<w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`;
  }).join("");
  return makeZip([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ["word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`],
  ]);
}

function makeXlsx(data) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["问题", data.question], ["回答", data.answer]]), "问答");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["来源文件", "主体/产品", "主题/规则", "片段", "内容", "距离"], ...data.sources.map((s) => [s.file, s.productName || "", s.subject || "", s.chunkId ?? "", s.content, s.distance ?? ""])]), "检索来源");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["工具", "参数", "结果"], ...data.toolResults.map((t) => [t.tool, JSON.stringify(t.arguments), JSON.stringify(t.result)])]), "工具结果");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
}

function makeText(data, format) {
  if (format === "md") return `# AI 知识库问答结果\n\n${sections(data).map(([title, ...items]) => `## ${title}\n\n${items.map((item) => `- ${item}`).join("\n")}`).join("\n\n")}\n`;
  if (format === "csv") {
    const rows = [["类型", "内容"], ...sections(data).flatMap(([title, ...items]) => items.map((item) => [title, item]))];
    return `\uFEFF${rows.map((row) => row.map((cell) => {
      const value = String(cell ?? "");
      const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
      return `"${safe.replace(/"/g, '""')}"`;
    }).join(",")).join("\r\n")}`;
  }
  return `AI 知识库问答结果\n\n${sections(data).map(([title, ...items]) => `${title}\n${items.join("\n")}`).join("\n\n")}\n`;
}

export async function createDocument(data) {
  validateDocumentData(data);
  if (typeof data.format !== "string" || !Object.hasOwn(FORMAT_INFO, data.format)) {
    const error = new Error("不支持的文档格式");
    error.code = "UNSUPPORTED_FORMAT";
    throw error;
  }
  const info = FORMAT_INFO[data.format];
  const buffer = data.format === "docx"
    ? makeDocx(data)
    : data.format === "xlsx"
      ? makeXlsx(data)
      : Buffer.from(makeText(data, data.format), "utf8");
  return { ...info, buffer };
}
