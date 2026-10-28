import { useState } from "react";
import { apiFetch } from "../lib/api.js";
import "./ChatPage.css";

const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const DOCUMENT_FORMATS = [["docx", "Word（DOCX）"], ["xlsx", "Excel（XLSX）"], ["csv", "CSV"], ["md", "Markdown"], ["txt", "纯文本"]];

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [documentFormat, setDocumentFormat] = useState("docx");
  const [exporting, setExporting] = useState(null);

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
      if (d.error) throw new Error(d.error);
      setMessages((m) => [...m, { role: "assistant", content: d.answer || "无回答", sources: d.sources || [], toolResults: d.toolResults || [], question: q }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: `错误：${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (message, index) => {
    setExporting(index);
    try {
      const response = await apiFetch("/generate-document", {
        method: "POST",
        body: JSON.stringify({ format: documentFormat, question: message.question, answer: message.content, sources: message.sources || [], toolResults: message.toolResults || [] }),
      });
      const url = URL.createObjectURL(response.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `问答结果.${documentFormat}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setExporting(null);
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
                <div className={`chat-bubble ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
                  <div>{m.content}</div>
                  {m.role === "assistant" && m.question && <details className="chat-result-details">
                    <summary>查看查询结果（来源 {m.sources?.length || 0}，工具 {m.toolResults?.length || 0}）</summary>
                    <div><strong>知识库来源</strong>{m.sources?.length > 0 ? m.sources.map((source, j) => <div className="chat-result-item" key={j}><b>{source.file}{source.chunkId ? ` · 片段 ${source.chunkId}` : ""} · {source.matchType || "语义匹配"}{source.matchedPhrase ? `（${source.matchedPhrase}）` : ""}</b><p>主体/产品：{source.productName || "未标注"} · 主题/规则：{source.subject || "未标注"}</p><p>{source.content}</p></div>) : <p>本次没有检索到知识库片段。</p>}</div>
                    <div><strong>工具查询结果</strong>{m.toolResults?.length > 0 ? m.toolResults.map((tool, j) => <pre className="chat-result-item" key={j}>{tool.tool}: {JSON.stringify(tool.result, null, 2)}</pre>) : <p>本次没有调用工具。</p>}</div>
                  </details>}
                  {m.role === "assistant" && m.question && <div className="chat-document-actions">
                    <button type="button" className="chat-btn chat-btn-secondary" onClick={() => downloadDocument(m, i)} disabled={exporting !== null}>
                      {exporting === i ? "生成中…" : "生成并下载文档"}
                    </button>
                  </div>}
                </div>
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
          <label className="chat-format-picker">
            <span>回答文档格式</span>
            <select aria-label="回答文档格式" value={documentFormat} onChange={(e) => setDocumentFormat(e.target.value)} disabled={exporting !== null}>
              {DOCUMENT_FORMATS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
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

