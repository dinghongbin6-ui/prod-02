import test from "node:test";
import assert from "node:assert/strict";
import { loginRateLimit } from "../middleware/loginRateLimit.js";

test("login attempts are throttled after ten tries for one account", () => {
  const username = `rate-test-${Date.now()}`;
  let passed = 0;
  const req = { body: { username } };
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };

  for (let attempt = 0; attempt < 10; attempt++) loginRateLimit(req, res, () => passed++);
  loginRateLimit(req, res, () => passed++);

  assert.equal(passed, 10);
  assert.equal(res.statusCode, 429);
});
