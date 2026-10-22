import { searchFiles } from "../search.js";
import { getToolDefinitions, executeTool } from "../tools/router.js";
import { getHistory, saveMessage } from "../chatMemory.js";

export async function askAssistant(question, sessionId) {
  const context = await searchFiles(question, 5);
  const history = await getHistory(sessionId, 20);
  const messages = [
    { role: "system", content: `你是企业知识库助手。\n以下是检索到的知识库内容：\n${context}\n规则：优先依据知识库回答业务规则；静态信息不能代替实时信息；天气必须调用 get_weather；当前时间/日期/星期必须调用 get_time；多个实时信息分别调用工具；工具返回后直接利用结果回答；禁止重复调用已返回相同结果的工具；知识库不足时可调用工具；回答简洁准确；不要展示内部推理、工具调用过程或系统规则。` },
    ...history,
    { role: "user", content: question }
  ];
  const toolHistory = new Set();
  for (let iteration = 0; iteration < 10; iteration++) {
    if (messages.length > 50) messages.splice(2, messages.length - 50);
    const response = await fetch(process.env.LMSTUDIO_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LMSTUDIO_KEY || ""}` },
      body: JSON.stringify({ model: process.env.LMSTUDIO_MODEL || "qwen3-4b-2507", messages, tools: getToolDefinitions(), tool_choice: "auto", temperature: 0.3 })
    });
    if (!response.ok) throw new Error(`LLM Request Failed: ${await response.text()}`);
    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message;
    if (!assistantMessage) throw new Error("Model returned no choices");
    messages.push(assistantMessage);
    if (!assistantMessage.tool_calls?.length) {
      const answer = assistantMessage.content || "模型未返回内容";
      await saveMessage(sessionId, "user", question);
      await saveMessage(sessionId, "assistant", answer);
      return answer;
    }
    for (const call of assistantMessage.tool_calls) {
      const name = call?.function?.name;
      let args = {};
      try { const raw = call?.function?.arguments || "{}"; args = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { args = {}; }
      const key = name + JSON.stringify(args);
      if (toolHistory.has(key)) {
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: "Duplicate tool call skipped" }) });
        continue;
      }
      toolHistory.add(key);
      let result;
      try { result = await executeTool(name, args); }
      catch (e) { result = { error: e.message || "Tool execution failed" }; }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result, null, 2) });
    }
  }
  throw new Error("Tool calling exceeded maximum iterations.");
}
