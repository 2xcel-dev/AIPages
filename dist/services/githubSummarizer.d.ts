/**
 * GitHub Repo Health & Diff Analyzer Service
 *
 * Ingests repository URLs or PR diff patches, analyzes structural changes,
 * evaluates codebase health metrics, and generates executive-level change summaries.
 */
export interface GithubSummarizerRequest {
    repoUrl: string;
    diffOrPatch?: string;
    pullRequestNumber?: number;
    includeHealthMetrics?: boolean;
}
export interface FileChangeStat {
    filename: string;
    status: "added" | "modified" | "deleted" | "renamed";
    additions: number;
    deletions: number;
    isBreakingChangeRisk: boolean;
}
export interface CodebaseHealthOverview {
    maintenanceScore: number;
    testCoverageConfidence: "high" | "medium" | "low" | "none";
    activeContributors: number;
    hasLicense: boolean;
    hasCiConfig: boolean;
}
export interface GithubSummarizerResult {
    repo: string;
    executiveSummary: string;
    totalFilesChanged: number;
    additions: number;
    deletions: number;
    keyHighlights: string[];
    fileBreakdown: FileChangeStat[];
    codebaseHealth?: CodebaseHealthOverview;
    analyzedAt: string;
}
/**
 * Analyze GitHub diff, patch, or repository health state.
 */
export declare function analyzeGithubRepo(req: GithubSummarizerRequest): GithubSummarizerResult;
//# sourceMappingURL=githubSummarizer.d.ts.map