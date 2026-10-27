import { useEffect, useState } from "react";
import LoginPage from "./components/LoginPage.jsx";
import ChatPage from "./components/ChatPage.jsx";
import AdminPage from "./components/AdminPage.jsx";
import { apiFetch, setToken } from "./lib/api.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem("auth_token")));
  const [tab, setTab] = useState("chat");
  const [error, setError] = useState("");
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    apiFetch("/auth/me").then(data => setUser(data.user)).catch(() => { setToken(""); }).finally(() => setChecking(false));
  }, []);
  const onLogin = (result) => { setToken(result.token); setUser(result.user); setTab("chat"); setError(""); };
  const logout = () => { setToken(""); setUser(null); setTab("chat"); };
  if (checking) return <main style={styles.center}>正在检查登录状态…</main>;
  if (!user) return <LoginPage onLogin={onLogin} />;
  return <main style={styles.page}>
    <header style={styles.header}><div><h1 style={{margin:0}}>企业AI知识库</h1><small>用户：{user.username}（{user.role === "admin" ? "管理员" : "普通用户"}）</small></div><div style={styles.nav}>
      <button style={styles.button} onClick={() => setTab("chat")}>聊天</button>
      {user.role === "admin" && <><button style={styles.button} onClick={() => setTab("users")}>用户管理</button><button style={styles.button} onClick={() => setTab("files")}>文件管理</button></>}
      <button style={{...styles.button, background:"#b91c1c"}} onClick={logout}>退出登录</button>
    </div></header>
    {error && <p style={{color:"#b91c1c"}}>{error}</p>}
    {tab === "chat" && <ChatPage />}
    {user.role === "admin" && tab !== "chat" && <AdminPage mode={tab} />}
  </main>;
}
const styles = { page:{minHeight:"100vh",padding:24,background:"#f1f5f9",color:"#0f172a",fontFamily:"system-ui,sans-serif"}, center:{padding:40}, header:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",maxWidth:1100,margin:"0 auto 24px"}, nav:{display:"flex",gap:8,flexWrap:"wrap"}, button:{padding:"10px 14px",border:0,borderRadius:8,background:"#2563eb",color:"white",cursor:"pointer"} };
