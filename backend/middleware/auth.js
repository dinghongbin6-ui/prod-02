import { verifyToken } from "../security/tokens.js";
import { get } from "../database.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const tokenUser = verifyToken(token);
    if (!tokenUser) return res.status(401).json({ error: "登录已过期或尚未登录" });
    const user = await get("SELECT id, username, role FROM users WHERE id = ?", [tokenUser.id]);
    if (!user) return res.status(401).json({ error: "登录已过期或尚未登录" });
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "需要管理员权限" });
  next();
}
