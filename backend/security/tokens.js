import crypto from "node:crypto";
const secret = () => process.env.AUTH_SECRET;
function sign(value) {
  if (!secret() || secret().length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}
export function createToken(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, username: user.username, role: user.role, exp: Date.now() + 12 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = sign(payload);
  const a = Buffer.from(signature || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}
