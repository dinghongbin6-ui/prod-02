import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Index } from "@lancedb/lancedb";

// 自动加载项目根目录的.env文件
dotenv.config({ path: path.resolve(fileURLToPath(import.meta.url), '../../.env') });

// 官方兼容方式加载CommonJS模块
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// 【关键】用稳定版pdf-parse，不需要canvas，纯JS解析，兼容所有文字版PDF
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const XLSX = require("xlsx");

import { getEmbedding } from "./embedding.js";
import { db, getTable } from "./lancedb.js";
import { all } from "./database.js";
import { mapWithConcurrency } from "./services/embeddingBatch.js";
import { assertIndexBuildCanCommit } from "./services/indexBuildPolicy.js";
import { splitText } from "./services/chunking.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const knowledgeDir = path.join(__dirname, "knowledge");

/*
========================================
TXT / MD / JSON / CSV
========================================
*/
function readTextFile(fullPath) {
  return fs.readFileSync(fullPath, "utf8");
}

/*
========================================
PDF解析：经典稳定版实现，零依赖
========================================
*/
async function readPdf(fullPath) {
  const dataBuffer = fs.readFileSync(fullPath);
  const data = await pdf(dataBuffer);
  return data.text;
}

/*
========================================
DOCX
========================================
*/
async function readDocx(fullPath) {
  const result = await mammoth.extractRawText({ path: fullPath });
  return result.value;
}

/*
========================================
XLS / XLSX
========================================
*/
async function readExcel(fullPath) {
  const workbook = XLSX.readFile(fullPath);
  let text = "";
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    text += `\n\nSheet: ${sheetName}\n`;
    for (const row of rows) {
      text += row.join(" ") + "\n";
    }
  }
  return text;
}

/*
========================================
统一文件读取分发
========================================
*/
async function readFileContent(fullPath) {
  const ext = path.extname(fullPath).toLowerCase();
  switch (ext) {
    case ".txt":
    case ".md":
    case ".json":
    case ".csv":
      return readTextFile(fullPath);
    case ".pdf":
      return await readPdf(fullPath);
    case ".docx":
      return await readDocx(fullPath);
    case ".xlsx":
    case ".xls":
      return await readExcel(fullPath);
    default:
      throw new Error(`不支持的文件格式: ${ext || "(无扩展名)"}`);
  }
}

/*
========================================
主构建程序
========================================
*/
export async function buildKnowledgeIndex() {
  console.log("🚀 开始构建知识库索引...");
  console.log(`🔗 当前嵌入API地址: ${process.env.LMSTUDIO_embeddings_API}`);

  if (!fs.existsSync(knowledgeDir)) {
    fs.mkdirSync(knowledgeDir, { recursive: true });
    console.log("ℹ️  已自动创建knowledge目录，请放入文档后重新运行");
    throw new Error("knowledge 目录不存在，已创建空目录；请先上传知识文件再重建索引");
  }

  const table = await getTable();
  const metadataRows = await all("SELECT file_name, product_name, subject FROM knowledge_file_metadata");
  const metadataByFile = new Map(metadataRows.map((item) => [item.file_name, item]));
  const files = fs.readdirSync(knowledgeDir);
  const rows = [];
  const failures = [];

  for (const file of files) {
    try {
      const fullPath = path.join(knowledgeDir, file);
      if (!fs.statSync(fullPath).isFile()) continue;

      const fileName = file;
      console.log(`📄 正在读取文件: ${fileName}`);
      const metadata = metadataByFile.get(fileName);
      if (!metadata?.product_name?.trim() || !metadata?.subject?.trim()) {
        throw new Error("缺少核心主体/产品或主题元数据，请在管理员文件管理页面填写并保存");
      }

      let content = await readFileContent(fullPath);
      if (!content || !content.trim()) {
        throw new Error("文件内容为空或没有可提取的文字层（扫描版 PDF 需要 OCR）");
      }

      // 文本清洗
      content = content
        .replace(/\r\n/g, "\n")
        .replace(/\t/g, " ")
        .replace(/ {2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      const chunks = splitText(content);
      console.log(`✅ ${fileName} => 分割为 ${chunks.length} 个文本块`);

      // 批量生成向量
      const embeddings = await mapWithConcurrency(chunks, 3, (chunk) => getEmbedding(
        `核心主体/产品：${metadata.product_name}\n主题：${metadata.subject}\n正文：${chunk}`
      ));

      for (let i = 0; i < chunks.length; i++) {
        rows.push({
          id: `${fileName}-${i}`,
          file: fileName,
          chunkId: i + 1,
          content: chunks[i],
          vector: embeddings[i]
        });
      }

    } catch (error) {
      const fileName = file;
      console.error(`❌ 处理文件失败 ${fileName}:`, error.message);
      failures.push({ file: fileName, error: error.message });
    }
  }

  assertIndexBuildCanCommit(failures, rows);

  console.log("🔄 正在更新知识库向量表...");
  if (table) {
    await table.add(rows, { mode: "overwrite" });
  } else {
    await db.createTable("knowledge", rows);
  }

  try {
    const updatedTable = await getTable();
    await updatedTable.createIndex("content", {
      config: Index.fts({
        baseTokenizer: "ngram",
        ngramMinLength: 2,
        ngramMaxLength: 3,
        removeStopWords: false,
      }),
      replace: true,
    });
    console.log("✅ 已更新中文 n-gram 全文检索索引");
  } catch (error) {
    console.warn("⚠️ 全文检索索引创建失败，将由关键词扫描回退：", error.message);
  }

  console.log(`🎉 索引构建完成！共成功索引 ${rows.length} 个文本块，来自 ${new Set(rows.map(r => r.file)).size} 个文件`);
  return { chunks: rows.length, files: new Set(rows.map(r => r.file)).size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  buildKnowledgeIndex().catch(err => {
    console.error("❌ 索引构建失败:", err);
    process.exitCode = 1;
  });
}
