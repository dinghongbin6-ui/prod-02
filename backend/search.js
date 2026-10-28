import {
  getEmbedding
}
from "./embedding.js";

import {
  getTable
}
from "./lancedb.js";
import { all } from "./database.js";
import { extractSearchPhrases } from "./services/searchPhrases.js";
import { reciprocalRankFusion } from "./services/retrievalFusion.js";

function normalizeForCompare(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export async function searchFiles(
  query,
  topK = 3
) {

  const table =
    await getTable();

  if (!table) {

    return [];
  }

  const embedding =
    await getEmbedding(
      query
    );

  const semanticResults =
    await table
      .search(embedding)
      .limit(Math.max(topK * 4, 12))
      .toArray();

  const phraseResults = [];
  const matchedPhraseByChunk = new Map();
  let fullTextSearchAvailable = true;
  for (const phrase of extractSearchPhrases(query)) {
    let results;
    try {
      if (!fullTextSearchAvailable) throw new Error("全文检索索引不可用");
      results = await table.search(phrase, "fts", "content").limit(12).toArray();
    } catch {
      fullTextSearchAvailable = false;
      const escapedPhrase = phrase.replace(/'/g, "''");
      results = await table.query().where(`content LIKE '%${escapedPhrase}%'`).limit(12).toArray();
    }
    if (!results.length) continue;
    phraseResults.push(results);
    for (const item of results) {
      const key = `${item.file}:${item.chunkId}`;
      const previous = matchedPhraseByChunk.get(key) || "";
      if ([...phrase].length > [...previous].length) matchedPhraseByChunk.set(key, phrase);
    }
  }

  const metadataRows = await all("SELECT file_name, product_name, subject FROM knowledge_file_metadata");
  const metadataByFile = new Map(metadataRows.map((item) => [item.file_name, item]));

  const keyOf = (item) => `${item.file}:${item.chunkId}`;
  const fused = reciprocalRankFusion([semanticResults, ...phraseResults], keyOf);

  const queryNormalized = normalizeForCompare(query);
  const results = fused.map(({ item, score, ranks }) => {
    const phrase = matchedPhraseByChunk.get(keyOf(item)) || "";
    const metadata = metadataByFile.get(item.file) || {};
    const productNormalized = normalizeForCompare(metadata.product_name).replace(/(?:保险条款|条款|保险产品|产品)$/u, "");
    const productMatch = productNormalized.length >= 4 && queryNormalized.includes(productNormalized);
    return {
      file: item.file || "未知文件",
      productName: metadata.product_name || "",
      subject: metadata.subject || "",
      chunkId: item.chunkId ?? null,
      content: item.content || "",
      distance: Number.isFinite(item._distance) ? item._distance : null,
      matchType: phrase ? "关键词命中" : "语义匹配",
      matchedPhrase: phrase,
      productMatch,
      retrievalScore: score + (productMatch ? 0.01 : 0),
      vectorRank: ranks[0] ?? Number.MAX_SAFE_INTEGER,
    };
  });

  results.sort((a, b) => {
    return b.retrievalScore - a.retrievalScore;
  });
  return results.slice(0, Math.max(topK, 5));
}
