export function buildFilterUrl(baseUrl, params) {
    const query = new URLSearchParams();
    if (params.q && params.q.trim())
        query.set("q", params.q.trim());
    if (params.reliability && params.reliability !== "all")
        query.set("reliability", params.reliability);
    if (params.connectionType && params.connectionType !== "all")
        query.set("connectionType", params.connectionType);
    if (params.pricingModel && params.pricingModel !== "all")
        query.set("pricingModel", params.pricingModel);
    if (params.capability && params.capability !== "all")
        query.set("capability", params.capability);
    const qs = query.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
}
//# sourceMappingURL=filterBar.js.map