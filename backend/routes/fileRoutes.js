import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = path.resolve(__dirname, "../knowledge");
fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
const allowed = new Set([".txt", ".md", ".pdf", ".doc", ".docx", ".csv", ".xls", ".xlsx", ".ppt", ".pptx"]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, KNOWLEDGE_DIR),
  filename: (_req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[\\/\0]/g, "_");
    cb(null, safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  if (!allowed.has(path.extname(file.originalname).toLowerCase())) return cb(new Error("不支持的文件类型"));
  cb(null, true);
}});
router.use(requireAuth, requireAdmin);
router.get("/", (_req, res) => {
  try {
    const files = fs.readdirSync(KNOWLEDGE_DIR, { withFileTypes: true }).filter(x => x.isFile()).map(x => {
      const full = path.join(KNOWLEDGE_DIR, x.name); const s = fs.statSync(full);
      return { filename: x.name, size: s.size, updatedAt: s.mtime.toISOString() };
    });
    res.json({ files });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post("/", (req, res) => upload.single("file")(req, res, err => {
  if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.message });
  if (!req.file) return res.status(400).json({ error: "请选择文件" });
  res.status(201).json({ success: true, filename: req.file.filename, note: "文件已保存。若知识库使用 LanceDB，请按项目原有流程重建索引后才能检索到新内容。" });
}));
router.delete("/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const full = path.join(KNOWLEDGE_DIR, filename);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return res.status(404).json({ error: "文件不存在" });
  try { fs.unlinkSync(full); res.json({ success: true, note: "源文件已删除；请按项目原有流程更新/重建向量索引，避免旧内容仍被检索到。" }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
export default router;
