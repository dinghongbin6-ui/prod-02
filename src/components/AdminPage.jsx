import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import "./AdminPage.css";

export default function AdminPage({ mode }) {
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [productName, setProductName] = useState("");
  const [subject, setSubject] = useState("");
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
      form.append("productName", productName);
      form.append("subject", subject);
      form.append("file", selectedFile);
      await apiFetch("/admin/files", { method: "POST", body: form });
      setSelectedFile(null);
      setProductName("");
      setSubject("");
      e.target.reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteFile = async (f) => {
    if (!confirm(`确定删除文件 ${f.displayFilename || f.filename}？`)) return;
    try {
      await apiFetch(`/admin/files/${encodeURIComponent(f.filename)}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const updateFileMetadata = (filename, field, value) => {
    setFiles((current) => current.map((file) => file.filename === filename ? { ...file, [field]: value } : file));
  };

  const saveMetadata = async (file) => {
    setBusy(true);
    setError("");
    setRebuildMessage("");
    try {
      const result = await apiFetch(`/admin/files/${encodeURIComponent(file.filename)}/metadata`, {
        method: "PUT",
        body: JSON.stringify({ productName: file.productName, subject: file.subject }),
      });
      setRebuildMessage(result.message || "元数据已保存");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
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
            <label className="admin-field">
              <span className="admin-label">核心主体 / 产品名称</span>
              <input required maxLength={200} value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="例如：平安产险少儿门急诊医疗保险" className="admin-input" />
            </label>
            <label className="admin-field">
              <span className="admin-label">主题 / 规则</span>
              <input required maxLength={300} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="例如：保险责任认定" className="admin-input" />
            </label>
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
            每份文件都要填写核心主体/产品和主题/规则；文件名只用于定位，不会自动当成主体。元数据保存后，点击“重建知识库”更新向量索引。
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
                  <th>核心主体 / 产品</th>
                  <th>主题 / 规则</th>
                  <th>大小</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.filename}>
                    <td>{f.displayFilename || f.filename}</td>
                    <td><input className="admin-input admin-metadata-input" maxLength={200} value={f.productName || ""} onChange={(e) => updateFileMetadata(f.filename, "productName", e.target.value)} aria-label={`${f.displayFilename || f.filename} 核心主体或产品`} /></td>
                    <td><input className="admin-input admin-metadata-input" maxLength={300} value={f.subject || ""} onChange={(e) => updateFileMetadata(f.filename, "subject", e.target.value)} aria-label={`${f.displayFilename || f.filename} 主题或规则`} /></td>
                    <td>{(f.size / 1024).toFixed(1)} KB</td>
                    <td>{new Date(f.updatedAt).toLocaleString()}</td>
                    <td>
                      <button disabled={busy} onClick={() => saveMetadata(f)} className="admin-btn admin-btn-primary">
                        保存元数据
                      </button>
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

