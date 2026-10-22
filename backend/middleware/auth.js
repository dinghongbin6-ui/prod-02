import { verifyToken } from "../security/tokens.js";
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: "登录已过期或尚未登录" });
  req.user = user;
  next();
}
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "需要管理员权限" });
  next();
}
