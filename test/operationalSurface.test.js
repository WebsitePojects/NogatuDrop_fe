import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const mainLayoutSource = readFileSync(new URL('../src/layouts/MainLayout.jsx', import.meta.url), 'utf8');
const stockistLayoutSource = readFileSync(new URL('../src/layouts/StockistLayout.jsx', import.meta.url), 'utf8');
const mobileLayoutSource = readFileSync(new URL('../src/layouts/MobileLayout.jsx', import.meta.url), 'utf8');
const landingSource = readFileSync(new URL('../src/pages/shared/LandingPage.jsx', import.meta.url), 'utf8');
const shopSource = readFileSync(new URL('../src/pages/shared/Shop.jsx', import.meta.url), 'utf8');
const stockistOrdersSource = readFileSync(new URL('../src/pages/stockist/Orders.jsx', import.meta.url), 'utf8');
const stockistCatalogSource = readFileSync(new URL('../src/pages/stockist/Catalog.jsx', import.meta.url), 'utf8');
const loginSource = readFileSync(new URL('../src/pages/shared/Login.jsx', import.meta.url), 'utf8');
const apiSource = readFileSync(new URL('../src/services/api.js', import.meta.url), 'utf8');
const productImagesSource = readFileSync(new URL('../src/utils/productImages.js', import.meta.url), 'utf8');
const mainOrdersSource = readFileSync(new URL('../src/pages/main/Orders.jsx', import.meta.url), 'utf8');
const mainWarehousesSource = readFileSync(new URL('../src/pages/main/Warehouses.jsx', import.meta.url), 'utf8');
const stockistWarehousesSource = readFileSync(new URL('../src/pages/stockist/Warehouses.jsx', import.meta.url), 'utf8');
const endpointsSource = readFileSync(new URL('../src/services/endpoints.js', import.meta.url), 'utf8');
const pricingBreakdownSource = readFileSync(new URL('../src/components/OrderPricingBreakdown.jsx', import.meta.url), 'utf8');
const mobileInventorySource = readFileSync(new URL('../src/pages/mobile/Inventory.jsx', import.meta.url), 'utf8');
const stockistPurchaseOrdersSource = readFileSync(new URL('../src/pages/stockist/PurchaseOrders.jsx', import.meta.url), 'utf8');

test('app shell removes phase workspace pages from the live route surface', () => {
  assert.equal(appSource.includes('LandingPage'), true);
  assert.equal(appSource.includes('Phase1Workspace'), false);
  assert.match(appSource, /path="\/"\s+element={<LandingPage \/>}/);
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

test('staff does not keep direct access to stockist ordering catalog routes', () => {
  assert.match(appSource, /path="catalog"[\s\S]*requiredPermission=\{PERMISSIONS\.CART_USE\}/);
  assert.match(appSource, /path="catalog\/:id"[\s\S]*requiredPermission=\{PERMISSIONS\.CART_USE\}/);
  assert.match(stockistLayoutSource, /\.\.\.\(canUseCart \? \[\{ path: '\/stockist\/catalog'/);
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

test('public shop now completes checkout with a bank-transfer payment wall and proof upload', () => {
  assert.equal(shopSource.includes('Bank Transfer Instructions'), true);
  assert.equal(shopSource.includes('Choose Payment Proof File'), true);
  assert.equal(shopSource.includes('Submit Payment Proof'), true);
  assert.equal(shopSource.includes('ORDERS.PUBLIC_PAYMENT_PROOF'), true);
  assert.equal(shopSource.includes('Track my order'), true);
  assert.equal(shopSource.includes('VAT and System Fee Included'), true);
  assert.equal(shopSource.includes('normalizeIncomingPublicCart'), true);
});

test('public tracking can continue unpaid orders with payment instructions and proof upload', () => {
  const trackingSource = readFileSync(new URL('../src/pages/shared/Tracking.jsx', import.meta.url), 'utf8');

  assert.equal(trackingSource.includes('Payment Instructions'), true);
  assert.equal(trackingSource.includes('Phone number used at checkout'), true);
  assert.equal(trackingSource.includes('ORDERS.PUBLIC_PAYMENT_PROOF'), true);
  assert.equal(trackingSource.includes('Payment proof already uploaded'), true);
  assert.equal(trackingSource.includes('Submit payment proof'), true);
});

test('stockist orders split own and child queues while exposing child payment and delivery actions', () => {
  assert.equal(stockistOrdersSource.includes('My City Orders'), true);
  assert.equal(stockistOrdersSource.includes('Mobile Stockist Orders'), true);
  assert.equal(stockistOrdersSource.includes('My Provincial Orders'), true);
  assert.equal(stockistOrdersSource.includes('Affiliated City Orders'), true);
  assert.equal(stockistOrdersSource.includes('Verify Payment'), true);
  assert.equal(stockistOrdersSource.includes('Generate Delivery Link'), true);
  assert.equal(stockistOrdersSource.includes('Delivery Magic Link'), true);
});

test('order details expose a reconciled total breakdown and high-contrast payment actions', () => {
  assert.equal(pricingBreakdownSource.includes('Merchandise subtotal'), true);
  assert.equal(pricingBreakdownSource.includes('Shipping fee'), true);
  assert.equal(pricingBreakdownSource.includes('System fee'), true);
  assert.equal(pricingBreakdownSource.includes('Total amount'), true);
  assert.equal(mainOrdersSource.includes('<OrderPricingBreakdown'), true);
  assert.equal(stockistOrdersSource.includes('<OrderPricingBreakdown'), true);
  assert.equal(mainOrdersSource.includes('bg-emerald-600 text-white'), true);
  assert.equal(stockistOrdersSource.includes('bg-emerald-600 text-white'), true);
  assert.equal(mainOrdersSource.includes('bg-amber-400 text-amber-950'), true);
});

test('warehouse screens use backend-owned My Warehouses and Affiliated Network tabs', () => {
  for (const source of [mainWarehousesSource, stockistWarehousesSource]) {
    assert.equal(source.includes('My Warehouses'), true);
    assert.equal(source.includes('Affiliated Network'), true);
    assert.equal(source.includes("params: { view: activeView"), true);
  }
});

test('Mobile Stockist portal is inventory-only and exposes audited manual adjustments', () => {
  assert.equal(mobileLayoutSource.includes("label: 'Inventory'"), true);
  assert.equal(mobileLayoutSource.includes("label: 'Product Catalog'"), false);
  assert.equal(mobileLayoutSource.includes("label: 'My Orders'"), false);
  assert.equal(mobileLayoutSource.includes('FloatingCartButton'), false);
  assert.match(appSource, /path="inventory" element={<MobileInventory \/>}/);
  assert.equal(appSource.includes('<MobileCatalog />'), false);
  assert.equal(appSource.includes('<MobileCart />'), false);
  assert.equal(appSource.includes('<MobileOrders />'), false);
  assert.equal(mobileInventorySource.includes('Record direct sale'), true);
  assert.equal(mobileInventorySource.includes('Increase stock'), true);
  assert.equal(mobileInventorySource.includes('MOBILE_INVENTORY.ADJUST'), true);
});

test('purchase-order endpoints expose owner submit before supplier approval', () => {
  assert.equal(endpointsSource.includes('SUBMIT:  (id) => `/purchase-orders/${id}/submit`'), true);
  assert.equal(stockistPurchaseOrdersSource.includes('Submit to parent'), true);
  assert.equal(stockistPurchaseOrdersSource.includes('Accept supply request'), true);
});

test('landing checkout hands products forward into the public shop flow and shows the new total note', () => {
  assert.equal(landingSource.includes("navigate('/shop', { state: { cart: cartItems, openCheckout: true } });"), true);
  assert.equal(landingSource.includes('VAT and System Fee Included'), true);
});

test('frontend defaults API and image origins to the current browser host when env is unset', () => {
  assert.equal(apiSource.includes('const { protocol, hostname } = window.location;'), true);
  assert.equal(apiSource.includes('return `${protocol}//${hostname}:5000/api/v1`;'), true);
  assert.equal(productImagesSource.includes('const { protocol, hostname } = window.location;'), true);
  assert.equal(productImagesSource.includes('return `${protocol}//${hostname}:5000/api/v1`;'), true);
});

test('stockist catalog surfaces route-aware availability before checkout', () => {
  assert.equal(stockistCatalogSource.includes('available_qty'), true);
  assert.equal(stockistCatalogSource.includes('Unavailable from your route'), true);
  assert.equal(stockistCatalogSource.includes('is currently unavailable from your supply route'), true);
});

test('login form tabs from email to password before forgot-password recovery link', () => {
  const passwordFieldIndex = loginSource.indexOf('id="login-password"');
  const forgotPasswordIndex = loginSource.indexOf('Forgot password?');

  assert.equal(loginSource.includes('name="email"'), true);
  assert.equal(loginSource.includes('name="password"'), true);
  assert.ok(passwordFieldIndex > -1, 'Password field should exist');
  assert.ok(forgotPasswordIndex > -1, 'Forgot password link should exist');
  assert.ok(passwordFieldIndex < forgotPasswordIndex, 'Forgot password link should come after the password field in DOM order');
});
