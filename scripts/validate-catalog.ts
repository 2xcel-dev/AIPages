/**
 * Pre-release CLI guardrail to validate all seeded catalog and first-party tool records.
 *
 * Usage:
 *   npx tsx scripts/validate-catalog.ts
 *   npm run check:tools
 */
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";
import {
  validateToolRecord,
  validateFirstPartyToolRecord,
  validateCatalog,
  assertValidFirstPartyTools,
} from "../src/validation/toolValidator.js";
import type { Tool } from "../src/types.js";

async function main() {
  console.log("🛡️  =========================================================");
  console.log("🚀 RUNNING AIPAGES CATALOG & FIRST-PARTY VALIDATION GUARDRAIL");
  console.log("🛡️  =========================================================\n");

  console.log(`📦 Validating ${CANONICAL_AUS_TOOLS.length} First-Party AUS Tools...`);

  // 1. Strict assertion for AUS tools
  try {
    assertValidFirstPartyTools(CANONICAL_AUS_TOOLS as unknown as Tool[]);
    console.log("✅ All first-party AUS tools passed strict assertion check!\n");
  } catch (err: any) {
    console.error("❌ First-party AUS validation failed:\n", err.message);
    process.exit(1);
  }

  // 2. Tabular inspection
  console.log("📋 Verified First-Party Fleet Manifest:");
  console.table(
    CANONICAL_AUS_TOOLS.map((t) => ({
      Namespace: t.namespace,
      Name: t.name,
      Pricing: `$${t.pricing?.costPerCall} USDC`,
      Capabilities: (t.capabilities ?? []).join(", "),
      Endpoint: t.endpointUrl,
      Health: t.healthStatus,
      RateLimit: t.rateLimit,
    })),
  );

  // 3. Full catalog validation report
  const report = validateCatalog(CANONICAL_AUS_TOOLS as unknown as Tool[]);
  console.log(`\n📊 Summary:`);
  console.log(`   Total Verified: ${report.totalChecked}`);
  console.log(`   Valid Records:  ${report.validCount}`);
  console.log(`   Invalid:        ${report.invalidCount}`);

  if (!report.valid) {
    console.error(`\n❌ Found ${report.failures.length} validation failures.`);
    process.exit(1);
  }

  console.log("\n✨ Pre-release guardrail verified: All records compliant with zero schema/health violations.\n");
}

main().catch((err) => {
  console.error("Fatal guardrail error:", err);
  process.exit(1);
});
