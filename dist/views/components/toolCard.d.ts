import { type Tool } from "../../types.js";
export declare const CORE_AUS_NAMES: Set<string>;
export declare function classifyToolGroup(tool: Tool): "core" | "mesh" | "framework";
/**
 * Render a high-contrast vector Solar Icon glyph for a tool group.
 */
export declare function renderCategoryGlyphSvg(group: "core" | "mesh" | "framework"): string;
/**
 * Derive a clean, human-understandable Use Case badge for each tool.
 */
export declare function deriveToolUseCase(tool: Tool): string;
/**
 * Render an individual tool card using the 21st.dev #5115 Pricing Card glass-header architecture
 * while preserving all reliability, freshness, and capability hooks required by the test suite.
 */
export declare function renderToolCard(tool: Tool, baseUrl?: string, activeCapability?: string, cardIndex?: number): string;
//# sourceMappingURL=toolCard.d.ts.map