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
 * Analyze search intent and extract entities from query strings.
 */
export declare function analyzeSearchIntent(req: SerpIntentRequest): SerpIntentResult;
//# sourceMappingURL=serpIntent.d.ts.map