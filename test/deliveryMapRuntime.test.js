import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRoutePolyline,
  shouldAttemptGoogleMaps,
} from '../src/utils/deliveryMapRuntime.js';

test('shouldAttemptGoogleMaps rejects missing and placeholder keys', () => {
  assert.equal(shouldAttemptGoogleMaps(''), false);
  assert.equal(shouldAttemptGoogleMaps('   '), false);
  assert.equal(shouldAttemptGoogleMaps('your_google_maps_api_key'), false);
  assert.equal(shouldAttemptGoogleMaps('changeme'), false);
});

test('shouldAttemptGoogleMaps accepts keys that look like browser Google Maps keys', () => {
  assert.equal(shouldAttemptGoogleMaps('AIzaSyD2VwQ9aBcDeFgHiJkLmNoPqRsTuVwXyZ'), true);
});

test('buildRoutePolyline keeps only fully valid coordinate points', () => {
  const result = buildRoutePolyline({
    sourcePoint: { lat: 7.12345, lng: 125.67891 },
    currentPoint: { lat: Number.NaN, lng: 121.1 },
    destinationPoint: { lat: 8.54321, lng: 126.11111 },
  });

  assert.deepEqual(result, [
    { lat: 7.12345, lng: 125.67891 },
    { lat: 8.54321, lng: 126.11111 },
  ]);
});

test('buildRoutePolyline returns an empty array when fewer than two valid points exist', () => {
  const result = buildRoutePolyline({
    sourcePoint: { lat: 14.1, lng: 121.2 },
    currentPoint: null,
    destinationPoint: { lat: null, lng: 122.3 },
  });

  assert.deepEqual(result, []);
});
