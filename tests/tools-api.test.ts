import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { InMemoryToolStore } from '../src/db.js';
import { deriveReliability, type Tool, type ConnectionType, type HealthStatus } from '../src/types.js';
import { findToolBySlug } from '../src/views/toolPage.js';

describe('GET /api/tools & Health Reliability Extension', () => {
  describe('deriveReliability logic', () => {
    it('returns explicit "unchecked" enum state when tool has no lastChecked timestamp', () => {
      const tool: Partial<Tool> = {
        namespace: 'test.untested',
        healthStatus: 'unknown',
      };
      const res = deriveReliability(tool);
      assert.equal(res.lastCheckedIso, null);
      assert.equal(res.reliability, 'unchecked');
      assert.equal(res.failureReason, null);
    });

    it('returns reliability: "high" when tool is active and checked within 24 hours', () => {
      const recentCheck = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      const tool: Partial<Tool> = {
        namespace: 'test.healthy',
        healthStatus: 'active',
        lastChecked: recentCheck,
        failureReason: null,
      };
      const res = deriveReliability(tool);
      assert.equal(res.healthStatus, 'active');
      assert.equal(res.lastCheckedIso, recentCheck.toISOString());
      assert.equal(res.reliability, 'high');
      assert.equal(res.failureReason, null);
    });

    it('returns reliability: "degraded" when tool is active but checked over 24 hours ago', () => {
      const staleCheck = new Date(Date.now() - 25 * 3600 * 1000); // 25 hours ago
      const tool: Partial<Tool> = {
        namespace: 'test.stale',
        healthStatus: 'active',
        lastChecked: staleCheck,
        failureReason: null,
      };
      const res = deriveReliability(tool);
      assert.equal(res.healthStatus, 'active');
      assert.equal(res.lastCheckedIso, staleCheck.toISOString());
      assert.equal(res.reliability, 'degraded');
      assert.equal(res.failureReason, null);
    });

    it('returns reliability: "failing" with failureReason when tool is inactive', () => {
      const checkTime = new Date();
      const tool: Partial<Tool> = {
        namespace: 'test.failing',
        healthStatus: 'inactive',
        lastChecked: checkTime,
        failureReason: 'HTTP 502 Bad Gateway',
      };
      const res = deriveReliability(tool);
      assert.equal(res.healthStatus, 'inactive');
      assert.equal(res.lastCheckedIso, checkTime.toISOString());
      assert.equal(res.reliability, 'failing');
      assert.equal(res.failureReason, 'HTTP 502 Bad Gateway');
    });
  });

  describe('API endpoints integration', () => {
    function setupApp() {
      const store = new InMemoryToolStore();
      const app = new Hono();

      function formatToolRecord(tool: Tool) {
        const health = deriveReliability(tool);
        const pricingModel = tool.pricing?.model ?? 'free';
        const costPerCall = tool.pricing?.costPerCall ?? 0;
        return {
          namespace: tool.namespace,
          name: tool.name,
          description: tool.description,
          schema: tool.schema,
          connectionType: tool.connectionType,
          endpointUrl: tool.endpointUrl ?? null,
          healthStatus: health.healthStatus,
          lastChecked: health.lastCheckedIso,
          failureReason: health.failureReason,
          reliability: health.reliability,
          health: {
            status: health.healthStatus,
            lastChecked: health.lastCheckedIso,
            reliability: health.reliability,
            failureReason: health.failureReason,
          },
          pricing: {
            model: pricingModel,
            costPerCall,
            currency: 'USDC',
            chain: 'Base',
          },
          developer: tool.developer,
          status: tool.status ?? 'active',
          updatedAt: tool.updatedAt instanceof Date ? tool.updatedAt.toISOString() : tool.updatedAt,
        };
      }

      app.get('/api/tools', async (c) => {
        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset') ?? c.req.query('skip');
        const status = c.req.query('status');
        const connectionType = c.req.query("connectionType") as ConnectionType | undefined;
        const healthStatus = c.req.query("healthStatus") as HealthStatus | undefined;
        const pricingModel = c.req.query('pricingModel');
        const capability = c.req.query('capability') ?? c.req.query('q') ?? c.req.query('keyword');
        const reliabilityParam = c.req.query('reliability');

        if (reliabilityParam !== undefined) {
          const validReliabilities = ['high', 'degraded', 'failing', 'unchecked', 'all'];
          const normalized = reliabilityParam.toLowerCase().trim();
          if (!validReliabilities.includes(normalized)) {
            return c.json(
              {
                error: 'Invalid reliability filter parameter',
                message: "Allowed values for 'reliability' are: 'high', 'degraded', 'failing', 'unchecked', or 'all'.",
                provided: reliabilityParam,
              },
              400,
            );
          }
        }

        const limit = Math.min(Math.max(1, Number(limitParam ?? 20)), 100);
        const offset = Math.max(0, Number(offsetParam ?? 0));

        const filter = {
          status,
          connectionType,
          healthStatus,
          pricingModel,
          capability,
        };

        let tools = await store.list(filter);

        if (reliabilityParam) {
          const target = reliabilityParam.toLowerCase().trim();
          if (target !== 'all') {
            tools = tools.filter((t) => deriveReliability(t).reliability === target);
          }
        }

        const total = tools.length;
        const paginated = tools.slice(offset, offset + limit);

        return c.json({
          total,
          count: paginated.length,
          limit,
          offset,
          tools: paginated.map(formatToolRecord),
        });
      });

      async function handleApiToolDetail(c: any) {
        const slug = c.req.param('slug') || c.req.param('namespace');
        if (!slug) return c.json({ error: 'Missing tool identifier' }, 400);
        const tool = await findToolBySlug(store, slug);
        if (!tool) return c.json({ error: 'Tool not found', slug }, 404);
        return c.json(formatToolRecord(tool));
      }

      app.get('/api/tools/:slug', handleApiToolDetail);
      app.get('/api/tool/:slug', handleApiToolDetail);

      return { app, store };
    }

    it('returns tools with health status, lastChecked, and reliability indicator', async () => {
      const { app, store } = setupApp();

      const tool1: Tool = {
        namespace: 'com.test.fresh',
        name: 'fresh_tool',
        description: 'Fresh active tool',
        schema: {},
        connectionType: 'http',
        endpointUrl: 'https://api.example.com/fresh',
        healthStatus: 'active',
        lastChecked: new Date(Date.now() - 60000), // 1 min ago
        failureReason: null,
        updatedAt: new Date(),
      };

      const tool2: Tool = {
        namespace: 'com.test.unchecked',
        name: 'unchecked_tool',
        description: 'Unchecked tool with no check yet',
        schema: {},
        connectionType: 'stdio',
        healthStatus: 'unknown',
        updatedAt: new Date(),
      };

      const tool3: Tool = {
        namespace: 'com.test.failing',
        name: 'failing_tool',
        description: 'Failing endpoint tool',
        schema: {},
        connectionType: 'http',
        endpointUrl: 'https://api.example.com/fail',
        healthStatus: 'inactive',
        lastChecked: new Date(Date.now() - 120000),
        failureReason: 'HTTP 502 Bad Gateway',
        updatedAt: new Date(),
      };

      await store.upsert(tool1);
      await store.upsert(tool2);
      await store.upsert(tool3);

      const res = await app.request('/api/tools');
      assert.equal(res.status, 200);
      const data = await res.json() as any;

      assert.equal(data.total, 3);
      assert.equal(data.count, 3);

      // Verify tool1: high reliability
      const t1 = data.tools.find((t: any) => t.namespace === 'com.test.fresh');
      assert.ok(t1);
      assert.equal(t1.healthStatus, 'active');
      assert.ok(t1.lastChecked);
      assert.equal(t1.failureReason, null);
      assert.equal(t1.reliability, 'high');
      assert.equal(t1.health.reliability, 'high');

      // Verify tool2: unchecked -> "unchecked" enum
      const t2 = data.tools.find((t: any) => t.namespace === 'com.test.unchecked');
      assert.ok(t2);
      assert.equal(t2.lastChecked, null);
      assert.equal(t2.failureReason, null);
      assert.equal(t2.reliability, 'unchecked');
      assert.equal(t2.health.reliability, 'unchecked');

      // Verify tool3: failing
      const t3 = data.tools.find((t: any) => t.namespace === 'com.test.failing');
      assert.ok(t3);
      assert.equal(t3.healthStatus, 'inactive');
      assert.ok(t3.lastChecked);
      assert.equal(t3.failureReason, 'HTTP 502 Bad Gateway');
      assert.equal(t3.reliability, 'failing');
      assert.equal(t3.health.reliability, 'failing');
    });

    it('preserves filters and pagination on GET /api/tools', async () => {
      const { app, store } = setupApp();

      for (let i = 1; i <= 5; i++) {
        await store.upsert({
          namespace: `com.test.tool${i}`,
          name: `tool_${i}`,
          description: `Tool ${i}`,
          schema: {},
          connectionType: i % 2 === 0 ? 'stdio' : 'http',
          healthStatus: i % 2 === 0 ? 'inactive' : 'active',
          updatedAt: new Date(),
        });
      }

      // Test pagination
      const pagedRes = await app.request('/api/tools?limit=2&offset=1');
      assert.equal(pagedRes.status, 200);
      const pagedData = await pagedRes.json() as any;
      assert.equal(pagedData.total, 5);
      assert.equal(pagedData.count, 2);
      assert.equal(pagedData.limit, 2);
      assert.equal(pagedData.offset, 1);

      // Test filter by connectionType
      const filteredRes = await app.request('/api/tools?connectionType=stdio');
      assert.equal(filteredRes.status, 200);
      const filteredData = await filteredRes.json() as any;
      assert.equal(filteredData.count, 2);
      for (const t of filteredData.tools) {
        assert.equal(t.connectionType, 'stdio');
      }

      // Test filter by healthStatus
      const healthRes = await app.request('/api/tools?healthStatus=active');
      assert.equal(healthRes.status, 200);
      const healthData = await healthRes.json() as any;
      assert.equal(healthData.count, 3);
      for (const t of healthData.tools) {
        assert.equal(t.healthStatus, 'active');
      }

      // Test filter by capability
      await store.upsert({
        namespace: 'net.2xcel.aus.sanitizer',
        name: 'aus_sanitizer',
        description: 'Input sanitization and XSS stripping utility',
        schema: {
          type: 'object',
          properties: {
            payload: { type: 'object', description: 'JSON payload to inspect and sanitize' },
          },
        },
        connectionType: 'http',
        healthStatus: 'active',
        updatedAt: new Date(),
      });

      const capRes = await app.request('/api/tools?capability=sanitiz');
      assert.equal(capRes.status, 200);
      const capData = await capRes.json() as any;
      assert.equal(capData.count, 1);
      assert.equal(capData.tools[0].name, 'aus_sanitizer');
    });

    it('returns detail with health and reliability on GET /api/tools/:namespace', async () => {
      const { app, store } = setupApp();

      const checkTime = new Date();
      await store.upsert({
        namespace: 'com.test.detail',
        name: 'detail_tool',
        description: 'Detail tool',
        schema: {},
        connectionType: 'http',
        endpointUrl: 'https://api.example.com/detail',
        healthStatus: 'active',
        lastChecked: checkTime,
        failureReason: null,
        updatedAt: new Date(),
      });

      const res = await app.request('/api/tools/com.test.detail');
      assert.equal(res.status, 200);
      const tool = await res.json() as any;

      assert.equal(tool.namespace, 'com.test.detail');
      assert.equal(tool.healthStatus, 'active');
      assert.equal(tool.lastChecked, checkTime.toISOString());
      assert.equal(tool.reliability, 'high');
      assert.equal(tool.health.status, 'active');
      assert.equal(tool.health.reliability, 'high');

      // Non-existent tool returns 404
      const res404 = await app.request('/api/tools/nonexistent');
      assert.equal(res404.status, 404);
    });

    it('filters tools by reliability parameter on GET /api/tools', async () => {
      const { app, store } = setupApp();

      const freshTool: Tool = {
        namespace: 'com.test.fresh-rel',
        name: 'fresh_rel',
        description: 'Fresh active tool',
        schema: {},
        connectionType: 'http',
        healthStatus: 'active',
        lastChecked: new Date(Date.now() - 3600000),
        updatedAt: new Date(),
      };

      const failingTool: Tool = {
        namespace: 'com.test.failing-rel',
        name: 'failing_rel',
        description: 'Failing tool',
        schema: {},
        connectionType: 'http',
        healthStatus: 'inactive',
        lastChecked: new Date(Date.now() - 10000),
        failureReason: 'Connection refused',
        updatedAt: new Date(),
      };

      await store.upsert(freshTool);
      await store.upsert(failingTool);

      const highRes = await app.request('/api/tools?reliability=high');
      assert.equal(highRes.status, 200);
      const highData = await highRes.json() as any;
      assert.equal(highData.count, 1);
      assert.equal(highData.tools[0].namespace, 'com.test.fresh-rel');

      const failRes = await app.request('/api/tools?reliability=failing');
      assert.equal(failRes.status, 200);
      const failData = await failRes.json() as any;
      assert.equal(failData.count, 1);
      assert.equal(failData.tools[0].namespace, 'com.test.failing-rel');

      const badRes = await app.request('/api/tools?reliability=invalid_value');
      assert.equal(badRes.status, 400);
      const badData = await badRes.json() as any;
      assert.ok(badData.error.includes('Invalid reliability'));
    });

    it('resolves tool specification by short name slug on /api/tools/:slug and /api/tool/:slug', async () => {
      const { app, store } = setupApp();

      await store.upsert({
        namespace: 'net.2xcel.aus.schema-sanitizer',
        name: 'schema_sanitizer',
        description: 'Sanitizer tool for autonomous agents',
        schema: { type: 'object' },
        connectionType: 'http',
        endpointUrl: 'https://aipages.tech/tool/schema-sanitizer',
        healthStatus: 'unknown',
        pricing: { model: 'paid', costPerCall: 0.1 },
        updatedAt: new Date(),
      });

      const resSlug = await app.request('/api/tools/schema-sanitizer');
      assert.equal(resSlug.status, 200);
      const dataSlug = await resSlug.json() as any;
      assert.equal(dataSlug.namespace, 'net.2xcel.aus.schema-sanitizer');
      assert.equal(dataSlug.name, 'schema_sanitizer');
      assert.equal(dataSlug.pricing.currency, 'USDC');
      assert.equal(dataSlug.pricing.chain, 'Base');

      const resName = await app.request('/api/tools/schema_sanitizer');
      assert.equal(resName.status, 200);
      const dataName = await resName.json() as any;
      assert.equal(dataName.namespace, 'net.2xcel.aus.schema-sanitizer');

      const resAlias = await app.request('/api/tool/schema-sanitizer');
      assert.equal(resAlias.status, 200);
      const dataAlias = await resAlias.json() as any;
      assert.equal(dataAlias.namespace, 'net.2xcel.aus.schema-sanitizer');
    });
  });
});
