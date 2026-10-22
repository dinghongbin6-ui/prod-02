import { useState } from "react";
import { apiFetch } from "../lib/api.js";
export default function LoginPage({ onLogin }) {
  const [username,setUsername] = useState(""); const [password,setPassword] = useState(""); const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  const submit = async (e) => { e.preventDefault(); setBusy(true); setError(""); try { onLogin(await apiFetch("/auth/login", { method:"POST", body:JSON.stringify({username,password}) })); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#0f172a,#334155)",padding:20,fontFamily:"system-ui,sans-serif"}}><form onSubmit={submit} style={{width:"min(380px,100%)",background:"white",padding:30,borderRadius:16,boxSizing:"border-box"}}><h1>企业AI知识库</h1><label>用户名<input required autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} style={input}/></label><label>密码<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} style={input}/></label>{error&&<p style={{color:"#b91c1c"}}>{error}</p>}<button disabled={busy} style={submitStyle}>{busy?"登录中…":"登录"}</button></form></main>;
}
const input={display:"block",width:"100%",boxSizing:"border-box",padding:12,margin:"8px 0 18px",border:"1px solid #cbd5e1",borderRadius:8}; const submitStyle={width:"100%",padding:12,background:"#2563eb",color:"white",border:0,borderRadius:8,cursor:"pointer"};
