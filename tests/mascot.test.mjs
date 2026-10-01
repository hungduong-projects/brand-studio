import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleState, checkPart, validateMascot } from '../plugins/brand-studio/skills/brand-design/scripts/mascot.mjs';

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
