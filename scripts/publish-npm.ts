/**
 * Automated NPM Publisher Script for packages/aipages-sdk
 *
 * Verifies package build, runs tests, and publishes @aipages/sdk to the NPM registry.
 * Token can be passed via NPM_TOKEN or NODE_AUTH_TOKEN environment variables,
 * or as a command-line argument.
 *
 * Usage:
 *   npx tsx scripts/publish-npm.ts [optional-token]
 *   npm run publish:npm
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SDK_DIR = path.resolve(ROOT_DIR, "packages/aipages-sdk");

async function main() {
  console.log("\n=======================================================");
  console.log("  📦 NPM Publishing Pipeline for aipages-sdk (v1.0.0)");
  console.log("=======================================================\n");

  // 1. Verify dist and build
  console.log("[publish-npm] 1. Compiling TypeScript build...");
  try {
    execSync("npm run build:sdk", { cwd: ROOT_DIR, stdio: "inherit" });
    console.log("  ✓ Build compiled successfully.");
  } catch (err: any) {
    console.error("  ✗ Build failed:", err.message);
    process.exit(1);
  }

  // 2. Run unit tests
  console.log("[publish-npm] 2. Running unit test suite...");
  try {
    execSync("npm run test:sdk", { cwd: ROOT_DIR, stdio: "inherit" });
    console.log("  ✓ All SDK tests passed.");
  } catch (err: any) {
    console.error("  ✗ Test suite failed:", err.message);
    process.exit(1);
  }

  // 3. Resolve NPM Auth Token
  const token =
    process.env.NPM_TOKEN ||
    process.env.NODE_AUTH_TOKEN ||
    process.argv[2];

  const npmrcPath = path.join(SDK_DIR, ".npmrc");
  let createdNpmrc = false;

  try {
    if (token) {
      console.log("[publish-npm] 3. Configuring temporary authentication token...");
      fs.writeFileSync(
        npmrcPath,
        `//registry.npmjs.org/:_authToken=${token.trim()}\n`,
        "utf-8"
      );
      createdNpmrc = true;
    }

    console.log("[publish-npm] 4. Publishing @aipages/sdk to npm registry...");
    try {
      const output = execSync("npm publish --access public", {
        cwd: SDK_DIR,
        encoding: "utf-8",
        stdio: ["inherit", "pipe", "pipe"],
      });
      console.log(output);
      console.log("\n  ✨ SUCCESS: @aipages/sdk published to npm!");
      console.log("  🔗 https://www.npmjs.com/package/@aipages/sdk\n");
    } catch (publishErr: any) {
      const errMsg = publishErr.stderr || publishErr.message || "";
      if (errMsg.includes("E401") || errMsg.includes("ENEEDAUTH")) {
        console.error("\n  ✗ Authentication Required: Not logged in to npm.\n");
        console.log("To publish, either:");
        console.log("  A. Run in terminal: cd packages/aipages-sdk && npm login && npm publish --access public");
        console.log("  B. Or pass your NPM access token:");
        console.log("     $env:NPM_TOKEN=\"npm_...\"; npm run publish:npm\n");
      } else if (errMsg.includes("E403") || errMsg.includes("Scope not found")) {
        console.error("\n  ✗ Scope Error: The @aipages organization does not exist or you lack write access.\n");
        console.log("Solutions:");
        console.log("  1. Create the '@aipages' organization on https://www.npmjs.com/org/create");
        console.log("  2. Or publish unscoped as 'aipages-sdk' by renaming the package name in package.json.\n");
      } else {
        console.error("  ✗ Publish failed:", errMsg);
      }
      process.exit(1);
    }
  } finally {
    if (createdNpmrc && fs.existsSync(npmrcPath)) {
      fs.unlinkSync(npmrcPath);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
