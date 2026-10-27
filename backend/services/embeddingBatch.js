export async function mapWithConcurrency(items, concurrency, mapper) {
  if (!Array.isArray(items)) throw new TypeError("items must be an array");
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer");
  }

  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const outcomes = await Promise.allSettled(Array.from({ length: workerCount }, () => worker()));
  const failure = outcomes.find((outcome) => outcome.status === "rejected");
  if (failure) throw failure.reason;
  return results;
}
