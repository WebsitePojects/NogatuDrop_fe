import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'src');
const shop = fs.readFileSync(path.join(root, 'pages/shared/Shop.jsx'), 'utf8');
const influencerCheckout = fs.readFileSync(path.join(root, 'pages/shared/InfluencerCheckout.jsx'), 'utf8');
const influencerPaymentStep = fs.readFileSync(path.join(root, 'pages/shared/InfluencerPaymentStep.jsx'), 'utf8');
const reports = fs.readFileSync(path.join(root, 'pages/main/InfluencerReports.jsx'), 'utf8');

test('public shop checkout keeps retries idempotent', () => {
  assert.match(shop, /if \(submittingRef\.current\) return/);
  assert.match(shop, /getCheckoutIntent\(checkoutIntentRef\.current, payload\)/);
  assert.match(shop, /payment_provider: paymentProvider/);
});

test('influencer checkout posts one product with the chosen quantity, once per intent', () => {
  assert.match(influencerCheckout, /placing\.run\(/, 'order submit goes through the shared submit guard');
  assert.match(influencerCheckout, /getCheckoutIntent\(checkoutIntentRef\.current, payload\)/);
  assert.match(influencerCheckout, /createIntentHeaders\(checkoutIntentRef\.current\)/);
  assert.match(influencerCheckout, /ORDERS\.PUBLIC_INFLUENCER\(slug\)/);
  assert.match(influencerCheckout, /items: \[\{ product_id: product\.id, quantity \}\]/);
  assert.doesNotMatch(influencerCheckout, /member_username/, 'no member field on influencer links');
  assert.match(influencerPaymentStep, /uploading\.run\(/, 'proof upload is guarded too');
  assert.match(influencerPaymentStep, /if \(proofSent\) return;/, 'a sent proof cannot be sent again from the same page');
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
