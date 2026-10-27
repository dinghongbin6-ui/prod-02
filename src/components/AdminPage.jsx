import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import "./AdminPage.css";

export default function AdminPage({ mode }) {
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rebuildMessage, setRebuildMessage] = useState("");

  const load = useCallback(async () => {
    try {
      if (mode === "users") {
        const d = await apiFetch("/admin/users");
        setError("");
        setUsers(d.users || []);
      } else if (mode === "files") {
        const d = await apiFetch("/admin/files");
        setError("");
        setFiles(d.files || []);
      }
    } catch (e) {
      setError(e.message);
    }
  }, [mode]);

  useEffect(() => {
    let active = true;
    const request = mode === "users"
      ? apiFetch("/admin/users")
      : apiFetch("/admin/files");

    request.then((data) => {
      if (!active) return;
      setError("");
      if (mode === "users") setUsers(data.users || []);
      else setFiles(data.files || []);
    }).catch((error) => {
      if (active) setError(error.message);
    });

    return () => { active = false; };
  }, [mode]);

  const createUser = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setUsername("");
      setPassword("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (u) => {
    if (!confirm(`确定删除用户 ${u.username}？`)) return;
    try {
      await apiFetch(`/admin/users/${u.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      await apiFetch("/admin/files", { method: "POST", body: form });
      setSelectedFile(null);
      e.target.reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteFile = async (f) => {
    if (!confirm(`确定删除文件 ${f.filename}？`)) return;
    try {
      await apiFetch(`/admin/files/${encodeURIComponent(f.filename)}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const rebuildIndex = async () => {
    if (!confirm("将根据当前所有知识文件重建向量索引，确定继续吗？")) return;
    setBusy(true);
    setError("");
    setRebuildMessage("");
    try {
      const result = await apiFetch("/admin/files/rebuild-index", { method: "POST" });
      setRebuildMessage(result.message || "知识库重建完成");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-panel">
      <div className="admin-header">
        <h2 className="admin-title">{mode === "users" ? "用户管理" : "文件管理"}</h2>
      </div>

      {error && (
        <p className="admin-error" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.8v4.6" />
            <path d="M12 16.2h.01" />
          </svg>
          {error}
        </p>
      )}

      {mode === "users" ? (
        <>
          <form className="admin-form" onSubmit={createUser}>
            <label className="admin-field">
              <span className="admin-label">新用户名</span>
              <input
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3-40位字母/数字"
                className="admin-input"
              />
            </label>
            <label className="admin-field">
              <span className="admin-label">初始密码（至少12位）</span>
              <input
                required
                minLength={12}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="admin-input"
              />
            </label>
            <button disabled={busy} className="admin-btn admin-btn-primary">
              {busy && <span className="admin-spinner" />}
              {busy ? "处理中…" : "注册普通用户"}
            </button>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户名</th>
                  <th>角色</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`admin-role-tag ${u.role === "admin" ? "admin-role-admin" : ""}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.created_at}</td>
                    <td>
                      {u.role !== "admin" && (
                        <button onClick={() => deleteUser(u)} className="admin-btn admin-btn-danger">
                          删除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <form className="admin-form" onSubmit={upload}>
            <label className="admin-file-field">
              <input
                type="file"
                required
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".txt,.md,.json,.pdf,.docx,.csv,.xls,.xlsx"
                className="admin-file-input"
              />
              <span className="admin-file-placeholder">
                {selectedFile ? selectedFile.name : "点击选择文件"}
              </span>
            </label>
            <button disabled={busy || !selectedFile} className="admin-btn admin-btn-primary">
              {busy && <span className="admin-spinner" />}
              {busy ? "上传中…" : "上传文件"}
            </button>
          </form>

          <p className="admin-tip">
            支持常见文档格式，单个文件最大25MB。上传或删除源文件后，点击“重建知识库”使检索索引更新。
          </p>

          <div className="admin-form">
            <button type="button" onClick={rebuildIndex} disabled={busy} className="admin-btn admin-btn-primary">
              {busy && <span className="admin-spinner" />}
              {busy ? "正在重建…" : "重建知识库"}
            </button>
            {rebuildMessage && <span role="status">{rebuildMessage}</span>}
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>文件名</th>
                  <th>大小</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.filename}>
                    <td>{f.filename}</td>
                    <td>{(f.size / 1024).toFixed(1)} KB</td>
                    <td>{new Date(f.updatedAt).toLocaleString()}</td>
                    <td>
                      <button onClick={() => deleteFile(f)} className="admin-btn admin-btn-danger">
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

