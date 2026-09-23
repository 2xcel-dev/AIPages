import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import agentScraperRouter from '../src/routes/agentScraper.js';

describe('Agent Scraper API Route', () => {
  it('returns 400 when urls parameter is missing', async () => {
    const res = await agentScraperRouter.request('/api/scrape-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const data = await res.json() as any;
    assert.equal(data.error, 'Please provide an array of URLs to scrape.');
  });

  it('returns 400 when urls is not an array', async () => {
    const res = await agentScraperRouter.request('/api/scrape-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: 'https://example.com' }),
    });

    assert.equal(res.status, 400);
    const data = await res.json() as any;
    assert.equal(data.error, 'Please provide an array of URLs to scrape.');
  });

  it('returns 200 with empty agents list when urls array is empty', async () => {
    const res = await agentScraperRouter.request('/api/scrape-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: [] }),
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.equal(data.success, true);
    assert.equal(data.count, 0);
    assert.deepEqual(data.agents, []);
  });
});
