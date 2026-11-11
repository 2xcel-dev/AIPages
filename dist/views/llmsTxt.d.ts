import type { Tool } from "../types.js";
/**
 * Generate standard llms.txt Markdown manifest for LLM crawlers,
 * autonomous agents, and IDE assistants (Claude, Perplexity, GPTBot, Cursor).
 *
 * Spec reference: https://llmstxt.org/
 */
export declare function generateLlmsTxt(tools: Tool[], baseUrl?: string): string;
/**
 * Generate comprehensive llms-full.txt Markdown reference containing complete
 * JSON Schemas, x402 Base Mainnet payment specifications, and invocation examples
 * for one-shot LLM and IDE coding assistant ingestion.
 */
export declare function generateLlmsFullTxt(tools: Tool[], baseUrl?: string): string;
/**
 * Generate a token-budgeted (~800 token) clean Markdown sheet for a single tool.
 * Served when agents request /tool/:slug.md, ?format=md, or Accept: text/markdown.
 */
export declare function generateToolMarkdown(tool: Tool, relatedTools?: Tool[], baseUrl?: string): string;
//# sourceMappingURL=llmsTxt.d.ts.map