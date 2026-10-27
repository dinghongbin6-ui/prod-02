const windowMs = 15 * 60 * 1000;
const maxAttempts = 10;
const attemptsByUsername = new Map();
let callsSinceCleanup = 0;

export function loginRateLimit(req, res, next) {
  const username = String(req.body?.username || "").trim().toLowerCase().slice(0, 100);
  if (!username) return next();

  const now = Date.now();
  let entry = attemptsByUsername.get(username);
  if (!entry || now - entry.startedAt >= windowMs) {
    entry = { startedAt: now, count: 0 };
    attemptsByUsername.set(username, entry);
  }
  if (entry.count >= maxAttempts) {
    return res.status(429).json({ error: "登录尝试过多，请15分钟后重试" });
  }

  entry.count++;
  callsSinceCleanup++;
  if (callsSinceCleanup >= 100) {
    for (const [key, value] of attemptsByUsername) {
      if (now - value.startedAt >= windowMs) attemptsByUsername.delete(key);
    }
    callsSinceCleanup = 0;
  }
  return next();
}
