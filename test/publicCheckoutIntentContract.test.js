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

test('influencer report renders the pinned API field names and exports through the authenticated client', () => {
  [
    'row.order_number', 'row.created_at', 'row.payment_provider', 'row.fulfillment_center',
    'row.customer_location', 'row.total_amount', 'row.status',
    'summary.order_count', 'summary.gross_sales', 'summary.by_provider', 'summary.by_center',
  ].forEach((field) => assert.ok(reports.includes(field), `report page must render ${field}`));
  assert.match(reports, /REPORTS\.INFLUENCERS_EXPORT/);
  assert.match(reports, /responseType: 'blob'/);
  assert.match(reports, /if \(exportingRef\.current/);
  assert.doesNotMatch(reports, /window\.open/);
});
