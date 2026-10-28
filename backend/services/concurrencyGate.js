export function createConcurrencyGate(limit) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("Concurrency limit must be a positive integer");
  }

  let active = 0;
  return {
    tryAcquire() {
      if (active >= limit) return false;
      active++;
      return true;
    },
    release() {
      if (active > 0) active--;
    },
  };
}