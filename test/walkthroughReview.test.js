import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Regressions found in the 2026-10-13 walkthrough review.
const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), 'utf8');

test('rider signature: the canvas is not reset when the signature first becomes non-empty', () => {
  const deliver = read('pages/shared/Deliver.jsx');
  // The resize effect re-ran on signatureDirty, clearing the canvas mid-stroke and pasting back a snapshot
  // of the first stroke over the rest, so the start of every signature was lost.
  const effectDeps = deliver.match(/resizeSignatureCanvas\(\);[\s\S]*?\}, \[([^\]]*)\]\);/);
  assert.ok(effectDeps, 'resize effect found');
  assert.doesNotMatch(effectDeps[1], /signatureDirty/);
  assert.match(deliver, /const existing = signatureDirtyRef\.current \?/);
});

test('store home page shows no placeholder figures or invented testimonials', () => {
  const landing = read('pages/shared/LandingPage.jsx');
  for (const placeholder of ['120k+', '99.4%', '4.8/5', 'TESTIMONIALS', 'Enterprise Storefront', '24/7 Support']) {
    assert.ok(!landing.includes(placeholder), `LandingPage still contains "${placeholder}"`);
  }
});

test('dates the browser cannot read show a dash, never "Invalid Date"', async () => {
  const { formatDate } = await import('../src/utils/formatDate.js');
  assert.equal(formatDate('0000-00-00'), '—');
  assert.equal(formatDate(null), 'N/A');
  assert.notEqual(formatDate('2026-10-14'), '—');
});
