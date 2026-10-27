import { validateServerConfig } from "../config.js";
import { get, run } from "../database.js";
import { hashPassword, verifyPassword } from "../security/passwords.js";

export async function ensureInitialAdmin() {
  validateServerConfig();
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.includes("替换成你自己的强密码")) {
    console.warn("[auth] ADMIN_PASSWORD 未设置为真实密码；跳过管理员初始化");
    return;
  }
  const existing = await get("SELECT id FROM users WHERE username = ?", [username]);
  if (!existing) {
    await run("INSERT INTO users(username,password_hash,role) VALUES(?,?, 'admin')", [username, hashPassword(password)]);
    console.log(`[auth] 已创建初始管理员账号：${username}`);
  }
}
export async function login(username, password) {
  const user = await get("SELECT id, username, password_hash, role FROM users WHERE username = ?", [String(username || "").trim()]);
  if (!user || !verifyPassword(String(password || ""), user.password_hash)) return null;
  return { id: user.id, username: user.username, role: user.role };
}
