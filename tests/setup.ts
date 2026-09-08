/**
 * Global test setup — loads environment variables from .env (if present)
 * before any test modules are imported. This is critical because src/config.ts
 * reads env vars at module-load time.
 *
 * Usage: npx tsx --import ./tests/setup.ts --test tests/*.test.ts
 */
import { config } from "dotenv";
config();

export {};
