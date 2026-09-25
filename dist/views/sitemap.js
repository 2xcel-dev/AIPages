export function escapeXml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
function formatDate(date) {
    if (!date)
        return null;
    try {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime()))
            return null;
        return d.toISOString();
    }
    catch {
        return null;
    }
}
/**
 * Generate an XML sitemap for public tool and directory pages.
 * Includes homepage, tools directory, and all indexed tool detail pages with lastmod timestamps.
 */
export function generateSitemapXml(tools, baseUrl = "https://aipages.tech") {
    const normalizedBase = baseUrl.replace(/\/+$/, "");
    const nowIso = new Date().toISOString();
    // Derive latest tool update timestamp for top-level directory lastmod
    let latestToolDate = null;
    for (const tool of tools) {
        const d = tool.updatedAt
            ? new Date(tool.updatedAt)
            : tool.lastChecked
                ? new Date(tool.lastChecked)
                : null;
        if (d && !isNaN(d.getTime())) {
            if (!latestToolDate || d.getTime() > latestToolDate.getTime()) {
                latestToolDate = d;
            }
        }
    }
    const directoryLastmod = latestToolDate ? latestToolDate.toISOString() : nowIso;
    const entries = [
        {
            loc: `${normalizedBase}/`,
            lastmod: directoryLastmod,
            changefreq: "daily",
            priority: 1.0,
        },
        {
            loc: `${normalizedBase}/tool`,
            lastmod: directoryLastmod,
            changefreq: "daily",
            priority: 0.9,
        },
        {
            loc: `${normalizedBase}/tools`,
            lastmod: directoryLastmod,
            changefreq: "daily",
            priority: 0.9,
        },
        {
            loc: `${normalizedBase}/capabilities`,
            lastmod: directoryLastmod,
            changefreq: "daily",
            priority: 0.9,
        },
    ];
    // Add all public, indexed tools
    for (const tool of tools) {
        if (tool.status === "rejected" || tool.status === "pending") {
            continue;
        }
        const toolDate = formatDate(tool.updatedAt) || formatDate(tool.lastChecked) || directoryLastmod;
        const toolSlug = encodeURIComponent(tool.namespace);
        entries.push({
            loc: `${normalizedBase}/tool/${toolSlug}`,
            lastmod: toolDate,
            changefreq: "weekly",
            priority: 0.8,
        });
    }
    const xmlEntries = entries
        .map((e) => {
        const parts = [`    <loc>${escapeXml(e.loc)}</loc>`];
        if (e.lastmod) {
            parts.push(`    <lastmod>${escapeXml(e.lastmod)}</lastmod>`);
        }
        if (e.changefreq) {
            parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
        }
        if (e.priority !== undefined) {
            parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
        }
        return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
        .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;
}
//# sourceMappingURL=sitemap.js.map