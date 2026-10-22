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
    res.json({ answer: await askAssistant(question, sessionId) });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message || "Unknown error" }); }
});
router.post("/clear-memory", async (req, res) => {
  try {
    const sessionId = String(req.body?.sessionId || "").trim();
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });
    await clearSession(sessionId); res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message || "Clear memory failed" }); }
});
export default router;
