import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 2 });
  const svgAbs = path.resolve("assets/aipages-banner.svg").replace(/\\/g, "/");
  await page.goto("file:///" + svgAbs);
  await page.waitForTimeout(500);
  const outPath = path.resolve("assets/github-social-preview.png");
  await page.screenshot({ path: outPath, type: "png" });
  await browser.close();
  const stats = fs.statSync(outPath);
  console.log(`Saved ${outPath} (${stats.size} bytes)`);
}

main().catch(console.error);
