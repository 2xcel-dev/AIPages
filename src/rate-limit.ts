/**
 * Rate limiter — token bucket for registry endpoints (per IP) and sliding
 * window for invocations (per agent ID).
 *
 * Default: in-memory (Map-backed) stores — suitable for single-instance dev.
 * For multi-instance production, pass a MongoRateStore via setRateLimitStore().
 *
 * The interface is small (increment, get, reset) so any backend can implement
 * it — in-memory, Redis, MongoDB, or a custom cache.
 */
import type { Collection, Document, WithId } from "mongodb";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix ms
  retryAfterSec?: number;
}

/** Backend interface — any implementation works (in-memory, Redis, MongoDB). */
export interface RateLimitStore {
  /** Record a hit for `key` within `windowMs`. Returns current count. */
  increment(key: string, windowMs: number): Promise<number>;
  /** Get the current count for `key` within `windowMs`. */
  get(key: string, windowMs: number): Promise<number>;
  /** Reset all counters for `key`. */
  reset(key: string): Promise<void>;
  /** Start periodic cleanup of stale entries. Returns stop function. */
  startCleanup?(): () => void;
}

/**
 * Token-bucket rate limiter. Refills at a fixed rate per window.
 * Used for registry endpoints (search, submit, scrape, ingest) — per IP.
 */
export function tokenBucket(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let bucket = BUCKETS.get(key);
  if (!bucket) {
    bucket = { tokens: maxRequests, lastRefill: now };
    BUCKETS.set(key, bucket);
  }
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= windowMs) {
    const refills = Math.floor(elapsed / windowMs);
    bucket.tokens = Math.min(maxRequests, bucket.tokens + refills * maxRequests);
    bucket.lastRefill = now - (elapsed % windowMs);
  }
  if (bucket.tokens < 1) {
    const resetAt = bucket.lastRefill + windowMs;
    return { allowed: false, remaining: 0, resetAt, retryAfterSec: Math.ceil((resetAt - now) / 1000) };
  }
  bucket.tokens -= 1;
  return { allowed: true, remaining: bucket.tokens, resetAt: bucket.lastRefill + windowMs };
}

/**
 * Sliding-window rate limiter. Counts requests in the last `windowMs` ms.
 * Used for tool invocations — per agent ID (X-Agent-ID header).
 */
export function slidingWindow(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  let window = WINDOWS.get(key);
  if (!window) {
    window = { timestamps: [] };
    WINDOWS.set(key, window);
  }
  // Prune
  window.timestamps = window.timestamps.filter((t) => t > cutoff);
  if (window.timestamps.length >= maxRequests) {
    const resetAt = window.timestamps[0] + windowMs;
    return { allowed: false, remaining: 0, resetAt, retryAfterSec: Math.ceil((resetAt - now) / 1000) };
  }
  window.timestamps.push(now);
  const remaining = maxRequests - window.timestamps.length;
  const resetAt = window.timestamps.length > 0 ? window.timestamps[0] + windowMs : now + windowMs;
  return { allowed: true, remaining, resetAt };
}

/**
 * Async sliding-window rate limiter with persistent backend.
 * When a MongoRateStore is set via setRateLimitStore(), this uses it; otherwise
 * falls back to the in-memory slidingWindow().
 */
export async function slidingWindowAsync(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!RATE_STORE) {
    // Fallback to synchronous in-memory implementation
    return slidingWindow(key, maxRequests, windowMs);
  }

  const now = Date.now();
  try {
    const count = await RATE_STORE.increment(key, windowMs);
    if (count > maxRequests) {
      const resetAt = now + windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterSec: Math.ceil(windowMs / 1000),
      };
    }
    return {
      allowed: true,
      remaining: maxRequests - count,
      resetAt: now + windowMs,
    };
  } catch (err: any) {
    // If persistent store fails, fall back to in-memory
    console.warn("[rate-limit] persistent store failed, falling back to memory:", err?.message);
    return slidingWindow(key, maxRequests, windowMs);
  }
}

// ── Store management ─────────────────────────────────────────────────────────

let RATE_STORE: RateLimitStore | null = null;

/**
 * Set a persistent rate limit store (MongoDB, Redis, etc.).
 * When null, rate limiting falls back to in-memory (single-instance).
 */
export function setRateLimitStore(store: RateLimitStore | null): void {
  RATE_STORE = store;
}

/**
 * MongoDB-backed rate limit store.
 *
 * Uses atomic findOneAndUpdate with upsert to prevent race conditions
 * across multiple instances behind a load balancer. Each (key, windowStart)
 * pair gets a document with a counter — incremented atomically.
 *
 * A TTL index on `expiresAt` automatically removes expired documents.
 */
export class MongoRateStore implements RateLimitStore {
  private coll: Collection;

  constructor(coll: Collection) {
    this.coll = coll;
  }

  /**
   * Atomically increment the request counter for `key` within the current
   * time window. Uses findOneAndUpdate with upsert — a single atomic
   * operation that either creates or updates the counter document.
   *
   * Strategy: bucket by (key, windowStart) where windowStart is the start
   * of the current sliding window. This gives us a counter that we can
   * read without race conditions.
   */
  async increment(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const windowStart = now - (now % windowMs);
    const expiresAt = new Date(windowStart + windowMs + windowMs); // extra TTL buffer

    const result = await this.coll.findOneAndUpdate(
      { key, windowStart },
      {
        $inc: { count: 1 },
        $setOnInsert: { createdAt: now, expiresAt },
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    );

    const doc = result?.value as WithId<Document> | null;
    if (!doc) {
      // Fallback — shouldn't happen with upsert, but handle gracefully
      return 1;
    }

    // Now count all active window buckets for this key
    const windowStartMs = now - windowMs;
    const total = await this.coll.countDocuments({
      key,
      windowStart: { $gte: windowStartMs },
    });

    return total;
  }

  /**
   * Get the current request count for `key` within the sliding window.
   * Counts all active window-bucket documents for this key.
   */
  async get(key: string, windowMs: number): Promise<number> {
    const windowStartMs = Date.now() - windowMs;
    return this.coll.countDocuments({
      key,
      windowStart: { $gte: windowStartMs },
    });
  }

  /**
   * Reset all counters for `key` — removes all window-bucket documents.
   */
  async reset(key: string): Promise<void> {
    await this.coll.deleteMany({ key });
  }

  /**
   * Ensure the TTL index exists for automatic expiry.
   * The TTL index on `expiresAt` removes expired documents automatically.
   */
  async ensureTtlIndex(ttlSeconds: number = 3600): Promise<void> {
    await this.coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }
}

/**
 * Periodic cleanup of stale bucket/window entries in the in-memory store.
 * Call once at startup — returns a stop function.
 * No-op when a persistent store is configured (MongoDB TTL handles expiry).
 */
export function startRateLimitCleanup(intervalMs = 60_000): () => void {
  if (RATE_STORE) return () => {}; // persistent store handles expiry

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of BUCKETS) {
      if (now - bucket.lastRefill > 120_000) {
        BUCKETS.delete(key);
      }
    }
    for (const [key, window] of WINDOWS) {
      if (window.timestamps.length === 0 || now - window.timestamps[0] > 120_000) {
        WINDOWS.delete(key);
      }
    }
  }, intervalMs);
  return () => clearInterval(timer);
}

// ── private in-memory structures (fallback only) ─────────────────────────────

const BUCKETS = new Map<string, { tokens: number; lastRefill: number }>();
const WINDOWS = new Map<string, { timestamps: number[] }>();
