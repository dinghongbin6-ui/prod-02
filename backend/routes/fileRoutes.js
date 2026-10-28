import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { buildKnowledgeIndex } from "../build-index.js";
import { all, run } from "../database.js";
import { decodeMojibakeFilename } from "../services/filenameEncoding.js";
const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = path.resolve(__dirname, "../knowledge");
fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
const allowed = new Set([".txt", ".md", ".json", ".pdf", ".docx", ".csv", ".xls", ".xlsx"]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, KNOWLEDGE_DIR),
  filename: (_req, file, cb) => {
    const originalname = decodeMojibakeFilename(file.originalname);
    const safe = path.basename(originalname).replace(/[\\/\0]/g, "_");
    const extension = path.extname(safe);
    const name = path.basename(safe, extension);
    cb(null, `${name}-${randomUUID()}${extension}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  const originalname = decodeMojibakeFilename(file.originalname);
  if (!allowed.has(path.extname(originalname).toLowerCase())) return cb(new Error("不支持的文件类型"));
  cb(null, true);
}});
router.use(requireAuth, requireAdmin);
let rebuilding = false;
router.post("/rebuild-index", async (_req, res) => {
  if (rebuilding) return res.status(409).json({ error: "知识库正在重建，请稍后再试" });
  rebuilding = true;
  try {
    const result = await buildKnowledgeIndex();
    res.json({ success: true, ...result, message: `知识库重建完成：${result.files} 个文件，${result.chunks} 个文本块` });
  } catch (error) {
    console.error("知识库重建失败:", error);
    res.status(500).json({ error: error.message || "知识库重建失败" });
  } finally {
    rebuilding = false;
  }
});
router.get("/", async (_req, res) => {
  try {
    const metadataRows = await all("SELECT file_name, product_name, subject FROM knowledge_file_metadata");
    const metadataByFile = new Map(metadataRows.map((item) => [item.file_name, item]));
    const files = fs.readdirSync(KNOWLEDGE_DIR, { withFileTypes: true }).filter(x => x.isFile()).map(x => {
      const full = path.join(KNOWLEDGE_DIR, x.name); const s = fs.statSync(full);
      const metadata = metadataByFile.get(x.name) || {};
      return { filename: x.name, displayFilename: decodeMojibakeFilename(x.name), size: s.size, updatedAt: s.mtime.toISOString(), productName: metadata.product_name || "", subject: metadata.subject || "" };
    });
    res.json({ files });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.put("/:filename/metadata", async (req, res) => {
  const filename = path.basename(req.params.filename);
  const full = path.join(KNOWLEDGE_DIR, filename);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return res.status(404).json({ error: "文件不存在" });
  const productName = String(req.body?.productName || "").trim();
  const subject = String(req.body?.subject || "").trim();
  if (!productName || !subject) return res.status(400).json({ error: "核心主体/产品和主题/规则都必须填写" });
  if (productName.length > 200 || subject.length > 300) return res.status(400).json({ error: "元数据长度超出限制" });
  try {
    await run("INSERT OR REPLACE INTO knowledge_file_metadata (file_name, product_name, subject, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)", [filename, productName, subject]);
    res.json({ success: true, message: "元数据已保存；请重建知识库使新元数据进入向量索引" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.post("/", (req, res) => upload.single("file")(req, res, async err => {
  if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.message });
  if (!req.file) return res.status(400).json({ error: "请选择文件" });
  const productName = String(req.body?.productName || "").trim();
  const subject = String(req.body?.subject || "").trim();
  if (!productName || !subject) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "上传时必须填写核心主体/产品和主题/规则" });
  }
  try {
    await run("INSERT OR REPLACE INTO knowledge_file_metadata (file_name, product_name, subject, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)", [req.file.filename, productName, subject]);
    res.status(201).json({ success: true, filename: req.file.filename, note: "文件和元数据已保存。请重建知识库使新内容进入检索索引。" });
  } catch (error) {
    fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
}));
router.delete("/:filename", async (req, res) => {
  const filename = path.basename(req.params.filename);
  const full = path.join(KNOWLEDGE_DIR, filename);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return res.status(404).json({ error: "文件不存在" });
  try {
    fs.unlinkSync(full);
    await run("DELETE FROM knowledge_file_metadata WHERE file_name = ?", [filename]);
    res.json({ success: true, note: "源文件已删除；请重建向量索引，避免旧内容仍被检索到。" });
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});
export default router;
