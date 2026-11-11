/**
 * SVG Badge Generator for GitHub README verification shields.
 * Produces crisp, accessible, shields.io-compatible SVGs for tool authors.
 *
 * Usage:
 *   [![AIPages Verified](https://aipages.tech/badge/:slug.svg)](https://aipages.tech/tools/:slug)
 */
import type { Tool } from "../types.js";
export interface BadgeOptions {
    label?: string;
    status?: string;
    color?: string;
    isAus?: boolean;
}
/**
 * Generate standard SVG markup for verification badge
 */
export declare function generateBadgeSvg(toolOrSlug: Tool | string | null, options?: BadgeOptions): string;
//# sourceMappingURL=badge.d.ts.map