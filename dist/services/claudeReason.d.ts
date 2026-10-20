/**
 * AUS Claude Reason Service
 * Ported faithfully from agent-utility-services (Engine: claude-reason)
 *
 * Deep analytical reasoning, chain-of-thought verification, and multi-step inference.
 */
export interface ClaudeReasonRequest {
    prompt: string;
    system_instruction?: string;
    max_tokens?: number;
}
export interface ClaudeReasonResult {
    success: boolean;
    utility: "claude-reason";
    request_id: string;
    result: string;
    usage?: {
        input_tokens?: number;
        output_tokens?: number;
    };
}
export declare function executeClaudeReason(req: ClaudeReasonRequest): Promise<ClaudeReasonResult>;
//# sourceMappingURL=claudeReason.d.ts.map