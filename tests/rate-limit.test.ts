/**
 * Tests for the rate limiter.
 * Covers: token bucket limits, sliding window limits, rate limit store interface.
 * Does NOT require MongoDB — uses the in-memory implementations and a mock
 * store to test the async path.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const {
  tokenBucket,
  slidingWindow,
  slidingWindowAsync,
  setRateLimitStore,
  MongoRateStore,
  startRateLimitCleanup,
} = await import("../src/rate-limit.js");

describe("rate-limiter", () => {
  describe("tokenBucket", () => {
    test("allows requests up to the limit", () => {
      const max = 5;
      const windowMs = 1000;
      for (let i = 0; i < max; i++) {
        const result = tokenBucket("test-bucket", max, windowMs);
        assert.ok(result.allowed, `Request ${i} should be allowed`);
      }
    });

    test("blocks requests after exceeding the limit", () => {
      const max = 3;
      const windowMs = 1000;
      // Exhaust the bucket
      for (let i = 0; i < max; i++) {
        tokenBucket("test-bucket-2", max, windowMs);
      }
      // Next request should be blocked
      const result = tokenBucket("test-bucket-2", max, windowMs);
      assert.equal(result.allowed, false);
      assert.equal(result.remaining, 0);
      assert.ok(result.retryAfterSec !== undefined);
    });

    test("returns correct remaining count", () => {
      const max = 10;
      const windowMs = 1000;
      const result = tokenBucket("test-bucket-3", max, windowMs);
      assert.ok(result.allowed);
      assert.equal(result.remaining, max - 1);
    });

    test("separate keys have independent buckets", () => {
      const max = 1;
      const windowMs = 1000;
      const r1 = tokenBucket("key-a", max, windowMs);
      const r2 = tokenBucket("key-b", max, windowMs);
      assert.ok(r1.allowed);
      assert.ok(r2.allowed);
    });
  });

  describe("slidingWindow", () => {
    test("allows requests up to the limit", () => {
      const max = 3;
      const windowMs = 1000;
      for (let i = 0; i < max; i++) {
        const result = slidingWindow("sw-test-1", max, windowMs);
        assert.ok(result.allowed, `Request ${i} should be allowed`);
      }
    });

    test("blocks after exceeding the limit", () => {
      const max = 2;
      const windowMs = 1000;
      for (let i = 0; i < max; i++) {
        slidingWindow("sw-test-2", max, windowMs);
      }
      const result = slidingWindow("sw-test-2", max, windowMs);
      assert.equal(result.allowed, false);
      assert.equal(result.remaining, 0);
    });
  });

  describe("slidingWindowAsync (in-memory fallback)", () => {
    test("falls back to in-memory when no store is set", async () => {
      // Ensure no persistent store is set
      setRateLimitStore(null);

      const max = 3;
      const windowMs = 1000;
      const results = [];
      for (let i = 0; i < max; i++) {
        results.push(await slidingWindowAsync("async-test-1", max, windowMs));
      }
      // All should be allowed
      assert.ok(results.every((r) => r.allowed));

      // Next should be blocked
      const blocked = await slidingWindowAsync("async-test-1", max, windowMs);
      assert.equal(blocked.allowed, false);
    });

    test("uses persistent store when set", async () => {
      // Create a mock store
      const mockStore = {
        counts: new Map<string, number>(),
        async increment(key: string, _windowMs: number): Promise<number> {
          const count = (this.counts.get(key) ?? 0) + 1;
          this.counts.set(key, count);
          return count;
        },
        async get(key: string, _windowMs: number): Promise<number> {
          return this.counts.get(key) ?? 0;
        },
        async reset(key: string): Promise<void> {
          this.counts.delete(key);
        },
      };
      setRateLimitStore(mockStore as any);

      const result = await slidingWindowAsync("async-test-2", 5, 1000);
      assert.ok(result.allowed);
      assert.equal(result.remaining, 4);
      assert.equal(mockStore.counts.get("async-test-2"), 1);

      // Clean up
      setRateLimitStore(null);
    });

    test("falls back to in-memory when store throws", async () => {
      const failingStore = {
        async increment(): Promise<number> {
          throw new Error("DB connection failed");
        },
        async get(): Promise<number> {
          return 0;
        },
        async reset(): Promise<void> {},
      };
      setRateLimitStore(failingStore as any);

      const result = await slidingWindowAsync("async-test-3", 5, 1000);
      // Should fall back to in-memory and succeed
      assert.ok(result.allowed);
      assert.ok(result.remaining >= 0);

      setRateLimitStore(null);
    });
  });

  describe("MongoRateStore", () => {
    test("implements the RateLimitStore interface", () => {
      assert.ok(typeof MongoRateStore.prototype.increment === "function");
      assert.ok(typeof MongoRateStore.prototype.get === "function");
      assert.ok(typeof MongoRateStore.prototype.reset === "function");
      assert.ok(typeof MongoRateStore.prototype.ensureTtlIndex === "function");
    });

    test("uses findOneAndUpdate with upsert for atomic increments", async () => {
      // Verify the source code uses atomic findOneAndUpdate with upsert
      const fs = await import("node:fs");
      const src = fs.readFileSync("src/rate-limit.ts", "utf8");
      assert.match(src, /findOneAndUpdate/, "MongoRateStore should use findOneAndUpdate");
      assert.match(src, /upsert:\s*true/, "MongoRateStore should use upsert: true");
      assert.match(
        src,
        /\$inc/,
        "MongoRateStore should use $inc for atomic counter increment",
      );
    });

    test("uses TTL index for automatic document expiry", async () => {
      const fs = await import("node:fs");
      const src = fs.readFileSync("src/rate-limit.ts", "utf8");
      assert.match(
        src,
        /createIndex.*expiresAt/,
        "MongoRateStore should create TTL index on expiresAt",
      );
    });

    test("MongoRateStore works with a mock collection", async () => {
      // Mock MongoDB collection that simulates findOneAndUpdate with upsert
      const mockDocs: Record<string, any> = {};
      const mockColl = {
        async findOneAndUpdate(filter: any, update: any, opts: any) {
          const id = `${filter.key}:${filter.windowStart}`;
          let doc = mockDocs[id];
          if (!doc) {
            doc = { count: 0, createdAt: Date.now(), expiresAt: new Date() };
          }
          doc.count += 1;
          mockDocs[id] = doc;
          return { value: doc };
        },
        async countDocuments(filter: any) {
          const windowStart = filter.windowStart?.$gte ?? 0;
          let total = 0;
          for (const key of Object.keys(mockDocs)) {
            const [k, ws] = key.split(":");
            if (k === filter.key && parseInt(ws) >= windowStart) {
              total += mockDocs[key].count;
            }
          }
          return total;
        },
        async deleteMany(filter: any) {
          if (filter.key) {
            for (const k of Object.keys(mockDocs)) {
              if (k.startsWith(`${filter.key}:`)) delete mockDocs[k];
            }
          }
        },
        async createIndex() {},
      };

      const store = new MongoRateStore(mockColl as any);
      const count1 = await store.increment("test-key", 1000);
      assert.equal(count1, 1);
      const count2 = await store.increment("test-key", 1000);
      assert.equal(count2, 2);
    });
  });

  describe("cleanup", () => {
    test("startRateLimitCleanup returns a stop function", () => {
      const stop = startRateLimitCleanup(1000);
      assert.equal(typeof stop, "function");
      stop();
    });
  });
});
