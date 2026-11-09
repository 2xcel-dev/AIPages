/**
 * AUS Geospatial Verifier Service
 * Ported faithfully from agent-utility-services (Engine: geospatial-verifier)
 * Hardened with coordinate boundary verification, null/type checking,
 * and robust Haversine distance bounds.
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
  calculation?: {
    distance_km: number;
    distance_miles: number;
    geofence_threshold_km: number | null;
    within_geofence: boolean | null;
  };
  error?: string;
}

function isValidCoordinate(coord: unknown): coord is GeoCoordinate {
  if (!coord || typeof coord !== "object") return false;
  const c = coord as Record<string, unknown>;
  const lat = Number(c.lat);
  const lng = Number(c.lng);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function verifyGeospatial(req: GeospatialVerifierRequest): GeospatialVerifierResult {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (!isValidCoordinate(req?.origin)) {
    return {
      success: false,
      utility: "geospatial-verifier",
      request_id: requestId,
      error: "Invalid or missing 'origin' coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.",
    };
  }

  if (!isValidCoordinate(req?.destination)) {
    return {
      success: false,
      utility: "geospatial-verifier",
      request_id: requestId,
      error: "Invalid or missing 'destination' coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.",
    };
  }

  const { origin, destination, max_radius_km } = req;

  if (max_radius_km !== undefined && (!Number.isFinite(max_radius_km) || max_radius_km < 0)) {
    return {
      success: false,
      utility: "geospatial-verifier",
      request_id: requestId,
      error: "Invalid 'max_radius_km'. Must be a non-negative finite number.",
    };
  }

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
