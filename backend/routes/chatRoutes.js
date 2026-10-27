import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { askAssistant } from "../services/chatService.js";
import { clearSession } from "../chatMemory.js";
const router = Router();
router.use(requireAuth);
router.post("/ask", async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();
    const sessionId = String(req.body?.sessionId || "").trim();
    if (!question) return res.status(400).json({ error: "question is required" });
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });
    if (question.length > 4000) return res.status(413).json({ error: "问题不能超过4000个字符" });
    if (sessionId.length > 128) return res.status(400).json({ error: "sessionId is too long" });
    const scopedSessionId = `user:${req.user.id}:session:${sessionId}`;
    res.json({ answer: await askAssistant(question, scopedSessionId) });
  } catch (e) { console.error(e); res.status(500).json({ error: "对话请求失败，请稍后重试" }); }
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
