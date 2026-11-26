import fs from "node:fs";
import path from "node:path";
const FREE_TIER_LIMIT = 25;
const STORAGE_FILE = path.join(process.cwd(), ".data", "free_tier_usage.json");
class FreeTierManager {
    counts = new Map();
    constructor() {
        this.load();
    }
    load() {
        try {
            if (fs.existsSync(STORAGE_FILE)) {
                const raw = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf-8"));
                this.counts = new Map(Object.entries(raw));
            }
        }
        catch (e) {
            console.warn("[free-tier] Could not load usage file:", e);
        }
    }
    persist() {
        try {
            const dir = path.dirname(STORAGE_FILE);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(STORAGE_FILE, JSON.stringify(Object.fromEntries(this.counts), null, 2), "utf-8");
        }
        catch (e) {
            console.warn("[free-tier] Could not save usage file:", e);
        }
    }
    checkAndConsume(identifier) {
        const cleanId = (identifier || "anonymous_agent").toLowerCase().trim();
        const current = this.counts.get(cleanId) || 0;
        if (current < FREE_TIER_LIMIT) {
            const next = current + 1;
            this.counts.set(cleanId, next);
            this.persist();
            return {
                allowed: true,
                remaining: FREE_TIER_LIMIT - next,
                total: FREE_TIER_LIMIT,
                current: next,
            };
        }
        return {
            allowed: false,
            remaining: 0,
            total: FREE_TIER_LIMIT,
            current,
        };
    }
    getUsage(identifier) {
        const cleanId = (identifier || "anonymous_agent").toLowerCase().trim();
        const current = this.counts.get(cleanId) || 0;
        return {
            remaining: Math.max(0, FREE_TIER_LIMIT - current),
            total: FREE_TIER_LIMIT,
            current,
        };
    }
}
export const freeTierManager = new FreeTierManager();
//# sourceMappingURL=free-tier.js.map