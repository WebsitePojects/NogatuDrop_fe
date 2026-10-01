import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'src');
const shop = fs.readFileSync(path.join(root, 'pages/shared/Shop.jsx'), 'utf8');
const reports = fs.readFileSync(path.join(root, 'pages/main/InfluencerReports.jsx'), 'utf8');

test('public checkout keeps retries idempotent and influencer orders fixed to one item', () => {
  assert.match(shop, /if \(submittingRef\.current\) return/);
  assert.match(shop, /getCheckoutIntent\(checkoutIntentRef\.current, payload\)/);
  assert.match(shop, /PUBLIC_INFLUENCER\(influencerSlug\)/);
  assert.match(shop, /quantity: 1/);
  assert.match(shop, /payment_provider: paymentProvider/);
});

test('influencer report renders the backend aggregate field names exactly', () => {
  assert.match(reports, /row\.orders/);
  assert.match(reports, /row\.paid_orders/);
  assert.match(reports, /row\.delivered_orders/);
  assert.match(reports, /row\.delivered_revenue/);
  assert.doesNotMatch(reports, /row\.paid_count|row\.delivered_count/);
});
