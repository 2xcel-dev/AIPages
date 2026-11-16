/**
 * Real-Time SEO & Search Engine Notifier
 * Dispatches real-time IndexNow delta notifications whenever tools are registered or updated.
 */

const INDEXNOW_URL = "https://api.indexnow.org/indexnow";
const DEFAULT_KEY = "e57cb8c73c4000ea04ba0eb607228cba";

export async function notifyIndexNow(urls: string[]): Promise<boolean> {
  if (!urls || urls.length === 0) return false;

  const hexKey = process.env.INDEXNOW_KEY || DEFAULT_KEY;
  const payload = {
    host: "aipages.tech",
    key: hexKey,
    keyLocation: `https://aipages.tech/${hexKey}.txt`,
    urlList: urls,
  };

  try {
    const res = await fetch(INDEXNOW_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "AIPages-RealTimeDelta/1.0",
      },
      body: JSON.stringify(payload),
    });

    return res.status === 200 || res.status === 202;
  } catch (err: any) {
    console.warn(`[seo-notifier] Real-time IndexNow ping warning: ${err.message}`);
    return false;
  }
}
