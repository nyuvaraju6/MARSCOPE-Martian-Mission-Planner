import assert from 'node:assert/strict';
import test from 'node:test';
import { MARS_MAP_LAYERS } from '../data/marsLayers';
import { MARS_REGIONS } from '../data/marsRegions';
import { buildMarsContextSnapshot, sanitizeSourceReferences } from './aiContext';
import { DEFAULT_GALE_DEMO_MISSION } from './missionStorage';
import { assessRouteRisk, computeTerrainProfileMetrics } from './terrainAnalysis';

test('sanitizeSourceReferences preserves verified NASA/USGS URLs and strips unverified domains', () => {
  const cleaned = sanitizeSourceReferences([
    {
      label: 'NASA Mars Trek',
      url: 'https://trek.nasa.gov/mars/',
      relevance: 'DEM elevation service',
    },
    {
      label: 'Fabricated Blog',
      url: 'https://fake-mars-journal.example.com/paper',
      relevance: 'Unverified',
    },
    {
      label: 'Malformed',
      url: 'not-a-url',
      relevance: 'Invalid',
    },
  ]);

  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].url, 'https://trek.nasa.gov/mars/');
});

test('sanitizeSourceReferences falls back to verified defaults when empty', () => {
  const cleaned = sanitizeSourceReferences([]);
  assert.ok(cleaned.length >= 3);
  assert.ok(cleaned.every((r) => r.url.startsWith('https://')));
});

test('buildMarsContextSnapshot explicitly lists missing datasets and demonstration state', () => {
  const profileMetrics = computeTerrainProfileMetrics([]);
  const riskAssessment = assessRouteRisk({
    waypoints: DEFAULT_GALE_DEMO_MISSION.waypoints,
    walkingSpeedKmH: DEFAULT_GALE_DEMO_MISSION.walkingSpeedKmH,
    profileResponse: null,
    profileMetrics,
  });

  const snapshot = buildMarsContextSnapshot({
    region: MARS_REGIONS[0],
    inspectedCoords: { lat: -4.59, lng: 137.44 },
    activeLayer: MARS_MAP_LAYERS[0],
    pointAnalysis: null,
    geologyRecord: null,
    mission: DEFAULT_GALE_DEMO_MISSION,
    profileResponse: null,
    profileMetrics,
    riskAssessment,
    insightData: null,
  });

  assert.equal(snapshot.region.id, 'gale-crater');
  assert.equal(snapshot.missionRoute.isDemonstration, true);
  assert.equal(snapshot.inspectedPoint.dataAvailability, 'UNAVAILABLE');
  assert.ok(
    snapshot.missingDatasets.some((d) => d.includes('InSight')),
    'Should flag unavailable live weather telemetry'
  );
  assert.ok(
    snapshot.missingDatasets.some((d) => d.includes('DEM')),
    'Should flag missing point DEM when not yet sampled'
  );
});
