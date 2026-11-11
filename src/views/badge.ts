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
 * Approximate text width calculation for SVG layout
 */
function getTextWidth(text: string, fontSize: number = 11): number {
  // Approximate standard sans-serif character width at 11px
  return Math.round(text.length * (fontSize * 0.62) + 10);
}

/**
 * Generate standard SVG markup for verification badge
 */
export function generateBadgeSvg(toolOrSlug: Tool | string | null, options?: BadgeOptions): string {
  let label = options?.label || "AIPages";
  let status = options?.status;
  let color = options?.color;

  if (typeof toolOrSlug === "object" && toolOrSlug !== null) {
    const tool = toolOrSlug;
    if (!status) {
      if (tool.pricing?.model === "free") {
        status = "Verified Free";
        color = color || "#06b6d4"; // cyan
      } else if (tool.isFirstParty || tool.namespace.startsWith("net.2xcel.aus.")) {
        status = "Verified x402";
        color = color || "#10b981"; // emerald
      } else {
        status = "Verified Tool";
        color = color || "#3b82f6"; // blue
      }
    }
  } else if (typeof toolOrSlug === "string") {
    if (!status) {
      if (toolOrSlug.includes("aus.") || toolOrSlug.includes("stealth") || toolOrSlug.includes("sanitizer")) {
        status = "Verified x402";
        color = color || "#10b981";
      } else {
        status = "Verified Tool";
        color = color || "#3b82f6";
      }
    }
  }

  if (!status) status = "Verified";
  if (!color) color = "#10b981";

  const labelWidth = getTextWidth(label);
  const statusWidth = getTextWidth(status);
  const totalWidth = labelWidth + statusWidth;

  const labelCenter = Math.round(labelWidth / 2);
  const statusCenter = labelWidth + Math.round(statusWidth / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" viewBox="0 0 ${totalWidth} 20" role="img" aria-label="${label}: ${status}">
  <title>${label}: ${status}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#0f172a"/>
    <rect x="${labelWidth}" width="${statusWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelCenter * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelWidth - 10) * 10}">${label}</text>
    <text x="${labelCenter * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(labelWidth - 10) * 10}">${label}</text>
    <text aria-hidden="true" x="${statusCenter * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(statusWidth - 10) * 10}">${status}</text>
    <text x="${statusCenter * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(statusWidth - 10) * 10}">${status}</text>
  </g>
</svg>`;
}
