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
