export interface EgressDecision {
    ok: boolean;
    reason?: string;
    /** The validated, pinned connection target (present when ok). */
    target?: PinnedTarget;
}
/**
 * A validated downstream connection: the original hostname (for TLS SNI +
 * Host + cert verification) plus the pinned IP address the socket will
 * actually connect to — closing the DNS-rebinding TOCTOU window.
 */
export interface PinnedTarget {
    protocol: "http:" | "https:";
    hostname: string;
    port: number;
    /** Path + query to request on the target. */
    path: string;
    /** The validated IP to pin the connection to. */
    address: string;
}
/**
 * Validate a downstream target URL before any request leaves the proxy.
 *
 * @param rawUrl  Full URL to proxy (tool endpointUrl + subpath + query).
 * @param opts    Additional context for error messages.
 */
export declare function guardTargetUrl(rawUrl: string, opts?: {
    namespace?: string;
}): Promise<EgressDecision>;
/**
 * Connect to a pinned target using the validated IP (via a `lookup` override)
 * while preserving the original hostname for TLS SNI and Host headers.
 *
 * This eliminates the TOCTOU DNS-rebinding window: the socket never re-resolves
 * the hostname — it dials the pre-validated IP directly.
 */
export declare function pinnedRequest(target: PinnedTarget, opts: {
    method: string;
    headers: Record<string, string>;
    body?: Uint8Array;
    maxResponseBytes: number;
}): Promise<Response>;
export interface SizeLimits {
    maxRequestBytes: number;
    maxResponseBytes: number;
}
export declare function sizeLimits(): SizeLimits;
/**
 * Read a response body with a hard byte cap, returning the truncated-safe
 * bytes (or throwing an over-limit error). Callers pass the `res.body` stream.
 */
export declare function readBodyWithLimit(stream: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<Uint8Array>;
export declare class ResponseLimitError extends Error {
}
//# sourceMappingURL=egress-guard.d.ts.map