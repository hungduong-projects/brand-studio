import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateAssetBible } from '../plugins/brand-studio/skills/brand-design/scripts/asset-bible.mjs';

const root = fileURLToPath(new URL('../examples/deskhand/art/', import.meta.url));
const source = JSON.parse(readFileSync(new URL('asset-bible.json', `file://${root}`)));
const check = bible => validateAssetBible(bible, { root });
const has = (bible, text) => check(bible).errors.some(e => e.includes(text));

test('Deskhand art family passes with no palette drift', () => assert.deepEqual(check(source), { errors: [], warnings: [] }));

test('catches an overwritten master and a derivative written over it', () => {
  const b = structuredClone(source);
  b.assets[0].sha256 = '0'.repeat(64);
  b.assets[1].file = b.assets[0].file;
  assert.ok(has(b, 'masters are never overwritten'));
  assert.ok(has(b, 'also used by exploded-reply'));
});

test('requires versioned derivative names, lineage and changes', () => {
  const b = structuredClone(source);
  b.assets[2].file = 'derivatives/subject.png';
  b.assets[3].version = 2;
  b.assets[4].derivedFrom = 'missing';
  delete b.assets[1].changes;
  assert.ok(has(b, 'must end in -v1'));
  assert.ok(has(b, 'must end in -v2'));
  assert.ok(has(b, 'names a missing asset: missing'));
  assert.ok(has(b, 'changes must list'));
});

test('rejects derivative cycles that never reach a master', () => {
  const b = structuredClone(source);
  b.assets[1].derivedFrom = 'reply-sheet';
  b.assets[2].derivedFrom = 'paper-band';
  assert.ok(has(b, 'paper-band.derivedFrom does not lead back to a master'));
});

test('requires source records by type', () => {
  const b = structuredClone(source);
  b.assets[1].source = { type: 'generated', model: 'image-model-1', digitalSourceType: 'algorithmicMedia' };
  b.assets[2].source = { type: 'open-licence', title: 'Lamp', author: 'A. Maker', url: 'http://example.org', licence: 'CC0' };
  b.assets[3].source = { type: 'code', script: 'missing.mjs' };
  b.assets[4].source = { type: 'stock' };
  const { errors } = check(b);
  for (const text of ['source.prompt is required', 'must be trainedAlgorithmicMedia', 'url must be an HTTPS link', 'script not found', 'source.type must be one of']) assert.ok(errors.some(e => e.includes(text)), text);
});

test('requires alt text on content images, ids, roles, uses and two artifact types', () => {
  const b = structuredClone(source);
  b.assets[2].alt = '';
  b.assets[3].id = b.assets[2].id;
  b.assets[4].role = 'hero';
  for (const a of b.assets) a.uses = ['email'];
  b.assets[1].uses = [];
  const { errors } = check(b);
  for (const text of ['alt must describe', 'duplicate asset id', 'role must be one of', 'must name at least one artifact type', 'at least two artifact types']) assert.ok(errors.some(e => e.includes(text)), text);
});

test('palette must be hex and drift from brand tokens is a warning', () => {
  const b = structuredClone(source);
  b.palette.push({ role: 'purple glow', hex: '#7c3aed' }, { role: 'bad', hex: 'yellow' });
  const { errors, warnings } = check(b);
  assert.ok(errors.some(e => e.includes('palette[10]')));
  assert.deepEqual(warnings.length, 1);
  assert.ok(warnings[0].includes('#7c3aed'));
});

test('keeps files inside the bible folder and fails cleanly on bad input', () => {
  const b = structuredClone(source);
  b.assets[1].file = '../../../package-v1.json';
  assert.ok(has(b, "must stay inside the bible's folder"));
  assert.ok(check(null).errors.length);
  assert.ok(check({ assets: [null] }).errors.length);
});
