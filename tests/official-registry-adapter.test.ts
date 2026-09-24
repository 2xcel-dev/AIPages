import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeOfficialServerRecord,
  sanitizeDashes,
  fetchOfficialServersFallback,
  fetchOfficialRegistryCandidates,
} from '../src/discovery/official-registry.js';
import {
  createInitialSourceYieldMap,
  type Candidate,
} from '../src/discovery/types.js';
import {
  recordRejection,
  createInitialRejectionBreakdown,
  type CrawlResult,
} from '../src/crawler.js';
import { extractTools } from '../src/manifest.js';

describe('Official MCP Registry Discovery Adapter', () => {
  describe('normalizeOfficialServerRecord', () => {
    it('normalizes streamable-http remote endpoints into valid Candidate records', () => {
      const serverItem = {
        server: {
          $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
          name: 'ac.inference.sh/mcp',
          description: 'Run 150+ AI apps across image, video, and audio',
          title: 'inference.sh',
          version: '1.0.0',
          remotes: [
            {
              type: 'streamable-http',
              url: 'https://api.inference.sh/mcp',
            },
          ],
        },
      };

      const candidate = normalizeOfficialServerRecord(serverItem);
      assert.ok(candidate);
      assert.equal(candidate.source, 'official-registry');
      assert.equal(candidate.repoOrPackageUrl, 'https://api.inference.sh/mcp');
      assert.equal(candidate.repo, undefined);
      assert.ok(candidate.manifestHint);
      assert.equal(candidate.manifestHint.name, 'ac.inference.sh/mcp');
      assert.ok(candidate.manifestHint.mcpServers);
      assert.equal(
        candidate.manifestHint.mcpServers['ac.inference.sh/mcp'].url,
        'https://api.inference.sh/mcp',
      );
      assert.equal(
        candidate.manifestHint.mcpServers['ac.inference.sh/mcp'].type,
        'streamable-http',
      );

      // Verify extractTools can parse this manifest hint directly
      const tools = extractTools(
        candidate.repoOrPackageUrl,
        {
          kind: 'mcp',
          url: candidate.repoOrPackageUrl,
          raw: JSON.stringify(candidate.manifestHint),
        },
        'mcp.registry',
      );
      assert.equal(tools.length, 1);
      assert.equal(tools[0].endpointUrl, 'https://api.inference.sh/mcp');
      assert.equal(tools[0].connectionType, 'http');
      assert.ok(tools[0].namespace.startsWith('mcp.registry.'));
    });

    it('normalizes stdio npm packages into valid Candidate records', () => {
      const serverItem = {
        server: {
          name: 'pretrip-mcp',
          description: 'Pre-trip flight and travel advisory MCP server',
          packages: [
            {
              registryType: 'npm',
              identifier: 'pretrip-mcp',
              version: '1.0.1',
              transport: { type: 'stdio' },
            },
          ],
        },
      };

      const candidate = normalizeOfficialServerRecord(serverItem);
      assert.ok(candidate);
      assert.equal(candidate.source, 'official-registry');
      assert.equal(candidate.repoOrPackageUrl, 'https://www.npmjs.com/package/pretrip-mcp');
      assert.ok(candidate.manifestHint.mcpServers);
      assert.equal(candidate.manifestHint.mcpServers['pretrip-mcp'].command, 'npx');
      assert.deepEqual(candidate.manifestHint.mcpServers['pretrip-mcp'].args, ['-y', 'pretrip-mcp']);
    });

    it('normalizes stdio pypi packages with python command', () => {
      const serverItem = {
        name: 'mcp-server-git',
        description: 'Git repository inspection tools for LLMs',
        packages: [
          {
            registryType: 'pypi',
            identifier: 'mcp-server-git',
            version: '0.1.0',
          },
        ],
      };

      const candidate = normalizeOfficialServerRecord(serverItem);
      assert.ok(candidate);
      assert.equal(candidate.source, 'official-registry');
      assert.equal(candidate.repoOrPackageUrl, 'https://pypi.org/project/mcp-server-git');
      assert.equal(candidate.manifestHint.mcpServers['mcp-server-git'].command, 'python');
    });

    it('extracts GitHub repository and subfolder path when repository metadata is present', () => {
      const serverItem = {
        server: {
          name: 'lona-mcp',
          description: 'Lona venture investment analysis server',
          repository: {
            url: 'https://github.com/mindsightventures/lona',
            source: 'github',
            subfolder: 'packages/lona-mcp-server',
          },
        },
      };

      const candidate = normalizeOfficialServerRecord(serverItem);
      assert.ok(candidate);
      assert.equal(candidate.source, 'official-registry');
      assert.equal(candidate.repoOrPackageUrl, 'https://github.com/mindsightventures/lona');
      assert.equal(candidate.repo, 'mindsightventures/lona');
      assert.equal(candidate.path, 'packages/lona-mcp-server/mcp.json');
    });

    it('returns null on invalid or empty server records', () => {
      assert.equal(normalizeOfficialServerRecord(null), null);
      assert.equal(normalizeOfficialServerRecord(undefined), null);
      assert.equal(normalizeOfficialServerRecord('not-an-object'), null);
      assert.equal(normalizeOfficialServerRecord({ server: { name: '' } }), null);
      assert.equal(normalizeOfficialServerRecord({ name: '   ' }), null);
    });
  });

  describe('sanitizeDashes', () => {
    it('replaces em dashes and en dashes with standard hyphen', () => {
      assert.equal(sanitizeDashes(null), '');
      assert.equal(sanitizeDashes(undefined), '');
      const input = 'Run 150+ AI apps \u2014 image, video, audio \u2013 and more.';
      const output = sanitizeDashes(input);
      assert.equal(output.includes('\u2014'), false);
      assert.equal(output.includes('\u2013'), false);
      assert.equal(output, 'Run 150+ AI apps  -  image, video, audio  -  and more.');
    });
  });

  describe('fetchOfficialServersFallback', () => {
    it('parses reference implementations markdown into valid candidates', async () => {
      const candidates = await fetchOfficialServersFallback(10);
      assert.ok(Array.isArray(candidates));
      assert.ok(candidates.length > 0);
      assert.equal(candidates[0].source, 'official-registry');
      assert.equal(candidates[0].repo, 'modelcontextprotocol/servers');
      assert.ok(candidates[0].path?.endsWith('/mcp.json'));
    });
  });

  describe('fetchOfficialRegistryCandidates', () => {
    it('fetches candidates from the official registry and dedupes entries', async () => {
      const candidates = await fetchOfficialRegistryCandidates(5);
      assert.ok(Array.isArray(candidates));
      assert.ok(candidates.length > 0);
      for (const c of candidates) {
        assert.equal(c.source, 'official-registry');
        assert.ok(c.repoOrPackageUrl);
        assert.ok(c.manifestHint);
      }
    });
  });

  describe('Funnel Tracking and Source Telemetry Breakdown', () => {
    it('tracks discovered, extracted, ingested, and rejected metrics by source', () => {
      const yieldMap = createInitialSourceYieldMap();
      assert.deepEqual(yieldMap['official-registry'], {
        discovered: 0,
        extracted: 0,
        ingested: 0,
        rejected: 0,
      });

      const result: CrawlResult = {
        discovered: 10,
        fetched: 8,
        rejected: 2,
        extracted: 12,
        healthChecked: 8,
        active: 6,
        ingested: 8,
        errors: 0,
        rejectionsByCategory: createInitialRejectionBreakdown(),
        rejections: [],
        bySource: createInitialSourceYieldMap(),
      };

      // Record a rejection with source attribution
      recordRejection(
        result,
        'official-org/unsupported-server',
        'invalid_schema',
        'Schema is missing required input properties',
        'official-registry',
      );

      assert.equal(result.rejected, 3);
      assert.equal(result.rejectionsByCategory.invalid_schema, 1);
      assert.equal(result.bySource?.['official-registry'].rejected, 1);
      assert.equal(result.rejections.length, 1);
      assert.equal(result.rejections[0].source, 'official-registry');
      assert.equal(result.rejections[0].repo, 'official-org/unsupported-server');
    });
  });

  describe('Zero em dash constraint verification in official registry adapter files', () => {
    it('ensures no em dashes or en dashes exist in touched discovery adapter files', () => {
      const filesToCheck = [
        path.resolve(process.cwd(), 'src/discovery/types.ts'),
        path.resolve(process.cwd(), 'src/discovery/official-registry.ts'),
        path.resolve(process.cwd(), 'src/discovery/index.ts'),
        path.resolve(process.cwd(), 'src/crawler.ts'),
        path.resolve(process.cwd(), 'src/manifest.ts'),
        path.resolve(process.cwd(), 'tests/official-registry-adapter.test.ts'),
      ];

      const dashRegex = /[\u2013\u2014]/;

      for (const filePath of filesToCheck) {
        const text = fs.readFileSync(filePath, 'utf8');
        const match = dashRegex.exec(text);
        assert.equal(
          match,
          null,
          `File ${path.basename(filePath)} contains forbidden dash at index ${match?.index}`,
        );
      }
    });
  });
});
