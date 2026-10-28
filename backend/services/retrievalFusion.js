/** Reciprocal Rank Fusion for independently ranked retrieval lists. */
export function reciprocalRankFusion(rankedLists, keyOf, constant = 60) {
  const fused = new Map();
  rankedLists.forEach((list, listIndex) => {
    list.forEach((item, rank) => {
      const key = keyOf(item);
      const entry = fused.get(key) || { item, score: 0, ranks: [] };
      entry.score += 1 / (constant + rank + 1);
      entry.ranks[listIndex] = rank;
      fused.set(key, entry);
    });
  });
  return [...fused.values()].sort((a, b) => b.score - a.score);
}
