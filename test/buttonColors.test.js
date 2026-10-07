import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// A flowbite <Button> that paints its own background or text colour fights the shared theme: the theme's
// `enabled:hover:` background wins on hover while the custom text colour stays. That is how Order
// Details' "Close" turned white-on-white on hover (2026-10-07). Buttons pick a `color` (and `outline`)
// from src/theme/flowbiteTheme.js; className is for spacing, width and weight only.
const SRC = fileURLToPath(new URL('../src', import.meta.url));
const COLOR_CLASS = /(^|[\s"'`{(:])(dark:)?(hover:)?(enabled:hover:)?(bg-(?!opacity)|text-white|text-(gray|amber|red|green|emerald|coffee|slate|orange|blue|yellow)-\d|text-\[#)/;

const walk = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.jsx') ? [join(dir, e.name)] : []));

// An opening tag ends at the first '>' outside braces and quotes (arrow functions contain '>').
function openingTag(src, start) {
  let depth = 0;
  let quote = null;
  for (let i = start + 7; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (depth === 0 && (ch === '"' || ch === "'")) quote = ch;
    else if (ch === '`') quote = '`';
    else if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '>' && depth === 0) return src.slice(start, i);
  }
  return src.slice(start);
}

test('no <Button> overrides the theme colours through className', () => {
  const offenders = [];
  let buttons = 0;
  for (const file of walk(SRC)) {
    const src = readFileSync(file, 'utf8');
    for (let at = src.indexOf('<Button'); at !== -1; at = src.indexOf('<Button', at + 7)) {
      if (/\w/.test(src[at + 7])) continue; // <ButtonGroup and friends
      buttons += 1;
      const cls = openingTag(src, at).match(/className=("[^"]*"|\{`[^`]*`\}|\{[^}]*\})/);
      if (cls && COLOR_CLASS.test(cls[1])) {
        offenders.push(`${relative(SRC, file)}:${src.slice(0, at).split('\n').length} ${cls[1].slice(0, 90)}`);
      }
    }
  }
  assert.ok(buttons > 100, `scanned ${buttons} buttons; the scan must actually find the app's buttons`);
  assert.deepEqual(offenders, [], `use color="…" (and outline) instead:\n${offenders.join('\n')}`);
});
