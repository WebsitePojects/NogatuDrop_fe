import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const mainLayoutSource = readFileSync(new URL('../src/layouts/MainLayout.jsx', import.meta.url), 'utf8');
const stockistLayoutSource = readFileSync(new URL('../src/layouts/StockistLayout.jsx', import.meta.url), 'utf8');
const mobileLayoutSource = readFileSync(new URL('../src/layouts/MobileLayout.jsx', import.meta.url), 'utf8');
const shopSource = readFileSync(new URL('../src/pages/shared/Shop.jsx', import.meta.url), 'utf8');

test('app shell removes phase workspace pages from the live route surface', () => {
  assert.equal(appSource.includes('LandingPage'), false);
  assert.equal(appSource.includes('Phase1Workspace'), false);
  assert.match(appSource, /path="\/"\s+element={<Navigate to="\/shop" replace \/>}/);
  assert.match(appSource, /path="\/track"\s+element={<Tracking \/>}/);
});

test('main navigation keeps only operational super admin pages', () => {
  assert.equal(mainLayoutSource.includes('Control Tower'), false);
  assert.equal(mainLayoutSource.includes('Dispatch Board'), false);
  assert.equal(mainLayoutSource.includes('Delivery Exceptions'), false);
  assert.equal(mainLayoutSource.includes('Verification Queue'), false);
  assert.equal(mainLayoutSource.includes('Regional Routing'), false);
  assert.equal(mainLayoutSource.includes('Replenishment Planner'), false);
  assert.equal(mainLayoutSource.includes('Expiry Risk Board'), false);
  assert.equal(mainLayoutSource.includes('Capacity Heatmap'), false);
});

test('stockist and mobile navigation remove duplicate workspace views', () => {
  assert.equal(stockistLayoutSource.includes('Kanban Orders'), false);
  assert.equal(stockistLayoutSource.includes('Payment Status'), false);
  assert.equal(stockistLayoutSource.includes('Dispatch Readiness'), false);
  assert.equal(stockistLayoutSource.includes('Courier Performance'), false);
  assert.equal(stockistLayoutSource.includes('Delivery Proofs'), false);
  assert.equal(stockistLayoutSource.includes('Segments'), false);
  assert.equal(stockistLayoutSource.includes('Activity and Last Login'), false);
  assert.equal(stockistLayoutSource.includes('Risk Signals'), false);

  assert.equal(mobileLayoutSource.includes("label: 'Reorder'"), false);
  assert.equal(mobileLayoutSource.includes("label: 'Account'"), false);
});

test('public shop uses production public routes instead of placeholder navigation', () => {
  assert.equal(shopSource.includes('PRODUCTS.PUBLIC'), true);
  assert.equal(shopSource.includes("to=\"/track/search\""), false);
  assert.equal(shopSource.includes("to=\"/track\""), true);
});

test('public shop exposes a recoverable catalog error state instead of failing silently', () => {
  assert.equal(shopSource.includes('const [productsError, setProductsError] = useState(\'\');'), true);
  assert.equal(shopSource.includes('Catalog temporarily unavailable'), true);
  assert.equal(shopSource.includes('Retry catalog load'), true);
  assert.equal(shopSource.includes('No matching products found'), true);
});
