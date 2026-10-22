import { Router } from "express";
import { login } from "../services/authService.js";
import { createToken } from "../security/tokens.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "请输入用户名和密码" });
    const user = await login(username, password);
    if (!user) return res.status(401).json({ error: "用户名或密码错误" });
    res.json({ token: createToken(user), user });
  } catch (e) { console.error(e); res.status(500).json({ error: "登录失败" }); }
});
router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
export default router;
