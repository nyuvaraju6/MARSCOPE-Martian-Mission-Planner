import assert from 'node:assert/strict';
import test from 'node:test';
import { MARS_REGIONS } from '../data/marsRegions';
import { checkHiRiseRegionalCoverage } from '../services/nasaDataManager';
import type {
  PointTerrainAnalysis,
  RouteRiskAssessment,
  RouteTerrainAnalysisResponse,
  TerrainProfileMetrics,
} from '../types/mars';
import {
  buildScenarioSimulation,
  generateMissionRecommendations,
  getLayerComparisonInsight,
} from './missionIntelligence';
import { DEFAULT_GALE_DEMO_MISSION } from './missionStorage';

const baseMetrics: TerrainProfileMetrics = {
  highestPointM: -4146,
  lowestPointM: -4521,
  elevationDifferenceM: 375,
  totalElevationGainM: 400,
  totalElevationLossM: 25,
  maxSlopeDeg: 6.2,
  validSampleCount: 20,
  totalSampleCount: 20,
  incompleteSampleCount: 0,
  steepSections: [],
};

const baseRisk: RouteRiskAssessment = {
  category: 'MODERATE TERRAIN CONCERN',
  isPreliminary: false,
  preliminaryReason: null,
  totalDistanceKm: 9.05,
  estimatedHours: 4.52,
  maxSlopeDeg: 6.2,
  steepSectionCount: 0,
  incompleteDataCount: 0,
  obstacleAlerts: [],
  riskFactors: [],
  safetyDisclaimer: 'Test disclaimer',
};

test('flags steep terrain concern when route max slope >= 15 degrees', () => {
  const recs = generateMissionRecommendations({
    region: MARS_REGIONS[0],
    mission: DEFAULT_GALE_DEMO_MISSION,
    pointAnalysis: null,
    geologyRecord: null,
    profileResponse: {
      status: 'COMPLETE',
      demName: 'Gale DEM',
      demInstrument: 'HiRISE',
      demResolution: '1 m/pixel',
      demSourceUrl: 'https://trek.nasa.gov/mars/',
      demCoverageNote: 'ok',
      samples: [],
      nearbyFeatures: [],
      nearbyDuneFields: [],
      nearbyMineralDetections: [],
      queriedAt: '2026-11-14T00:00:00Z',
    },
    profileMetrics: { ...baseMetrics, maxSlopeDeg: 19.4 },
    riskAssessment: { ...baseRisk, category: 'HIGH TERRAIN CONCERN', maxSlopeDeg: 19.4 },
    insightData: null,
  });

  const steepRec = recs.find((r) => r.id === 'rec-steep-slope');
  assert.ok(steepRec);
  assert.equal(steepRec.severity, 'HIGH CONCERN');
});

test('flags insufficient data warning when elevation DEM information is missing', () => {
  const missingPoint: PointTerrainAnalysis = {
    lat: -13.9,
    lng: -59.2,
    primaryElevationM: null,
    primaryDemName: 'MOLA',
    primaryDemInstrument: 'MOLA',
    primaryDemResolution: 'Unavailable',
    primaryDemSourceUrl: 'https://trek.nasa.gov/mars/',
    molaGlobalElevationM: null,
    molaHrscElevationM: null,
    regionalHiResElevationM: null,
    slopeDeg: null,
    slopePercent: null,
    aspectLabel: null,
    slopeCategory: 'UNAVAILABLE',
    isSteepSlope: false,
    morphologyLabel: 'UNAVAILABLE',
    relativeReliefM: null,
    nearbyFeatures: [],
    nearbyDuneFields: [],
    nearbyMineralDetections: [],
    dataAvailability: 'UNAVAILABLE',
    limitationNote: 'Unavailable',
    queriedAt: '2026-11-14T00:00:00Z',
  };

  const recs = generateMissionRecommendations({
    region: MARS_REGIONS[3], // Valles Marineris (no HiRISE live stream)
    mission: DEFAULT_GALE_DEMO_MISSION,
    pointAnalysis: missingPoint,
    geologyRecord: null,
    profileResponse: null,
    profileMetrics: { ...baseMetrics, validSampleCount: 0, maxSlopeDeg: null },
    riskAssessment: { ...baseRisk, isPreliminary: true },
    insightData: null,
  });

  assert.ok(recs.some((r) => r.id === 'rec-missing-elevation' && r.severity === 'INSUFFICIENT DATA'));
  assert.ok(recs.some((r) => r.id === 'rec-hirise-inspection'));
  const envRec = recs.find((r) => r.id === 'rec-historical-env');
  assert.ok(envRec?.observationDateNote?.includes('Aug 2012'));
});

test('checks HiRISE regional coverage accurately for Jezero vs Olympus Mons', () => {
  const jezero = MARS_REGIONS.find((r) => r.id === 'jezero-crater')!;
  const olympus = MARS_REGIONS.find((r) => r.id === 'olympus-mons')!;
  assert.equal(checkHiRiseRegionalCoverage(jezero).hasDirectTileOrDem, true);
  assert.equal(checkHiRiseRegionalCoverage(olympus).hasDirectTileOrDem, false);
});

test('scenario simulator computes deterministic distance, duration, waypoints, and explicit assumptions', () => {
  const profile: RouteTerrainAnalysisResponse = {
    status: 'COMPLETE',
    demName: 'Gale 1m DEM',
    demInstrument: 'HiRISE/CTX/HRSC',
    demResolution: '1 m/pixel',
    demSourceUrl: 'https://trek.nasa.gov/mars/',
    demCoverageNote: 'ok',
    samples: [],
    nearbyFeatures: [],
    nearbyDuneFields: [],
    nearbyMineralDetections: [],
    queriedAt: '2026-11-14T00:00:00Z',
  };

  const sim = buildScenarioSimulation({
    config: {
      regionId: 'gale-crater',
      startLat: -4.5895,
      startLng: 137.4417,
      destLat: -4.718,
      destLng: 137.418,
      waypointCount: 5,
      walkingSpeedKmH: 2.5,
      scientificObjective: 'Sample sulfate-clay contact',
      equipment: ['Portable Drill & Spectrometer'],
    },
    insightData: null,
    profileResponse: profile,
    profileMetrics: baseMetrics,
  });

  assert.equal(sim.isDemonstration, true);
  assert.equal(sim.generatedWaypoints.length, 5);
  assert.ok(sim.totalDistanceKm > 7 && sim.totalDistanceKm < 9);
  assert.equal(
    sim.estimatedDurationHours,
    Number((sim.totalDistanceKm / 2.5).toFixed(2))
  );
  assert.ok(sim.assumptions.length >= 3);
  assert.ok(sim.missingDatasets.length >= 2);
});

test('comparison insight returns targeted scientific explanation for elevation vs thermal', () => {
  const insight = getLayerComparisonInsight('terrain', 'thermal_night');
  assert.equal(insight.headline, 'Elevation vs. Thermal Imagery');
  assert.ok(insight.scientificRevelation.includes('thermal inertia'));
});
