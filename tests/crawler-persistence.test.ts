import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cron from 'node-cron';
import { InMemoryToolStore } from '../src/db.js';
import { BI_DAILY_CRON_SCHEDULE, crawlOnce } from '../src/crawler.js';
import { findToolBySlug } from '../src/views/toolPage.js';
import type { Tool } from '../src/types.js';

describe('MongoDB Upsert and Crawler Persistence Logic', () => {
  describe('ToolStore.upsert atomic preservation', () => {
    it('preserves existing pricing, developer, and capabilities on partial manifest update', async () => {
      const store = new InMemoryToolStore();

      // Initial record with developer, monetization, capabilities, and creation date
      const initialTool: Tool = {
        namespace: 'net.2xcel.aus.schema-sanitizer',
        name: 'schema-sanitizer',
        description: 'Sanitizes arbitrary payloads',
        schema: { type: 'object', properties: { input: { type: 'string' } } },
        connectionType: 'http',
        endpointUrl: 'https://aus.2xcel.net/tools/schema-sanitizer',
        healthStatus: 'unknown',
        pricing: {
          model: 'paid',
          costPerCall: 0.005,
        },
        developer: {
          address: '0x1234567890123456789012345678901234567890',
          listingFeePaid: true,
          name: 'AUS Team',
        },
        capabilities: ['schema-sanitization', 'validation'],
        status: 'active',
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };

      await store.upsert(initialTool);

      const before = await store.getByNamespace('net.2xcel.aus.schema-sanitizer');
      assert.ok(before);
      assert.equal(before.pricing?.model, 'paid');
      assert.equal(before.developer?.name, 'AUS Team');
      assert.deepEqual(before.capabilities, ['schema-sanitization', 'validation']);

      // Crawler runs a re-crawl with updated health probe and fresh schema, but NO pricing/developer fields
      const partialUpdate: Tool = {
        namespace: 'net.2xcel.aus.schema-sanitizer',
        name: 'schema-sanitizer',
        description: 'Sanitizes arbitrary payloads and enforces JSON Schema',
        schema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
            strict: { type: 'boolean' },
          },
        },
        connectionType: 'http',
        endpointUrl: 'https://aus.2xcel.net/tools/schema-sanitizer',
        healthStatus: 'active',
        lastChecked: new Date('2026-09-24T12:00:00Z'),
        lastCheckedAt: new Date('2026-09-24T12:00:00Z'),
        failureReason: null,
        updatedAt: new Date('2026-09-24T12:00:00Z'),
      };

      await store.upsert(partialUpdate);

      const after = await store.getByNamespace('net.2xcel.aus.schema-sanitizer');
      assert.ok(after);
      // Verify updated fields
      assert.equal(after.description, 'Sanitizes arbitrary payloads and enforces JSON Schema');
      assert.equal(after.healthStatus, 'active');
      assert.equal(after.lastChecked?.toISOString(), '2026-09-24T12:00:00.000Z');
      assert.ok(after.schema.properties?.strict);

      // Verify preserved fields
      assert.equal(after.pricing?.model, 'paid');
      assert.equal(after.pricing?.costPerCall, 0.005);
      assert.equal(after.developer?.name, 'AUS Team');
      assert.deepEqual(after.capabilities, ['schema-sanitization', 'validation']);
      assert.equal(after.status, 'active');
    });

    it('safely handles undefined properties and does not overwrite valid stored values with undefined', async () => {
      const store = new InMemoryToolStore();

      await store.upsert({
        namespace: 'net.2xcel.test.tool',
        name: 'test-tool',
        description: 'Initial description',
        schema: { type: 'object' },
        connectionType: 'http',
        endpointUrl: 'https://example.com/api',
        healthStatus: 'active',
        updatedAt: new Date(),
      });

      // Update where endpointUrl is undefined
      await store.upsert({
        namespace: 'net.2xcel.test.tool',
        name: 'test-tool',
        description: 'Updated description without changing endpoint',
        schema: { type: 'object' },
        connectionType: 'http',
        endpointUrl: undefined,
        healthStatus: 'active',
        updatedAt: new Date(),
      });

      const retrieved = await store.getByNamespace('net.2xcel.test.tool');
      assert.ok(retrieved);
      assert.equal(retrieved.description, 'Updated description without changing endpoint');
      assert.equal(retrieved.endpointUrl, 'https://example.com/api');
    });
  });

  describe('Bi-daily cron schedule configuration', () => {
    it('validates that BI_DAILY_CRON_SCHEDULE is 0 2,14 * * * and parses as valid node-cron expression', () => {
      assert.equal(BI_DAILY_CRON_SCHEDULE, '0 2,14 * * *');
      const isValid = cron.validate(BI_DAILY_CRON_SCHEDULE);
      assert.equal(isValid, true, 'Cron expression 0 2,14 * * * must be valid');
    });

    it('confirms render.yaml contains the bi-daily 0 2,14 * * * schedule for aipages-crawler', () => {
      const renderYamlPath = path.resolve(process.cwd(), 'render.yaml');
      const content = fs.readFileSync(renderYamlPath, 'utf8');

      // Check that aipages-crawler service is configured with the bi-daily schedule
      assert.ok(content.includes('name: aipages-crawler'), 'render.yaml must declare aipages-crawler');
      assert.ok(content.includes('schedule: "0 2,14 * * *"'), 'render.yaml must use schedule: "0 2,14 * * *"');
    });

    it('confirms package.json contains crawl:cron script', () => {
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      assert.ok(pkg.scripts['crawl:cron'], 'package.json must contain crawl:cron script');
      assert.equal(pkg.scripts['crawl:cron'], 'tsx src/crawler.ts cron');
    });
  });

  describe('Real-time database read flow for API and views', () => {
    it('immediately reflects persisted crawler updates in findToolBySlug and store.list without caching delay', async () => {
      const store = new InMemoryToolStore();

      // Tool does not exist yet
      let found = await findToolBySlug(store, 'schema-sanitizer');
      assert.equal(found, null);

      // Crawler runs and stores the newly discovered tool
      const newTool: Tool = {
        namespace: 'net.2xcel.aus.schema-sanitizer',
        name: 'schema-sanitizer',
        description: 'Real-time discovery test tool',
        schema: { type: 'object', properties: {} },
        connectionType: 'http',
        endpointUrl: 'https://aus.2xcel.net/tools/schema-sanitizer',
        healthStatus: 'active',
        lastChecked: new Date(),
        updatedAt: new Date(),
      };

      await store.upsert(newTool);

      // Immediate lookup by slug
      found = await findToolBySlug(store, 'schema-sanitizer');
      assert.ok(found);
      assert.equal(found.namespace, 'net.2xcel.aus.schema-sanitizer');
      assert.equal(found.description, 'Real-time discovery test tool');

      // Immediate lookup by direct namespace
      const byNs = await store.getByNamespace('net.2xcel.aus.schema-sanitizer');
      assert.ok(byNs);
      assert.equal(byNs.name, 'schema-sanitizer');

      // Immediate listing reflection
      const all = await store.list();
      assert.equal(all.length, 1);
      assert.equal(all[0].namespace, 'net.2xcel.aus.schema-sanitizer');
    });
  });

  describe('Strict Index Enforcement on MongoToolStore.connect', () => {
    it('throws immediately when unique namespace index creation fails rather than catching silently', async () => {
      const { MongoToolStore } = await import('../src/db.js');
      const store = new MongoToolStore('mongodb://localhost:27017/test_db');

      // Mock client methods and collection index creation
      const mockClient = store.getClient();
      mockClient.connect = async () => mockClient;
      mockClient.db = (() => ({
        command: async () => ({ ok: 1 }),
      })) as any;

      (store as any).collection = {
        createIndex: async (indexSpec: any) => {
          if (indexSpec.namespace === 1) {
            throw new Error('E11000 duplicate key error collection: tools index: namespace_1');
          }
          return 'index_created';
        },
      };
      (store as any).locksCollection = {
        createIndex: async () => 'index_created',
      };

      await assert.rejects(
        async () => {
          await store.connect();
        },
        {
          name: 'Error',
          message: 'E11000 duplicate key error collection: tools index: namespace_1',
        },
        'store.connect() must throw when unique namespace index fails'
      );
    });
  });

  describe('Database-backed distributed lock semantics', () => {
    it('manages lock acquisition, contention, expiration, and release', async () => {
      const store = new InMemoryToolStore();
      const lockKey = 'test:crawler:lock';

      // 1. Initial acquisition succeeds
      const acquired1 = await store.acquireLock(lockKey, 'runner-1', 1000);
      assert.equal(acquired1, true, 'runner-1 should acquire free lock');

      // 2. Contention: runner-2 fails to acquire active lock
      const acquired2 = await store.acquireLock(lockKey, 'runner-2', 1000);
      assert.equal(acquired2, false, 'runner-2 should be rejected while runner-1 holds lock');

      // 3. Same runner can re-acquire or extend lease
      const extended = await store.acquireLock(lockKey, 'runner-1', 1000);
      assert.equal(extended, true, 'runner-1 should be able to extend its own lease');

      // 4. Release by wrong runner does not free the lock
      const wrongRelease = await store.releaseLock(lockKey, 'runner-2');
      assert.equal(wrongRelease, false, 'runner-2 should not be able to release runner-1 lock');

      // 5. Release by valid owner frees the lock
      const validRelease = await store.releaseLock(lockKey, 'runner-1');
      assert.equal(validRelease, true, 'runner-1 should release lock');

      // 6. runner-2 can now acquire the freed lock
      const acquiredAfterRelease = await store.acquireLock(lockKey, 'runner-2', 1000);
      assert.equal(acquiredAfterRelease, true, 'runner-2 should acquire freed lock');
      await store.releaseLock(lockKey, 'runner-2');
    });

    it('allows acquisition of an expired lock lease', async () => {
      const store = new InMemoryToolStore();
      const lockKey = 'test:expired:lock';

      // Acquire lock with short ttl (1ms)
      await store.acquireLock(lockKey, 'old-runner', 1);

      // Wait 10ms for lease to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // New runner can acquire expired lease
      const acquiredExpired = await store.acquireLock(lockKey, 'new-runner', 1000);
      assert.equal(acquiredExpired, true, 'new runner should acquire expired lock');
      await store.releaseLock(lockKey, 'new-runner');
    });

    it('prevents overlapping crawl execution via distributed lock in crawlOnce', async () => {
      const store = new InMemoryToolStore();
      const { CRAWLER_LOCK_KEY } = await import('../src/crawler.js');

      // Pre-acquire the distributed lock by an external runner
      const preAcquired = await store.acquireLock(CRAWLER_LOCK_KEY, 'external-worker-pod', 60000);
      assert.equal(preAcquired, true);

      // Trigger crawlOnce with this store: must detect lock is held and abort cleanly
      const result = await crawlOnce(store);
      assert.equal(result.discovered, 0);
      assert.equal(result.ingested, 0);
      assert.equal(result.errors, 0);

      // Cleanup
      await store.releaseLock(CRAWLER_LOCK_KEY, 'external-worker-pod');
    });
  });

  describe('Zero em dash constraint verification in modified files', () => {
    it('ensures no em dashes or en dashes exist in src/db.ts, src/crawler.ts, or render.yaml', () => {
      const filesToCheck = [
        path.resolve(process.cwd(), 'src/db.ts'),
        path.resolve(process.cwd(), 'src/crawler.ts'),
        path.resolve(process.cwd(), 'render.yaml'),
      ];

      const dashRegex = /[\u2013\u2014]/;

      for (const filePath of filesToCheck) {
        const text = fs.readFileSync(filePath, 'utf8');
        const match = dashRegex.exec(text);
        assert.equal(
          match,
          null,
          `File ${path.basename(filePath)} contains forbidden dash at index ${match?.index}`
        );
      }
    });
  });
});
