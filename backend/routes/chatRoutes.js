import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { askAssistant } from "../services/chatService.js";
import { clearSession } from "../chatMemory.js";
import { createDocument } from "../services/documentService.js";
import { createConcurrencyGate } from "../services/concurrencyGate.js";
const router = Router();
router.use(requireAuth);
const configuredChatLimit = Number(process.env.MAX_CONCURRENT_CHATS);
const chatGate = createConcurrencyGate(Number.isInteger(configuredChatLimit) && configuredChatLimit > 0 ? configuredChatLimit : 4);
router.post("/ask", async (req, res) => {
  let keepalive;
  let acquired = false;
  try {
    const question = String(req.body?.question || "").trim();
    const sessionId = String(req.body?.sessionId || "").trim();
    if (!question) return res.status(400).json({ error: "question is required" });
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });
    if (question.length > 4000) return res.status(413).json({ error: "问题不能超过4000个字符" });
    if (sessionId.length > 128) return res.status(400).json({ error: "sessionId is too long" });
    if (!chatGate.tryAcquire()) return res.status(429).json({ error: "当前对话请求较多，请稍后重试" });
    acquired = true;
    const scopedSessionId = `user:${req.user.id}:session:${sessionId}`;
    res.set({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
    keepalive = setInterval(() => {
      if (!res.destroyed && !res.writableEnded) res.write(" ");
    }, 15_000);
    const result = await askAssistant(question, scopedSessionId);
    res.end(JSON.stringify(result));
  } catch (e) {
    console.error(e);
    const payload = { error: e.code === "LM_TIMEOUT"
      ? "模型响应超时。请稍后重试；若持续发生，请检查 LM Studio 的模型推理速度。"
      : "对话请求失败，请稍后重试" };
    if (res.headersSent) return res.end(JSON.stringify(payload));
    if (e.code === "LM_TIMEOUT") return res.status(504).json(payload);
    res.status(500).json(payload);
  } finally {
    if (keepalive) clearInterval(keepalive);
    if (acquired) chatGate.release();
  }
});
router.post("/generate-document", async (req, res) => {
  try {
    const { format, question, answer, sources = [], toolResults = [] } = req.body || {};
    if (!question || !answer) return res.status(400).json({ error: "question and answer are required" });
    if (!Array.isArray(sources) || !Array.isArray(toolResults)) return res.status(400).json({ error: "sources and toolResults must be arrays" });
    if (JSON.stringify(req.body).length > 200_000) return res.status(413).json({ error: "文档内容过大" });
    const document = await createDocument({ format, question, answer, sources, toolResults });
    res.setHeader("Content-Type", document.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="answer.${document.extension}"`);
    res.send(document.buffer);
  } catch (error) {
    if (["UNSUPPORTED_FORMAT", "INVALID_DOCUMENT"].includes(error.code)) return res.status(400).json({ error: error.message });
    console.error("文档生成失败:", error);
    res.status(500).json({ error: "文档生成失败，请稍后重试" });
  }
});
router.post("/clear-memory", async (req, res) => {
  try {
    const sessionId = String(req.body?.sessionId || "").trim();
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });
    if (sessionId.length > 128) return res.status(400).json({ error: "sessionId is too long" });
    await clearSession(`user:${req.user.id}:session:${sessionId}`); res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "清理聊天记忆失败" }); }
});
export default router;
