import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Management 2026-10-27: a courier parcel (J&T, LBC) is followed on the courier's page and closed by staff.
const tracking = readFileSync(new URL('../src/pages/shared/Tracking.jsx', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../src/components/delivery/RiderLinkPanel.jsx', import.meta.url), 'utf8');
const endpoints = readFileSync(new URL('../src/services/endpoints.js', import.meta.url), 'utf8');

test('the buyer page shows no live map for a courier parcel', () => {
  assert.match(tracking, /trackingData\.status === 'delivering' && !trackingData\.courier_tracking_number && \(sourcePoint \|\| latestPingPoint\)/);
});

test('a courier parcel replaces the Rider Link and map with "Mark delivered"', () => {
  assert.match(panel, /\{!courier && route && \(route\.source \|\| route\.destination\)/, 'no map for a courier parcel');
  assert.match(panel, /\{courier \? null : \(/, 'no Rider Link or vehicle picker for a courier parcel');
  assert.match(panel, /showManage && courier && delivering \?/, 'the button only for staff, only while on the way');
  assert.match(panel, /const \{ submitting, run \} = useSubmitGuard\(\);[\s\S]*DELIVERY_TOKENS\.COURIER_DELIVERED/, 'guarded against double presses');
  assert.match(endpoints, /COURIER_DELIVERED: \(orderId\) => `\/delivery-tokens\/by-order\/\$\{orderId\}\/courier-delivered`/);
});
