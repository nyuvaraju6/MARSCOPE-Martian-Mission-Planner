import type {
  MorphologyLabel,
  NearbyDuneField,
  NearbyMarsFeature,
  RouteRiskAssessment,
  RouteRiskCategory,
  RouteTerrainAnalysisResponse,
  SlopeCategory,
  SteepSectionSummary,
  TerrainProfileMetrics,
  TerrainProfileSample,
  Waypoint,
} from '../types/mars';
import {
  MARS_MEAN_RADIUS_KM,
  calculateEstimatedDurationHours,
  calculateMarsDistanceKm,
  calculateRouteSegments,
} from './marsGeo';

export const STEEP_SLOPE_THRESHOLD_DEG = 15;
export const MODERATE_SLOPE_THRESHOLD_DEG = 8;

export interface StencilElevations {
  center: number | null;
  north: number | null;
  south: number | null;
  east: number | null;
  west: number | null;
  stepMeters: number;
  highResScale?: boolean;
}

export interface StencilMorphologyResult {
  slopeDeg: number | null;
  slopePercent: number | null;
  aspectLabel: string | null;
  slopeCategory: SlopeCategory;
  isSteepSlope: boolean;
  morphologyLabel: MorphologyLabel;
  relativeReliefM: number | null;
}

function getCardinalAspect(dxGradient: number, dyGradient: number): string {
  // Gradient points uphill (+east, +north); downhill aspect is opposite vector
  const downX = -dxGradient;
  const downY = -dyGradient;
  const angleRad = Math.atan2(downX, downY); // 0 = North, +pi/2 = East
  const deg = ((angleRad * 180) / Math.PI + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(deg / 45) % 8;
  return `${dirs[idx]} (${Math.round(deg)}°) downhill`;
}

export function classifySlope(slopeDeg: number | null): SlopeCategory {
  if (slopeDeg === null || !Number.isFinite(slopeDeg)) return 'UNAVAILABLE';
  if (slopeDeg >= STEEP_SLOPE_THRESHOLD_DEG) return 'STEEP (>=15°)';
  if (slopeDeg >= 10) return 'CAUTION (10°–15°)';
  if (slopeDeg >= 5) return 'MODERATE (5°–10°)';
  return 'GENTLE (<5°)';
}

/**
 * Computes slope angle, percent grade, downhill aspect, and local concavity/depression indicator
 * from a 5-point cardinal elevation stencil on the Martian sphere.
 */
export function computeStencilSlopeAndMorphology(
  stencil: StencilElevations
): StencilMorphologyResult {
  const { center, north, south, east, west, stepMeters, highResScale = false } = stencil;

  if (center === null || !Number.isFinite(center) || !Number.isFinite(stepMeters) || stepMeters <= 0) {
    return {
      slopeDeg: null,
      slopePercent: null,
      aspectLabel: null,
      slopeCategory: 'UNAVAILABLE',
      isSteepSlope: false,
      morphologyLabel: 'UNAVAILABLE',
      relativeReliefM: null,
    };
  }

  let dzDy: number | null = null;
  if (north !== null && south !== null) {
    dzDy = (north - south) / (2 * stepMeters);
  } else if (north !== null) {
    dzDy = (north - center) / stepMeters;
  } else if (south !== null) {
    dzDy = (center - south) / stepMeters;
  }

  let dzDx: number | null = null;
  if (east !== null && west !== null) {
    dzDx = (east - west) / (2 * stepMeters);
  } else if (east !== null) {
    dzDx = (east - center) / stepMeters;
  } else if (west !== null) {
    dzDx = (center - west) / stepMeters;
  }

  if (dzDx === null && dzDy === null) {
    return {
      slopeDeg: null,
      slopePercent: null,
      aspectLabel: null,
      slopeCategory: 'UNAVAILABLE',
      isSteepSlope: false,
      morphologyLabel: 'UNAVAILABLE',
      relativeReliefM: null,
    };
  }

  const gx = dzDx ?? 0;
  const gy = dzDy ?? 0;
  const grade = Math.sqrt(gx * gx + gy * gy);
  const slopeDeg = Number(((Math.atan(grade) * 180) / Math.PI).toFixed(2));
  const slopePercent = Number((grade * 100).toFixed(1));
  const aspectLabel = slopeDeg >= 0.5 ? getCardinalAspect(gx, gy) : 'Flat / Negligible aspect';

  const neighbors = [north, south, east, west].filter(
    (v): v is number => v !== null && Number.isFinite(v)
  );
  let relativeReliefM: number | null = null;
  let morphologyLabel: MorphologyLabel = 'RELATIVELY PLANAR';

  if (neighbors.length >= 2) {
    const meanNeighbor = neighbors.reduce((sum, v) => sum + v, 0) / neighbors.length;
    relativeReliefM = Number((center - meanNeighbor).toFixed(2));
    const reliefThreshold = highResScale ? 1.5 : 8;
    if (relativeReliefM <= -reliefThreshold) {
      morphologyLabel = 'LOCAL DEPRESSION / CRATER FLOOR';
    } else if (relativeReliefM >= reliefThreshold) {
      morphologyLabel = 'ELEVATED RIM / RIDGE';
    } else if (slopeDeg >= 5) {
      morphologyLabel = 'SLOPING FLANK / BENCH';
    } else {
      morphologyLabel = 'RELATIVELY PLANAR';
    }
  } else if (slopeDeg >= 5) {
    morphologyLabel = 'SLOPING FLANK / BENCH';
  }

  const slopeCategory = classifySlope(slopeDeg);
  const isSteepSlope = slopeDeg >= STEEP_SLOPE_THRESHOLD_DEG;

  return {
    slopeDeg,
    slopePercent,
    aspectLabel,
    slopeCategory,
    isSteepSlope,
    morphologyLabel,
    relativeReliefM,
  };
}

/**
 * Generates evenly distributed geospatial sampling coordinates along a waypoint route,
 * preserving every user-placed waypoint vertex.
 */
export function interpolateRoutePoints(
  waypoints: Waypoint[],
  maxTotalSamples = 36
): Array<{ distanceKm: number; lat: number; lng: number; waypointName?: string }> {
  if (waypoints.length === 0) return [];
  if (waypoints.length === 1) {
    return [
      {
        distanceKm: 0,
        lat: waypoints[0].lat,
        lng: waypoints[0].lng,
        waypointName: waypoints[0].name,
      },
    ];
  }

  const segments = calculateRouteSegments(waypoints);
  const totalKm = segments.reduce((sum, seg) => sum + seg.distanceKm, 0);
  const points: Array<{ distanceKm: number; lat: number; lng: number; waypointName?: string }> = [];

  let cumulativeKm = 0;
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const segKm = segments[i]?.distanceKm ?? 0;
    const targetSubsteps =
      totalKm > 0
        ? Math.max(2, Math.round((segKm / totalKm) * Math.max(maxTotalSamples - waypoints.length, 8)))
        : 2;

    for (let step = 0; step < targetSubsteps; step += 1) {
      const t = step / targetSubsteps;
      const lat = Number((a.lat + (b.lat - a.lat) * t).toFixed(6));
      const lng = Number((a.lng + (b.lng - a.lng) * t).toFixed(6));
      points.push({
        distanceKm: Number((cumulativeKm + segKm * t).toFixed(4)),
        lat,
        lng,
        waypointName: step === 0 ? a.name : undefined,
      });
    }
    cumulativeKm += segKm;
  }

  const last = waypoints[waypoints.length - 1];
  points.push({
    distanceKm: Number(cumulativeKm.toFixed(4)),
    lat: last.lat,
    lng: last.lng,
    waypointName: last.name,
  });

  return points;
}

/**
 * Attaches segment slope metrics to raw route elevation samples.
 */
export function enrichProfileSamplesWithSlope(
  rawSamples: Array<{
    distanceKm: number;
    lat: number;
    lng: number;
    elevationM: number | null;
    waypointName?: string;
  }>
): TerrainProfileSample[] {
  return rawSamples.map((sample, idx) => {
    if (idx === 0 || sample.elevationM === null) {
      return {
        ...sample,
        segmentSlopeDeg: null,
        isSteep: false,
      };
    }

    const prev = rawSamples[idx - 1];
    if (prev.elevationM === null) {
      return {
        ...sample,
        segmentSlopeDeg: null,
        isSteep: false,
      };
    }

    const deltaDistM = Math.max(
      (sample.distanceKm - prev.distanceKm) * 1000,
      calculateMarsDistanceKm(prev.lat, prev.lng, sample.lat, sample.lng) * 1000
    );

    if (deltaDistM <= 0.5) {
      return {
        ...sample,
        segmentSlopeDeg: 0,
        isSteep: false,
      };
    }

    const deltaZ = Math.abs(sample.elevationM - prev.elevationM);
    const slopeDeg = Number(((Math.atan(deltaZ / deltaDistM) * 180) / Math.PI).toFixed(2));
    return {
      ...sample,
      segmentSlopeDeg: slopeDeg,
      isSteep: slopeDeg >= STEEP_SLOPE_THRESHOLD_DEG,
    };
  });
}

/**
 * Computes summary elevation statistics and identifies steep sections from sampled route elevations.
 */
export function computeTerrainProfileMetrics(
  samples: TerrainProfileSample[]
): TerrainProfileMetrics {
  const validSamples = samples.filter(
    (s): s is TerrainProfileSample & { elevationM: number } =>
      s.elevationM !== null && Number.isFinite(s.elevationM)
  );
  const incompleteSampleCount = samples.length - validSamples.length;

  if (validSamples.length === 0) {
    return {
      highestPointM: null,
      lowestPointM: null,
      elevationDifferenceM: null,
      totalElevationGainM: null,
      totalElevationLossM: null,
      maxSlopeDeg: null,
      validSampleCount: 0,
      totalSampleCount: samples.length,
      incompleteSampleCount,
      steepSections: [],
    };
  }

  let highest = -Infinity;
  let lowest = Infinity;
  let gain = 0;
  let loss = 0;
  let maxSlope: number | null = null;
  const steepSections: SteepSectionSummary[] = [];

  for (let i = 0; i < samples.length; i += 1) {
    const cur = samples[i];
    if (cur.elevationM !== null) {
      if (cur.elevationM > highest) highest = cur.elevationM;
      if (cur.elevationM < lowest) lowest = cur.elevationM;
    }

    if (i > 0) {
      const prev = samples[i - 1];
      if (prev.elevationM !== null && cur.elevationM !== null) {
        const diff = cur.elevationM - prev.elevationM;
        if (diff > 0) gain += diff;
        else loss += Math.abs(diff);

        if (cur.segmentSlopeDeg !== null) {
          maxSlope = maxSlope === null ? cur.segmentSlopeDeg : Math.max(maxSlope, cur.segmentSlopeDeg);
          if (cur.segmentSlopeDeg >= MODERATE_SLOPE_THRESHOLD_DEG) {
            steepSections.push({
              legLabel: `${prev.distanceKm.toFixed(2)}–${cur.distanceKm.toFixed(2)} km`,
              startKm: Number(prev.distanceKm.toFixed(2)),
              endKm: Number(cur.distanceKm.toFixed(2)),
              slopeDeg: cur.segmentSlopeDeg,
              elevationDeltaM: Number(diff.toFixed(1)),
              lat: cur.lat,
              lng: cur.lng,
            });
          }
        }
      }
    }
  }

  return {
    highestPointM: Number(highest.toFixed(1)),
    lowestPointM: Number(lowest.toFixed(1)),
    elevationDifferenceM: Number((highest - lowest).toFixed(1)),
    totalElevationGainM: Number(gain.toFixed(1)),
    totalElevationLossM: Number(loss.toFixed(1)),
    maxSlopeDeg: maxSlope !== null ? Number(maxSlope.toFixed(2)) : null,
    validSampleCount: validSamples.length,
    totalSampleCount: samples.length,
    incompleteSampleCount,
    steepSections,
  };
}

/**
 * Classifies route risk strictly using terrain slopes, incomplete DEM coverage, mapped obstacles,
 * elevation relief, and EVA endurance. Never classifies a route as safe based on distance alone.
 */
export function assessRouteRisk(params: {
  waypoints: Waypoint[];
  walkingSpeedKmH: number;
  profileResponse: RouteTerrainAnalysisResponse | null;
  profileMetrics: TerrainProfileMetrics;
}): RouteRiskAssessment {
  const { waypoints, walkingSpeedKmH, profileResponse, profileMetrics } = params;
  const segments = calculateRouteSegments(waypoints);
  const totalDistanceKm = segments.reduce((sum, s) => sum + s.distanceKm, 0);
  const estimatedHours = calculateEstimatedDurationHours(totalDistanceKm, walkingSpeedKmH);

  const nearbyDuneFields: NearbyDuneField[] = profileResponse?.nearbyDuneFields ?? [];
  const nearbyFeatures: NearbyMarsFeature[] = profileResponse?.nearbyFeatures ?? [];

  const hasDemData =
    profileResponse !== null &&
    profileResponse.status !== 'UNAVAILABLE' &&
    profileMetrics.validSampleCount >= 2;

  const isCoarseGlobalDem =
    profileResponse?.demResolution.includes('200 m') ||
    profileResponse?.demResolution.includes('463 m') ||
    false;

  const isIncomplete =
    !hasDemData ||
    profileResponse?.status === 'PARTIAL' ||
    profileMetrics.incompleteSampleCount > 0;

  let isPreliminary = false;
  let preliminaryReason: string | null = null;

  if (!hasDemData) {
    isPreliminary = true;
    preliminaryReason =
      'Preliminary Assessment: Real elevation DEM telemetry could not be retrieved for this route. Do not assume safe traverse without orbital topography.';
  } else if (profileMetrics.incompleteSampleCount > 0 || profileResponse?.status === 'PARTIAL') {
    isPreliminary = true;
    preliminaryReason = `Preliminary Assessment: ${profileMetrics.incompleteSampleCount} of ${profileMetrics.totalSampleCount} sampled route points lacked valid elevation coverage.`;
  }

  const obstacleAlerts: string[] = [];
  if (nearbyDuneFields.length > 0) {
    nearbyDuneFields.forEach((dune) => {
      obstacleAlerts.push(
        `USGS Dune Field ${dune.duneId} (${dune.duneType}${
          dune.meanHeightM ? `, ~${dune.meanHeightM} m mean height` : ''
        }) intersects or borders the route corridor — loose aeolian sand entrapment hazard.`
      );
    });
  }

  const craterFeatures = nearbyFeatures.filter((f) =>
    f.type.toLowerCase().includes('crater')
  );
  if (craterFeatures.length > 0) {
    obstacleAlerts.push(
      `Mapped impact crater(s) near corridor (${craterFeatures
        .slice(0, 3)
        .map((c) => `${c.name}${c.diameterKm ? ` Ø ${c.diameterKm.toFixed(1)} km` : ''}`)
        .join(', ')}) — inspect rim talus and ejecta boulders.`
    );
  }

  const valleyFeatures = nearbyFeatures.filter(
    (f) => f.type.toLowerCase().includes('vallis') || f.type.toLowerCase().includes('chasma')
  );
  if (valleyFeatures.length > 0) {
    obstacleAlerts.push(
      `Mapped canyon/valley feature(s) in corridor (${valleyFeatures
        .slice(0, 2)
        .map((v) => v.name)
        .join(', ')}) — verify scarp wall angles before crossing.`
    );
  }

  const riskFactors: string[] = [];
  const maxSlopeDeg = profileMetrics.maxSlopeDeg;
  const steep15Count = profileMetrics.steepSections.filter(
    (s) => s.slopeDeg >= STEEP_SLOPE_THRESHOLD_DEG
  ).length;
  const cautionSlopeCount = profileMetrics.steepSections.length;
  const elevDiff = profileMetrics.elevationDifferenceM;

  let category: RouteRiskCategory = 'LOW TERRAIN CONCERN';

  const hasHighTrigger =
    (maxSlopeDeg !== null && maxSlopeDeg >= STEEP_SLOPE_THRESHOLD_DEG) ||
    nearbyDuneFields.length > 0 ||
    (elevDiff !== null && elevDiff > 1000) ||
    estimatedHours > 8;

  const hasModerateTrigger =
    isPreliminary ||
    (maxSlopeDeg !== null && maxSlopeDeg >= MODERATE_SLOPE_THRESHOLD_DEG) ||
    (elevDiff !== null && elevDiff >= 150) ||
    craterFeatures.length > 0 ||
    valleyFeatures.length > 0 ||
    estimatedHours > 4 ||
    segments.some((s) => s.distanceKm > 2.5);

  if (hasHighTrigger) {
    category = 'HIGH TERRAIN CONCERN';
  } else if (hasModerateTrigger) {
    category = 'MODERATE TERRAIN CONCERN';
  } else {
    category = 'LOW TERRAIN CONCERN';
  }

  if (steep15Count > 0 && maxSlopeDeg !== null) {
    riskFactors.push(
      `${steep15Count} steep route section(s) reach >=15° (max sampled slope ${maxSlopeDeg.toFixed(
        1
      )}°), exceeding standard unassisted EVA incline thresholds.`
    );
  } else if (cautionSlopeCount > 0 && maxSlopeDeg !== null) {
    riskFactors.push(
      `${cautionSlopeCount} sloping section(s) reach ${MODERATE_SLOPE_THRESHOLD_DEG}°–15° (max ${maxSlopeDeg.toFixed(
        1
      )}°), increasing suited metabolic load and footing risk.`
    );
  } else if (hasDemData && maxSlopeDeg !== null) {
    riskFactors.push(
      `Sampled DEM macro-slopes remain below ${MODERATE_SLOPE_THRESHOLD_DEG}° (max ${maxSlopeDeg.toFixed(
        1
      )}°). Note: local boulder-scale hazards cannot be excluded without HiRISE stereo confirmation.`
    );
  }

  if (elevDiff !== null && elevDiff > 0) {
    riskFactors.push(
      `Total elevation span along route is ${elevDiff.toFixed(1)} m (${
        profileMetrics.lowestPointM?.toFixed(1) ?? '—'
      } m to ${profileMetrics.highestPointM?.toFixed(1) ?? '—'} m relative to Martian areoid).`
    );
  }

  if (isIncomplete && preliminaryReason) {
    riskFactors.push(preliminaryReason);
  }

  if (hasDemData && isCoarseGlobalDem) {
    riskFactors.push(
      `Elevation sampled from ${profileResponse?.demResolution} regional/global DEM; micro-topography (<200 m boulders, small craters, scarps) is unresolved and requires HiRISE 0.3–1 m/px stereo verification.`
    );
  }

  if (estimatedHours > 8) {
    riskFactors.push(
      `Estimated duration (${estimatedHours.toFixed(2)} hrs at ${walkingSpeedKmH.toFixed(
        1
      )} km/h) exceeds 8-hour single-sol suited EVA endurance; pressurized rover support required.`
    );
  } else if (estimatedHours > 4) {
    riskFactors.push(
      `Estimated duration (${estimatedHours.toFixed(2)} hrs) requires multi-hour portable life support reserves and intermediate rest stops.`
    );
  }

  if (segments.some((s) => s.distanceKm > 2.5)) {
    const maxSeg = Math.max(...segments.map((s) => s.distanceKm));
    riskFactors.push(
      `Longest segment (${maxSeg.toFixed(2)} km) exceeds 2.5 km unassisted contingency walk-back guideline.`
    );
  }

  return {
    category,
    isPreliminary,
    preliminaryReason,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    estimatedHours: Number(estimatedHours.toFixed(2)),
    maxSlopeDeg,
    steepSectionCount: cautionSlopeCount,
    incompleteDataCount: profileMetrics.incompleteSampleCount,
    obstacleAlerts,
    riskFactors,
    safetyDisclaimer:
      'Terrain concern level reflects orbital DEM slope, relief, mapped dune/crater obstacles, and EVA endurance — never distance alone. Always inspect HiRISE 0.3 m/px imagery and nighttime THEMIS rock inertia before field commitment.',
  };
}

/**
 * Calculates angular degree offsets on Mars for a given metric step distance at latitude `lat`.
 */
export function metersToMarsDegreeStep(latDeg: number, stepMeters: number): {
  dLat: number;
  dLng: number;
} {
  const radiusM = MARS_MEAN_RADIUS_KM * 1000;
  const dLat = (stepMeters / radiusM) * (180 / Math.PI);
  const cosLat = Math.max(0.15, Math.cos((latDeg * Math.PI) / 180));
  const dLng = (stepMeters / (radiusM * cosLat)) * (180 / Math.PI);
  return { dLat, dLng };
}
