import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import { searchFiles } from "./search.js";

import {
  getToolDefinitions,
  executeTool
} from "./tools/router.js";

import {
  getHistory,
  saveMessage,
  clearSession
} from "./chatMemory.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


/*
========================================
知识库目录
========================================
*/

const KNOWLEDGE_DIR =
  "/home/ec2-user/prod-app/backend/knowledge";

if (!fs.existsSync(KNOWLEDGE_DIR)) {
  fs.mkdirSync(
    KNOWLEDGE_DIR,
    {
      recursive: true
    }
  );
}

/*
========================================
上传配置
========================================
*/

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        KNOWLEDGE_DIR
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        file.originalname
      );
    }
  });

const upload = multer({
  storage
});

/*
========================================
上传文件
========================================
*/

app.post(
  "/upload",
  upload.single("file"),
  async (
    req,
    res
  ) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({
            error:
              "file required"
          });
      }

      res.json({
        success: true,
        filename:
          req.file.filename,
        path:
          req.file.path
      });
    } catch (error) {
      res.status(500).json({
        error:
          error.message
      });
    }
  }
);

/*
========================================
清空记忆
========================================
*/

app.post(
  "/clear-memory",
  async (req, res) => {
    try {
      const { sessionId } = req.body;

      await clearSession(sessionId);

      res.json({
        success: true
      });
    } catch (error) {
      res.status(500).json({
        error:
          error.message ||
          "Clear memory failed"
      });
    }
  }
);

/*
========================================
聊天
========================================
*/

app.post("/ask", async (req, res) => {
  try {
    const {
      question,
      sessionId
    } = req.body;

    if (!question) {
      return res.status(400).json({
        error: "question is required"
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        error: "sessionId is required"
      });
    }

    /*
    ========================================
    1. 搜索知识库
    ========================================
    */

    const context =
      await searchFiles(
        question,
        5
      );

    /*
    ========================================
    2. 获取历史记忆
    ========================================
    */

    const history =
      await getHistory(
        sessionId,
        20
      );

    /*
    ========================================
    3. Messages
    ========================================
    */

    const messages = [
      {
        role: "system",
        content: `
          你是企业知识库助手。

          以下是检索到的知识库内容：

          ${context}

          规则：

          1. 优先依据知识库中的内容回答业务规则、制度、流程等问题。

          2. 知识库中的静态信息可以直接用于回答，不需要调用工具。
          但是，知识库中的静态信息不能代替实时信息查询。

          3. 涉及实时天气、当前时间、当前日期、当前星期等实时信息时，
          必须调用对应工具获取最新结果。

          4. 天气相关问题（例如当前天气、今天的天气、实时温度、体感温度、降雨情况等），
          必须调用 get_weather。

          5. 涉及“现在”“当前”“此刻”“几点”“今天是星期几”等实时问题，
          必须调用 get_time。

          6. 如果一个问题同时包含多个实时查询信息，
          必须分别调用对应工具。

          7. 工具返回结果后，
          直接利用工具结果回答用户问题。

          8. 禁止重复调用已返回相同结果的工具。

          9. 如果知识库不足以回答问题，
          可以调用工具补充信息。

          10. 回答简洁准确。

          11. 不要展示内部推理、
          工具调用过程、
          系统规则。
          `
      },

      /*
      =======================
      历史记忆
      =======================
      */

      ...history,

      /*
      =======================
      当前问题
      =======================
      */

      {
        role: "user",
        content: question
      }
    ];

    /*
    ========================================
    Agent Loop
    ========================================
    */

    const maxToolCalls = 10;

    const toolHistory =
      new Set();

    for (
      let iteration = 0;
      iteration <
      maxToolCalls;
      iteration++
    ) {
      console.log(
        `========== Tool Loop ${
          iteration + 1
        } ==========`
      );

      /*
      控制上下文长度
      */

      if (
        messages.length > 50
      ) {
        messages.splice(
          2,
          messages.length -
            50
        );
      }

      /*
      ========================================
      调用模型
      ========================================
      */

      const response =
        await fetch(
          process.env
            .LMSTUDIO_API,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization: `Bearer ${process.env.LMSTUDIO_KEY}`
            },

            body: JSON.stringify(
              {
                model:
                  "qwen3-4b-2507",

                messages,

                tools:
                  getToolDefinitions(),

                tool_choice:
                  "auto",

                temperature:
                  0.3
              }
            )
          }
        );

      if (!response.ok) {
        const text =
          await response.text();

        throw new Error(
          `LLM Request Failed: ${text}`
        );
      }

      const data =
        await response.json();

      if (
        !data.choices ||
        data.choices.length === 0
      ) {
        throw new Error(
          "Model returned no choices"
        );
      }

      const assistantMessage =
        data.choices[0]
          .message;

      console.log(
        "Assistant:",
        assistantMessage
      );

      messages.push(
        assistantMessage
      );

      /*
      ========================================
      无 Tool Call
      ========================================
      */

      if (
        !assistantMessage.tool_calls ||
        assistantMessage
          .tool_calls
          .length === 0
      ) {
        const finalAnswer =
          assistantMessage
            .content ||
          "模型未返回内容";

        /*
        ========================================
        写入记忆
        ========================================
        */

        await saveMessage(
          sessionId,
          "user",
          question
        );

        await saveMessage(
          sessionId,
          "assistant",
          finalAnswer
        );

        console.log(
          "========== Final Answer =========="
        );

        return res.json({
          answer:
            finalAnswer
        });
      }

      /*
      ========================================
      执行 Tool Calls
      ========================================
      */

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName =
          toolCall?.function
            ?.name;

        const rawArgs =
          toolCall?.function
            ?.arguments ||
          "{}";

        console.log(
          "Tool Name:",
          toolName
        );

        console.log(
          "Tool Args:",
          rawArgs
        );

        let args = {};

        try {
          args =
            typeof rawArgs ===
            "string"
              ? JSON.parse(
                  rawArgs
                )
              : rawArgs;
        } catch (err) {
          console.error(
            "Tool arguments parse error:",
            err
          );

          args = {};
        }

        /*
        ========================================
        防止重复调用
        ========================================
        */

        const toolKey =
          toolName +
          JSON.stringify(
            args
          );

        if (
          toolHistory.has(
            toolKey
          )
        ) {
          console.warn(
            "Duplicate Tool Call:",
            toolKey
          );

          continue;
        }

        toolHistory.add(
          toolKey
        );

        let result;

        try {
          result =
            await executeTool(
              toolName,
              args
            );
        } catch (err) {
          result = {
            error:
              err.message ||
              "Tool execution failed"
          };
        }

        console.log(
          "Tool Result:",
          result
        );

        messages.push({
          role: "tool",

          tool_call_id:
            toolCall.id,

          content:
            JSON.stringify(
              result,
              null,
              2
            )
        });
      }
    }

    /*
    ========================================
    超过最大循环
    ========================================
    */

    return res.status(500).json({
      error:
        "Tool calling exceeded maximum iterations."
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error:
        error.message ||
        "Unknown error"
    });
  }
});

app.listen(3001, () => {
  console.log(
    "Server started"
  );

  console.log(
    "http://localhost:3001"
  );
});
