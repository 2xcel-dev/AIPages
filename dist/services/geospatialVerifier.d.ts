/**
 * AUS Geospatial Verifier Service
 * Ported faithfully from agent-utility-services (Engine: geospatial-verifier)
 *
 * Haversine coordinate distance computation, geofencing boundary verification,
 * and proximity validation.
 */
export interface GeoCoordinate {
    lat: number;
    lng: number;
}
export interface GeospatialVerifierRequest {
    origin: GeoCoordinate;
    destination: GeoCoordinate;
    max_radius_km?: number;
}
export interface GeospatialVerifierResult {
    success: boolean;
    utility: "geospatial-verifier";
    request_id: string;
    calculation: {
        distance_km: number;
        distance_miles: number;
        geofence_threshold_km: number | null;
        within_geofence: boolean | null;
    };
}
export declare function verifyGeospatial(req: GeospatialVerifierRequest): GeospatialVerifierResult;
//# sourceMappingURL=geospatialVerifier.d.ts.map