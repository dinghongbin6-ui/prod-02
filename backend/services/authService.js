import { validateServerConfig } from "../config.js";
import { get, run } from "../database.js";
import { hashPassword, verifyPassword } from "../security/passwords.js";

export async function ensureInitialAdmin() {
  validateServerConfig();
  const existingAdmin = await get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (existingAdmin) return;

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.includes("替换成你自己的强密码") || password.length < 12 || password.length > 1024) {
    throw new Error("首次启动必须设置长度为12至1024位的 ADMIN_PASSWORD");
  }
  const existing = await get("SELECT id FROM users WHERE username = ?", [username]);
  if (existing) throw new Error(`初始管理员用户名已被非管理员账号占用：${username}`);
  await run("INSERT INTO users(username,password_hash,role) VALUES(?,?, 'admin')", [username, hashPassword(password)]);
  console.log(`[auth] 已创建初始管理员账号：${username}`);
}
export async function login(username, password) {
  const user = await get("SELECT id, username, password_hash, role FROM users WHERE username = ?", [String(username || "").trim()]);
  if (!user || !verifyPassword(String(password || ""), user.password_hash)) return null;
  return { id: user.id, username: user.username, role: user.role };
}
