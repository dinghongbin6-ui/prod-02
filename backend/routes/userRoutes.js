import { Router } from "express";
import { all, get, run } from "../database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { hashPassword } from "../security/passwords.js";
const router = Router();
router.use(requireAuth, requireAdmin);
router.get("/", async (_req, res) => {
  try { res.json({ users: await all("SELECT id, username, role, created_at FROM users ORDER BY id DESC") }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post("/", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) return res.status(400).json({ error: "用户名需为3-40位字母、数字、点、下划线或短横线" });
    if (password.length < 12) return res.status(400).json({ error: "初始密码至少12位" });
    const result = await run("INSERT INTO users(username,password_hash,role) VALUES(?,?,'user')", [username, hashPassword(password)]);
    res.status(201).json({ user: { id: result.lastID, username, role: "user" } });
  } catch (e) { res.status(e.message?.includes("UNIQUE") ? 409 : 500).json({ error: e.message?.includes("UNIQUE") ? "用户名已存在" : "创建用户失败" }); }
});
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const target = await get("SELECT id, role FROM users WHERE id = ?", [id]);
    if (!target) return res.status(404).json({ error: "用户不存在" });
    if (target.role === "admin") return res.status(400).json({ error: "不能通过此接口删除管理员" });
    await run("DELETE FROM users WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
export default router;
