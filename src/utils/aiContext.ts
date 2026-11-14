import type {
  GeologyPointRecord,
  InSightApiResponse,
  MarsMapLayer,
  MarsRegion,
  MissionPlan,
  PointTerrainAnalysis,
  RouteRiskAssessment,
  RouteTerrainAnalysisResponse,
  TerrainProfileMetrics,
  AiSourceReference,
  MarsContextSnapshot,
  GeologicalObservationPreset,
} from '../types/mars';
import { calculateRouteSegments, formatMarsCoords } from './marsGeo';

export const EXAMPLE_AI_QUESTIONS: string[] = [
  'What makes Gale Crater scientifically important?',
  'Explain the geological formations of Mount Sharp.',
  'What does MOLA elevation data tell us?',
  'What is the difference between THEMIS daytime and nighttime imagery?',
  'What are clay-bearing minerals?',
  'Why are steep slopes challenging for astronauts?',
  'Which datasets should we inspect before selecting an exploration route?',
  'Explain the scientific importance of CRISM data.',
];

export const REPUTABLE_SCIENTIFIC_SOURCES: AiSourceReference[] = [
  {
    label: 'NASA Mars Trek',
    url: 'https://trek.nasa.gov/',
    relevance: 'MOLA, HRSC, THEMIS, CTX, and Gale 1m DEM geospatial services',
  },
  {
    label: 'NASA Planetary Data System (PDS)',
    url: 'https://pds.nasa.gov/',
    relevance: 'Calibrated CRISM, HiRISE, MOLA, and MSL RAD science archives',
  },
  {
    label: 'NASA Mars Exploration Science',
    url: 'https://science.nasa.gov/mars/',
    relevance: 'Mars orbiter and rover mission science overviews',
  },
  {
    label: 'USGS Astrogeology Science Center',
    url: 'https://astrogeology.usgs.gov/',
    relevance: 'SIM 3292 Global Geologic Map of Mars and cartographic standards',
  },
  {
    label: 'Caltech Murray Lab CTX Mosaic',
    url: 'https://murray-lab.caltech.edu/CTX/',
    relevance: '5 m/pixel global optical Context Camera mosaic',
  },
];

const ALLOWED_SOURCE_HOSTS = [
  'trek.nasa.gov',
  'pds.nasa.gov',
  'pds-geosciences.wustl.edu',
  'pds-ppi.igpp.ucla.edu',
  'science.nasa.gov',
  'mars.nasa.gov',
  'api.nasa.gov',
  'astrogeology.usgs.gov',
  'pubs.usgs.gov',
  'murray-lab.caltech.edu',
  'themis.asu.edu',
  'www.uahirise.org',
  'uahirise.org',
];

export function sanitizeSourceReferences(
  refs: Array<{ label?: string; url?: string; relevance?: string }> | undefined
): AiSourceReference[] {
  if (!Array.isArray(refs) || refs.length === 0) {
    return REPUTABLE_SCIENTIFIC_SOURCES.slice(0, 4);
  }

  const verified: AiSourceReference[] = [];
  const seenUrls = new Set<string>();

  for (const ref of refs) {
    const rawUrl = typeof ref?.url === 'string' ? ref.url.trim() : '';
    const rawLabel = typeof ref?.label === 'string' ? ref.label.trim() : '';
    const rawRelevance = typeof ref?.relevance === 'string' ? ref.relevance.trim() : '';
    if (!rawUrl || !rawLabel) continue;

    try {
      const parsed = new URL(rawUrl);
      const hostAllowed = ALLOWED_SOURCE_HOSTS.some(
        (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`)
      );
      if (parsed.protocol === 'https:' && hostAllowed && !seenUrls.has(parsed.href)) {
        seenUrls.add(parsed.href);
        verified.push({
          label: rawLabel,
          url: parsed.href,
          relevance: rawRelevance || 'Verified NASA / USGS / Caltech planetary science source',
        });
      }
    } catch {
      // Ignore malformed URLs returned by LLM
    }
  }

  return verified.length > 0 ? verified : REPUTABLE_SCIENTIFIC_SOURCES.slice(0, 4);
}

export const GEOLOGICAL_OBSERVATION_PRESETS: GeologicalObservationPreset[] = [
  {
    id: 'gale-lacustrine-mudstone',
    title: 'Finely Laminated Mudstones in Aeolis Palus (Gale Crater)',
    regionHint: 'Gale Crater (Mount Sharp)',
    observationText:
      'Thinly bedded, fine-grained sedimentary outcrop at low elevation (-4,500 m) showing polygonal desiccation-like fractures and possible phyllosilicate associations in orbital CRISM cubes.',
    spectralEvidenceProvided: true,
  },
  {
    id: 'jezero-delta-clay-carbonate',
    title: 'Deltaic Lobate Scarp with Smectite/Carbonate Signatures (Jezero)',
    regionHint: 'Jezero Crater',
    observationText:
      'Fan-shaped stratified deposit at a breached western crater rim where MRO CRISM 18 m/px hyperspectral data detects Mg/Fe-smectite clays and marginal carbonates.',
    spectralEvidenceProvided: true,
  },
  {
    id: 'visual-only-layered-outcrop',
    title: 'Visual-Only Optical Photograph of Pale Layered Ridge (No Spectral Data)',
    regionHint: 'Any Region',
    observationText:
      'An optical-only CTX/HiRISE photograph shows bright, horizontally layered rock beds on a mid-slope bench, with no CRISM, OMEGA, APXS, or ChemCam spectral measurements acquired yet.',
    spectralEvidenceProvided: false,
  },
  {
    id: 'dark-aeolian-dune-field',
    title: 'Low-Thermal-Inertia Dark Barchanoid Sand Field (THEMIS + CTX)',
    regionHint: 'Gale Crater / Bagnold Corridor',
    observationText:
      'Smooth dark ripple-textured floor unit visible in CTX 5 m/px imagery paired with low nighttime brightness temperature in THEMIS Night IR (100 m/px), intersecting mapped USGS Dune_Field polygons.',
    spectralEvidenceProvided: false,
  },
  {
    id: 'mount-sharp-sulfate-unit',
    title: 'Sulfate-Bearing Sloping Bench on Lower Aeolis Mons',
    regionHint: 'Gale Crater (Mount Sharp)',
    observationText:
      'Steeper stratified slopes ascending Mount Sharp where orbital CRISM spectra indicate hydrated Mg-sulfate mineral signatures transitioning upward from lower clay-rich units.',
    spectralEvidenceProvided: true,
  },
];

export interface BuildContextParams {
  region: MarsRegion;
  inspectedCoords: { lat: number; lng: number };
  activeLayer: MarsMapLayer;
  pointAnalysis: PointTerrainAnalysis | null;
  geologyRecord: GeologyPointRecord | null;
  mission: MissionPlan;
  profileResponse: RouteTerrainAnalysisResponse | null;
  profileMetrics: TerrainProfileMetrics;
  riskAssessment: RouteRiskAssessment;
  insightData: InSightApiResponse | null;
}

export function buildMarsContextSnapshot(params: BuildContextParams): MarsContextSnapshot {
  const {
    region,
    inspectedCoords,
    activeLayer,
    pointAnalysis,
    geologyRecord,
    mission,
    profileResponse,
    profileMetrics,
    riskAssessment,
    insightData,
  } = params;

  const segments = calculateRouteSegments(mission.waypoints);
  const startWp = mission.waypoints[0] ?? null;
  const endWp =
    mission.waypoints.length > 1 ? mission.waypoints[mission.waypoints.length - 1] : null;

  const latestInSightSol =
    insightData?.sols && insightData.sols.length > 0
      ? insightData.sols[insightData.sols.length - 1]
      : null;

  const missingDatasets: string[] = [
    'Real-time Martian surface weather & dust storm optical depth telemetry (live feed unavailable; InSight mission concluded Dec 2022)',
    'Real-time Solar Energetic Particle (SEP) surface storm alerts (Curiosity RAD live PDS stream not connected)',
  ];

  if (!pointAnalysis || pointAnalysis.dataAvailability === 'UNAVAILABLE') {
    missingDatasets.push('Point elevation & finite-difference slope from NASA Mars Trek DEM (not yet retrieved or unavailable at this coordinate)');
  } else if (pointAnalysis.dataAvailability === 'GLOBAL MOLA+HRSC DEM') {
    missingDatasets.push('Continuous sub-meter HiRISE stereo DEM (current slope derived at 200 m/px MOLA+HRSC resolution; sub-200 m boulders unresolved)');
  }

  if (!geologyRecord || geologyRecord.availability === 'UNAVAILABLE') {
    missingDatasets.push('USGS SIM 3292 point geologic unit classification (unavailable at coordinate)');
  }

  if (!profileResponse || profileResponse.status !== 'COMPLETE') {
    missingDatasets.push('Complete elevation profile along active route corridor');
  }

  return {
    generatedAt: new Date().toISOString(),
    region: {
      id: region.id,
      name: region.name,
      quadrangle: region.quadrangle,
      centerCoords: formatMarsCoords(region.lat, region.lng, 4),
      elevationSummary: region.elevationSummary,
      missionHistory: region.missionHistory,
      scientificInterest: region.scientificInterest,
      terrainNotice: region.terrainNotice,
    },
    inspectedPoint: {
      lat: inspectedCoords.lat,
      lng: inspectedCoords.lng,
      formatted: formatMarsCoords(inspectedCoords.lat, inspectedCoords.lng, 4),
      elevationM: pointAnalysis?.primaryElevationM ?? null,
      slopeDeg: pointAnalysis?.slopeDeg ?? null,
      slopeCategory: pointAnalysis?.slopeCategory ?? 'UNAVAILABLE',
      morphologyLabel: pointAnalysis?.morphologyLabel ?? 'UNAVAILABLE',
      demName: pointAnalysis?.primaryDemName ?? 'Not yet sampled',
      demResolution: pointAnalysis?.primaryDemResolution ?? 'Unknown',
      dataAvailability: pointAnalysis?.dataAvailability ?? 'UNAVAILABLE',
      nearbyFeatures: (pointAnalysis?.nearbyFeatures ?? [])
        .slice(0, 4)
        .map((f) => `${f.name} (${f.type}, ${f.distanceKm} km away)`),
      nearbyDuneFieldsCount: pointAnalysis?.nearbyDuneFields.length ?? 0,
      nearbyMineralDetections: (pointAnalysis?.nearbyMineralDetections ?? [])
        .slice(0, 4)
        .map((m) => `${m.type} [${m.instrument}]`),
    },
    geology: {
      availability: geologyRecord?.availability ?? 'UNAVAILABLE',
      unitCode: geologyRecord?.unitCode ?? null,
      unitDescription: geologyRecord?.unitDescription ?? null,
      areaKm2: geologyRecord?.areaKm2 ?? null,
      sourceName: geologyRecord?.sourceName ?? 'USGS SIM 3292 Global Geologic Map (1:20M)',
    },
    activeMapLayer: {
      id: activeLayer.id,
      name: activeLayer.name,
      missionSource: activeLayer.missionSource,
      instrument: activeLayer.instrument,
      resolution: activeLayer.resolution,
      availabilityStatus: activeLayer.availabilityStatus,
    },
    missionRoute: {
      name: mission.name,
      isDemonstration: mission.isDemonstration,
      scientificObjective: mission.scientificObjective,
      waypointCount: mission.waypoints.length,
      startCoords: startWp ? `${startWp.name} (${formatMarsCoords(startWp.lat, startWp.lng, 4)})` : 'Not set',
      destCoords: endWp ? `${endWp.name} (${formatMarsCoords(endWp.lat, endWp.lng, 4)})` : 'Not set',
      totalDistanceKm: riskAssessment.totalDistanceKm,
      estimatedHours: riskAssessment.estimatedHours,
      walkingSpeedKmH: mission.walkingSpeedKmH,
      segmentCount: segments.length,
      routeRiskCategory: riskAssessment.category,
      isPreliminaryRisk: riskAssessment.isPreliminary,
      profileStatus: profileResponse?.status ?? 'UNAVAILABLE',
      demResolutionUsed: profileResponse?.demResolution ?? 'Unavailable',
      highestPointM: profileMetrics.highestPointM,
      lowestPointM: profileMetrics.lowestPointM,
      elevationDifferenceM: profileMetrics.elevationDifferenceM,
      maxRouteSlopeDeg: profileMetrics.maxSlopeDeg,
      steepSectionCount: profileMetrics.steepSections.length,
      scientificTargets: mission.scientificTargets.map(
        (t) => `${t.name} [${t.category}] at ${formatMarsCoords(t.lat, t.lng, 4)}: ${t.description}`
      ),
      obstacleAlerts: riskAssessment.obstacleAlerts,
    },
    historicalEnvironment: {
      radBaseline:
        'Historical MSL Curiosity RAD (Sol 0–300, Aug 2012–Jun 2013, Hassler et al. Science 2014): ~0.21 mGy/day absorbed / ~0.64 mSv/day equivalent at Gale Crater (-4.5 km); excludes Solar Energetic Particle (SEP) storms.',
      insightWeatherSummary: latestInSightSol
        ? `Historical InSight Sol ${latestInSightSol.sol} (${latestInSightSol.firstUtc?.slice(0, 10) ?? 'Oct 2020'}, Elysium Planitia 4.5°N 135.6°E): Avg ${latestInSightSol.tempAvgC ?? 'N/A'}°C (Min ${latestInSightSol.tempMinC ?? 'N/A'}°C / Max ${latestInSightSol.tempMaxC ?? 'N/A'}°C), Pressure ${latestInSightSol.pressureAvgPa ?? 'N/A'} Pa. Mission ended Dec 2022.`
        : 'InSight weather API currently not connected (mission concluded Dec 2022; historical baseline Elysium Planitia -96.9°C to -15.9°C).',
    },
    missingDatasets,
  };
}

export function formatContextForPrompt(snapshot: MarsContextSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}
