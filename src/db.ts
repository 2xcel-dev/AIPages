/**
 * Database abstraction — MongoDB Atlas Vector Search with an in-memory fallback.
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
import { MongoClient, type Collection, type Document } from "mongodb";
import { config } from "./config.js";
import { toSearchResult } from "./types.js";
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

export interface ToolStore {
  /** Insert or upsert a tool by namespace (unique key). */
  upsert(tool: Tool): Promise<void>;
  /** Bulk upsert. */
  upsertMany(tools: Tool[]): Promise<number>;
  /** Get total document count. */
  count(): Promise<number>;
  /** Vector search: returns top-k tools matching the embedding. */
  search(queryEmbedding: number[], limit: number): Promise<SearchResult[]>;
  /** Get a single tool by namespace (full document). */
  getByNamespace(namespace: string): Promise<Tool | null>;
  /** Health check — returns true if the store is reachable. */
  ping(): Promise<boolean>;
  /** Close connections. */
  close(): Promise<void>;
}

// ──────────────────── MongoDB Atlas Store ────────────────────

class MongoToolStore implements ToolStore {
  private client: MongoClient;
  private collection: Collection<Document>;

  constructor(uri: string) {
    this.client = new MongoClient(uri, {
      // Atlas recommended settings
      serverApi: { version: "1", strict: false, deprecationErrors: true },
    });
    // Default database from URI
    this.collection = this.client.db().collection("tools");
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.client.db().command({ ping: 1 });
  }

  async upsert(tool: Tool): Promise<void> {
    await this.collection.updateOne(
      { namespace: tool.namespace },
      { $set: tool },
      { upsert: true },
    );
  }

  getClient(): MongoClient {
    return this.client;
  }

  async getByNamespace(namespace: string): Promise<Tool | null> {
    return this.collection.findOne({ namespace }) as Promise<Tool | null>;
  }

  async upsertMany(tools: Tool[]): Promise<number> {
    let count = 0;
    for (const tool of tools) {
      await this.upsert(tool);
      count++;
    }
    return count;
  }

  async count(): Promise<number> {
    return this.collection.estimatedDocumentCount();
  }

  async search(queryEmbedding: number[], limit: number): Promise<SearchResult[]> {
    const indexName = process.env.VECTOR_INDEX_NAME ?? "vector_index";
    const pipeline: Document[] = [
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
    return docs.map((doc: any) => toSearchResult(doc, doc.score));
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.db().command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

// ──────────────────── In-Memory Store (dev fallback) ────────────────────

export class InMemoryToolStore implements ToolStore {
  private tools = new Map<string, Tool>();

  async upsert(tool: Tool): Promise<void> {
    this.tools.set(tool.namespace, tool);
  }

  async upsertMany(tools: Tool[]): Promise<number> {
    for (const tool of tools) {
      this.tools.set(tool.namespace, tool);
    }
    return tools.length;
  }

  async count(): Promise<number> {
    return this.tools.size;
  }

  async search(queryEmbedding: number[], limit: number): Promise<SearchResult[]> {
    const all: Array<{ tool: Tool; score: number }> = [];
    for (const tool of this.tools.values()) {
      if (!tool.embedding) continue;
      const score = cosineSimilarity(queryEmbedding, tool.embedding);
      all.push({ tool, score });
    }
    all.sort((a, b) => b.score - a.score);
    return all.slice(0, limit).map(({ tool, score }) => toSearchResult(tool, score));
  }

  async getByNamespace(namespace: string): Promise<Tool | null> {
    return this.tools.get(namespace) ?? null;
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    // no-op
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
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

export async function createStore(): Promise<ToolStore> {
  if (config.MONGODB_URI) {
    console.log("[db] Connecting to MongoDB Atlas…");
    const store = new MongoToolStore(config.MONGODB_URI);
    await store.connect();
    console.log("[db] Connected to MongoDB Atlas.");
    return store;
  }
  console.warn("[db] No MONGODB_URI — using in-memory store (dev mode).");
  const store = new InMemoryToolStore();
  return store;
}
