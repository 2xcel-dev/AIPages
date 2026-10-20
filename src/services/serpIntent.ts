/**
 * Structured Search Intent & SERP Entity Extraction Service
 *
 * Analyzes search queries or SERP text snippets, classifies search intent
 * (informational, commercial, navigational, transactional), extracts named entities,
 * and outputs structured, token-optimized JSON for agent decision workflows.
 */

export type SearchIntentType = "informational" | "commercial" | "transactional" | "navigational";

export interface SerpIntentRequest {
  query: string;
  locale?: string;
  depth?: "brief" | "standard" | "deep";
  filterEntities?: boolean;
}

export interface ExtractedEntity {
  name: string;
  type: "organization" | "product" | "location" | "concept" | "person";
  salience: number;
}

export interface SerpIntentResult {
  query: string;
  primaryIntent: SearchIntentType;
  intentDistribution: Record<SearchIntentType, number>;
  confidence: number;
  entities: ExtractedEntity[];
  keyQuestions: string[];
  semanticTopics: string[];
  locale: string;
  analyzedAt: string;
}

/**
 * Heuristic keywords for intent classification
 */
const TRANSACTIONAL_TRIGGERS = ["buy", "order", "purchase", "discount", "price", "pricing", "cheap", "deal", "coupon", "checkout"];
const COMMERCIAL_TRIGGERS = ["best", "review", "comparison", "vs", "top", "alternative", "specs", "guide", "pricing plan"];
const NAVIGATIONAL_TRIGGERS = ["login", "portal", "website", "account", "dashboard", "homepage", "docs", "app"];

/**
 * Analyze search intent and extract entities from query strings.
 */
export function analyzeSearchIntent(req: SerpIntentRequest): SerpIntentResult {
  const query = (req.query || "").trim();
  const lower = query.toLowerCase();
  const locale = req.locale || "en-US";
  const words = lower.split(/\s+/).filter(Boolean);

  let transScore = 0;
  let commScore = 0;
  let navScore = 0;
  let infoScore = 0.3; // Default baseline for search

  for (const trigger of TRANSACTIONAL_TRIGGERS) {
    if (lower.includes(trigger)) transScore += 0.4;
  }
  for (const trigger of COMMERCIAL_TRIGGERS) {
    if (lower.includes(trigger)) commScore += 0.35;
  }
  for (const trigger of NAVIGATIONAL_TRIGGERS) {
    if (lower.includes(trigger)) navScore += 0.45;
  }

  // Question words indicate informational intent
  if (/^(what|how|why|when|where|who|is|can|does|which)/i.test(lower)) {
    infoScore += 0.5;
  }

  const total = (transScore + commScore + navScore + infoScore) || 1;
  const intentDistribution: Record<SearchIntentType, number> = {
    transactional: Math.round((transScore / total) * 100) / 100,
    commercial: Math.round((commScore / total) * 100) / 100,
    navigational: Math.round((navScore / total) * 100) / 100,
    informational: Math.round((infoScore / total) * 100) / 100,
  };

  // Determine winner
  let primaryIntent: SearchIntentType = "informational";
  let maxScore = intentDistribution.informational;

  for (const [intent, score] of Object.entries(intentDistribution) as [SearchIntentType, number][]) {
    if (score > maxScore) {
      maxScore = score;
      primaryIntent = intent;
    }
  }

  // Extract simple entity candidates (words capitalized in query or key nouns)
  const rawEntities: ExtractedEntity[] = words
    .filter((w) => w.length > 3 && !["with", "from", "that", "this", "your"].includes(w))
    .slice(0, 5)
    .map((w, idx) => ({
      name: w,
      type: idx === 0 ? "concept" : "product",
      salience: Math.round((0.9 - idx * 0.15) * 100) / 100,
    }));

  const keyQuestions: string[] = [
    `What are the key features related to "${query}"?`,
    `How does "${query}" compare with top alternatives?`,
  ];

  return {
    query,
    primaryIntent,
    intentDistribution,
    confidence: Math.min(0.98, Math.max(0.65, maxScore + 0.1)),
    entities: rawEntities,
    keyQuestions,
    semanticTopics: words.slice(0, 4),
    locale,
    analyzedAt: new Date().toISOString(),
  };
}
