// Copy the Deskhand brand contract from the website into the app, so the app builds on its own.
// `--check` fails when the copy has drifted from the source instead of writing it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const source = new URL('../../../../apps/showcase/src/deskhand.brand.json', import.meta.url);
const target = new URL('../src/brand/brand.json', import.meta.url);
const text = readFileSync(source, 'utf8');
if (process.argv.includes('--check')) {
  let copy = '';
  try { copy = readFileSync(target, 'utf8'); } catch {}
  if (copy !== text) { console.error('src/brand/brand.json differs from apps/showcase/src/deskhand.brand.json. Run npm run sync-brand.'); process.exit(1); }
  console.log('brand.json matches the website contract');
} else {
  mkdirSync(new URL('.', target), { recursive: true });
  writeFileSync(target, text);
  console.log('synced src/brand/brand.json');
}
