/**
 * PyPI Automated Publishing Script for packages/aipages-py
 *
 * Verifies wheel and tarball integrity via Twine, then uploads to PyPI.
 * Token can be passed via PYPI_API_TOKEN environment variable or command-line argument.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DIST_DIR = path.resolve(process.cwd(), "packages/aipages-py/dist");

async function main() {
  console.log("[pypi-publish] Checking package distributions in:", DIST_DIR);

  if (!fs.existsSync(DIST_DIR)) {
    console.error("[pypi-publish] Error: dist directory not found. Run python -m build packages/aipages-py first.");
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_DIR).filter((f) => f.endsWith(".whl") || f.endsWith(".tar.gz"));
  if (files.length === 0) {
    console.error("[pypi-publish] Error: No wheel or tar.gz distributions found in dist/");
    process.exit(1);
  }

  console.log(`[pypi-publish] Found ${files.length} distributions:`, files);

  // 1. Run Twine Check
  console.log("[pypi-publish] Running twine check...");
  try {
    const checkOutput = execSync(`python -m twine check "${path.join(DIST_DIR, "*")}"`, {
      encoding: "utf8",
    });
    console.log(checkOutput.trim());
  } catch (err: any) {
    console.error("[pypi-publish] Twine check failed:", err.message);
    process.exit(1);
  }

  // 2. Read Token
  const token = process.env.PYPI_API_TOKEN || process.argv[2];
  if (!token) {
    console.log("\n=======================================================");
    console.log("Ready to publish packages/aipages-py (v0.1.0) to PyPI!");
    console.log("To upload, provide your PyPI API token via:");
    console.log("  $env:PYPI_API_TOKEN=\"pypi-...\"; npm run publish:pypi");
    console.log("Or run directly:");
    console.log("  python -m twine upload packages/aipages-py/dist/* -u __token__ -p <YOUR_PYPI_API_TOKEN>");
    console.log("=======================================================\n");
    return;
  }

  // 3. Upload via Twine
  console.log("[pypi-publish] Uploading to PyPI registry...");
  try {
    const uploadCmd = `python -m twine upload "${path.join(DIST_DIR, "*")}" -u __token__ -p "${token}" --non-interactive`;
    const uploadOutput = execSync(uploadCmd, { encoding: "utf8" });
    console.log(uploadOutput);
    console.log("[pypi-publish] Successfully published aipages to PyPI!");
  } catch (err: any) {
    console.error("[pypi-publish] Upload failed:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[pypi-publish] Fatal:", err);
  process.exit(1);
});
