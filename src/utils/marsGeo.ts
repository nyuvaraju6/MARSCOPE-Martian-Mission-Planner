import type { Waypoint } from '../types/mars';

/**
 * IAU volumetric mean radius of Mars in kilometers.
 * Reference: Archinal et al., Celestial Mechanics and Dynamical Astronomy (2018).
 */
export const MARS_MEAN_RADIUS_KM = 3389.5;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Normalizes planetary longitude to [-180, 180] East.
 */
export function normalizeLongitude180(lng: number): number {
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 && lng > 0 ? 180 : wrapped;
}

/**
 * Formats latitude and East longitude in standard NASA/USGS planetary notation.
 */
export function formatMarsCoords(lat: number, lng: number, precision = 2): string {
  const clampedLat = Math.max(-90, Math.min(90, lat));
  const normLng = normalizeLongitude180(lng);
  const latHem = clampedLat >= 0 ? 'N' : 'S';
  const lngHem = normLng >= 0 ? 'E' : 'W';
  return `${Math.abs(clampedLat).toFixed(precision)}° ${latHem}, ${Math.abs(normLng).toFixed(
    precision
  )}° ${lngHem}`;
}

/**
 * Computes great-circle surface distance on Mars using the Haversine formula
 * with the IAU mean Martian radius (3,389.5 km).
 */
export function calculateMarsDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(normalizeLongitude180(lng2) - normalizeLongitude180(lng1));

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return MARS_MEAN_RADIUS_KM * c;
}

export interface RouteSegment {
  fromName: string;
  toName: string;
  distanceKm: number;
}

export function calculateRouteSegments(waypoints: Waypoint[]): RouteSegment[] {
  if (waypoints.length < 2) return [];
  const segments: RouteSegment[] = [];
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    segments.push({
      fromName: a.name,
      toName: b.name,
      distanceKm: calculateMarsDistanceKm(a.lat, a.lng, b.lat, b.lng),
    });
  }
  return segments;
}

export function calculateRouteDistanceKm(waypoints: Waypoint[]): number {
  return calculateRouteSegments(waypoints).reduce((sum, seg) => sum + seg.distanceKm, 0);
}

/**
 * Computes estimated exploration traverse duration in hours given an explicit
 * walking-speed assumption (km/h). Returns 0 if speed is not positive.
 */
export function calculateEstimatedDurationHours(
  distanceKm: number,
  walkingSpeedKmH: number
): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  if (!Number.isFinite(walkingSpeedKmH) || walkingSpeedKmH <= 0) return 0;
  return distanceKm / walkingSpeedKmH;
}

export interface MobilityAssessment {
  totalDistanceKm: number;
  waypointCount: number;
  segmentCount: number;
  maxSegmentKm: number;
  meanSegmentKm: number;
  estimatedHours: number;
  evaRangeClassification: 'SHORT RECONNAISSANCE' | 'EXTENDED SURFACE EVA' | 'ROVER-ASSISTED RANGE';
  safetyCertification: string;
  cautionNotes: string[];
}

/**
 * Evaluates deterministic route geometry and EVA range thresholds.
 * Explicitly refrains from certifying terrain slope safety without local high-res DEM verification.
 */
export function assessRouteMobility(
  waypoints: Waypoint[],
  walkingSpeedKmH: number
): MobilityAssessment {
  const segments = calculateRouteSegments(waypoints);
  const totalDistanceKm = segments.reduce((acc, s) => acc + s.distanceKm, 0);
  const maxSegmentKm = segments.reduce((max, s) => Math.max(max, s.distanceKm), 0);
  const meanSegmentKm = segments.length > 0 ? totalDistanceKm / segments.length : 0;
  const estimatedHours = calculateEstimatedDurationHours(totalDistanceKm, walkingSpeedKmH);

  let evaRangeClassification: MobilityAssessment['evaRangeClassification'] = 'SHORT RECONNAISSANCE';
  if (totalDistanceKm > 10) {
    evaRangeClassification = 'ROVER-ASSISTED RANGE';
  } else if (totalDistanceKm > 3) {
    evaRangeClassification = 'EXTENDED SURFACE EVA';
  }

  const cautionNotes: string[] = [
    'Route geometry uses spherical Martian great-circle distance (R = 3,389.5 km); actual surface path length increases with micro-topography.',
  ];

  if (maxSegmentKm > 2.5) {
    cautionNotes.push(
      `Longest leg (${maxSegmentKm.toFixed(2)} km) exceeds typical 2.5 km unassisted EVA contingency spacing; intermediate waypoints or pressurized rover support recommended.`
    );
  }
  if (estimatedHours > 6) {
    cautionNotes.push(
      `Estimated traverse duration (${estimatedHours.toFixed(1)} hrs at ${walkingSpeedKmH.toFixed(
        1
      )} km/h) approaches single-sol suited EVA life-support limits.`
    );
  }

  return {
    totalDistanceKm,
    waypointCount: waypoints.length,
    segmentCount: segments.length,
    maxSegmentKm,
    meanSegmentKm,
    estimatedHours,
    evaRangeClassification,
    safetyCertification:
      'NOT CERTIFIED FOR CREW TRAVERSE — High-resolution HiRISE DEM slope (<15° check) and boulder-density analysis required before field approval.',
    cautionNotes,
  };
}
