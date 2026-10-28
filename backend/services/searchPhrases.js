export function extractSearchPhrases(query) {
  const normalized = String(query || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[，。！？?!、；;：:（）()【】\[\]《》“”‘’"']/g, " ")
    .split(/(?:\s+|请问|告诉我|资料里|文档里|文件里|关于|涉及|针对|其中|里面|中的|的|是否|有没有|有无|包含|包括|是什么意思|是什么|指什么|怎么|如何|认定|说明|解释|定义|哪些|什么|吗|呢|一下|条款)/g)
    .map((part) => part.replace(/[\s%_\\]/g, "").trim())
    .filter((part) => [...part].length >= 2);

  const phrases = [];
  for (const term of [...normalized].reverse()) {
    const chars = [...term];
    const lengths = [...new Set([chars.length, 8, 6, 4])]
      .filter((length) => length >= 2 && length <= chars.length)
      .sort((a, b) => b - a);
    for (const length of lengths) {
      const phrase = chars.slice(0, length).join("");
      if (!phrases.includes(phrase)) phrases.push(phrase);
    }
  }
  return phrases.slice(0, 8);
}
