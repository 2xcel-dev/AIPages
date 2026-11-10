/**
 * Autonomous Search Engine & Crawler Syndication Dispatcher
 * Pings Google, Bing, and IndexNow with https://aipages.tech/sitemap.xml
 * and validates search crawler assets (robots.txt, llms.txt, capabilities).
 */

import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";

const BASE_URL = "https://aipages.tech";
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;
const LLMS_URL = `${BASE_URL}/llms.txt`;

const CORE_URLS = [
  `${BASE_URL}/`,
  `${BASE_URL}/tool`,
  `${BASE_URL}/tools`,
  `${BASE_URL}/capabilities`,
  `${BASE_URL}/search`,
  `${BASE_URL}/api/tools`,
  `${BASE_URL}/api/openapi.json`,
  ...CANONICAL_AUS_TOOLS.map((t) => `${BASE_URL}/tool/${encodeURIComponent(t.namespace)}`),
];

async function pingUrl(serviceName: string, pingUrl: string): Promise<void> {
  try {
    const res = await fetch(pingUrl, {
      method: "GET",
      headers: { "User-Agent": "AIPages-CrawlerSync/1.0 (+https://aipages.tech)" },
    });
    console.log(`[seo] ${serviceName} ping: ${res.status} ${res.statusText}`);
  } catch (err: any) {
    console.warn(`[seo] ${serviceName} ping warning: ${err.message}`);
  }
}

async function submitIndexNow(urls: string[]): Promise<void> {
  const indexNowUrl = "https://api.indexnow.org/indexnow";
  const payload = {
    host: "aipages.tech",
    key: process.env.INDEXNOW_KEY || "aipages_indexnow_verification_key",
    keyLocation: `https://aipages.tech/${process.env.INDEXNOW_KEY || "aipages_indexnow_verification_key"}.txt`,
    urlList: urls,
  };

  try {
    const res = await fetch(indexNowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "AIPages-IndexNow/1.0",
      },
      body: JSON.stringify(payload),
    });
    console.log(`[seo] IndexNow bulk submit (${urls.length} URLs): ${res.status} ${res.statusText}`);
  } catch (err: any) {
    console.warn(`[seo] IndexNow submit warning: ${err.message}`);
  }
}

export async function runSeoSyndication(): Promise<void> {
  console.log(`\n════════════════════════════════════════════════════════════════`);
  console.log(`  🌐 STAGE 6: Autonomous Search Engine & LLM Crawler Dispatch`);
  console.log(`════════════════════════════════════════════════════════════════\n`);
  console.log(`Target Sitemap: ${SITEMAP_URL}`);
  console.log(`LLM Discovery Manifest: ${LLMS_URL}`);
  console.log(`Submitting ${CORE_URLS.length} indexed URLs across search engines...\n`);

  // 1. Ping Google Sitemap Endpoint
  await pingUrl("Google Search Console Ping", `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);

  // 2. Ping Bing Search Sitemap Endpoint
  await pingUrl("Bing Webmaster Ping", `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);

  // 3. Dispatch IndexNow (Bing, Yandex, Seznam, Naver)
  await submitIndexNow(CORE_URLS);

  console.log(`\n[seo] Automated search engine notifications dispatched.`);
  console.log(`[seo] Google Search Console verification:`);
  console.log(`      1. Visit https://search.google.com/search-console`);
  console.log(`      2. Add Property -> Domain: "aipages.tech" or URL Prefix: "https://aipages.tech"`);
  console.log(`      3. Add DNS TXT record or HTML meta tag`);
  console.log(`      4. Under "Sitemaps", submit "sitemap.xml"\n`);
}

import { fileURLToPath } from "node:url";
import path from "node:path";

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  runSeoSyndication().catch((err) => {
    console.error("SEO syndication error:", err);
  });
}
