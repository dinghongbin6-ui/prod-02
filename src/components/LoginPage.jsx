import { useState } from "react";
import { apiFetch } from "../lib/api.js";
import "./LoginPage.css";

const icons = {
  logo: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6.5c0-1.4 3.6-2.5 8-2.5s8 1.1 8 2.5-3.6 2.5-8 2.5-8-1.1-8-2.5Z" />
      <path d="M4 6.5v5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-5" />
      <path d="M4 11.5v5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-5" />
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  lock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  ),
  alert: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.8v4.6" />
      <path d="M12 16.2h.01" />
    </svg>
  ),
};

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <span className="auth-logo">{icons.logo}</span>
          <div>
            <h1 className="auth-title">企业AI知识库</h1>
            <p className="auth-sub">登录后进入你的知识工作台</p>
          </div>
        </div>

        <label className="auth-field" htmlFor="login-username">
          <span className="auth-label">用户名</span>
          <span className="auth-input-wrap">
            <span className="auth-input-icon">{icons.user}</span>
            <input
              id="login-username"
              className="auth-input"
              required
              autoComplete="username"
              placeholder="请输入用户名"
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "login-error" : undefined}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </span>
        </label>

        <label className="auth-field" htmlFor="login-password">
          <span className="auth-label">密码</span>
          <span className="auth-input-wrap">
            <span className="auth-input-icon">{icons.lock}</span>
            <input
              id="login-password"
              className="auth-input"
              required
              type="password"
              autoComplete="current-password"
              placeholder="请输入密码"
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "login-error" : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </span>
        </label>

        {error && (
          <p className="auth-error" id="login-error" role="alert">
            {icons.alert}
            <span>{error}</span>
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={busy} aria-busy={busy}>
          {busy && <span className="auth-spinner" />}
          {busy ? "登录中…" : "登录"}
        </button>

        <p className="auth-foot">企业AI知识库 · 仅限内部授权成员访问</p>
      </form>
    </main>
  );
}

