import { MARS_REGIONS } from '../data/marsRegions';
import { checkHiRiseRegionalCoverage } from '../services/nasaDataManager';
import type {
  ComparisonPresetId,
  GeologyPointRecord,
  InSightApiResponse,
  MarsLayerCategory,
  MarsRegion,
  MissionPlan,
  MissionRecommendation,
  PointTerrainAnalysis,
  RouteRiskAssessment,
  RouteTerrainAnalysisResponse,
  ScenarioSimulationResult,
  ScenarioSimulatorConfig,
  TerrainProfileMetrics,
  Waypoint,
} from '../types/mars';
import {
  calculateEstimatedDurationHours,
  calculateMarsDistanceKm,
  formatMarsCoords,
} from './marsGeo';
import { MODERATE_SLOPE_THRESHOLD_DEG, STEEP_SLOPE_THRESHOLD_DEG } from './terrainAnalysis';

export interface ComparisonPresetConfig {
  id: ComparisonPresetId;
  label: string;
  leftLayerId: MarsLayerCategory;
  rightLayerId: MarsLayerCategory;
  scientificInsight: string;
  astronautDecisionValue: string;
}

export const COMPARISON_PRESETS: ComparisonPresetConfig[] = [
  {
    id: 'elevation-vs-thermal',
    label: 'Elevation vs. Thermal Imagery',
    leftLayerId: 'terrain',
    rightLayerId: 'thermal_night',
    scientificInsight:
      'Comparing MOLA+HRSC elevation against 100 m/px THEMIS Nighttime Infrared exposes where steep crater walls or ridges coincide with high thermal inertia (bright exposed bedrock/boulder talus) versus low-inertia dark dust/sand traps.',
    astronautDecisionValue:
      'Separates firm bedrock benches (bright in Night IR, safer traction) from unconsolidated aeolian sand ripples along low-slope valleys.',
  },
  {
    id: 'geology-vs-elevation',
    label: 'Geological Units vs. Elevation',
    leftLayerId: 'geology',
    rightLayerId: 'slope_elevation',
    scientificInsight:
      'Overlaying USGS SIM 3292 stratigraphic units onto MOLA elevation isolates elevation contacts between older Noachian/Hesperian bedrock units and younger volcanic or impact basin plains.',
    astronautDecisionValue:
      'Highlights geological contact boundaries where astronauts can sample multiple ancient epochs across manageable vertical relief.',
  },
  {
    id: 'minerals-vs-imagery',
    label: 'Mineral Context & High-Res vs. CTX Imagery',
    leftLayerId: 'hirise',
    rightLayerId: 'surface_ctx',
    scientificInsight:
      'Pairing targeted HiRISE/Jezero overlays and OMEGA/CRISM hydrous mineral detections with 5 m/px CTX imagery connects spectroscopic alteration signatures to physical outcrop textures, channels, and fracture systems.',
    astronautDecisionValue:
      'Verifies whether hydrated clay/sulfate targets lie on accessible layered benches or unstable crater rim talus.',
  },
  {
    id: 'slope-vs-route',
    label: 'Terrain Slope/Elevation vs. Proposed Route',
    leftLayerId: 'slope_elevation',
    rightLayerId: 'thermal_day',
    scientificInsight:
      'Plotting the active traverse waypoints across MOLA shaded relief alongside THEMIS Daytime IR surface warming reveals sun-facing scarps, crater rim approaches, and multi-kilometer elevation gradients along the route corridor.',
    astronautDecisionValue:
      'Identifies legs that require intermediate rest waypoints, rover slope checks, or HiRISE micro-relief verification.',
  },
];

export function getLayerComparisonInsight(
  leftLayerId: MarsLayerCategory,
  rightLayerId: MarsLayerCategory
): { headline: string; scientificRevelation: string; operationalCheck: string } {
  const preset = COMPARISON_PRESETS.find(
    (p) => p.leftLayerId === leftLayerId && p.rightLayerId === rightLayerId
  );
  if (preset) {
    return {
      headline: preset.label,
      scientificRevelation: preset.scientificInsight,
      operationalCheck: preset.astronautDecisionValue,
    };
  }

  return {
    headline: 'Custom Dual-Dataset Cross-Analysis',
    scientificRevelation:
      'Synchronized dual-pane inspection aligns identical Martian coordinates across two independent orbital instruments, exposing correlations between topography, surface rock abundance, stratigraphy, and optical morphology.',
    operationalCheck:
      'Verify that bright nighttime thermal features or sharp optical scarps do not cross planned route segments without sub-meter HiRISE confirmation.',
  };
}

/**
 * Transparent rule-based decision-support engine combining DEM slopes, coverage gaps,
 * orbital imagery availability, geology/mineralogy, and historical environmental baselines.
 * Never certifies a route as astronaut-safe without sufficient validated high-res data.
 */
export function generateMissionRecommendations(params: {
  region: MarsRegion;
  mission: MissionPlan;
  pointAnalysis: PointTerrainAnalysis | null;
  geologyRecord: GeologyPointRecord | null;
  profileResponse: RouteTerrainAnalysisResponse | null;
  profileMetrics: TerrainProfileMetrics;
  riskAssessment: RouteRiskAssessment;
  insightData: InSightApiResponse | null;
}): MissionRecommendation[] {
  const {
    region,
    mission,
    pointAnalysis,
    geologyRecord,
    profileResponse,
    profileMetrics,
    riskAssessment,
    insightData,
  } = params;

  const recs: MissionRecommendation[] = [];

  // RULE 1: Steep terrain detection along route or inspected coordinate
  const routeMaxSlope = profileMetrics.maxSlopeDeg;
  const pointSlope = pointAnalysis?.slopeDeg ?? null;
  if (
    (routeMaxSlope !== null && routeMaxSlope >= STEEP_SLOPE_THRESHOLD_DEG) ||
    (pointSlope !== null && pointSlope >= STEEP_SLOPE_THRESHOLD_DEG)
  ) {
    const worst = Math.max(routeMaxSlope ?? 0, pointSlope ?? 0);
    recs.push({
      id: 'rec-steep-slope',
      category: 'Terrain Concerns',
      severity: 'HIGH CONCERN',
      title: `Steep Terrain Threshold Exceeded (${worst.toFixed(1)}° >= 15°)`,
      rationale:
        'Unassisted suited EVA traverses and pressurized rover operations face elevated slip, anchor, and metabolic load hazards on inclines >=15°.',
      ruleTriggered:
        'IF sampled route or point DEM slope >= 15° THEN flag High Terrain Concern and prohibit unassisted direct ascent.',
      actionableStep:
        'Re-route waypoints along lower-gradient contour benches (<10°) and require tethered/rover-winch contingency plus 1 m/px HiRISE DTM verification.',
    });
  } else if (routeMaxSlope !== null && routeMaxSlope >= MODERATE_SLOPE_THRESHOLD_DEG) {
    recs.push({
      id: 'rec-moderate-slope',
      category: 'Terrain Concerns',
      severity: 'CAUTION',
      title: `Moderate Corridor Gradient Detected (Max ${routeMaxSlope.toFixed(1)}°)`,
      rationale:
        'Slopes between 8° and 15° increase suit energy expenditure and regolith slippage on dust-mantled surfaces.',
      ruleTriggered:
        'IF 8° <= max route slope < 15° THEN issue EVA incline pacing caution.',
      actionableStep:
        'Schedule conservative walking speed (<2.0 km/h) on ascending legs and confirm firm bedrock footing via THEMIS Night IR.',
    });
  }

  // RULE 2: Missing or incomplete elevation DEM information
  const missingProfileDem =
    !profileResponse ||
    profileResponse.status === 'UNAVAILABLE' ||
    profileMetrics.validSampleCount < 2;
  const partialProfileDem =
    profileResponse?.status === 'PARTIAL' || profileMetrics.incompleteSampleCount > 0;
  const missingPointDem = !pointAnalysis || pointAnalysis.dataAvailability === 'UNAVAILABLE';

  if (missingProfileDem || missingPointDem || partialProfileDem) {
    recs.push({
      id: 'rec-missing-elevation',
      category: 'Missing Scientific Information',
      severity: 'INSUFFICIENT DATA',
      title: 'Insufficient Elevation Data Warning — Route Cannot Be Certified Safe',
      rationale: missingProfileDem
        ? 'Real DEM elevation samples could not be retrieved along the active route corridor.'
        : `Partial DEM coverage gap (${profileMetrics.incompleteSampleCount} missing route samples).`,
      ruleTriggered:
        'IF elevation information is missing or partial THEN display Insufficient Data Warning and withhold safety clearance.',
      actionableStep:
        'Retry NASA Mars Trek DEM sampling, cross-check MOLA 463 m/px regional relief, and never infer terrain safety from horizontal distance alone.',
    });
  }

  // RULE 3: High-resolution HiRISE imagery availability check
  const hiriseCoverage = checkHiRiseRegionalCoverage(region);
  const usingCoarseDem =
    profileResponse?.demResolution.includes('200 m') ||
    profileResponse?.demResolution.includes('463 m') ||
    pointAnalysis?.dataAvailability === 'GLOBAL MOLA+HRSC DEM';

  if (!hiriseCoverage.hasDirectTileOrDem || usingCoarseDem) {
    recs.push({
      id: 'rec-hirise-inspection',
      category: 'Recommended Additional Observations',
      severity: 'OBSERVATION RECOMMENDED',
      title: `Targeted HiRISE High-Resolution Inspection Required for ${region.name}`,
      rationale: !hiriseCoverage.hasDirectTileOrDem
        ? hiriseCoverage.coverageNote
        : `Current terrain profile relies on ${profileResponse?.demResolution ?? '200 m/px'} DEM spacing, which cannot detect meter-scale boulders or cliff overhangs.`,
      ruleTriggered:
        'IF continuous HiRISE imagery/1 m DEM is unavailable for region THEN recommend targeted HiRISE orbital stereo inspection.',
      actionableStep:
        'Query the UArizona/NASA PDS HiRISE catalog (~0.25–0.30 m/px) for overlapping strips covering all planned waypoints before traverse approval.',
    });
  }

  // RULE 4: Mapped Dune Field / Crater Rim Obstacles
  if ((profileResponse?.nearbyDuneFields.length ?? 0) > 0 || (pointAnalysis?.nearbyDuneFields.length ?? 0) > 0) {
    const dunes =
      profileResponse?.nearbyDuneFields.length
        ? profileResponse.nearbyDuneFields
        : pointAnalysis?.nearbyDuneFields ?? [];
    recs.push({
      id: 'rec-dune-obstacle',
      category: 'Route Planning Considerations',
      severity: 'HIGH CONCERN',
      title: `Aeolian Sand Entrapment Risk (${dunes.length} Mapped Dune Field Corridor Intersection)`,
      rationale: `USGS Dune Field ID ${dunes[0].duneId} (${dunes[0].duneType}) lies within the operational corridor; loose wind-blown basaltic sand causes severe rover wheel slip and suited boot sinkage.`,
      ruleTriggered:
        'IF USGS Dune_Field polygon intersects route corridor THEN flag aeolian sand avoidance corridor.',
      actionableStep:
        'Route traverse waypoints along bright THEMIS Night IR high-thermal-inertia bedrock surfaces bypassing dark sand sheets.',
    });
  }

  // RULE 5: Scientific Exploration Targets & Mineralogical/Geological Opportunity
  const minerals =
    pointAnalysis?.nearbyMineralDetections.length
      ? pointAnalysis.nearbyMineralDetections
      : profileResponse?.nearbyMineralDetections ?? [];
  if (minerals.length > 0 || geologyRecord?.unitCode) {
    const geoLabel = geologyRecord?.unitCode
      ? `USGS Unit ${geologyRecord.unitCode} (${geologyRecord.unitDescription})`
      : region.quadrangle;
    recs.push({
      id: 'rec-science-targets',
      category: 'Scientific Exploration Targets',
      severity: 'OBSERVATION RECOMMENDED',
      title: `Prioritize Stratified & Hydrous Alteration Targets (${minerals.length} OMEGA/CRISM Detections Nearby)`,
      rationale: `Selected coordinate sits on ${geoLabel} with ${minerals.length} indexed OMEGA/CRISM hydrous mineral detection(s) and ${mission.scientificTargets.length} logged mission target(s).`,
      ruleTriggered:
        'IF regional geology unit OR OMEGA/CRISM hydrous detections exist THEN prioritize outcrop sampling targets in Mission Planner.',
      actionableStep:
        'Inspect CTX 5 m/px imagery to locate exposed layered benches near CRISM detections and log each site in Scientific Target Identification.',
    });
  }

  // RULE 6: Historical Environmental Measurements Transparency
  const latestSol =
    insightData?.status === 'HISTORICAL DATA' && insightData.sols.length > 0
      ? insightData.sols[insightData.sols.length - 1]
      : null;

  recs.push({
    id: 'rec-historical-env',
    category: 'Route Planning Considerations',
    severity: 'HISTORICAL CONTEXT',
    title: 'Environmental Baselines Represent Historical Archives — Real-Time Weather & Radiation Disconnected',
    rationale: latestSol
      ? `Atmosphere uses InSight Sol ${latestSol.sol} (Oct 2020; mission concluded Dec 2022) at Elysium Planitia; radiation uses Curiosity RAD Sol 0–300 (Aug 2012 – Jun 2013, ~0.64 mSv/day quiet conditions).`
      : 'InSight weather service is currently disconnected or offline (mission concluded Dec 2022); radiation relies strictly on Curiosity RAD Sol 0–300 (Aug 2012 – Jun 2013) baseline.',
    ruleTriggered:
      'IF historical environmental datasets are used THEN explicitly surface observation dates and site-extrapolation limits.',
    actionableStep:
      'Treat thermal and radiation figures as historical planning baselines only; integrate orbital dust-opacity and SEP space-weather monitoring before actual EVA operations.',
    observationDateNote:
      'MSL RAD: Aug 2012 – Jun 2013 (Gale Crater) · InSight APSS: Oct 2020 (Elysium Planitia) · THEMIS: Oct 2018 mosaic.',
  });

  // RULE 7: Contingency Walk-Back & EVA Endurance Check
  if (riskAssessment.estimatedHours > 4 || riskAssessment.totalDistanceKm > 5) {
    recs.push({
      id: 'rec-eva-endurance',
      category: 'Route Planning Considerations',
      severity: riskAssessment.estimatedHours > 8 ? 'HIGH CONCERN' : 'CAUTION',
      title: `Extended Traverse Endurance (${riskAssessment.totalDistanceKm.toFixed(2)} km / ${riskAssessment.estimatedHours.toFixed(2)} hrs)`,
      rationale:
        'Multi-hour traverses exceeding 2.5 km leg spacing or 4–8 hours approach portable life support (PLSS) consumables and thermal battery limits.',
      ruleTriggered:
        'IF total distance > 5 km OR estimated duration > 4 hrs THEN require contingency walk-back or pressurized rover staging.',
      actionableStep:
        'Split legs exceeding 2.5 km with intermediate safe-haven waypoints or allocate a pressurized EVA rover with backup O2/H2O.',
    });
  }

  return recs;
}

/**
 * Generates a deterministic demonstration Mars Surface Exploration Scenario simulation
 * with explicit assumptions, waypoint interpolation, distance/duration math, and missing data checks.
 */
export function buildScenarioSimulation(params: {
  config: ScenarioSimulatorConfig;
  insightData: InSightApiResponse | null;
  profileResponse: RouteTerrainAnalysisResponse | null;
  profileMetrics: TerrainProfileMetrics;
}): ScenarioSimulationResult {
  const { config, insightData, profileResponse, profileMetrics } = params;
  const region = MARS_REGIONS.find((r) => r.id === config.regionId) ?? MARS_REGIONS[0];
  const wpCount = Math.max(2, Math.min(8, Math.round(config.waypointCount || 4)));

  const generatedWaypoints: Waypoint[] = [];
  for (let i = 0; i < wpCount; i += 1) {
    const t = i / (wpCount - 1);
    const lat = Number((config.startLat + (config.destLat - config.startLat) * t).toFixed(4));
    const lng = Number((config.startLng + (config.destLng - config.startLng) * t).toFixed(4));
    generatedWaypoints.push({
      id: `sim-wp-${i + 1}`,
      name:
        i === 0
          ? 'Simulated EVA Origin'
          : i === wpCount - 1
          ? 'Simulated Primary Target'
          : `Simulated Traverse Checkpoint ${i}`,
      lat,
      lng,
      notes: 'DEMONSTRATION WAYPOINT — Linear great-circle interpolation pending HiRISE micro-routing.',
    });
  }

  let totalDistanceKm = 0;
  for (let i = 0; i < generatedWaypoints.length - 1; i += 1) {
    totalDistanceKm += calculateMarsDistanceKm(
      generatedWaypoints[i].lat,
      generatedWaypoints[i].lng,
      generatedWaypoints[i + 1].lat,
      generatedWaypoints[i + 1].lng
    );
  }
  totalDistanceKm = Number(totalDistanceKm.toFixed(2));

  const effectiveSpeed = Math.max(0.5, Number(config.walkingSpeedKmH) || 2.0);
  const estimatedDurationHours = Number(
    calculateEstimatedDurationHours(totalDistanceKm, effectiveSpeed).toFixed(2)
  );

  const hasValidProfile =
    profileResponse &&
    profileResponse.status !== 'UNAVAILABLE' &&
    profileMetrics.validSampleCount >= 2;

  const terrainSummary = hasValidProfile
    ? `Sampled on ${profileResponse.demName} (${profileResponse.demResolution}): Lowest ${profileMetrics.lowestPointM?.toFixed(
        1
      )} m, Highest ${profileMetrics.highestPointM?.toFixed(
        1
      )} m, Elevation Span ${profileMetrics.elevationDifferenceM?.toFixed(
        1
      )} m, Max Sampled Slope ${profileMetrics.maxSlopeDeg?.toFixed(1) ?? '—'}°.`
    : `DEM elevation profile not yet retrieved for this exact coordinate pair; regional context (${region.elevationSummary}) indicates: ${region.terrainNotice}`;

  const suggestedTargets: string[] = [
    `Primary Objective Focus: ${config.scientificObjective || region.scientificInterest}`,
    `Destination Coordinate Site (${formatMarsCoords(config.destLat, config.destLng, 4)}): Inspect layered bedrock, ejecta, or mineral contacts.`,
  ];
  if (config.equipment.includes('Portable Drill & Spectrometer')) {
    suggestedTargets.push(
      'Subsurface Core & Raman/LIBS Target: Sample unweathered regolith beneath dust veneer (assumes drill equipment onboard).'
    );
  }

  const environmentalConcerns: string[] = [
    'GCR Surface Radiation Baseline: ~0.21 mGy/day absorbed / ~0.64 mSv/day equivalent (Historical MSL RAD Sol 0–300, Aug 2012 – Jun 2013; excludes episodic SEP storms).',
    region.terrainNotice,
  ];
  if (insightData?.status === 'HISTORICAL DATA' && insightData.sols.length > 0) {
    const s = insightData.sols[insightData.sols.length - 1];
    environmentalConcerns.push(
      `Historical Diurnal Temperature Reference (InSight Elysium Planitia Sol ${s.sol}, Oct 2020): ${s.tempMinC}°C to ${s.tempMaxC}°C, pressure ${s.pressureAvgPa} Pa.`
    );
  } else {
    environmentalConcerns.push(
      'Diurnal Thermal Extreme Context: Martian surface temperatures swing roughly -100°C pre-dawn to ~0°C afternoon (InSight live API disconnected / mission ended Dec 2022).'
    );
  }

  const hiriseCheck = checkHiRiseRegionalCoverage(region);
  const missingDatasets: string[] = [
    'Real-time surface weather, dust optical depth (tau), and live SEP radiation alerts (NOT CONNECTED).',
    'Continuous global sub-meter (<0.3 m/px) HiRISE terrain/boulder coverage.',
  ];
  if (!hiriseCheck.hasDirectTileOrDem) {
    missingDatasets.push(`Local 1 m/px stereo DEM not connected for ${region.name} (using 200–463 m/px global DEM).`);
  }
  if (!config.equipment.includes('HiRISE Local Slope Stereo Package')) {
    missingDatasets.push('No local HiRISE micro-slope stereo verification package selected in simulator equipment.');
  }

  const missionLimitations: string[] = [
    'DEMONSTRATION SCENARIO — Generated waypoints follow straight spherical segments and do not automatically route around meter-scale boulders, steep gullies, or sand traps.',
    'Safe human EVA traverse cannot be certified from simulated parameters or distance alone without HiRISE inspection and local rover/scout reconnaissance.',
  ];
  if (
    estimatedDurationHours > 4 &&
    !config.equipment.includes('Pressurized EVA Rover')
  ) {
    missionLimitations.push(
      `Simulated travel duration (${estimatedDurationHours.toFixed(
        2
      )} hrs) exceeds 4 hours without a Pressurized EVA Rover selected.`
    );
  }
  if (!config.equipment.includes('Solar Storm Dosimeter & Contingency Shelter')) {
    missionLimitations.push(
      'No Solar Storm Dosimeter & Contingency Shelter selected — crew exposed to unmitigated SEP solar particle events.'
    );
  }

  const assumptions: string[] = [
    `Constant EVA pace assumption: ${effectiveSpeed.toFixed(1)} km/h over Martian spherical radius R = 3,389.5 km (no slope speed penalty applied).`,
    `Linear coordinate spacing across ${wpCount} waypoints between ${formatMarsCoords(
      config.startLat,
      config.startLng,
      3
    )} and ${formatMarsCoords(config.destLat, config.destLng, 3)}.`,
    `Configured equipment: ${
      config.equipment.length > 0 ? config.equipment.join(', ') : 'None selected (Baseline EVA Suit)'
    }.`,
  ];

  return {
    config,
    regionName: region.name,
    generatedWaypoints,
    totalDistanceKm,
    estimatedDurationHours,
    terrainSummary,
    suggestedTargets,
    environmentalConcerns,
    missingDatasets,
    missionLimitations,
    assumptions,
    isDemonstration: true,
  };
}
