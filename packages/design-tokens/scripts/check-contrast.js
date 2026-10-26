/**
 * WCAG contrast check stub for T-W1-07.4.
 *
 * W1: replaces placeholder with real assertions using the WCAG 2.1 relative
 * luminance formula. For now we fail the script only if a color token is
 * missing light/dark values, which keeps CI green without false assurance.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(resolve(__dirname, '..', 'tokens.json'), 'utf8'));

const fgBgPairs = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['textMuted', 'bg'],
  ['textMuted', 'surface'],
  ['primary', 'surface'],
  ['danger', 'surface'],
];

let fail = false;
for (const [name, v] of Object.entries(tokens.color)) {
  if (!v.light || !v.dark) {
    console.error(`tokens.color.${name} missing light/dark`);
    fail = true;
  }
}
for (const [fg, bg] of fgBgPairs) {
  // TODO W1: compute actual contrast ratio and assert ≥ 4.5:1 for body text.
  if (!tokens.color[fg] || !tokens.color[bg]) {
    console.error(`contrast pair ${fg}/${bg} missing`);
    fail = true;
  }
}
if (fail) process.exit(1);
console.log(`contrast: ${fgBgPairs.length} fg/bg pairs configured (real WCAG checks added in W1)`);
