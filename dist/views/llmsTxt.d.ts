import type { Tool } from "../types.js";
/**
 * Generate standard llms.txt Markdown manifest for LLM crawlers,
 * autonomous agents, and IDE assistants (Claude, Perplexity, GPTBot, Cursor).
 *
 * Spec reference: https://llmstxt.org/
 */
export declare function generateLlmsTxt(tools: Tool[], baseUrl?: string): string;
//# sourceMappingURL=llmsTxt.d.ts.map