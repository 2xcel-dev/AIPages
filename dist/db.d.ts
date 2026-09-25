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
import type { Tool, ToolSchema, ConnectionType, HealthStatus, SearchResult } from "./types.js";
/**
 * Raw tool manifest from an external source (scraper / crawler / manual ingest).
 * Used as the input type for `ingestManifests()` and the crawler pipeline.
 */
export interface RawToolManifest {
    namespace: string;
    name: string;
    description: string;
    schema?: ToolSchema;
    connectionType?: ConnectionType;
    endpointUrl?: string;
}
export interface SearchHit {
    tool: Tool;
    score: number;
}
export interface HealthUpdate {
    healthStatus: HealthStatus;
    lastChecked: Date;
    lastCheckedAt?: Date;
    failureReason?: string | null;
}
export interface ToolListFilter {
    hasEndpoint?: boolean;
    status?: string;
    connectionType?: ConnectionType;
    healthStatus?: HealthStatus;
    pricingModel?: string;
    capability?: string;
    q?: string;
    limit?: number;
    offset?: number;
}
export interface ToolStore {
    /** Insert or upsert a tool by namespace (unique key). */
    upsert(tool: Tool): Promise<void>;
    /** Bulk upsert. */
    upsertMany(tools: Tool[]): Promise<number>;
    /** Get total document count (optionally filtered). */
    count(filter?: ToolListFilter): Promise<number>;
    /** Vector search: returns top-k tools matching the embedding. */
    search(queryEmbedding: number[], limit: number): Promise<SearchResult[]>;
    /** Get a single tool by namespace (full document). */
    getByNamespace(namespace: string): Promise<Tool | null>;
    /** List tools, optionally filtering by endpoint, status, connectionType, etc. */
    list(filter?: ToolListFilter): Promise<Tool[]>;
    /** Update health check status and diagnostic failure metadata. */
    updateHealth(namespace: string, update: HealthUpdate): Promise<void>;
    /** Acquire distributed lock by key with expiration lease (ms). */
    acquireLock(lockKey: string, owner: string, ttlMs: number): Promise<boolean>;
    /** Release distributed lock by key for the given owner. */
    releaseLock(lockKey: string, owner: string): Promise<boolean>;
    /** Health check - returns true if the store is reachable. */
    ping(): Promise<boolean>;
    /** Close connections. */
    close(): Promise<void>;
}
export declare class MongoToolStore implements ToolStore {
    private client;
    private collection;
    private locksCollection;
    constructor(uri: string);
    connect(): Promise<void>;
    upsert(tool: Tool): Promise<void>;
    getClient(): MongoClient;
    getByNamespace(namespace: string): Promise<Tool | null>;
    list(filter?: ToolListFilter): Promise<Tool[]>;
    updateHealth(namespace: string, update: HealthUpdate): Promise<void>;
    upsertMany(tools: Tool[]): Promise<number>;
    count(filter?: ToolListFilter): Promise<number>;
    search(queryEmbedding: number[], limit: number): Promise<SearchResult[]>;
    acquireLock(lockKey: string, owner: string, ttlMs: number): Promise<boolean>;
    releaseLock(lockKey: string, owner: string): Promise<boolean>;
    ping(): Promise<boolean>;
    close(): Promise<void>;
}
export declare class InMemoryToolStore implements ToolStore {
    private tools;
    private locks;
    upsert(tool: Tool): Promise<void>;
    upsertMany(tools: Tool[]): Promise<number>;
    count(filter?: ToolListFilter): Promise<number>;
    search(queryEmbedding: number[], limit: number): Promise<SearchResult[]>;
    getByNamespace(namespace: string): Promise<Tool | null>;
    list(filter?: ToolListFilter): Promise<Tool[]>;
    updateHealth(namespace: string, update: HealthUpdate): Promise<void>;
    acquireLock(lockKey: string, owner: string, ttlMs: number): Promise<boolean>;
    releaseLock(lockKey: string, owner: string): Promise<boolean>;
    ping(): Promise<boolean>;
    close(): Promise<void>;
}
export declare function createStore(): Promise<ToolStore>;
//# sourceMappingURL=db.d.ts.map