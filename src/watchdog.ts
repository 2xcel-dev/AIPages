/**
 * Uptime Watchdog — pings every active tool endpoint every 30 min.
 * Persistent 502/offline → MongoDB status: active → degraded → inactive.
 */
import { MongoClient, Db } from "mongodb";
import { config } from "./config.js";

export async function runWatchdog() {
  const uri = config.MONGODB_URI ?? "mongodb://localhost:27017/aipages";
  const client = new MongoClient(uri);
  await client.connect();
  const db: Db = client.db();
  const tools = db.collection("tools");
  const active = await tools.find({ status: "active" }).toArray();
  for (const t of active) {
    try {
      const r = await fetch(t.manifestUrl || t.endpoint || "", { signal: AbortSignal.timeout(8000) });
      if (r.status >= 502) await tools.updateOne({ _id: t._id }, { $set: { status: "degraded", lastWatch: new Date() } });
    } catch {
      await tools.updateOne({ _id: t._id }, { $set: { status: "inactive", lastWatch: new Date() } });
    }
  }
  await client.close();
  console.log(`[watchdog] checked ${active.length} active tools`);
}
