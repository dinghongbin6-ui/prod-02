import { useState } from "react";
import { apiFetch } from "../lib/api.js";
import "./ChatPage.css";

const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [sessionId] = useState(() => {
    let id = localStorage.getItem("session_id");
    if (!id) {
      id = newId();
      localStorage.setItem("session_id", id);
    }
    return id;
  });

  const ask = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const d = await apiFetch("/ask", {
        method: "POST",
        body: JSON.stringify({ question: q, sessionId }),
      });
      setMessages((m) => [...m, { role: "assistant", content: d.answer || "无回答" }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: `错误：${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    try {
      await apiFetch("/clear-memory", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
      setMessages([]);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <section className="chat-panel">
      <div className="chat-header">
        <h2 className="chat-title">AI 知识对话</h2>
        <button type="button" onClick={clear} className="chat-btn chat-btn-secondary" disabled={messages.length === 0 || loading}>
          清空记忆
        </button>
      </div>

      <div className="chat-conversation" id="chat-scroll-area">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="chat-empty-title">开始和企业知识库对话</p>
            <p className="chat-empty-tip">你可以询问文档中的任何内容，AI 会基于已上传的知识文件给出回答。</p>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble-row ${m.role === "user" ? "chat-bubble-right" : "chat-bubble-left"}`}>
                <span className={`chat-bubble ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
                  {m.content}
                </span>
              </div>
            ))}
          </>
        )}
        {loading && (
          <div className="chat-bubble-row chat-bubble-left">
            <span className="chat-bubble chat-bubble-assistant chat-bubble-typing">
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
            </span>
          </div>
        )}
      </div>

      <form className="chat-input-form" onSubmit={ask}>
        <textarea
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(e);
            }
          }}
          placeholder="请输入问题… （Enter 发送，Shift+Enter 换行）"
          className="chat-textarea"
        />
        <div className="chat-input-actions">
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="chat-btn chat-btn-primary"
          >
            {loading && <span className="chat-spinner" />}
            {loading ? "思考中…" : "发送"}
          </button>
        </div>
      </form>
    </section>
  );
}

