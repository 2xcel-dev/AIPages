import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { InMemoryToolStore } from '../src/db.js';
import type { Tool } from '../src/types.js';
import { createToolsApiRouter, handleGetTools, formatToolRecord } from '../src/api/tools.js';
import {
  createSyndicationRouter,
  handleSyndicationFeed,
  buildSyndicationFeed,
  FEED_TITLE,
  FEED_HOME_PAGE,
  FEED_URL,
} from '../src/api/syndication.js';

describe('Public Tools Directory API and Syndication Feed', () => {
  function createSampleTools(): Tool[] {
    const now = new Date();
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);

    return [
      {
        namespace: 'net.2xcel.aus.search',
        name: 'aus_deep_search',
        description: 'Autonomous Universal Service deep web crawler and analyzer',
        schema: { type: 'object' },
        connectionType: 'http',
        endpointUrl: 'https://api.2xcel.net/aus/search',
        healthStatus: 'active',
        lastChecked: oneHourAgo,
        failureReason: null,
        updatedAt: now,
        isFirstParty: true,
        schemaSource: 'first-party:net.2xcel.aus',
        capabilities: ['search', 'web-scraping', 'research'],
        pricing: { model: 'per-call', costPerCall: 0.05, currency: 'USDC', chain: 'Base' },
        status: 'active',
      },
      {
        namespace: 'mcp.registry.github.brave-search',
        name: 'brave_search_mcp',
        description: 'Official MCP Registry Brave Search server for agent retrieval',
        schema: { type: 'object' },
        connectionType: 'stdio',
        healthStatus: 'active',
        lastChecked: oneHourAgo,
        failureReason: null,
        updatedAt: now,
        isFirstParty: false,
        schemaSource: 'official-registry:https://registry.modelcontextprotocol.io/v0.1/servers',
        capabilities: ['search', 'retrieval'],
        pricing: { model: 'free', costPerCall: 0 },
        status: 'active',
      },
      {
        namespace: 'github.puppeteer.browser-tools',
        name: 'puppeteer_mcp',
        description: 'Headless browser automation MCP server discovered on GitHub',
        schema: { type: 'object' },
        connectionType: 'http',
        endpointUrl: 'https://github.com/puppeteer/browser-tools',
        healthStatus: 'active',
        lastChecked: oneHourAgo,
        failureReason: null,
        updatedAt: now,
        isFirstParty: false,
        schemaSource: 'github:https://github.com/puppeteer/browser-tools',
        capabilities: ['automation', 'browser'],
        pricing: { model: 'free', costPerCall: 0 },
        status: 'active',
      },
      {
        namespace: 'npm.sqlite.mcp-server',
        name: 'sqlite_mcp',
        description: 'SQLite database inspection tools published on npm',
        schema: { type: 'object' },
        connectionType: 'stdio',
        healthStatus: 'inactive',
        lastChecked: now,
        failureReason: 'Spawn error: process exited with code 1',
        updatedAt: now,
        isFirstParty: false,
        schemaSource: 'npm:@modelcontextprotocol/server-sqlite',
        capabilities: ['database', 'sqlite'],
        pricing: { model: 'free', costPerCall: 0 },
        status: 'inactive',
      },
      {
        namespace: 'pypi.fastmcp.data-tools',
        name: 'fastmcp_data',
        description: 'Python PyPI FastMCP server providing data science utilities',
        schema: { type: 'object' },
        connectionType: 'stdio',
        healthStatus: 'active',
        lastChecked: oneHourAgo,
        failureReason: null,
        updatedAt: now,
        isFirstParty: false,
        schemaSource: 'pypi:fastmcp-data-tools',
        capabilities: ['python', 'data-science'],
        pricing: { model: 'free', costPerCall: 0 },
        status: 'active',
      },
    ];
  }

  function setupApp() {
    const store = new InMemoryToolStore();
    const app = new Hono();

    app.get('/api/tools', async (c) => handleGetTools(c, store));
    app.get('/api/feed.json', async (c) => handleSyndicationFeed(c, store));
    app.get('/api/syndication', async (c) => handleSyndicationFeed(c, store));
    app.get('/api/syndication/feed.json', async (c) => handleSyndicationFeed(c, store));
    app.get('/feed.json', async (c) => handleSyndicationFeed(c, store));

    return { app, store };
  }

  describe('GET /api/tools pagination and metadata', () => {
    it('returns standard pagination object and backward compatible top-level counts', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      const res = await app.request('/api/tools?limit=2&page=1');
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.ok(data.pagination, 'Must include pagination metadata object');
      assert.equal(data.pagination.page, 1);
      assert.equal(data.pagination.limit, 2);
      assert.equal(data.pagination.total, 5);
      assert.equal(data.pagination.totalPages, 3);
      assert.equal(data.pagination.hasNextPage, true);
      assert.equal(data.pagination.hasPrevPage, false);

      // Top-level backward compatibility fields
      assert.equal(data.total, 5);
      assert.equal(data.count, 2);
      assert.equal(data.limit, 2);
      assert.equal(data.offset, 0);
      assert.equal(data.tools.length, 2);
    });

    it('navigates to page 2 and page 3 correctly', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      // Page 2
      const resPage2 = await app.request('/api/tools?limit=2&page=2');
      const data2 = await resPage2.json();
      assert.equal(data2.pagination.page, 2);
      assert.equal(data2.pagination.hasNextPage, true);
      assert.equal(data2.pagination.hasPrevPage, true);
      assert.equal(data2.tools.length, 2);

      // Page 3 (last page with 1 remaining item)
      const resPage3 = await app.request('/api/tools?limit=2&page=3');
      const data3 = await resPage3.json();
      assert.equal(data3.pagination.page, 3);
      assert.equal(data3.pagination.hasNextPage, false);
      assert.equal(data3.pagination.hasPrevPage, true);
      assert.equal(data3.tools.length, 1);
    });
  });

  describe('GET /api/tools source query filtering', () => {
    it('filters by source=official-registry', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      const res = await app.request('/api/tools?source=official-registry');
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.pagination.total, 1);
      assert.equal(data.tools[0].name, 'brave_search_mcp');
      assert.equal(data.tools[0].schemaSource.includes('official-registry'), true);
    });

    it('filters by source=github', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      const res = await app.request('/api/tools?source=github');
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.pagination.total, 1);
      assert.equal(data.tools[0].name, 'puppeteer_mcp');
    });

    it('filters by source=first-party', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      const res = await app.request('/api/tools?source=first-party');
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.pagination.total, 1);
      assert.equal(data.tools[0].isFirstParty, true);
      assert.equal(data.tools[0].name, 'aus_deep_search');
    });

    it('filters by source=npm and source=pypi', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      const resNpm = await app.request('/api/tools?source=npm');
      const dataNpm = await resNpm.json();
      assert.equal(dataNpm.pagination.total, 1);
      assert.equal(dataNpm.tools[0].name, 'sqlite_mcp');

      const resPypi = await app.request('/api/tools?source=pypi');
      const dataPypi = await resPypi.json();
      assert.equal(dataPypi.pagination.total, 1);
      assert.equal(dataPypi.tools[0].name, 'fastmcp_data');
    });
  });

  describe('GET /api/tools search query filtering', () => {
    it('searches text matches across name, namespace, description, and capabilities', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      // Search matching description keyword
      const res1 = await app.request('/api/tools?search=browser');
      const data1 = await res1.json();
      assert.equal(data1.pagination.total, 1);
      assert.equal(data1.tools[0].name, 'puppeteer_mcp');

      // Search matching capability
      const res2 = await app.request('/api/tools?search=retrieval');
      const data2 = await res2.json();
      assert.equal(data2.pagination.total, 1);
      assert.equal(data2.tools[0].name, 'brave_search_mcp');

      // Search matching namespace
      const res3 = await app.request('/api/tools?search=fastmcp');
      const data3 = await res3.json();
      assert.equal(data3.pagination.total, 1);
      assert.equal(data3.tools[0].name, 'fastmcp_data');
    });
  });

  describe('GET /api/tools active status filtering', () => {
    it('filters active=true to exclude inactive or failing tools', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      const res = await app.request('/api/tools?active=true');
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.pagination.total, 4);
      for (const tool of data.tools) {
        assert.equal(tool.status, 'active');
        assert.notEqual(tool.healthStatus, 'inactive');
      }
    });

    it('filters active=false to retrieve inactive tools', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      const res = await app.request('/api/tools?active=false');
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.pagination.total, 1);
      assert.equal(data.tools[0].name, 'sqlite_mcp');
    });
  });

  describe('JSON Feed v1.1 Syndication Endpoint', () => {
    it('serves valid JSON Feed v1.1 on /api/feed.json with correct Content-Type', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      const res = await app.request('/api/feed.json');
      assert.equal(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('application/feed+json'));

      const feed = await res.json();
      assert.equal(feed.version, 'https://jsonfeed.org/version/1.1');
      assert.equal(feed.title, FEED_TITLE);
      assert.equal(feed.home_page_url, FEED_HOME_PAGE);
      assert.equal(feed.feed_url, FEED_URL);
      assert.ok(Array.isArray(feed.items));
      assert.equal(feed.items.length, 5);
    });

    it('structures items with required JSON Feed fields and _aipages machine extension', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      const res = await app.request('/api/feed.json');
      const feed = await res.json();
      const firstItem = feed.items[0];

      assert.ok(firstItem.id, 'Feed item must have id');
      assert.ok(firstItem.url, 'Feed item must have url');
      assert.ok(firstItem.title, 'Feed item must have title');
      assert.ok(firstItem.summary, 'Feed item must have summary');
      assert.ok(firstItem.date_modified, 'Feed item must have date_modified');
      assert.ok(Array.isArray(firstItem.tags), 'Feed item must have tags array');

      // Machine extension verification
      assert.ok(firstItem._aipages, 'Feed item must contain _aipages extension');
      assert.ok(firstItem._aipages.namespace);
      assert.ok(firstItem._aipages.connectionType);
      assert.ok(firstItem._aipages.pricing);
      assert.ok(firstItem._aipages.health);
      assert.ok(firstItem._aipages.health.reliability);
    });

    it('serves identical syndication feeds across aliases /api/syndication and /feed.json', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      const res1 = await app.request('/api/syndication');
      const res2 = await app.request('/feed.json');

      assert.equal(res1.status, 200);
      assert.equal(res2.status, 200);
      const json1 = await res1.json();
      const json2 = await res2.json();

      assert.equal(json1.version, json2.version);
      assert.equal(json1.items.length, json2.items.length);
    });

    it('supports query parameters on syndication feed (e.g. source and limit)', async () => {
      const { app, store } = setupApp();
      for (const t of createSampleTools()) {
        await store.upsert(t);
      }

      const res = await app.request('/api/feed.json?source=official-registry&limit=1');
      assert.equal(res.status, 200);
      const feed = await res.json();

      assert.equal(feed.items.length, 1);
      assert.equal(feed.items[0]._aipages.namespace, 'mcp.registry.github.brave-search');
    });
  });

  describe('Zero em dash and en dash constraint verification', () => {
    it('confirms no forbidden em dashes or en dashes exist in newly added API and syndication files', () => {
      const filesToCheck = [
        path.resolve(process.cwd(), 'src/api/tools.ts'),
        path.resolve(process.cwd(), 'src/api/syndication.ts'),
        path.resolve(process.cwd(), 'src/index.ts'),
        path.resolve(process.cwd(), 'tests/api-directory-syndication.test.ts'),
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
