import test from 'node:test';
import assert from 'node:assert/strict';
import { INFLUENCER_ROUTE, decideInfluencerRoute } from '../src/pages/shared/influencerRouteDecision.js';
import { normalizePaymentProviders } from '../src/pages/shared/paymentProviders.js';
import { REPORTS, GRN } from '../src/services/endpoints.js';

const httpError = (status) => ({ response: { status } });

test('a known slug resolves to the influencer shop', () => {
  const payload = { slug: 'kawoodee', product: { id: 7, name: 'Berry NAD+' } };
  assert.equal(decideInfluencerRoute({ payload }), INFLUENCER_ROUTE.SHOP);
});

test('an unknown slug (404) or malformed slug (400) resolves to not-found', () => {
  assert.equal(decideInfluencerRoute({ error: httpError(404) }), INFLUENCER_ROUTE.NOT_FOUND);
  assert.equal(decideInfluencerRoute({ error: httpError(400) }), INFLUENCER_ROUTE.NOT_FOUND);
});

test('a 200 without a configured product fails closed to not-found', () => {
  assert.equal(decideInfluencerRoute({ payload: { slug: 'kawoodee' } }), INFLUENCER_ROUTE.NOT_FOUND);
  assert.equal(decideInfluencerRoute({ payload: { slug: 'kawoodee', product: {} } }), INFLUENCER_ROUTE.NOT_FOUND);
  assert.equal(decideInfluencerRoute({}), INFLUENCER_ROUTE.NOT_FOUND);
});

test('network failures and server errors offer a retry instead of a false 404', () => {
  assert.equal(decideInfluencerRoute({ error: new Error('Network Error') }), INFLUENCER_ROUTE.RETRY);
  assert.equal(decideInfluencerRoute({ error: httpError(500) }), INFLUENCER_ROUTE.RETRY);
  assert.equal(decideInfluencerRoute({ error: httpError(503) }), INFLUENCER_ROUTE.RETRY);
});

test('payment providers accept bare codes or account objects and drop duplicates/blanks', () => {
  const options = normalizePaymentProviders([
    'gcash',
    { provider: 'BDO', account_name: 'Nogatu Inc', account_number: '0012' },
    'GCASH',
    '',
    null,
  ]);
  assert.deepEqual(options.map((o) => o.provider), ['GCASH', 'BDO']);
  assert.equal(options[1].accountName, 'Nogatu Inc');
  assert.equal(options[1].accountNumber, '0012');
  assert.equal(options[0].accountNumber, '');
  assert.deepEqual(normalizePaymentProviders(undefined), []);
});

test('relaunch endpoint constants keep the names other pages depend on', () => {
  assert.equal(REPORTS.INFLUENCERS, '/reports/influencers');
  assert.equal(REPORTS.INFLUENCERS_EXPORT, '/reports/influencers/export');
  assert.equal(GRN.QUICK_RECEIVE, '/grn/quick-receive');
});
