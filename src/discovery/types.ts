/**
 * Discovery Architecture Types: candidate sources, normalized candidate models,
 * and funnel yield metrics for the AIPages crawler.
 */

export type CandidateSource =
  | "official-registry"
  | "github"
  | "npm"
  | "pypi"
  | "community-feed";

/**
 * Normalized tool candidate discovered from any external registry or index.
 */
export interface Candidate {
  source: CandidateSource;
  /** Primary identifier URL: repository URL, package URL, or endpoint URL. */
  repoOrPackageUrl: string;
  /** GitHub owner/repo identifier if backed by a GitHub repository. */
  repo?: string;
  /** Matched file or manifest path within repo if known (e.g. "mcp.json"). */
  path?: string;
  /** Direct manifest, mcpServers config, or metadata hint when provided by feed. */
  manifestHint?: any;
}

/**
 * Funnel yield metrics per discovery source.
 */
export interface SourceYieldMetrics {
  discovered: number;
  extracted: number;
  ingested: number;
  rejected: number;
}

export function createInitialSourceYieldMap(): Record<CandidateSource, SourceYieldMetrics> {
  return {
    "official-registry": { discovered: 0, extracted: 0, ingested: 0, rejected: 0 },
    github: { discovered: 0, extracted: 0, ingested: 0, rejected: 0 },
    npm: { discovered: 0, extracted: 0, ingested: 0, rejected: 0 },
    pypi: { discovered: 0, extracted: 0, ingested: 0, rejected: 0 },
    "community-feed": { discovered: 0, extracted: 0, ingested: 0, rejected: 0 },
  };
}
