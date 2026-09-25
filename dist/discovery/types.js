/**
 * Discovery Architecture Types: candidate sources, normalized candidate models,
 * and funnel yield metrics for the AIPages crawler.
 */
export function createInitialSourceYieldMap() {
    return {
        "official-registry": { discovered: 0, extracted: 0, ingested: 0, rejected: 0 },
        github: { discovered: 0, extracted: 0, ingested: 0, rejected: 0 },
        npm: { discovered: 0, extracted: 0, ingested: 0, rejected: 0 },
        pypi: { discovered: 0, extracted: 0, ingested: 0, rejected: 0 },
        "community-feed": { discovered: 0, extracted: 0, ingested: 0, rejected: 0 },
    };
}
//# sourceMappingURL=types.js.map