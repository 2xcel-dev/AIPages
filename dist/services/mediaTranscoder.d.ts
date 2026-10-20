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
    media_analysis: {
        mime_type: string;
        byte_size: number;
        kilobytes: number;
        content_sha256: string;
        is_valid_binary: boolean;
    };
}
export declare function inspectMedia(req: MediaTranscoderRequest): MediaTranscoderResult;
//# sourceMappingURL=mediaTranscoder.d.ts.map