import { Router } from "express";
import { login } from "../services/authService.js";
import { createToken } from "../security/tokens.js";
import { requireAuth } from "../middleware/auth.js";
import { loginRateLimit } from "../middleware/loginRateLimit.js";
const router = Router();
router.post("/login", loginRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string" || !username || !password) return res.status(400).json({ error: "请输入用户名和密码" });
    if (username.length > 100 || password.length > 1024) return res.status(400).json({ error: "用户名或密码长度超出限制" });
    const user = await login(username, password);
    if (!user) return res.status(401).json({ error: "用户名或密码错误" });
    res.json({ token: createToken(user), user });
  } catch (e) { console.error(e); res.status(500).json({ error: "登录失败" }); }
});
router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
export default router;
