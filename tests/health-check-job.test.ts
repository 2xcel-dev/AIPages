import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { InMemoryToolStore } from '../src/db.js';
import type { Tool } from '../src/types.js';
import {
  isEligibleTool,
  sanitizeFailureReason,
  probeEndpoint,
  runHealthCheckJob,
} from '../scripts/health-check-job.js';

describe('Focused Health-Check Job & Persistence Model', () => {
  let server: http.Server;
  let serverUrl: string;

  before(async () => {
    server = http.createServer((req, res) => {
      const url = req.url ?? '/';
      if (url === '/ok') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else if (url === '/not-found') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else if (url === '/error-502') {
        res.writeHead(502, { 'Content-Type': 'text/html' });
        res.end('<html>Bad Gateway</html>');
      } else if (url === '/timeout') {
        // Do not respond; wait for client timeout
        setTimeout(() => {
          if (!res.writableEnded) {
            res.writeHead(200);
            res.end();
          }
        }, 3000);
      } else {
        res.writeHead(200);
        res.end();
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = server.address() as { port: number };
    serverUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('isEligibleTool', () => {
    it('identifies eligible HTTP/HTTPS tools and filters out ineligible tools', () => {
      const validTool: Tool = {
        namespace: 'test.valid',
        name: 'Valid Tool',
        description: 'A valid tool',
        schema: {},
        connectionType: 'http',
        endpointUrl: 'https://api.example.com/tool',
        healthStatus: 'unknown',
        updatedAt: new Date(),
      };
      assert.equal(isEligibleTool(validTool), true);

      const stdioTool: Tool = {
        ...validTool,
        namespace: 'test.stdio',
        connectionType: 'stdio',
        endpointUrl: undefined,
      };
      assert.equal(isEligibleTool(stdioTool), false);

      const emptyUrlTool: Tool = {
        ...validTool,
        namespace: 'test.empty',
        endpointUrl: '   ',
      };
      assert.equal(isEligibleTool(emptyUrlTool), false);

      const rejectedTool: Tool = {
        ...validTool,
        namespace: 'test.rejected',
        status: 'rejected',
      };
      assert.equal(isEligibleTool(rejectedTool), false);
    });
  });

  describe('sanitizeFailureReason', () => {
    it('strips query parameters, tokens, and truncates concisely', () => {
      const sensitiveMsg = 'Fetch failed at https://api.example.com/v1?token=secret1234567890abcdef1234567890abcdef&api_key=sk_live_xyz';
      const sanitized = sanitizeFailureReason(sensitiveMsg);
      assert.ok(!sanitized.includes('secret123'));
      assert.ok(!sanitized.includes('sk_live_xyz'));
      assert.ok(sanitized.length <= 80);
    });
  });

  describe('probeEndpoint', () => {
    it('returns healthy: true for 200 responses', async () => {
      const probe = await probeEndpoint(`${serverUrl}/ok`, 1000);
      assert.equal(probe.healthy, true);
      assert.equal(probe.statusCode, 200);
      assert.equal(probe.failureReason, null);
      assert.ok(probe.latencyMs >= 0);
    });

    it('returns healthy: true for 404 responses (server is reachable)', async () => {
      const probe = await probeEndpoint(`${serverUrl}/not-found`, 1000);
      assert.equal(probe.healthy, true);
      assert.equal(probe.statusCode, 404);
      assert.equal(probe.failureReason, null);
    });

    it('returns healthy: false for 502 Bad Gateway responses without body', async () => {
      const probe = await probeEndpoint(`${serverUrl}/error-502`, 1000);
      assert.equal(probe.healthy, false);
      assert.equal(probe.statusCode, 502);
      assert.ok(probe.failureReason?.includes('HTTP 502'));
    });

    it('enforces bounded timeout on slow endpoints', async () => {
      const timeoutMs = 250;
      const start = performance.now();
      const probe = await probeEndpoint(`${serverUrl}/timeout`, timeoutMs);
      const elapsed = performance.now() - start;

      assert.equal(probe.healthy, false);
      assert.ok(elapsed < 1500, `Expected bounded timeout < 1500ms, took ${elapsed}ms`);
      assert.ok(probe.failureReason?.includes('timed out'));
    });

    it('handles connection refused without throwing', async () => {
      // Ephemeral port that is closed
      const probe = await probeEndpoint('http://127.0.0.1:59999/none', 500);
      assert.equal(probe.healthy, false);
      assert.ok(probe.failureReason?.includes('Connection refused') || probe.failureReason?.length! > 0);
    });
  });

  describe('runHealthCheckJob (Worker Execution & Deterministic Updates)', () => {
    it('processes eligible tools and deterministically updates health results in persistence store', async () => {
      const store = new InMemoryToolStore();

      const toolHealthy: Tool = {
        namespace: 'com.example.healthy',
        name: 'Healthy Tool',
        description: 'Healthy service endpoint',
        schema: {},
        connectionType: 'http',
        endpointUrl: `${serverUrl}/ok`,
        healthStatus: 'unknown',
        updatedAt: new Date(Date.now() - 60000),
      };

      const toolFailing: Tool = {
        namespace: 'com.example.failing',
        name: 'Failing Tool',
        description: 'Failing 502 endpoint',
        schema: {},
        connectionType: 'http',
        endpointUrl: `${serverUrl}/error-502`,
        healthStatus: 'active',
        updatedAt: new Date(Date.now() - 60000),
      };

      const toolStdio: Tool = {
        namespace: 'com.example.stdio',
        name: 'Local Tool',
        description: 'Stdio tool with no network endpoint',
        schema: {},
        connectionType: 'stdio',
        healthStatus: 'unknown',
        updatedAt: new Date(Date.now() - 60000),
      };

      await store.upsert(toolHealthy);
      await store.upsert(toolFailing);
      await store.upsert(toolStdio);

      // Run health-check job
      const summary = await runHealthCheckJob({
        store,
        timeoutMs: 1000,
        concurrency: 2,
      });

      // 1. Verify summary metrics
      assert.equal(summary.totalEligible, 2);
      assert.equal(summary.active, 1);
      assert.equal(summary.inactive, 1);
      assert.equal(summary.results.length, 2);

      // 2. Verify deterministic store persistence for healthy tool
      const updatedHealthy = await store.getByNamespace('com.example.healthy');
      assert.ok(updatedHealthy);
      assert.equal(updatedHealthy.healthStatus, 'active');
      assert.ok(updatedHealthy.lastChecked instanceof Date);
      assert.equal(updatedHealthy.failureReason, null);

      // 3. Verify deterministic store persistence for failing tool
      const updatedFailing = await store.getByNamespace('com.example.failing');
      assert.ok(updatedFailing);
      assert.equal(updatedFailing.healthStatus, 'inactive');
      assert.ok(updatedFailing.lastChecked instanceof Date);
      assert.ok(updatedFailing.failureReason?.includes('HTTP 502'));

      // 4. Verify stdio tool was not modified
      const untouchedStdio = await store.getByNamespace('com.example.stdio');
      assert.ok(untouchedStdio);
      assert.equal(untouchedStdio.healthStatus, 'unknown');
      assert.equal(untouchedStdio.lastChecked, undefined);
      assert.equal(untouchedStdio.failureReason, undefined);

      // 5. Run a second time to ensure deterministic behavior
      const summary2 = await runHealthCheckJob({
        store,
        timeoutMs: 1000,
        concurrency: 2,
      });

      assert.equal(summary2.totalEligible, 2);
      assert.equal(summary2.active, 1);
      assert.equal(summary2.inactive, 1);
    });
  });
});
