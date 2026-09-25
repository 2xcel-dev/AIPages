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
import type { Collection } from "mongodb";
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
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
export declare function tokenBucket(key: string, maxRequests: number, windowMs: number): RateLimitResult;
/**
 * Sliding-window rate limiter. Counts requests in the last `windowMs` ms.
 * Used for tool invocations — per agent ID (X-Agent-ID header).
 */
export declare function slidingWindow(key: string, maxRequests: number, windowMs: number): RateLimitResult;
/**
 * Async sliding-window rate limiter with persistent backend.
 * When a MongoRateStore is set via setRateLimitStore(), this uses it; otherwise
 * falls back to the in-memory slidingWindow().
 */
export declare function slidingWindowAsync(key: string, maxRequests: number, windowMs: number): Promise<RateLimitResult>;
/**
 * Set a persistent rate limit store (MongoDB, Redis, etc.).
 * When null, rate limiting falls back to in-memory (single-instance).
 */
export declare function setRateLimitStore(store: RateLimitStore | null): void;
/**
 * MongoDB-backed rate limit store.
 *
 * Uses atomic findOneAndUpdate with upsert to prevent race conditions
 * across multiple instances behind a load balancer. Each (key, windowStart)
 * pair gets a document with a counter — incremented atomically.
 *
 * A TTL index on `expiresAt` automatically removes expired documents.
 */
export declare class MongoRateStore implements RateLimitStore {
    private coll;
    constructor(coll: Collection);
    /**
     * Atomically increment the request counter for `key` within the current
     * time window. Uses findOneAndUpdate with upsert — a single atomic
     * operation that either creates or updates the counter document.
     *
     * Strategy: bucket by (key, windowStart) where windowStart is the start
     * of the current sliding window. This gives us a counter that we can
     * read without race conditions.
     */
    increment(key: string, windowMs: number): Promise<number>;
    /**
     * Get the current request count for `key` within the sliding window.
     * Counts all active window-bucket documents for this key.
     */
    get(key: string, windowMs: number): Promise<number>;
    /**
     * Reset all counters for `key` — removes all window-bucket documents.
     */
    reset(key: string): Promise<void>;
    /**
     * Ensure the TTL index exists for automatic expiry.
     * The TTL index on `expiresAt` removes expired documents automatically.
     */
    ensureTtlIndex(ttlSeconds?: number): Promise<void>;
}
/**
 * Periodic cleanup of stale bucket/window entries in the in-memory store.
 * Call once at startup — returns a stop function.
 * No-op when a persistent store is configured (MongoDB TTL handles expiry).
 */
export declare function startRateLimitCleanup(intervalMs?: number): () => void;
//# sourceMappingURL=rate-limit.d.ts.map