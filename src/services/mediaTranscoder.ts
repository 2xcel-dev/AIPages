/**
 * AUS Media Transcoder Service
 * Ported faithfully from agent-utility-services (Engine: media-transcoder)
 * Hardened with maximum payload ceiling (OOM protection), safe base64 decoding,
 * and robust error handling.
 */
import crypto from "crypto";

export interface MediaTranscoderRequest {
  data_uri?: string;
  base64_data?: string;
  mime_type?: string;
  target_format?: string;
}

export interface MediaTranscoderResult {
  success: boolean;
  utility: "media-transcoder";
  request_id: string;
  media_analysis?: {
    mime_type: string;
    byte_size: number;
    kilobytes: number;
    content_sha256: string;
    is_valid_binary: boolean;
  };
  error?: string;
}

// 10 Megabytes binary (~14 Megabytes in base64 string)
const MAX_BASE64_CHARS = 14 * 1024 * 1024;

export function inspectMedia(req: MediaTranscoderRequest): MediaTranscoderResult {
  const { data_uri, base64_data, mime_type } = req;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let rawBase64 = base64_data || "";
  let detectedMime = mime_type || "application/octet-stream";

  if (data_uri && typeof data_uri === "string" && data_uri.startsWith("data:")) {
    const parts = data_uri.split(",");
    detectedMime = parts[0].split(":")[1]?.split(";")[0] || detectedMime;
    rawBase64 = parts[1] || "";
  }

  if (!rawBase64 || typeof rawBase64 !== "string") {
    return {
      success: false,
      utility: "media-transcoder",
      request_id: requestId,
      error: "Missing or invalid media payload. Provide 'base64_data' or 'data_uri'.",
    };
  }

  if (rawBase64.length > MAX_BASE64_CHARS) {
    return {
      success: false,
      utility: "media-transcoder",
      request_id: requestId,
      error: `Media payload exceeds maximum size limit of ${Math.round(MAX_BASE64_CHARS / 1024 / 1024)}MB.`,
    };
  }

  try {
    const buffer = Buffer.from(rawBase64, "base64");
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    return {
      success: true,
      utility: "media-transcoder",
      request_id: requestId,
      media_analysis: {
        mime_type: detectedMime,
        byte_size: buffer.length,
        kilobytes: Number((buffer.length / 1024).toFixed(2)),
        content_sha256: hash,
        is_valid_binary: buffer.length > 0,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      utility: "media-transcoder",
      request_id: requestId,
      error: `Media inspection error: ${message}`,
    };
  }
}
