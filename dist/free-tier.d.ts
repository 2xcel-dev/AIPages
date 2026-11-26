export interface FreeTierResult {
    allowed: boolean;
    remaining: number;
    total: number;
    current: number;
}
declare class FreeTierManager {
    private counts;
    constructor();
    private load;
    private persist;
    checkAndConsume(identifier: string): FreeTierResult;
    getUsage(identifier: string): {
        remaining: number;
        total: number;
        current: number;
    };
}
export declare const freeTierManager: FreeTierManager;
export {};
//# sourceMappingURL=free-tier.d.ts.map