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

export function verifyGeospatial(req: GeospatialVerifierRequest): GeospatialVerifierResult {
  const { origin, destination, max_radius_km } = req;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.lat)) * Math.cos(toRad(destination.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Number((R * c).toFixed(3));
  const withinGeofence = max_radius_km !== undefined ? distanceKm <= max_radius_km : null;

  return {
    success: true,
    utility: "geospatial-verifier",
    request_id: requestId,
    calculation: {
      distance_km: distanceKm,
      distance_miles: Number((distanceKm * 0.621371).toFixed(3)),
      geofence_threshold_km: max_radius_km || null,
      within_geofence: withinGeofence,
    },
  };
}
