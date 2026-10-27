
import "../config.js";

const LANGSEARCH_API_URL =
  "https://api.langsearch.com/v1/web-search";

export async function searchWeb(args = {}) {
  const query =
    typeof args.query === "string" ? args.query.trim() : "";

  if (!query) {
    throw new Error("search_web 缺少 query 参数");
  }

  const apiKey = process.env.LANGSEARCH_API_KEY;

  if (!apiKey) {
    throw new Error(
      "缺少 LANGSEARCH_API_KEY，请检查项目根目录 .env"
    );
  }

  const count = Math.min(
    Math.max(Number(args.max_results) || 5, 1),
    10
  );

  const includePageText = args.include_page_text !== false;

  const allowedFreshness = [
    "noLimit",
    "oneDay",
    "oneWeek",
    "oneMonth",
    "oneYear"
  ];

  const freshness = allowedFreshness.includes(args.freshness)
    ? args.freshness
    : "noLimit";

  const requestBody = {
    query,
    count,
    freshness
  };

  // 需要网页正文时才请求正文，限制每页字符数。
  // 如果只需要搜索摘要，就不传 contents。
  if (includePageText) {
    requestBody.contents = {
      text: {
        max_characters: 2500
      }
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(LANGSEARCH_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `LangSearch HTTP ${response.status}: ` +
        responseText.slice(0, 500)
      );
    }

    let payload;

    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new Error("LangSearch 返回的内容不是有效 JSON");
    }

    if (String(payload.code) !== "200") {
      throw new Error(
        `LangSearch API 错误：${payload.message || "未知错误"}`
      );
    }

    const pages = payload.data?.webPages?.value;

    if (!Array.isArray(pages)) {
      throw new Error("LangSearch 返回的数据结构不符合预期");
    }

    const results = pages.slice(0, count).map((page) => ({
      title: page.name || "",
      url: page.url || "",
      datePublished: page.datePublished || "",
      content: includePageText
        ? (page.text || page.snippet || "")
        : (page.snippet || "")
    }));

    return {
      success: true,
      provider: "LangSearch",
      query,
      resultCount: results.length,
      results,
      usage: payload.data?.usage || payload.usage || null
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("LangSearch 请求超时，请稍后重试");
    }

    throw new Error(`网页搜索失败：${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}
