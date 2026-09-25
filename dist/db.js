/**
 * Database abstraction: MongoDB Atlas Vector Search with an in-memory fallback.
 *
 * If MONGODB_URI is set, connects to Atlas and runs `$vectorSearch` aggregations.
 * If not, uses an in-memory array with cosine similarity (dev / test mode).
 *
 * The Atlas Vector Search index definition for the `tools` collection:
 *
 *   {
 *     "fields": [{
 *       "type": "vector",
 *       "path": "embedding",
 *       "numDimensions": 3072,
 *       "similarity": "cosine"
 *     }]
 *   }
 *
 * Name this index `vector_index` in the Atlas UI (or set VECTOR_INDEX_NAME env var).
 */
import { MongoClient } from "mongodb";
import { config } from "./config.js";
import { toSearchResult } from "./types.js";
// ──────────────────── MongoDB Atlas Store ────────────────────
export class MongoToolStore {
    client;
    collection;
    locksCollection;
    constructor(uri) {
        this.client = new MongoClient(uri, {
            // Atlas recommended settings
            serverApi: { version: "1", strict: false, deprecationErrors: true },
        });
        // Default database from URI
        this.collection = this.client.db().collection("tools");
        this.locksCollection = this.client.db().collection("distributed_locks");
    }
    async connect() {
        await this.client.connect();
        await this.client.db().command({ ping: 1 });
        // Strict index enforcement: throw error if unique index creation fails
        await this.collection.createIndex({ namespace: 1 }, { unique: true });
        await this.locksCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    }
    async upsert(tool) {
        const { _id, ...fieldsToUpdate } = tool;
        const cleanFields = {};
        for (const [key, value] of Object.entries(fieldsToUpdate)) {
            if (value !== undefined) {
                cleanFields[key] = value;
            }
        }
        cleanFields.updatedAt = cleanFields.updatedAt ?? new Date();
        await this.collection.updateOne({ namespace: tool.namespace }, {
            $set: cleanFields,
            $setOnInsert: {
                createdAt: new Date(),
            },
        }, { upsert: true });
    }
    getClient() {
        return this.client;
    }
    async getByNamespace(namespace) {
        return this.collection.findOne({ namespace });
    }
    async list(filter) {
        const query = {};
        if (filter?.hasEndpoint) {
            query.endpointUrl = { $exists: true, $nin: [null, ""] };
        }
        if (filter?.status) {
            query.status = filter.status;
        }
        if (filter?.connectionType) {
            query.connectionType = filter.connectionType;
        }
        if (filter?.healthStatus) {
            query.healthStatus = filter.healthStatus;
        }
        if (filter?.pricingModel) {
            query["pricing.model"] = filter.pricingModel;
        }
        if (filter?.capability && filter.capability.trim() && filter.capability !== "all") {
            const capRegex = { $regex: filter.capability.trim(), $options: "i" };
            query.$or = [
                { capabilities: capRegex },
                { name: capRegex },
                { namespace: capRegex },
                { description: capRegex },
            ];
        }
        if (filter?.q && filter.q.trim()) {
            const regex = { $regex: filter.q.trim(), $options: "i" };
            if (query.$or) {
                query.$and = [
                    { $or: query.$or },
                    { $or: [
                            { name: regex },
                            { namespace: regex },
                            { description: regex },
                            { capabilities: regex },
                        ] },
                ];
                delete query.$or;
            }
            else {
                query.$or = [
                    { name: regex },
                    { namespace: regex },
                    { description: regex },
                    { capabilities: regex },
                ];
            }
        }
        let cursor = this.collection.find(query);
        if (filter?.offset && filter.offset > 0) {
            cursor = cursor.skip(filter.offset);
        }
        if (filter?.limit && filter.limit > 0) {
            cursor = cursor.limit(filter.limit);
        }
        const docs = await cursor.toArray();
        return docs;
    }
    async updateHealth(namespace, update) {
        const lastChecked = update.lastChecked ?? new Date();
        await this.collection.updateOne({ namespace }, {
            $set: {
                healthStatus: update.healthStatus,
                lastChecked,
                lastCheckedAt: update.lastCheckedAt ?? lastChecked,
                failureReason: update.failureReason ?? null,
                updatedAt: new Date(),
            },
        });
    }
    async upsertMany(tools) {
        let count = 0;
        for (const tool of tools) {
            await this.upsert(tool);
            count++;
        }
        return count;
    }
    async count(filter) {
        if (!filter || Object.keys(filter).length === 0) {
            return this.collection.estimatedDocumentCount();
        }
        const query = {};
        if (filter?.hasEndpoint) {
            query.endpointUrl = { $exists: true, $nin: [null, ""] };
        }
        if (filter?.status)
            query.status = filter.status;
        if (filter?.connectionType)
            query.connectionType = filter.connectionType;
        if (filter?.healthStatus)
            query.healthStatus = filter.healthStatus;
        if (filter?.pricingModel)
            query["pricing.model"] = filter.pricingModel;
        if (filter?.capability && filter.capability.trim() && filter.capability !== "all") {
            const capRegex = { $regex: filter.capability.trim(), $options: "i" };
            query.$or = [
                { capabilities: capRegex },
                { name: capRegex },
                { namespace: capRegex },
                { description: capRegex },
            ];
        }
        if (filter?.q && filter.q.trim()) {
            const regex = { $regex: filter.q.trim(), $options: "i" };
            if (query.$or) {
                query.$and = [
                    { $or: query.$or },
                    { $or: [
                            { name: regex },
                            { namespace: regex },
                            { description: regex },
                            { capabilities: regex },
                        ] },
                ];
                delete query.$or;
            }
            else {
                query.$or = [
                    { name: regex },
                    { namespace: regex },
                    { description: regex },
                    { capabilities: regex },
                ];
            }
        }
        return this.collection.countDocuments(query);
    }
    async search(queryEmbedding, limit) {
        const indexName = process.env.VECTOR_INDEX_NAME ?? "vector_index";
        const pipeline = [
            {
                $vectorSearch: {
                    index: indexName,
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: Math.min(limit * 10, 200),
                    limit,
                },
            },
            {
                $project: {
                    namespace: 1,
                    name: 1,
                    description: 1,
                    schema: 1,
                    connectionType: 1,
                    endpointUrl: 1,
                    healthStatus: 1,
                    updatedAt: 1,
                    score: { $meta: "vectorSearchScore" },
                },
            },
        ];
        const docs = await this.collection.aggregate(pipeline).toArray();
        return docs.map((doc) => toSearchResult(doc, doc.score));
    }
    async acquireLock(lockKey, owner, ttlMs) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttlMs);
        try {
            const result = await this.locksCollection.findOneAndUpdate({
                _id: lockKey,
                $or: [
                    { expiresAt: { $lte: now } },
                    { owner: owner },
                ],
            }, {
                $set: {
                    owner,
                    acquiredAt: now,
                    expiresAt,
                },
            }, {
                upsert: true,
                returnDocument: "after",
            });
            return result !== null;
        }
        catch (err) {
            if (err?.code === 11000) {
                // Lock document exists and is actively held by another runner
                return false;
            }
            throw err;
        }
    }
    async releaseLock(lockKey, owner) {
        const result = await this.locksCollection.deleteOne({
            _id: lockKey,
            owner,
        });
        return result.deletedCount > 0;
    }
    async ping() {
        try {
            await this.client.db().command({ ping: 1 });
            return true;
        }
        catch {
            return false;
        }
    }
    async close() {
        await this.client.close();
    }
}
// ──────────────────── In-Memory Store (dev fallback) ────────────────────
export class InMemoryToolStore {
    tools = new Map();
    locks = new Map();
    async upsert(tool) {
        const existing = this.tools.get(tool.namespace);
        const { _id, ...fieldsToUpdate } = tool;
        const cleanFields = {};
        for (const [key, value] of Object.entries(fieldsToUpdate)) {
            if (value !== undefined) {
                cleanFields[key] = value;
            }
        }
        cleanFields.updatedAt = cleanFields.updatedAt ?? new Date();
        if (existing) {
            this.tools.set(tool.namespace, {
                ...existing,
                ...cleanFields,
            });
        }
        else {
            this.tools.set(tool.namespace, {
                ...tool,
                ...cleanFields,
                createdAt: new Date(),
            });
        }
    }
    async upsertMany(tools) {
        for (const tool of tools) {
            this.tools.set(tool.namespace, tool);
        }
        return tools.length;
    }
    async count(filter) {
        if (!filter || Object.keys(filter).length === 0) {
            return this.tools.size;
        }
        const all = await this.list({ ...filter, limit: undefined, offset: undefined });
        return all.length;
    }
    async search(queryEmbedding, limit) {
        const all = [];
        for (const tool of this.tools.values()) {
            if (!tool.embedding)
                continue;
            const score = cosineSimilarity(queryEmbedding, tool.embedding);
            all.push({ tool, score });
        }
        all.sort((a, b) => b.score - a.score);
        return all.slice(0, limit).map(({ tool, score }) => toSearchResult(tool, score));
    }
    async getByNamespace(namespace) {
        return this.tools.get(namespace) ?? null;
    }
    async list(filter) {
        let result = Array.from(this.tools.values());
        if (filter?.hasEndpoint) {
            result = result.filter((t) => typeof t.endpointUrl === "string" && t.endpointUrl.trim().length > 0);
        }
        if (filter?.status) {
            result = result.filter((t) => t.status === filter.status);
        }
        if (filter?.connectionType) {
            result = result.filter((t) => t.connectionType === filter.connectionType);
        }
        if (filter?.healthStatus) {
            result = result.filter((t) => t.healthStatus === filter.healthStatus);
        }
        if (filter?.pricingModel) {
            result = result.filter((t) => t.pricing?.model === filter.pricingModel);
        }
        if (filter?.capability && filter.capability.trim() && filter.capability !== "all") {
            const cLower = filter.capability.trim().toLowerCase();
            result = result.filter((t) => {
                if (t.capabilities && Array.isArray(t.capabilities) && t.capabilities.some((c) => c.toLowerCase() === cLower || c.toLowerCase().includes(cLower)))
                    return true;
                if (t.name.toLowerCase().includes(cLower))
                    return true;
                if (t.namespace.toLowerCase().includes(cLower))
                    return true;
                if (t.description?.toLowerCase().includes(cLower))
                    return true;
                if (t.schema?.properties) {
                    for (const [propName, propDef] of Object.entries(t.schema.properties)) {
                        if (propName.toLowerCase().includes(cLower))
                            return true;
                        if (typeof propDef === "object" &&
                            propDef !== null &&
                            propDef.description?.toLowerCase().includes(cLower)) {
                            return true;
                        }
                    }
                }
                return false;
            });
        }
        if (filter?.q && filter.q.trim()) {
            const cLower = filter.q.trim().toLowerCase();
            result = result.filter((t) => {
                if (t.name.toLowerCase().includes(cLower))
                    return true;
                if (t.namespace.toLowerCase().includes(cLower))
                    return true;
                if (t.description?.toLowerCase().includes(cLower))
                    return true;
                if (t.capabilities && Array.isArray(t.capabilities) && t.capabilities.some((c) => c.toLowerCase().includes(cLower)))
                    return true;
                if (t.schema?.properties) {
                    for (const [propName, propDef] of Object.entries(t.schema.properties)) {
                        if (propName.toLowerCase().includes(cLower))
                            return true;
                        if (typeof propDef === "object" &&
                            propDef !== null &&
                            propDef.description?.toLowerCase().includes(cLower)) {
                            return true;
                        }
                    }
                }
                return false;
            });
        }
        const offset = filter?.offset ?? 0;
        if (offset > 0) {
            result = result.slice(offset);
        }
        if (filter?.limit && filter.limit > 0) {
            result = result.slice(0, filter.limit);
        }
        return result;
    }
    async updateHealth(namespace, update) {
        const existing = this.tools.get(namespace);
        if (existing) {
            const lastChecked = update.lastChecked ?? new Date();
            existing.healthStatus = update.healthStatus;
            existing.lastChecked = lastChecked;
            existing.lastCheckedAt = update.lastCheckedAt ?? lastChecked;
            existing.failureReason = update.failureReason ?? null;
            existing.updatedAt = new Date();
        }
    }
    async acquireLock(lockKey, owner, ttlMs) {
        const now = new Date();
        const existing = this.locks.get(lockKey);
        if (!existing || existing.expiresAt <= now || existing.owner === owner) {
            this.locks.set(lockKey, {
                owner,
                expiresAt: new Date(now.getTime() + ttlMs),
            });
            return true;
        }
        return false;
    }
    async releaseLock(lockKey, owner) {
        const existing = this.locks.get(lockKey);
        if (existing && existing.owner === owner) {
            this.locks.delete(lockKey);
            return true;
        }
        return false;
    }
    async ping() {
        return true;
    }
    async close() {
        // no-op
    }
}
function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}
// ──────────────────── Factory ────────────────────
export async function createStore() {
    if (config.MONGODB_URI) {
        console.log("[db] Connecting to MongoDB Atlas…");
        const store = new MongoToolStore(config.MONGODB_URI);
        await store.connect();
        console.log("[db] Connected to MongoDB Atlas.");
        return store;
    }
    console.warn("[db] No MONGODB_URI - using in-memory store (dev mode).");
    const store = new InMemoryToolStore();
    return store;
}
//# sourceMappingURL=db.js.map