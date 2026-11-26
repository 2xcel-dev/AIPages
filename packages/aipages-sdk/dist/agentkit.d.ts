/**
 * Coinbase AgentKit Action Provider for AIPages
 *
 * Enables any autonomous agent built on Coinbase AgentKit / CDP to dynamically
 * discover, inspect, and invoke micro-utilities with native Base USDC settlement.
 */
import type { AIPagesClientOptions } from "./types.js";
export interface AgentKitAction {
    name: string;
    description: string;
    schema: Record<string, unknown>;
    invoke: (args: Record<string, unknown>) => Promise<string>;
}
export declare function createAIPagesActionProvider(options?: AIPagesClientOptions): {
    name: string;
    actions: AgentKitAction[];
};
//# sourceMappingURL=agentkit.d.ts.map