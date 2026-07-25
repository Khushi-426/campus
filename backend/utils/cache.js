/**
 * A minimal in-memory TTL cache.
 *
 * System design note: the product listing endpoint is read-heavy and the
 * data doesn't change every second, so we cache each unique query for a
 * short window to cut repeated DB round-trips and lower p50/p99 latency.
 * In a multi-instance deployment you'd swap this Map for Redis so every
 * server shares the same cache - the interface below is intentionally
 * Redis-shaped (get/set/del with TTL) to make that swap a small diff.
 */
class TTLCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = 30000) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  del(key) {
    this.store.delete(key);
  }

  // Invalidate every cached key that starts with a prefix, e.g. wipe all
  // "products:list:*" entries whenever a product is created/updated/deleted.
  delByPrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

export default new TTLCache();
