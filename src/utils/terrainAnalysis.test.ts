import test from 'node:test';
import assert from 'node:assert/strict';
import type { RouteTerrainAnalysisResponse, Waypoint } from '../types/mars';
import {
  assessRouteRisk,
  computeStencilSlopeAndMorphology,
  computeTerrainProfileMetrics,
  enrichProfileSamplesWithSlope,
  interpolateRoutePoints,
} from './terrainAnalysis';

test('computes accurate 45 degree slope on cardinal elevation stencil', () => {
  // 200 m step north-south with north=+200m and south=-200m -> dz = 400m over 400m -> grade 1.0 -> 45 deg
  const res = computeStencilSlopeAndMorphology({
    center: 0,
    north: 200,
    south: -200,
    east: 0,
    west: 0,
    stepMeters: 200,
  });
  assert.equal(res.slopeDeg, 45);
  assert.equal(res.slopePercent, 100);
  assert.equal(res.isSteepSlope, true);
  assert.equal(res.slopeCategory, 'STEEP (>=15°)');
});

test('identifies local depression / crater floor morphology when center is below surrounding rim', () => {
  const res = computeStencilSlopeAndMorphology({
    center: -4600,
    north: -4540,
    south: -4545,
    east: -4550,
    west: -4535,
    stepMeters: 200,
  });
  assert.equal(res.morphologyLabel, 'LOCAL DEPRESSION / CRATER FLOOR');
  assert.ok(res.relativeReliefM !== null && res.relativeReliefM < -40);
});

test('computes elevation profile metrics including highest, lowest, elevation diff, and steep sections', () => {
  const samples = enrichProfileSamplesWithSlope([
    { distanceKm: 0, lat: -4.58, lng: 137.44, elevationM: -4500, waypointName: 'Start' },
    { distanceKm: 0.5, lat: -4.588, lng: 137.44, elevationM: -4480 },
    { distanceKm: 1.0, lat: -4.596, lng: 137.44, elevationM: -4320, waypointName: 'Steep Ridge' }, // 160m rise over 500m -> ~17.74 deg
    { distanceKm: 1.5, lat: -4.604, lng: 137.44, elevationM: -4350, waypointName: 'End' },
  ]);

  const metrics = computeTerrainProfileMetrics(samples);
  assert.equal(metrics.highestPointM, -4320);
  assert.equal(metrics.lowestPointM, -4500);
  assert.equal(metrics.elevationDifferenceM, 180);
  assert.equal(metrics.totalElevationGainM, 180);
  assert.equal(metrics.totalElevationLossM, 30);
  assert.ok(metrics.maxSlopeDeg !== null && metrics.maxSlopeDeg >= 15);
  assert.equal(metrics.steepSections.length, 1);
});

test('short route with steep slope is classified as HIGH TERRAIN CONCERN, never safe based on distance alone', () => {
  const shortWaypoints: Waypoint[] = [
    { id: '1', name: 'Base', lat: -4.6, lng: 137.44 },
    { id: '2', name: 'Rim', lat: -4.603, lng: 137.44 },
  ];
  const samples = enrichProfileSamplesWithSlope([
    { distanceKm: 0, lat: -4.6, lng: 137.44, elevationM: -4500, waypointName: 'Base' },
    { distanceKm: 0.2, lat: -4.603, lng: 137.44, elevationM: -4430, waypointName: 'Rim' }, // 70m over 200m = 19.3 deg
  ]);
  const metrics = computeTerrainProfileMetrics(samples);
  const profileResponse: RouteTerrainAnalysisResponse = {
    status: 'COMPLETE',
    demName: 'Gale Crater 1m DEM',
    demInstrument: 'HRSC/CTX/HiRISE',
    demResolution: '1 m/pixel',
    demSourceUrl: 'https://trek.nasa.gov/mars/',
    demCoverageNote: 'Regional coverage',
    samples,
    nearbyFeatures: [],
    nearbyDuneFields: [],
    nearbyMineralDetections: [],
    queriedAt: '2026-11-14T00:00:00Z',
  };

  const risk = assessRouteRisk({
    waypoints: shortWaypoints,
    walkingSpeedKmH: 2.0,
    profileResponse,
    profileMetrics: metrics,
  });

  assert.equal(risk.category, 'HIGH TERRAIN CONCERN');
  assert.equal(risk.isPreliminary, false);
  assert.ok(risk.totalDistanceKm < 0.5);
});

test('unavailable DEM marks route assessment as preliminary and prevents LOW TERRAIN CONCERN classification', () => {
  const shortWaypoints: Waypoint[] = [
    { id: '1', name: 'A', lat: 18.4, lng: 77.6 },
    { id: '2', name: 'B', lat: 18.41, lng: 77.61 },
  ];
  const samples = enrichProfileSamplesWithSlope([
    { distanceKm: 0, lat: 18.4, lng: 77.6, elevationM: null },
    { distanceKm: 0.8, lat: 18.41, lng: 77.61, elevationM: null },
  ]);
  const metrics = computeTerrainProfileMetrics(samples);
  const risk = assessRouteRisk({
    waypoints: shortWaypoints,
    walkingSpeedKmH: 2.0,
    profileResponse: null,
    profileMetrics: metrics,
  });

  assert.equal(risk.isPreliminary, true);
  assert.notEqual(risk.category, 'LOW TERRAIN CONCERN');
  assert.ok(risk.preliminaryReason?.includes('Preliminary Assessment'));
});

test('interpolates route vertices while preserving waypoint names and cumulative endpoints', () => {
  const waypoints: Waypoint[] = [
    { id: '1', name: 'Start', lat: -4.59, lng: 137.44 },
    { id: '2', name: 'End', lat: -4.62, lng: 137.46 },
  ];
  const pts = interpolateRoutePoints(waypoints, 12);
  assert.ok(pts.length >= 4);
  assert.equal(pts[0].waypointName, 'Start');
  assert.equal(pts[pts.length - 1].waypointName, 'End');
  assert.equal(pts[0].distanceKm, 0);
  assert.ok(pts[pts.length - 1].distanceKm > 1);
});
