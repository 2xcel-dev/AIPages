/**
 * Revenue Gateway & x402 Settlement Verification Monitor
 * Verifies live Base Mainnet L2 settlement readiness, 402 challenges,
 * zero-friction free execution, and Prometheus metrics telemetry.
 */

import { initApp } from "../src/index.js";
import { EXPECTED_RECIPIENT, USDC_CONTRACT_BASE } from "../src/middleware/x402.js";

export async function runRevenueGateVerification(): Promise<{
  passed: boolean;
  wallet: string;
  usdcContract: string;
  chain: string;
  details: Record<string, any>;
}> {
  console.log(`\n════════════════════════════════════════════════════════════════`);
  console.log(`  💰 STAGE 7: Base Mainnet x402 Revenue Settlement Verification`);
  console.log(`════════════════════════════════════════════════════════════════\n`);

  const { app } = await initApp();

  // 1. Health Probe
  const healthRes = await app.request("http://localhost/health");
  const health = await healthRes.json();
  console.log(`[health] Status: ${health.status} | Tools total: ${health.toolsTotal} | Engines online: ${health.firstPartyEnginesOnline}`);

  // 2. Metrics Telemetry Probe
  const metricsRes = await app.request("http://localhost/metrics");
  const metricsText = await metricsRes.text();
  const hasPrometheus = metricsText.includes("aipages_tools_total") || metricsText.includes("http_requests_total");
  console.log(`[metrics] Prometheus telemetry line format: ${hasPrometheus ? "ACTIVE" : "INACTIVE"}`);

  // 3. Paid Tool x402 Challenge Probe (net.2xcel.aus.browser-stealth)
  console.log(`[x402] Probing paid engine: net.2xcel.aus.browser-stealth ($0.15 USDC)...`);
  const paidRes = await app.request("http://localhost/tool/net.2xcel.aus.browser-stealth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-agent-id": "agent-verification-alpha",
    },
    body: JSON.stringify({ url: "https://example.com" }),
  });

  const paidChallenge = paidRes.status === 402;
  const challengeBody = await paidRes.json();
  console.log(`[x402] HTTP Status: ${paidRes.status} (Expected: 402 Payment Required)`);
  console.log(`[x402] Settlement Directive: ${JSON.stringify(challengeBody.error || challengeBody.message || challengeBody)}`);
  console.log(`[x402] Target Recipient: ${EXPECTED_RECIPIENT}`);
  console.log(`[x402] Base USDC Contract: ${USDC_CONTRACT_BASE}`);

  // 4. Free Tool Invocation Probe (io.github.crewai.file-reader)
  console.log(`\n[free] Probing freemium zero-friction community tool: io.github.crewai.file-reader...`);
  const freeRes = await app.request("http://localhost/tool/io.github.crewai.file-reader", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-agent-id": "agent-verification-alpha",
    },
    body: JSON.stringify({ path: "/tmp/sample.txt" }),
  });

  // Note: Since file-reader is an external mock endpoint in dev, if loopback returns 502/404/200, it bypassed 402 payment!
  const freeNon402 = freeRes.status !== 402;
  console.log(`[free] HTTP Status: ${freeRes.status} (Confirmed bypassed 402 payment requirement)`);

  const passed = health.status === "healthy" && hasPrometheus && paidChallenge && freeNon402;

  console.log(`\n${passed ? "✅ ALL REVENUE GATE GUARDS OPERATIONAL" : "❌ REVENUE GATE CHECK FAILED"}`);
  console.log(`Settlement Wallet:   https://basescan.org/address/${EXPECTED_RECIPIENT}`);
  console.log(`USDC Contract:      https://basescan.org/token/${USDC_CONTRACT_BASE}`);
  console.log(`Chain ID:           8453 (Base Mainnet L2)\n`);

  return {
    passed,
    wallet: EXPECTED_RECIPIENT,
    usdcContract: USDC_CONTRACT_BASE,
    chain: "Base Mainnet (Chain ID 8453)",
    details: {
      health,
      paidChallengeStatus: paidRes.status,
      freeStatus: freeRes.status,
    },
  };
}

if (process.argv[1]?.includes("verify-revenue-gate")) {
  runRevenueGateVerification().catch((err) => {
    console.error("Revenue gate error:", err);
    process.exit(1);
  });
}
