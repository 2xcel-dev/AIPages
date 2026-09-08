/**
 * Seed the tool store with sample manifests for local development.
 *
 * Run:  npm run seed
 */
import "dotenv/config";
import { createStore } from "../src/db.js";
import { embed } from "../src/embedding.js";
import type { Tool } from "../src/types.js";

const SAMPLE_TOOLS: Omit<Tool, "embedding" | "updatedAt">[] = [
  {
    namespace: "net.2xcel.agent-utility",
    name: "web_scraper",
    description: "Extracts clean Markdown and structured text from target URLs. Supports JavaScript-rendered pages and returns semantic HTML content.",
    schema: { type: "object", properties: { url: { type: "string", description: "Target website URL" } }, required: ["url"] },
    connectionType: "sse",
    endpointUrl: "https://api.example.com/mcp",
    healthStatus: "active",
  },
  {
    namespace: "io.github.crewai.file-reader",
    name: "file_reader",
    description: "Reads files from the local filesystem. Supports text, PDF, and structured data extraction with encoding detection.",
    schema: { type: "object", properties: { path: { type: "string", description: "Absolute file path" } }, required: ["path"] },
    connectionType: "stdio",
    healthStatus: "active",
  },
  {
    namespace: "com.google.gemini-code-assist",
    name: "gemini_code_assist",
    description: "Gemini-powered code generation and assistance. Generates code with inline comments, suggests completions, and explains code snippets across multiple programming languages.",
    schema: { type: "object", properties: { prompt: { type: "string", description: "Code generation or assistance request" }, language: { type: "string", description: "Target programming language" } }, required: ["prompt"] },
    connectionType: "http",
    endpointUrl: "https://gemini.google.com/code-assist",
    healthStatus: "active",
  },
  {
    namespace: "net.huggingface.inference",
    name: "text_classifier",
    description: "Classifies text into predefined categories using transformer models. Supports zero-shot classification and sentiment analysis.",
    schema: { type: "object", properties: { text: { type: "string" }, model: { type: "string" } }, required: ["text"] },
    connectionType: "http",
    endpointUrl: "https://api-inference.huggingface.co",
    healthStatus: "active",
  },
  {
    namespace: "io.github.anthropic.mcp-filesystem",
    name: "filesystem",
    description: "Model Context Protocol server for filesystem operations: read, write, list, and search files on the local machine.",
    schema: { type: "object", properties: { operation: { type: "string", enum: ["read", "write", "list", "search"] } }, required: ["operation"] },
    connectionType: "stdio",
    healthStatus: "active",
  },
  {
    namespace: "com.stripe.payment-gateway",
    name: "payment_processor",
    description: "Processes payments via Stripe. Creates charges, manages subscriptions, and handles webhook events for billing automation.",
    schema: { type: "object", properties: { amount: { type: "number" }, currency: { type: "string" } }, required: ["amount", "currency"] },
    connectionType: "http",
    endpointUrl: "https://api.stripe.com/v1",
    healthStatus: "active",
  },
];

async function main() {
  console.log("Seeding tool store…");
  const store = await createStore();

  for (const raw of SAMPLE_TOOLS) {
    const text = `${raw.namespace} ${raw.name} ${raw.description}`;
    const embedding = await embed(text);
    const tool: Tool = { ...raw, embedding, updatedAt: new Date() };
    await store.upsert(tool);
    console.log(`  ✓ ${raw.namespace}`);
  }

  const count = await store.count();
  console.log(`\nSeeded ${count} tools.`);
  await store.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
