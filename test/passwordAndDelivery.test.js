import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordProblem } from '../src/utils/passwordPolicy.js';
import { formatDeliveryWindow } from '../src/utils/deliveryEstimate.js';

test('forms check the same password rule as the server', () => {
  assert.equal(passwordProblem('Strong#Pass1'), '');
  assert.match(passwordProblem('Ab1!'), /at least 8/);
  assert.match(passwordProblem('abcd1234'), /symbol/);
  assert.match(passwordProblem('abcdefg!'), /number/);
  assert.match(passwordProblem('1234567!'), /letter/);
});

test('delivery window shows the quoted calendar days without shifting a day', () => {
  assert.equal(formatDeliveryWindow('2026-11-18', '2026-11-25'), 'Nov 18 – Nov 25');
  assert.equal(formatDeliveryWindow('2026-12-31', '2027-01-09'), 'Dec 31 – Jan 9');
  assert.equal(formatDeliveryWindow('2026-11-18', '2026-11-18'), 'Nov 18');
  assert.equal(formatDeliveryWindow(null, null), '');
});
