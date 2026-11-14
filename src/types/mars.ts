export type PageId =
  | 'home'
  | 'explorer'
  | 'planner'
  | 'intelligence'
  | 'ai-assistant'
  | 'data'
  | 'safety'
  | 'about';

export type MarsLayerCategory =
  | 'terrain'
  | 'thermal_day'
  | 'thermal_night'
  | 'hirise'
  | 'geology'
  | 'surface_ctx'
  | 'surface_viking'
  | 'slope_elevation';

export interface MarsMapLayer {
  id: MarsLayerCategory;
  code: string;
  name: string;
  shortLabel: string;
  missionSource: string;
  instrument: string;
  resolution: string;
  description: string;
  serviceType: 'wmts' | 'wms' | 'xyz' | 'unavailable_global';
  url: string;
  wmsLayers?: string;
  attribution: string;
  officialSourceUrl: string;
  officialSourceLabel: string;
  maxNativeZoom: number;
  zoomOffset?: number;
  tileSize?: number;
  regionalOverlays?: Array<{
    label: string;
    url: string;
    maxNativeZoom: number;
    bounds: [[number, number], [number, number]];
  }>;
  availabilityStatus: 'LIVE TILES' | 'PARTIAL COVERAGE' | 'CATALOG REFERENCE';
  legendItems: Array<{ color: string; label: string }>;
  limitationNote: string;
}

export interface MarsRegion {
  id: string;
  name: string;
  quadrangle: string;
  lat: number;
  lng: number;
  zoom: number;
  elevationSummary: string;
  missionHistory: string;
  scientificInterest: string;
  terrainNotice: string;
}

export type ScientificTargetCategory =
  | 'Layered sedimentary formations'
  | 'Clay-bearing deposits'
  | 'Sulfate-bearing deposits'
  | 'Crater formations'
  | 'Ancient geological structures'
  | 'Other geological target';

export interface ScientificTarget {
  id: string;
  name: string;
  category: ScientificTargetCategory;
  lat: number;
  lng: number;
  description: string;
  createdAt: string;
}

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  notes?: string;
}

export interface MissionPlan {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  scientificObjective: string;
  walkingSpeedKmH: number;
  waypoints: Waypoint[];
  scientificTargets: ScientificTarget[];
  status: string;
  isDemonstration: boolean;
  updatedAt: string;
}

export type DatasetCategory =
  | 'OPTICAL DATA'
  | 'THERMAL DATA'
  | 'TOPOGRAPHIC DATA'
  | 'SPECTRAL DATA'
  | 'GEOLOGICAL DATA'
  | 'ATMOSPHERIC AND RADIATION DATA';

export interface ScientificDataset {
  id: string;
  category: DatasetCategory;
  name: string;
  mission: string;
  instrument: string;
  scientificPurpose: string;
  dataType: string;
  coverage: string;
  sourceUrl: string;
  sourceName: string;
  availabilityStatus: 'DIRECT MAP LAYER' | 'PUBLIC ARCHIVE' | 'HISTORICAL API';
}

export interface InSightSolRecord {
  sol: string;
  firstUtc: string | null;
  lastUtc: string | null;
  season: string | null;
  tempAvgC: number | null;
  tempMinC: number | null;
  tempMaxC: number | null;
  pressureAvgPa: number | null;
  windAvgMs: number | null;
}

export interface InSightApiResponse {
  status: 'HISTORICAL DATA' | 'DATA NOT CONNECTED';
  source: string;
  sourceUrl?: string;
  note?: string;
  error?: string;
  sols: InSightSolRecord[];
}

export interface NearbyMarsFeature {
  name: string;
  type: string;
  diameterKm: number | null;
  distanceKm: number;
  lat: number;
  lng: number;
  link?: string;
}

export interface NearbyDuneField {
  duneId: string;
  duneType: string;
  avgElevationM: number | null;
  meanHeightM: number | null;
  areaKm2: number | null;
  comments?: string;
}

export interface NearbyMineralDetection {
  type: string;
  instrument: string;
  lat: number;
  lng: number;
}

export type SlopeCategory =
  | 'GENTLE (<5°)'
  | 'MODERATE (5°–10°)'
  | 'CAUTION (10°–15°)'
  | 'STEEP (>=15°)'
  | 'UNAVAILABLE';

export type MorphologyLabel =
  | 'LOCAL DEPRESSION / CRATER FLOOR'
  | 'ELEVATED RIM / RIDGE'
  | 'SLOPING FLANK / BENCH'
  | 'RELATIVELY PLANAR'
  | 'UNAVAILABLE';

export interface PointTerrainAnalysis {
  lat: number;
  lng: number;
  primaryElevationM: number | null;
  primaryDemName: string;
  primaryDemInstrument: string;
  primaryDemResolution: string;
  primaryDemSourceUrl: string;
  molaGlobalElevationM: number | null;
  molaHrscElevationM: number | null;
  regionalHiResElevationM: number | null;
  regionalHiResDemName?: string;
  regionalHiResResolution?: string;
  slopeDeg: number | null;
  slopePercent: number | null;
  aspectLabel: string | null;
  slopeCategory: SlopeCategory;
  isSteepSlope: boolean;
  morphologyLabel: MorphologyLabel;
  relativeReliefM: number | null;
  nearbyFeatures: NearbyMarsFeature[];
  nearbyDuneFields: NearbyDuneField[];
  nearbyMineralDetections: NearbyMineralDetection[];
  dataAvailability: 'HIGH-RES REGIONAL DEM' | 'GLOBAL MOLA+HRSC DEM' | 'UNAVAILABLE';
  limitationNote: string;
  queriedAt: string;
  error?: string;
}

export interface TerrainProfileSample {
  distanceKm: number;
  lat: number;
  lng: number;
  elevationM: number | null;
  segmentSlopeDeg: number | null;
  isSteep: boolean;
  waypointName?: string;
}

export interface RouteTerrainAnalysisResponse {
  status: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';
  demName: string;
  demInstrument: string;
  demResolution: string;
  demSourceUrl: string;
  demCoverageNote: string;
  samples: TerrainProfileSample[];
  nearbyFeatures: NearbyMarsFeature[];
  nearbyDuneFields: NearbyDuneField[];
  nearbyMineralDetections: NearbyMineralDetection[];
  queriedAt: string;
  error?: string;
}

export type RouteRiskCategory =
  | 'LOW TERRAIN CONCERN'
  | 'MODERATE TERRAIN CONCERN'
  | 'HIGH TERRAIN CONCERN';

export interface SteepSectionSummary {
  legLabel: string;
  startKm: number;
  endKm: number;
  slopeDeg: number;
  elevationDeltaM: number;
  lat: number;
  lng: number;
}

export interface TerrainProfileMetrics {
  highestPointM: number | null;
  lowestPointM: number | null;
  elevationDifferenceM: number | null;
  totalElevationGainM: number | null;
  totalElevationLossM: number | null;
  maxSlopeDeg: number | null;
  validSampleCount: number;
  totalSampleCount: number;
  incompleteSampleCount: number;
  steepSections: SteepSectionSummary[];
}

export interface RouteRiskAssessment {
  category: RouteRiskCategory;
  isPreliminary: boolean;
  preliminaryReason: string | null;
  totalDistanceKm: number;
  estimatedHours: number;
  maxSlopeDeg: number | null;
  steepSectionCount: number;
  incompleteDataCount: number;
  obstacleAlerts: string[];
  riskFactors: string[];
  safetyDisclaimer: string;
}

// ==================================================
// VERSION 3: MISSION INTELLIGENCE & PROVENANCE TYPES
// ==================================================

export type NasaModuleId = 'MOLA' | 'THEMIS' | 'HiRISE' | 'CTX' | 'CRISM' | 'RAD';

export type NasaModuleAvailability =
  | 'AVAILABLE'
  | 'PARTIAL COVERAGE'
  | 'HISTORICAL ARCHIVE'
  | 'UNAVAILABLE'
  | 'CHECKING';

export interface GeologyPointRecord {
  lat: number;
  lng: number;
  unitCode: string | null;
  unitDescription: string | null;
  areaKm2: number | null;
  sourceName: string;
  sourceUrl: string;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  retrievedAt: string;
  cached?: boolean;
  error?: string;
}

export interface NasaDataModuleMetadata {
  id: NasaModuleId;
  datasetName: string;
  mission: string;
  instrument: string;
  provider: string;
  observationDate: string;
  isHistoricalOnly: boolean;
  spatialResolution: string;
  coverage: string;
  sourceUrl: string;
  endpointLabel: string;
  scientificPurpose: string;
  limitationNote: string;
}

export interface NasaServiceHealthItem {
  id: NasaModuleId | 'GEOLOGY' | 'INSIGHT';
  label: string;
  status: NasaModuleAvailability;
  httpStatus: number | null;
  latencyMs: number | null;
  checkedAt: string;
  message: string;
  cached: boolean;
}

export interface NasaServicesStatusResponse {
  checkedAt: string;
  cached: boolean;
  services: NasaServiceHealthItem[];
}

export interface DatasetProvenanceRecord {
  id: string;
  moduleId: string;
  datasetName: string;
  nasaMission: string;
  instrument: string;
  originalProvider: string;
  observationDate: string;
  temporalClass: 'Historical Measurements' | 'Archived Mosaic / DEM' | 'Catalog Index';
  spatialResolution: string;
  coverage: string;
  sourceUrl: string;
  availabilityStatus: NasaModuleAvailability;
  lastRetrievedAt: string | null;
}

export type ComparisonPresetId =
  | 'elevation-vs-thermal'
  | 'geology-vs-elevation'
  | 'minerals-vs-imagery'
  | 'slope-vs-route';

export type RecommendationSeverity =
  | 'HIGH CONCERN'
  | 'INSUFFICIENT DATA'
  | 'OBSERVATION RECOMMENDED'
  | 'CAUTION'
  | 'HISTORICAL CONTEXT';

export type RecommendationCategory =
  | 'Scientific Exploration Targets'
  | 'Terrain Concerns'
  | 'Missing Scientific Information'
  | 'Recommended Additional Observations'
  | 'Route Planning Considerations';

export interface MissionRecommendation {
  id: string;
  category: RecommendationCategory;
  severity: RecommendationSeverity;
  title: string;
  rationale: string;
  ruleTriggered: string;
  actionableStep: string;
  observationDateNote?: string;
}

export type SimulatorEquipmentOption =
  | 'Pressurized EVA Rover'
  | 'Unassisted Suited EVA Only'
  | 'Portable Drill & Spectrometer'
  | 'HiRISE Local Slope Stereo Package'
  | 'Solar Storm Dosimeter & Contingency Shelter';

export interface ScenarioSimulatorConfig {
  regionId: string;
  startLat: number;
  startLng: number;
  destLat: number;
  destLng: number;
  waypointCount: number;
  walkingSpeedKmH: number;
  scientificObjective: string;
  equipment: SimulatorEquipmentOption[];
}

export interface ScenarioSimulationResult {
  config: ScenarioSimulatorConfig;
  regionName: string;
  generatedWaypoints: Waypoint[];
  totalDistanceKm: number;
  estimatedDurationHours: number;
  terrainSummary: string;
  suggestedTargets: string[];
  environmentalConcerns: string[];
  missingDatasets: string[];
  missionLimitations: string[];
  assumptions: string[];
  isDemonstration: true;
}

// ==================================================
// VERSION 4: AI-POWERED MARTIAN EXPLORATION ASSISTANT TYPES
// ==================================================

export interface AiSourceReference {
  label: string;
  url: string;
  relevance: string;
}

export interface MarsContextSnapshot {
  generatedAt: string;
  region: {
    id: string;
    name: string;
    quadrangle: string;
    centerCoords: string;
    elevationSummary: string;
    missionHistory: string;
    scientificInterest: string;
    terrainNotice: string;
  };
  inspectedPoint: {
    lat: number;
    lng: number;
    formatted: string;
    elevationM: number | null;
    slopeDeg: number | null;
    slopeCategory: SlopeCategory;
    morphologyLabel: MorphologyLabel;
    demName: string;
    demResolution: string;
    dataAvailability: 'HIGH-RES REGIONAL DEM' | 'GLOBAL MOLA+HRSC DEM' | 'UNAVAILABLE';
    nearbyFeatures: string[];
    nearbyDuneFieldsCount: number;
    nearbyMineralDetections: string[];
  };
  geology: {
    availability: 'AVAILABLE' | 'UNAVAILABLE';
    unitCode: string | null;
    unitDescription: string | null;
    areaKm2: number | null;
    sourceName: string;
  };
  activeMapLayer: {
    id: MarsLayerCategory;
    name: string;
    missionSource: string;
    instrument: string;
    resolution: string;
    availabilityStatus: string;
  };
  missionRoute: {
    name: string;
    isDemonstration: boolean;
    scientificObjective: string;
    waypointCount: number;
    startCoords: string;
    destCoords: string;
    totalDistanceKm: number;
    estimatedHours: number;
    walkingSpeedKmH: number;
    segmentCount: number;
    routeRiskCategory: RouteRiskCategory;
    isPreliminaryRisk: boolean;
    profileStatus: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';
    demResolutionUsed: string;
    highestPointM: number | null;
    lowestPointM: number | null;
    elevationDifferenceM: number | null;
    maxRouteSlopeDeg: number | null;
    steepSectionCount: number;
    scientificTargets: string[];
    obstacleAlerts: string[];
  };
  historicalEnvironment: {
    radBaseline: string;
    insightWeatherSummary: string;
  };
  missingDatasets: string[];
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  regionName?: string;
  references?: AiSourceReference[];
  model?: string;
  error?: string;
}

export interface AiStatusResponse {
  configured: boolean;
  status: 'CONNECTED' | 'UNAVAILABLE';
  model: string;
  message: string;
  checkedAt: string;
}

export interface GeologicalObservationPreset {
  id: string;
  title: string;
  regionHint: string;
  observationText: string;
  spectralEvidenceProvided: boolean;
}

export interface GeologicalInterpretationResult {
  observationAnalyzed: string;
  epistemicClassification: string;
  geologicalSignificance: string;
  relevantConcepts: string[];
  additionalObservationsNeeded: string[];
  recommendedNasaInstruments: string[];
  scientificUncertainties: string[];
  spectralEvidenceRuleNote: string;
  references: AiSourceReference[];
  model: string;
  generatedAt: string;
}

export interface TerrainIntelligenceResult {
  elevationDifferences: string;
  steepSectionsAnalysis: string;
  terrainVariability: string;
  potentialTraverseChallenges: string[];
  missingDataAreas: string[];
  safetyClearanceStatement: string;
  references: AiSourceReference[];
  model: string;
  generatedAt: string;
}

export interface MissionAdvisorAssessment {
  missionOverview: string;
  scientificObjectives: string;
  terrainObservations: string;
  potentialConcerns: string[];
  recommendedDatasets: string[];
  additionalInvestigations: string[];
  missionLimitations: string[];
  evidenceVsRecommendationsNote: string;
  references: AiSourceReference[];
  model: string;
  generatedAt: string;
}

