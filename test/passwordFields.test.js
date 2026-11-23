// Standing UI rule: every password field lets the person show what they typed (components/PasswordInput).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? files(p) : /\.(jsx|js)$/.test(name) ? [p] : [];
});
// These two draw their own eye button (dark login card styling).
const OWN_TOGGLE = ['Login.jsx', 'ForgotPassword.jsx'];

test('no password input without the show/hide eye', () => {
  const offenders = files('src').filter((file) => {
    if (file.endsWith('PasswordInput.jsx')) return false;
    const src = readFileSync(file, 'utf8');
    if (OWN_TOGGLE.some((name) => file.endsWith(name))) {
      return !/aria-label=\{show\w* \? 'Hide password' : 'Show password'\}/.test(src);
    }
    return /type=["']password["']|type="password"/.test(src);
  });
  assert.deepEqual(offenders, [], `use components/PasswordInput in: ${offenders.join(', ')}`);
});
