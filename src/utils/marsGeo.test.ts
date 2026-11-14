import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARS_MEAN_RADIUS_KM,
  assessRouteMobility,
  calculateEstimatedDurationHours,
  calculateMarsDistanceKm,
  calculateRouteDistanceKm,
  formatMarsCoords,
  normalizeLongitude180,
} from './marsGeo';

test('Mars equatorial 1 degree arc equals pi * R / 180 km', () => {
  const expected = (Math.PI * MARS_MEAN_RADIUS_KM) / 180;
  const actual = calculateMarsDistanceKm(0, 0, 0, 1);
  assert.ok(Math.abs(actual - expected) < 0.001, `Expected ~${expected}, got ${actual}`);
});

test('Zero distance for identical coordinates', () => {
  assert.equal(calculateMarsDistanceKm(-4.59, 137.44, -4.59, 137.44), 0);
});

test('Multi-waypoint route distance sums segments deterministically', () => {
  const waypoints = [
    { id: '1', name: 'Start', lat: -4.5, lng: 137.4 },
    { id: '2', name: 'Mid', lat: -4.6, lng: 137.4 },
    { id: '3', name: 'End', lat: -4.6, lng: 137.5 },
  ];
  const seg1 = calculateMarsDistanceKm(-4.5, 137.4, -4.6, 137.4);
  const seg2 = calculateMarsDistanceKm(-4.6, 137.4, -4.6, 137.5);
  const total = calculateRouteDistanceKm(waypoints);
  assert.ok(Math.abs(total - (seg1 + seg2)) < 1e-9);
});

test('Duration calculation handles valid and invalid walking speeds', () => {
  assert.equal(calculateEstimatedDurationHours(10, 2.5), 4);
  assert.equal(calculateEstimatedDurationHours(10, 0), 0);
  assert.equal(calculateEstimatedDurationHours(10, -2), 0);
  assert.equal(calculateEstimatedDurationHours(0, 2.5), 0);
});

test('Longitude normalization and coordinate formatting use planetary hemispheres', () => {
  assert.equal(normalizeLongitude180(200), -160);
  assert.equal(normalizeLongitude180(-190), 170);
  assert.equal(formatMarsCoords(-4.59, 137.44), '4.59° S, 137.44° E');
  assert.equal(formatMarsCoords(18.38, -133.5), '18.38° N, 133.50° W');
});

test('Mobility assessment never certifies route without DEM verification', () => {
  const waypoints = [
    { id: '1', name: 'Landing Point', lat: -4.5895, lng: 137.4417 },
    { id: '2', name: 'Mount Sharp Foothills', lat: -4.72, lng: 137.49 },
  ];
  const result = assessRouteMobility(waypoints, 2.0);
  assert.ok(result.totalDistanceKm > 7 && result.totalDistanceKm < 9);
  assert.equal(result.evaRangeClassification, 'EXTENDED SURFACE EVA');
  assert.match(result.safetyCertification, /NOT CERTIFIED FOR CREW TRAVERSE/);
});
