import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleState, checkPart, stateDifference, validateMascot } from '../plugins/brand-studio/skills/brand-design/scripts/mascot.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/brand-studio/skills/brand-design/scripts/mascot.mjs', import.meta.url));
const VB = '0 0 512 512';
const part = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}">${body}</svg>`;

function rig(edit = s => s, files = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'mascot-'));
  mkdirSync(path.join(dir, 'parts'));
  writeFileSync(path.join(dir, 'brand.json'), JSON.stringify({ tokens: { light: { surface: '#f6f6f3', ink: '#101114', accent: '#ffe14d' }, dark: { surface: '#101114' } } }));
  const all = {
    'parts/body.svg': part('<rect width="240" height="240" rx="72" fill="#FFE14D"/>'),
    'parts/eyes-open.svg': part('<ellipse cx="216" cy="245" rx="13" ry="17" fill="#101114"/>'),
    'parts/eyes-closed.svg': part('<rect x="203" y="243" width="26" height="8" rx="4" fill="#101114"/>'),
    ...files,
  };
  for (const [file, svg] of Object.entries(all)) writeFileSync(path.join(dir, file), svg);
  const states = ['welcome', 'reading', 'drafting', 'waiting', 'sent', 'idle'].map((id, i) => ({ id, moment: `moment ${id}`, parts: { body: 'base', eyes: i % 2 ? 'closed' : 'open' } }));
  const spec = edit({
    schemaVersion: 1, name: 'Card', concept: 'The logo card', brand: 'brand.json', viewBox: VB, palette: [],
    slots: ['body', 'eyes'], parts: { body: { base: 'parts/body.svg' }, eyes: { open: 'parts/eyes-open.svg', closed: 'parts/eyes-closed.svg' } },
    states, constants: ['silhouette'], variables: ['eyes'],
    behaviour: { appearsWhen: ['after send'], never: ['blocks input'], canTurnOff: true },
  });
  return { spec, dir };
}
const errs = ({ spec, dir }) => validateMascot(spec, { root: dir }).errors;
const SCORE = { hook: 'A card with the logo bar for a mouth', fiveWords: 'The logo card, alive', scores: { recognition: 8, originality: 8, simplicity: 7, fit: 7, range: 6, appeal: 6 } };
const scored = edit => errs(rig(s => ({ ...s, conceptScore: edit(structuredClone(SCORE)) })));

test('accepts a valid rig, uppercase hex included', () => assert.deepEqual(errs(rig()), []));

test('returns one error for a spec that is not an object', () => {
  assert.deepEqual(validateMascot(null).errors, ['spec must be an object']);
  assert.deepEqual(validateMascot([]).errors, ['spec must be an object']);
});

test('needs 6 to 10 states, each tied to a product moment', () => {
  assert.ok(errs(rig(s => ({ ...s, states: s.states.slice(0, 5) }))).some(e => e.includes('needs 6 to 10')));
  assert.ok(errs(rig(s => ({ ...s, states: [...s.states, ...s.states.map(x => ({ ...x, id: `${x.id}-2` }))] }))).some(e => e.includes('needs 6 to 10')));
  assert.ok(errs(rig(s => { s.states[0].moment = ''; return s; })).some(e => e.includes('moment')));
});

test('rejects unknown parts, duplicate ids and paths outside the folder', () => {
  assert.ok(errs(rig(s => { s.states[1].parts.eyes = 'wink'; return s; })).some(e => e.includes('eyes.wink')));
  assert.ok(errs(rig(s => { s.states[1].id = 'welcome'; return s; })).some(e => e.includes('duplicate state id')));
  assert.ok(errs(rig(s => { s.parts.body.base = '../outside.svg'; return s; })).some(e => e.includes("inside the spec's folder")));
  assert.ok(errs(rig(s => { s.parts.body.base = '/etc/hosts'; return s; })).some(e => e.includes("inside the spec's folder")));
});

test('people can always turn the mascot off', () => {
  assert.ok(errs(rig(s => ({ ...s, behaviour: { ...s.behaviour, canTurnOff: false } }))).some(e => e.includes('canTurnOff')));
});

test('parts use filled shapes in contract colours only', () => {
  const opts = { viewBox: VB, allowed: new Set(['#101114']) };
  assert.deepEqual(checkPart(part('<rect fill="#101114"/>'), opts), []);
  assert.ok(checkPart(part('<rect fill="#ff0000"/>'), opts).some(e => e.includes('not in the contract')));
  assert.ok(checkPart(part('<rect fill="#fff"/>'), opts).some(e => e.includes('six-digit hex')));
  assert.ok(checkPart(part('<rect/>'), opts).some(e => e.includes('render black')));
  assert.ok(checkPart(part('<path d="M0 0" fill="none" stroke="#101114"/>'), opts).some(e => e.includes('filled shapes only')));
  assert.ok(checkPart(part('<image/><rect fill="#101114"/>'), opts).some(e => e.includes('<image>')));
  assert.ok(checkPart('<svg viewBox="0 0 10 10"><rect fill="#101114"/></svg>', opts).some(e => e.includes('viewBox')));
});

test('an off-palette fill in a part fails the spec and names the file', () => {
  assert.ok(errs(rig(s => s, { 'parts/body.svg': part('<rect fill="#00ff00"/>') })).some(e => e.startsWith('parts/body.svg:')));
});

test('a spec palette colour outside the contract passes with a warning', () => {
  const r = rig(s => ({ ...s, palette: ['#ff8fa3'] }), { 'parts/body.svg': part('<rect fill="#ff8fa3"/>') });
  const { errors, warnings } = validateMascot(r.spec, { root: r.dir });
  assert.deepEqual(errors, []);
  assert.ok(warnings.some(w => w.includes('#ff8fa3')));
});

test('a concept score needs 42 of 60, with recognition and originality at 8 or more', () => {
  assert.deepEqual(scored(c => c), []);
  assert.ok(scored(c => { c.scores.appeal = 5; return c; }).some(e => e.includes('41 of 60')));
  assert.ok(scored(c => { c.scores.recognition = 7; c.scores.appeal = 7; return c; }).some(e => e.includes('recognition is 7')));
  assert.ok(scored(c => { c.scores.originality = 7; c.scores.range = 7; return c; }).some(e => e.includes('originality is 7')));
  assert.ok(scored(c => { c.scores.fit = 11; return c; }).some(e => e.includes('whole number from 1 to 10')));
  assert.ok(scored(c => { delete c.scores.range; return c; }).some(e => e.includes('scores.range')));
  assert.ok(scored(c => { c.fiveWords = 'a yellow card that has a face'; return c; }).some(e => e.includes('five words')));
  assert.ok(scored(c => { c.hook = ''; return c; }).some(e => e.includes('hook')));
});

test('a rig without a concept score passes with a warning', () => {
  const { spec, dir } = rig();
  const { errors, warnings } = validateMascot(spec, { root: dir });
  assert.deepEqual(errors, []);
  assert.ok(warnings.some(w => w.includes('conceptScore')));
});

test('stateDifference is the share of covered pixels that change', () => {
  const a = Buffer.from([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0]);
  const b = Buffer.from([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 0]);
  assert.equal(stateDifference(a, a), 0);
  assert.equal(stateDifference(a, b), 2 / 3);
  assert.equal(stateDifference(Buffer.alloc(8), Buffer.alloc(8)), 0);
});

test('assembles a state with slots stacked bottom to top', () => {
  const { spec, dir } = rig();
  const svg = assembleState(spec, { id: 'x', parts: { eyes: 'open', body: 'base' } }, f => readFileSync(path.join(dir, f), 'utf8'));
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 512 512">/);
  assert.ok(svg.indexOf('data-slot="body"') < svg.indexOf('data-slot="eyes"'));
});

test('assembly keeps styling a part sets on its root', () => {
  const r = rig(s => s, { 'parts/body.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}" fill="#ffe14d"><rect width="240" height="240"/></svg>` });
  assert.deepEqual(errs(r), []);
  const svg = assembleState(r.spec, { id: 'x', parts: { body: 'base' } }, f => readFileSync(path.join(r.dir, f), 'utf8'));
  assert.match(svg, /<g data-slot="body" fill="#ffe14d"><rect/);
});

test('the CLI runs when started through a symlink', () => {
  const link = path.join(mkdtempSync(path.join(tmpdir(), 'link-')), 'mascot.mjs');
  symlinkSync(SCRIPT, link);
  const run = spawnSync(process.execPath, [link], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Usage: node mascot\.mjs/);
});

test('the CLI warns about parts that vanish on a surface and states that look alike', () => {
  // The body is yellow with no outline, so it melts into the light surface; welcome and drafting use the same parts.
  const { spec, dir } = rig();
  writeFileSync(path.join(dir, 'mascot.json'), JSON.stringify({ ...spec, conceptScore: SCORE }));
  const run = spawnSync(process.execPath, [SCRIPT, path.join(dir, 'mascot.json')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stderr, /welcome: body keeps 0% of its pixels at 3:1 on the light surface/);
  assert.match(run.stderr, /welcome and drafting differ in 0% of their pixels at 48 px/);
  const report = JSON.parse(readFileSync(path.join(dir, 'out', 'report.json'), 'utf8'));
  assert.deepEqual(Object.keys(report.states[0]), ['id', 'moment', 'silhouette', 'distinct', 'visible']);
  assert.equal(report.states[0].distinct, 0);
  assert.ok(existsSync(path.join(dir, 'out', 'contact-sheet.png')));
});
