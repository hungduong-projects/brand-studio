import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const SKILL = fileURLToPath(new URL('../plugins/brand-studio/skills/take-apart/', import.meta.url));
const SCRIPT = path.join(SKILL, 'scripts/take-apart.mjs'), PHONE = path.join(SKILL, 'assets/phone.js');
const BRAND = fileURLToPath(new URL('../apps/showcase/src/deskhand.brand.json', import.meta.url));
const run = (...args) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  return { status: r.status, out: JSON.parse(r.stdout.trim().split('\n').at(-1) || '{}') };
};
const has = (list, part) => assert.ok(list.some(m => m.includes(part)), `expected "${part}" in ${JSON.stringify(list)}`);

// Two figures: a box whose lid opens into a figure of its own.
const layer = (key, z, more = {}) => ({ key, title: key.toUpperCase(), readout: `The ${key}.`, zA: z, draw: 'slab(0, 0, 60, 60, 6, 0, 4)', ...more });
const figure = layers => ({ crumb: 'Box', heading: 'Inside a box', alt: 'A box in layers.', caption: 'A box comes apart.', gap: [40, 30], layers });
const source = m => `model(${JSON.stringify(m, null, 1).replace(/"draw": "(.*)"/g, '"draw": () => $1')});`;
const box = (edit = m => m) => edit({
  tour: [{ dive: ['lid'], light: ['seal'] }],
  figures: {
    box: figure([layer('base', 0), layer('lid', 4, { parts: [{ name: 'Lid', at: [30, 30, 4], open: 'lid', id: 'lid' }], draw: "hit('lid', 'lid', 'the lid', slab(0, 0, 60, 60, 6, 0, 4))" })]),
    lid: figure([layer('shell', 0), layer('seal', 4)]),
  },
});
// A process: four steps side by side, where the second step opens the lid's figure.
const step = (key, x, more = {}) => ({ key, title: key.toUpperCase(), readout: `The ${key} step.`, at: [x, 0], draw: 'slab(0, 0, 40, 40, 4, 0, 6)', ...more });
const making = (edit = m => m) => edit({
  tour: [{ dive: ['lid'], light: ['seal'] }],
  end: ['Box', 'Boxes, made step by step.'],
  figures: {
    make: { crumb: 'Making', heading: 'How a box is made', alt: 'Four steps in a row.', caption: 'A box is made in four steps.', steps: [
      step('cut', 0), step('fold', 70, { parts: [{ name: 'Lid', at: [20, 20, 6], open: 'lid', id: 'lid' }], draw: "hit('lid', 'lid', 'the lid', slab(0, 0, 40, 40, 4, 0, 6))" }),
      step('glue', 140), step('pack', 210)] },
    lid: figure([layer('shell', 0), layer('seal', 4)]),
  },
});
const build = (edit, base = box) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'take-apart-')), file = path.join(dir, 'model.js');
  writeFileSync(file, source(base(edit)));
  return run(file, '--out', path.join(dir, 'out'));
};

test('the phone example builds into one page in the brand, with every figure reachable four levels deep', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'take-apart-'));
  const { status, out } = run(PHONE, '--brand', BRAND, '--out', dir);
  assert.equal(status, 0);
  assert.deepEqual([out.fails, out.warnings], [[], []]);
  assert.equal(out.depth, 4);
  const html = readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /<script src=/);
  assert.match(html, /\/\* brand \*\/\n:root \{ --bs-surface: /);
  assert.match(html, /<title>How a phone is built<\/title>/);
});

test('a small model builds with a warning that its first view has too few layers, and --beats lists its film from intro to end card', () => {
  const small = build().out;
  assert.deepEqual(small.fails, []);
  has(small.warnings, 'figure box: the first view has 2 layers; 4 to 7');
  const dir = mkdtempSync(path.join(tmpdir(), 'take-apart-')), file = path.join(dir, 'model.js');
  writeFileSync(file, source(box(m => ({ ...m, end: ['Box', 'Boxes, taken apart.'] }))));
  assert.deepEqual(run(file, '--beats').out.beats.map(b => b.id), ['intro', 'box#lid', 'into:lid', 'lid#seal', 'home', 'together', 'end']);
});

test('a part that opens no figure, a part with nothing to click and a figure no part opens all fail', () => {
  const { status, out } = build(m => {
    m.figures.box.layers[0].parts = [{ name: 'Ghost', open: 'missing', id: 'ghost' }];
    m.figures.box.layers[1].draw = 'slab(0, 0, 60, 60, 6, 0, 4)';
    m.figures.orphan = figure([layer('a', 0), layer('b', 4)]);
    return m;
  });
  assert.equal(status, 1);
  has(out.fails, 'opens missing, which is not a figure');
  has(out.fails, "no hit('lid', 'lid', ...)");
  has(out.fails, 'figure orphan: no part opens it');
});

test('a tour through a missing part, a layer that draws nothing and one layer alone fail', () => {
  has(build(m => ({ ...m, tour: [{ dive: ['nope'] }] })).out.fails, 'has no part nope that opens a figure');
  has(build(m => { m.figures.lid.layers[0].draw = "''"; return m; }).out.fails, 'draws no solid or outline');
  has(build(m => { m.figures.lid.layers.pop(); return m; }).out.fails, 'needs at least two layers');
});

test('long titles, long readouts and crowded layers warn without failing', () => {
  const { status, out } = build(m => {
    m.figures.lid.layers[0].title = 'A title far too long for the list beside it';
    m.figures.lid.layers[1].readout = 'word '.repeat(30);
    return m;
  });
  assert.equal(status, 0);
  has(out.warnings, 'keep it under 30');
  has(out.warnings, 'about two lines is under 110');
});

test('a process walks its steps in order, dives where a step opens a figure, then carries on to the last step', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'take-apart-')), file = path.join(dir, 'model.js');
  writeFileSync(file, source(making()));
  const { status, out } = run(file, '--out', path.join(dir, 'out'));
  assert.deepEqual([status, out.fails, out.warnings], [0, [], []]);
  assert.deepEqual(run(file, '--beats').out.beats.map(b => b.id), ['intro', 'make#cut', 'make#fold', 'into:lid', 'lid#seal', 'home', 'make#glue', 'make#pack', 'together', 'end']);
});

test('a step with no place fails, and steps that stand on each other warn', () => {
  has(build(m => { delete m.figures.make.steps[2].at; return m; }, making).out.fails, 'figure make, step glue: at must be [x, y]');
  has(build(m => { m.figures.make.steps[1].at = [20, 0]; return m; }, making).out.warnings, 'figure make: steps cut and fold overlap');
});

test('every tone the model guide lists has a fill in the viewer, with its colours set for light and dark', () => {
  const guide = readFileSync(path.join(SKILL, 'references/model.md'), 'utf8'), html = readFileSync(path.join(SKILL, 'assets/viewer.html'), 'utf8');
  const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  const tones = kind => [...guide.match(new RegExp(`${kind} tones: (.*?)\\. [A-Z]`))[1].matchAll(/`([\w-]+)`/g)].map(m => m[1]);
  for (const [face, list] of [['top', tones('Top')], ['side', tones('Side')]]) for (const tone of list) {
    const rule = css.match(new RegExp(`\\.${face}\\.${tone}(?![\\w-])[^{}]*\\{[^}]*?fill: ([^;]+);`));
    assert.ok(rule, `.${face}.${tone} has no fill in the viewer`);
    for (const [, name] of rule[1].matchAll(/var\((--[\w-]+)\)/g)) assert.ok(css.split(`${name}:`).length > 2, `${name} is not set for both light and dark`);
  }
});

/* Playwright's own Chromium, else a Chrome-family browser already on the machine. */
const launch = async () => {
  try { return await chromium.launch(); } catch (error) {
    const local = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'].find(existsSync);
    if (!local) throw error;
    return chromium.launch({ executablePath: local });
  }
};

test('the film zooms into a part without drawing a pointer over it', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'take-apart-'));
  assert.equal(run(PHONE, '--out', dir).status, 0);
  const browser = await launch(), page = await browser.newPage({ viewport: { width: 540, height: 675 } });
  try {
    await page.goto(`${pathToFileURL(path.join(dir, 'index.html')).href}?film`);
    await page.evaluate(() => { window.beats = []; window.filmBeat = id => window.beats.push(id); window.filmStart(); });
    await page.waitForFunction(() => window.beats.some(id => id.startsWith('into:')), null, { timeout: 20000 });
    assert.equal(await page.evaluate(() => document.querySelector('.film-pointer')), null);
  } finally { await browser.close(); }
});

test('the film walks a process step by step with the beats --beats lists, and a process has no take-apart button and clips its view', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'take-apart-')), file = path.join(dir, 'model.js');
  writeFileSync(file, source(making()));
  assert.equal(run(file, '--out', dir).status, 0);
  const listed = run(file, '--beats').out.beats.map(b => b.id);
  const browser = await launch(), page = await browser.newPage({ viewport: { width: 540, height: 675 } });
  try {
    await page.goto(pathToFileURL(path.join(dir, 'index.html')).href);
    assert.equal(await page.locator('#apart').isHidden(), true);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.scene .xf-draw')).overflow), 'hidden');
    await page.goto(`${pathToFileURL(path.join(dir, 'index.html')).href}?film`);
    await page.evaluate(() => { window.beats = []; window.filmBeat = id => window.beats.push(id); window.filmStart(); });
    await page.waitForFunction(() => window.beats.includes('together'), null, { timeout: 40000 });
    assert.deepEqual(await page.evaluate(() => window.beats), listed.slice(0, listed.indexOf('together') + 1));
  } finally { await browser.close(); }
});
