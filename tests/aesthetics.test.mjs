import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { corners, judge, phiClaims, rasterFacts, subpaths, vectorFacts } from '../plugins/brand-studio/skills/brand-design/scripts/aesthetics.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/brand-studio/skills/brand-design/scripts/aesthetics.mjs', import.meta.url));
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const svg = (body, size = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${body}</svg>`;
const ROUND_RECT = 'M10 0H90A10 10 0 0 1 100 10V90A10 10 0 0 1 90 100H10A10 10 0 0 1 0 90V10A10 10 0 0 1 10 0Z';

test('reads relative, implicit and compact path commands', () => {
  const [square, tail] = subpaths('M0 0L10 0 10 10z m5 5 h1');
  assert.equal(square.closed, true);
  assert.equal(square.segs.length, 3);
  assert.deepEqual(tail.segs[0][3], { x: 6, y: 5 });
  assert.deepEqual(subpaths('M3 7a2 2 0 012-2h14')[0].segs.at(-1)[3], { x: 19, y: 5 });
});

test('a circular corner jumps in curvature and a continuous one does not', () => {
  const circular = corners(ROUND_RECT);
  assert.equal(circular.length, 4);
  assert.ok(circular.every(c => c.abrupt && Math.round(c.radius) === 10));
  // Both handles lie on the edges they meet, so curvature starts at zero.
  assert.deepEqual(corners('M0 100V20C0 5 5 0 20 0H100').map(c => c.abrupt), [false]);
  // A pill's round ends turn 180 degrees: they are caps, not corners.
  assert.deepEqual(corners('M20 0H80A20 20 0 0 1 80 40H20A20 20 0 0 1 20 0Z'), []);
});

test('reads rounded rects, strokes and the canvas', () => {
  const facts = vectorFacts(svg('<rect x="100" y="100" width="800" height="800" rx="200"/><path d="M0 0h10" stroke="#000" stroke-width="4"/>'));
  assert.equal(facts.canvas, 1024);
  assert.deepEqual(facts.strokes, [4]);
  assert.equal(facts.corners.length, 4);
});

test('measures weight, outline and mirror symmetry from pixels', () => {
  // A 2 × 4 bar at the left of an 8 × 8 canvas: symmetric about its own centre.
  const size = 8, px = new Uint8Array(size * size * 4);
  for (let y = 2; y < 6; y++) for (let x = 0; x < 2; x++) px[(y * size + x) * 4 + 3] = 255;
  assert.deepEqual(rasterFacts(px, size), { weight: 8 / 64, detail: 8 / 8, symmetry: 1 });
  px[(2 * size + 1) * 4 + 3] = 0;
  assert.ok(rasterFacts(px, size).symmetry < 1);
});

test('warns about circular corners, mixed strokes and radii, and outliers in a set', () => {
  const app = { id: 'card', ...vectorFacts(svg('<rect x="100" y="100" width="800" height="800" rx="200"/>')) };
  const glyph = { id: 'ticket', ...vectorFacts(svg('<rect x="3" y="3" width="18" height="18" rx="6"/>', 24)) };
  const small = { id: 'prop', ...vectorFacts(svg('<rect x="100" y="100" width="100" height="100" rx="20"/>')) };
  assert.match(judge({ items: [], sources: [app] })[0], /card: 4 of 4 large rounded corners jump/);
  assert.deepEqual(judge({ items: [], sources: [glyph] }), [], 'glyphs keep Lucide circular corners');
  assert.deepEqual(judge({ items: [], sources: [small] }), [], 'corners under a tenth of the canvas are too small to see');
  const strokes = [2, 3].map(w => ({ id: `w${w}`, ...vectorFacts(svg(`<path d="M0 0h9" stroke="#000" stroke-width="${w}"/>`, 24)) }));
  assert.match(judge({ items: [], sources: strokes })[0], /2 stroke widths across the set \(2, 3\)/);
  const radii = [1, 2, 4].map(r => ({ id: `r${r}`, ...vectorFacts(svg(`<rect width="12" height="12" rx="${r}"/>`, 24)) }));
  assert.match(judge({ items: [], sources: radii })[0], /3 corner radii across the set \(1, 2, 4\)/);
  const items = [0.2, 0.21, 0.5].map((weight, i) => ({ id: `g${i}`, weight, detail: 3 }));
  assert.deepEqual(judge({ items, sources: [] }), ["g2: weight is 2.4× the set's median; compare it beside the others"]);
});

test('finds golden-ratio claims in the notes beside the artwork', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'phi-'));
  writeFileSync(path.join(dir, 'PROVENANCE.md'), '# Mascot\n\nThe head sits on the golden ratio.\n');
  writeFileSync(path.join(dir, 'notes.txt'), 'golden ratio');
  const claims = phiClaims(dir);
  assert.equal(claims.length, 1);
  assert.match(claims[0], /PROVENANCE\.md:3: cites the golden ratio/);
});

test('the CLI audits a folder and the Deskhand mascot rig', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'audit-'));
  writeFileSync(path.join(dir, 'card.svg'), svg('<rect x="100" y="100" width="800" height="800" rx="200" fill="#101114"/>'));
  const run = spawnSync(process.execPath, [SCRIPT, dir, path.join(ROOT, 'examples/deskhand/mascot/mascot.json'), '--json'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const { sets } = JSON.parse(run.stdout);
  assert.match(sets[0].warnings[0], /card: 4 of 4 large rounded corners jump/);
  assert.equal(sets[1].items.length, 8);
  assert.ok(sets[1].items.every(i => i.weight > 0 && i.symmetry > 0));
});
