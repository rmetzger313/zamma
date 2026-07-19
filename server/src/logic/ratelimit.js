// Einfaches Sliding-Window-Rate-Limit (in-memory, pro Schlüssel).
// Produktion: vorgelagertes Gateway oder Redis-Store — Schnittstelle bleibt gleich.

export function createRateLimiter({ limit = 120, windowMs = 60_000, now = Date.now } = {}) {
  const hits = new Map();
  return function allow(key) {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.set(key, recent);
    return true;
  };
}
