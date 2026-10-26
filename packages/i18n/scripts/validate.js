import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '..', 'locales');

let ok = true;
const en = JSON.parse(readFileSync(join(dir, 'en-NG.json'), 'utf8'));
for (const file of readdirSync(dir)) {
  const locale = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  for (const key of Object.keys(en)) {
    if (!(key in locale)) {
      console.error(`${file} missing key: ${key}`);
      ok = false;
    }
  }
}
if (!ok) process.exit(1);
console.log(`i18n: ${Object.keys(en).length} keys validated across ${readdirSync(dir).length} locales`);
