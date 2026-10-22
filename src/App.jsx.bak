import { useState } from "react";

const API_BASE_URL =
  import.meta.env
    .VITE_API_BASE_URL || "";

const generateId = () => {
  if (
    globalThis.crypto
      ?.randomUUID
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

function App() {
  const [
    question,
    setQuestion
  ] = useState("");

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    uploading,
    setUploading
  ] = useState(false);

  const [
    messages,
    setMessages
  ] = useState([]);

  const [sessionId] =
    useState(() => {
      let id =
        localStorage.getItem(
          "session_id"
        );

      if (!id) {
        id =
          generateId();

        localStorage.setItem(
          "session_id",
          id
        );
      }

      return id;
    });

  const uploadFile =
    async (
      event
    ) => {
      const file =
        event.target.files?.[0];

      if (!file) return;

      try {
        setUploading(true);

        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        const response =
          await fetch(
            `${API_BASE_URL}/api/upload`,
            {
              method:
                "POST",
              body:
                formData
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error
          );
        }

        setMessages(
          (prev) => [
            ...prev,
            {
              role:
                "assistant",
              content: `✅ 文件上传成功：

${data.filename}`
            }
          ]
        );
      } catch (error) {
        setMessages(
          (prev) => [
            ...prev,
            {
              role:
                "assistant",
              content:
                "上传失败：" +
                error.message
            }
          ]
        );
      } finally {
        setUploading(
          false
        );
      }
    };

  const ask = async () => {
    if (
      !question.trim()
    )
      return;

    const userQuestion =
      question;

    setMessages(
      (prev) => [
        ...prev,
        {
          role:
            "user",
          content:
            userQuestion
        }
      ]
    );

    setQuestion("");

    try {
      setLoading(true);

      const response =
        await fetch(
          `${API_BASE_URL}/api/ask`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                {
                  question:
                    userQuestion,

                  sessionId
                }
              )
          }
        );

      const data =
        await response.json();

      setMessages(
        (prev) => [
          ...prev,
          {
            role:
              "assistant",

            content:
              data.answer ||
              "无回答"
          }
        ]
      );
    } catch (
      error
    ) {
      setMessages(
        (prev) => [
          ...prev,
          {
            role:
              "assistant",

            content:
              "错误：" +
              error.message
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const clearMemory =
    async () => {
      try {
        await fetch(
          `${API_BASE_URL}/api/clear-memory`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                {
                  sessionId
                }
              )
          }
        );

        setMessages([]);
      } catch (
        err
      ) {
        console.error(
          err
        );
      }
    };

  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "linear-gradient(135deg,#0f172a,#1e293b,#334155)",
        display:
          "flex",
        justifyContent:
          "center",
        alignItems:
          "center",
        padding:
          "30px"
      }}
    >
      <div
        style={{
          width:
            "100%",
          maxWidth:
            "1000px",
          background:
            "rgba(255,255,255,.08)",
          backdropFilter:
            "blur(15px)",
          border:
            "1px solid rgba(255,255,255,.1)",
          borderRadius:
            "24px",
          padding:
            "32px",
          color:
            "#fff"
        }}
      >
        <h1
          style={{
            textAlign:
              "center"
          }}
        >
          🤖 LM
          Studio Chat
        </h1>

        <div
          style={{
            height:
              "450px",
            overflowY:
              "auto",
            background:
              "rgba(255,255,255,.06)",
            borderRadius:
              "16px",
            padding:
              "20px",
            marginBottom:
              "20px"
          }}
        >
          {messages.length ===
            0 && (
            <div
              style={{
                color:
                  "#94a3b8"
              }}
            >
              开始聊天...
            </div>
          )}

          {messages.map(
            (
              msg,
              index
            ) => (
              <div
                key={
                  index
                }
                style={{
                  textAlign:
                    msg.role ===
                    "user"
                      ? "right"
                      : "left",

                  marginBottom:
                    "12px"
                }}
              >
                <div
                  style={{
                    display:
                      "inline-block",

                    maxWidth:
                      "80%",

                    padding:
                      "12px",

                    borderRadius:
                      "12px",

                    background:
                      msg.role ===
                      "user"
                        ? "#2563eb"
                        : "#475569",

                    whiteSpace:
                      "pre-wrap"
                  }}
                >
                  {
                    msg.content
                  }
                </div>
              </div>
            )
          )}

          {loading && (
            <div>
              AI思考中...
            </div>
          )}
        </div>

        <textarea
          rows="4"
          value={
            question
          }
          onChange={(
            e
          ) =>
            setQuestion(
              e.target
                .value
            )
          }
          placeholder="请输入问题..."
          style={{
            width:
              "100%",
            padding:
              "16px",
            borderRadius:
              "14px",
            border:
              "none"
          }}
        />

        <div
          style={{
            marginTop:
              "20px",

            display:
              "flex",

            gap:
              "10px",

            justifyContent:
              "space-between"
          }}
        >
          <label
            style={{
              padding:
                "12px 24px",

              borderRadius:
                "12px",

              background:
                "#22c55e",

              color:
                "#fff",

              cursor:
                "pointer"
            }}
          >
            {uploading
              ? "上传中..."
              : "上传文件"}

            <input
              type="file"
              hidden
              onChange={
                uploadFile
              }
            />
          </label>

          <button
            onClick={
              clearMemory
            }
            style={{
              padding:
                "12px 24px",

              border:
                "none",

              borderRadius:
                "12px",

              background:
                "#ef4444",

              color:
                "#fff"
            }}
          >
            清空记忆
          </button>

          <button
            onClick={ask}
            disabled={
              loading
            }
            style={{
              padding:
                "12px 24px",

              border:
                "none",

              borderRadius:
                "12px",

              background:
                "#2563eb",

              color:
                "#fff"
            }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
