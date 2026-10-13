import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DETAILS, SAMPLES, TONES, audit, boxOf, camera, collide, figureCss, figureHtml, figureModel, figureSvg, nearer, paintOrder, palette, touch, tourAt, tourSeconds, validateFigure } from '../plugins/brand-studio/skills/brand-design/scripts/figure.mjs';
import { contrast } from '../plugins/brand-studio/skills/brand-design/scripts/brand-check.mjs';
import { unsafe } from '../plugins/brand-studio/skills/brand-design/scripts/svg-kit.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/brand-studio/skills/brand-design/scripts/figure.mjs', import.meta.url));
const BRAND = fileURLToPath(new URL('../apps/showcase/src/deskhand.brand.json', import.meta.url));
const EXAMPLE = fileURLToPath(new URL('../examples/deskhand/figure/', import.meta.url));
const brand = JSON.parse(readFileSync(BRAND, 'utf8'));
const box = (id, at, size, tone = 'structure', more = {}) => ({ id, kind: 'box', at, size, tone, ...more });

// A plate with a block at each corner, a lid across the blocks and a card that slides along the plate.
const figure = (edit = s => s) => edit({
  schemaVersion: 1, id: 'slide', fig: 'Fig. 1', title: 'A card slides', alt: 'A card on a plate.', caption: 'The card moves from left to right.', truth: 'Invented for the test.', brand: BRAND,
  parts: [
    box('plate', [0, 0, 0], [120, 80, 4], 'base'),
    box('post-a', [4, 4, 4], [8, 8, 20]), box('post-b', [108, 4, 4], [8, 8, 20]), box('post-c', [4, 68, 4], [8, 8, 20]), box('post-d', [108, 68, 4], [8, 8, 20]),
    box('lid', [4, 4, 24], [112, 8, 3]),
    box('card', [20, 30, 4], [30, 24, 2], 'subject', { group: 'cargo', details: [{ kind: 'rules' }] }),
    { id: 'knob', kind: 'cylinder', at: [35, 42, 6], r: 6, h: 3, tone: 'subject', group: 'cargo' },
  ],
  steps: [
    { id: 'start', label: 'Starts on the left', readout: '0 mm', lit: 'cargo' },
    { id: 'end', label: 'Stops on the right', readout: '40 mm', lit: 'knob', move: { cargo: [40, 0, 0] } },
  ],
  legend: [{ tone: 'lit', label: 'The card' }],
});
const errors = edit => validateFigure(figure(edit), { root: tmpdir() }).errors;
const problems = edit => audit(figure(edit)).problems;
const has = (list, part) => list.some(e => e.includes(part));

test('the camera puts x to the right, y to the left and z up, with larger coordinates nearer', () => {
  const cam = camera(), [x, y, z] = [[10, 0, 0], [0, 10, 0], [0, 0, 10]].map(cam.point);
  assert.ok(x[0] > 0 && x[1] > 0 && y[0] < 0 && y[1] > 0);
  assert.ok(Math.abs(z[0]) < 1e-9 && z[1] < 0);
  for (const axis of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) assert.ok(cam.depth(axis) > 0);
});

test('boxes collide when they share volume and touch when they meet on a face', () => {
  const a = boxOf(box('a', [0, 0, 0], [10, 10, 10]));
  assert.ok(collide(a, boxOf(box('b', [5, 5, 5], [10, 10, 10]))));
  assert.ok(!collide(a, boxOf(box('b', [10, 0, 0], [10, 10, 10]))));
  assert.ok(touch(a, boxOf(box('b', [10, 0, 0], [10, 10, 10]))));
  assert.ok(touch(a, boxOf({ id: 'c', kind: 'cylinder', at: [5, 5, 10], r: 3, h: 4 })));
  assert.ok(!touch(a, boxOf(box('b', [11, 0, 0], [10, 10, 10]))));
  assert.ok(!touch(a, boxOf(box('b', [10, 10, 0], [10, 10, 10]))), 'an edge is not a face');
  assert.ok(collide(a, boxOf(box('b', [14, 0, 0], [10, 10, 10]), [-5, 0, 0])), 'the offset moves the box');
});

test('a part is painted after the parts it stands on, beside or in front of', () => {
  const plate = boxOf(box('plate', [0, 0, 0], [40, 40, 4])), block = boxOf(box('block', [10, 10, 4], [10, 10, 10]));
  assert.equal(nearer(block, plate), 1);
  assert.equal(nearer(plate, block), -1);
  assert.equal(nearer(boxOf(box('a', [0, 20, 0], [10, 10, 10])), boxOf(box('b', [20, 0, 0], [10, 10, 10]))), 0, 'side by side on screen');
  const items = [{ id: 'block', box: block }, { id: 'plate', box: plate }, { id: 'cap', box: boxOf(box('cap', [10, 10, 14], [10, 10, 2])) }];
  assert.deepEqual(paintOrder(items), { order: ['plate', 'block', 'cap'], cycle: [] });
});

test('three bars that each cover the next have no paint order', () => {
  const bars = [box('along-x', [0, 20, 10], [30, 2, 2]), box('along-y', [20, 0, 14], [2, 30, 2]), box('along-z', [24, 16, 0], [2, 2, 30])];
  const { cycle } = paintOrder(bars.map(b => ({ id: b.id, box: boxOf(b) })));
  assert.deepEqual(cycle.sort(), ['along-x', 'along-y', 'along-z']);
  assert.deepEqual(paintOrder(bars.map((b, i) => ({ id: b.id, box: boxOf(b), ghost: i === 2 }))).cycle, [], 'a hidden part takes any slot');
});

test('accepts a valid figure; rejects a non-object spec', () => {
  assert.deepEqual(validateFigure(figure(), { root: tmpdir() }), { errors: [], warnings: ['8 parts: crafted figures carry 30 to 60; add structure such as feet, rails, stops and pulls'] });
  assert.deepEqual(validateFigure(null).errors, ['spec must be an object']);
  assert.deepEqual(TONES, ['base', 'structure', 'subject']);
  assert.deepEqual(DETAILS, ['inset', 'screws', 'slats', 'seam', 'slots', 'rules']);
});

test('a figure names its readout source, its contract and enough solids to be an object', () => {
  assert.ok(has(errors(s => { delete s.truth; return s; }), 'truth must be nonempty text'));
  assert.ok(has(errors(s => { s.alt = ''; return s; }), 'alt must be nonempty text'));
  assert.ok(has(errors(s => { s.brand = 'missing.json'; return s; }), 'brand contract not found'));
  assert.ok(has(errors(s => { delete s.brand; return s; }), 'brand must name the contract file'));
  assert.ok(has(errors(s => { s.parts.length = 7; s.steps[1].lit = 'card'; return s; }), 'at least 8 solids'));
  assert.ok(has(errors(s => { s.camera = { azimuth: 80 }; return s; }), 'between 30 and 60'));
});

test('parts need a unique id, a kind with its size, a tone and details that fit the shape', () => {
  assert.ok(has(errors(s => { s.parts[1].id = 'plate'; return s; }), 'duplicate part: plate'));
  assert.ok(has(errors(s => { s.parts[1].id = 'Post A'; return s; }), 'kebab-case'));
  assert.ok(has(errors(s => { s.parts[1].kind = 'sphere'; return s; }), 'kind must be box or cylinder'));
  assert.ok(has(errors(s => { s.parts[1].size = [8, 8, 0]; return s; }), 'each above 0'));
  assert.ok(has(errors(s => { s.parts[1].round = 5; return s; }), 'half the shorter side'));
  assert.ok(has(errors(s => { s.parts[7].r = 0; return s; }), 'needs r and h above 0'));
  assert.ok(has(errors(s => { s.parts[1].tone = 'lit'; return s; }), 'tone must be one of base, structure, subject'));
  assert.ok(has(errors(s => { s.parts[1].details = [{ kind: 'arrow' }]; return s; }), 'detail kind must be one of'));
  assert.ok(has(errors(s => { s.parts[1].details = [{ kind: 'screws', on: 'left' }]; return s; }), 'screws goes on top'));
  assert.ok(has(errors(s => { s.parts[7].details = [{ kind: 'slats' }]; return s; }), 'a cylinder takes a seam or a top inset'));
  assert.ok(has(errors(s => { s.parts[6].group = 'knob'; return s; }), 'group knob has the name of a part'));
});

test('steps light one real part or group, and move or hide only parts that exist', () => {
  assert.ok(has(errors(s => { s.steps[0].lit = 'lamp'; return s; }), 'lit must name one part or group'));
  assert.ok(has(errors(s => { s.steps[0].hide = ['cargo']; return s; }), 'the lit part is hidden'));
  assert.ok(has(errors(s => { s.steps[0].hide = ['lamp']; return s; }), 'hide must list parts or groups'));
  assert.ok(has(errors(s => { s.steps[1].move = { lamp: [1, 0, 0] }; return s; }), 'move.lamp must map'));
  assert.ok(has(errors(s => { s.steps[1].move = { cargo: [1, 0] }; return s; }), 'move.cargo must map'));
  assert.ok(has(errors(s => { s.steps[1].id = 'start'; return s; }), 'duplicate step: start'));
  assert.ok(has(errors(s => { s.steps.length = 1; return s; }), '2 to 6 steps'));
  assert.ok(has(errors(s => { s.steps[0].readout = ''; return s; }), 'readout must be nonempty text'));
  assert.ok(has(errors(s => { s.legend = [{ tone: 'subject', label: 'The card' }]; return s; }), 'legend needs a lit key'));
  assert.ok(has(errors(s => { s.poster = 'middle'; return s; }), 'poster must name a step'));
});

test('the audit passes a figure whose parts rest on each other and never cross', () => {
  const model = audit(figure());
  assert.deepEqual(model.problems, []);
  assert.equal(model.steps.length, 2);
  assert.equal(model.between[0].length, SAMPLES + 1);
  assert.deepEqual(model.between[0][0], model.steps[0]);
  assert.deepEqual(model.between[0][SAMPLES], model.steps[1]);
  const order = model.steps[0].map(i => figure().parts[i].id);
  assert.ok(order.indexOf('plate') < order.indexOf('card') && order.indexOf('card') < order.indexOf('knob'));
});

test('the audit fails parts that share volume, at a step or on the way to the next', () => {
  assert.ok(has(problems(s => { s.parts[6].at = [8, 8, 4]; return s; }), 'step start: post-a passes through card'));
  const crossing = problems(s => { s.parts.push(box('stop', [66, 36, 4], [4, 12, 8])); s.steps[1].move = { cargo: [70, 0, 0] }; return s; });
  assert.ok(has(crossing, 'between start and end: card passes through stop'));
  assert.ok(!has(crossing, 'step start:') && !has(crossing, 'step end:'), 'both ends are clear');
  assert.deepEqual(problems(s => { s.parts.push(box('stop', [66, 36, 4], [4, 12, 8])); s.steps[1].move = { cargo: [70, 0, 0] }; s.steps[0].hide = ['stop']; return s; }), [], 'a part that is absent blocks nothing');
});

test('the audit fails parts that nothing joins to the ground and a lit part too small for a phone', () => {
  assert.ok(has(problems(s => { s.parts[5].at = [4, 4, 30]; return s; }), 'step start: lid floats'));
  const lifted = problems(s => { s.steps[1].move = { cargo: [40, 0, 5] }; return s; });
  assert.ok(has(lifted, 'step end: card floats') && has(lifted, 'step end: knob floats'), 'two parts that hold only each other float');
  assert.ok(!has(lifted, 'step start:'));
  assert.ok(has(problems(s => { s.parts[7].r = 2; return s; }), 'step end: the lit part spans'));
});

test('the audit fails a pose with no depth order', () => {
  const tangled = problems(s => { s.parts.push(box('along-x', [40, 50, 14], [30, 2, 2]), box('along-y', [60, 30, 18], [2, 30, 2]), box('along-z', [64, 46, 4], [2, 2, 30])); return s; });
  assert.ok(has(tangled, 'no depth order fits'));
});

test('each palette is mixed from the contract: tops lightest, the accent on the lit part', () => {
  const light = colour => contrast(colour, '#000000');
  for (const mode of ['light', 'dark']) {
    const tokens = brand.tokens[mode], c = palette(tokens);
    assert.equal(c.lit.top, tokens.accent);
    assert.equal(c.lit.edge, tokens.ink);
    for (const tone of [...TONES, 'lit']) {
      assert.ok(light(c[tone].top) > light(c[tone].sa), `${mode} ${tone}: the top is the lightest face`);
      assert.ok(light(c[tone].sa) > light(c[tone].sb), `${mode} ${tone}: the right side is darker than the left`);
    }
    assert.ok(contrast(c.subject.edge, tokens.elevated) > contrast(c.structure.edge, tokens.elevated) && contrast(c.structure.edge, tokens.elevated) > contrast(c.base.edge, tokens.elevated), `${mode}: outlines grow stronger from base to subject`);
    assert.ok(contrast(c.subject.edge, tokens.elevated) >= 3, `${mode}: the subject outline reaches 3:1 on the card`);
  }
});

test('the still is plain SVG in the theme colours; hidden parts are left out', () => {
  const spec = figure(s => { s.parts.push(box('flag', [60, 60, 4], [6, 6, 6])); s.steps[0].hide = ['flag']; return s; }), model = audit(spec), colors = palette(brand.tokens.light);
  const [first, last] = [0, 1].map(step => figureSvg(spec, model, { step, colors }));
  assert.deepEqual(unsafe(first), []);
  assert.match(first, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="[-\d. ]+" role="img" aria-label="A card on a plate\.">/);
  assert.equal(first.match(/<g transform=/g).length, 8);
  assert.equal(last.match(/<g transform=/g).length, 9);
  assert.ok(last.includes(`fill="${brand.tokens.light.accent}"`));
  assert.notEqual(first, last);
});

test('the page lists every step as a tab with its readout as text, and escapes the spec', () => {
  const spec = figure(s => { s.steps[0].label = 'Starts <left> & waits'; return s; }), html = figureHtml(spec, brand, audit(spec));
  assert.match(html, /<div class="bsf-steps" role="tablist" aria-label="A card slides: steps" aria-orientation="vertical">/);
  assert.match(html, /<button type="button" role="tab" id="bsf-slide-tab-start" aria-controls="bsf-slide-stage" aria-selected="true"><b>1<\/b><span>Starts &lt;left&gt; &amp; waits<\/span><small>0 mm<\/small><\/button>/);
  assert.match(html, /id="bsf-slide-tab-end" aria-controls="bsf-slide-stage" aria-selected="false" tabindex="-1"/);
  assert.match(html, /<div class="bsf-stage" id="bsf-slide-stage" role="tabpanel" aria-label="A card on a plate\.">/);
  assert.match(html, /<g id="bsf-slide-card" class="bsf-p is-lit" data-tone="subject"/);
  assert.ok(!html.includes('<left>'));
  assert.match(html, /<figcaption>The card moves from left to right\.<\/figcaption>/);
  assert.match(html, /<button type="button" class="bsf-play" hidden>.*<span>Play<\/span><\/button>/, 'Play shows only once the script runs');
});

test('the film of the tour holds on each step and eases to the next', () => {
  assert.ok(Math.abs(tourSeconds(3) - 6.6) < 1e-9 && Math.abs(tourSeconds(2) - 4.1) < 1e-9);
  assert.deepEqual([0, 1.6, 2.5, 4.1, 5, 6.6, 99].map(t => tourAt(t, 3)), [0, 0, 1, 1, 2, 2, 2]);
  assert.ok(Math.abs(tourAt(2.05, 3) - 0.5) < 1e-9, 'halfway through a move');
  const path = Array.from({ length: 67 }, (_, i) => tourAt(i / 10, 3));
  assert.ok(path.every((v, i) => i === 0 || v >= path[i - 1]), 'never runs backwards');
});

test('the CSS carries both themes from the contract and stops motion on request', () => {
  const css = figureCss(brand);
  assert.ok(css.includes(`--bsf-elevated:${brand.tokens.light.elevated}`) && css.includes(`--bsf-elevated:${brand.tokens.dark.elevated}`));
  assert.ok(css.includes(`--bsf-lit-top:${brand.tokens.light.accent}`));
  assert.match(css, /@media \(prefers-color-scheme:dark\)\{\.bsf:not\(\[data-theme="light"\]\)/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{[^}]*transition:none/);
  assert.match(css, /\.bsf-steps button\{[^}]*min-height:44px/);
  assert.match(css, /\.bsf-play\{[^}]*min-height:44px/);
  assert.match(css, /\.bsf-stage\{touch-action:pan-y/, 'a sideways drag scrubs; an up or down drag still scrolls the page');
});

test('the Deskhand figure passes its checks and its committed still matches the script', () => {
  const spec = JSON.parse(readFileSync(path.join(EXAMPLE, 'figure.json'), 'utf8'));
  assert.deepEqual(validateFigure(spec, { root: EXAMPLE }), { errors: [], warnings: [] });
  const model = audit(spec);
  assert.deepEqual(model.problems, []);
  assert.equal(readFileSync(path.join(EXAMPLE, 'out/figure.svg'), 'utf8'), `${figureSvg(spec, model, { step: spec.steps.length - 1, colors: palette(brand.tokens.light) })}\n`);
});

test('the model carries the words, each part\'s paths and every audited order for a component to draw', () => {
  const spec = figure(), model = audit(spec), data = figureModel(spec, model);
  assert.deepEqual(data.parts.map(p => [p.id, p.tone]), spec.parts.map(p => [p.id, p.tone]));
  assert.deepEqual(data.steps.map(s => [s.label, s.readout, s.at.length]), spec.steps.map(s => [s.label, s.readout, spec.parts.length]));
  assert.deepEqual(data.steps[1].lit, [spec.parts.findIndex(p => p.id === 'knob')]);
  assert.equal(data.between[0].length, SAMPLES + 1);
  for (const order of data.orders) assert.deepEqual([...order].sort((a, b) => a - b), spec.parts.map((_, i) => i));
  // Every paint the script writes has a rule in the UI package's stylesheet.
  const css = readFileSync(new URL('../packages/ui/src/story.css', import.meta.url), 'utf8');
  for (const paint of new Set(data.parts.flatMap(p => p.paths.map(s => s.paint)))) assert.ok(css.includes(`.bs-figure__${paint}${/^s\d/.test(paint) ? ' {' : ''}`), paint);
});

test('the Deskhand model on disk, and the copy the docs demo draws, match the script', () => {
  const spec = JSON.parse(readFileSync(path.join(EXAMPLE, 'figure.json'), 'utf8')), expected = `${JSON.stringify(figureModel(spec, audit(spec)))}\n`;
  assert.equal(readFileSync(path.join(EXAMPLE, 'out/figure.model.json'), 'utf8'), expected);
  assert.equal(readFileSync(new URL('../apps/docs/demos/explainer-figure/reply-desk.json', import.meta.url), 'utf8'), expected);
});

test('CLI: exports the page and stills, also when started through a symlink', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'figure-')), link = path.join(dir, 'figure-link.mjs');
  writeFileSync(path.join(dir, 'figure.json'), JSON.stringify(figure()));
  symlinkSync(SCRIPT, link);
  const run = spawnSync(process.execPath, [link, path.join(dir, 'figure.json')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /8 parts, 2 steps/);
  for (const file of ['figure.html', 'figure.svg', 'figure.model.json', 'poster.png', 'phone.png', 'sheet.png']) assert.ok(existsSync(path.join(dir, 'out', file)), file);
  assert.deepEqual(unsafe(readFileSync(path.join(dir, 'out/figure.svg'), 'utf8')), []);
});

test('CLI: --video adds an MP4 of the tour', { skip: spawnSync('ffmpeg', ['-version']).status !== 0 && 'ffmpeg is not installed' }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'figure-'));
  writeFileSync(path.join(dir, 'figure.json'), JSON.stringify(figure()));
  const run = spawnSync(process.execPath, [SCRIPT, path.join(dir, 'figure.json'), '--video'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(readFileSync(path.join(dir, 'out/figure.mp4')).subarray(4, 8).toString(), 'ftyp');
});

test('CLI: --video without ffmpeg says so before it exports', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'figure-'));
  writeFileSync(path.join(dir, 'figure.json'), JSON.stringify(figure()));
  const run = spawnSync(process.execPath, [SCRIPT, path.join(dir, 'figure.json'), '--video'], { encoding: 'utf8', env: { ...process.env, PATH: dir } });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /ffmpeg is not on the PATH/);
  assert.ok(!existsSync(path.join(dir, 'out')));
});

test('CLI: a spec error stops before export; a geometry problem fails after it', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'figure-'));
  writeFileSync(path.join(dir, 'figure.json'), JSON.stringify(figure(s => { delete s.truth; return s; })));
  const bad = spawnSync(process.execPath, [SCRIPT, path.join(dir, 'figure.json')], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /truth must be nonempty text/);
  assert.ok(!existsSync(path.join(dir, 'out')));
  writeFileSync(path.join(dir, 'figure.json'), JSON.stringify(figure(s => { s.parts[6].at = [8, 8, 4]; return s; })));
  const crossed = spawnSync(process.execPath, [SCRIPT, path.join(dir, 'figure.json'), '--out', path.join(dir, 'review')], { encoding: 'utf8' });
  assert.equal(crossed.status, 1);
  assert.match(crossed.stderr, /post-a passes through card/);
  assert.ok(existsSync(path.join(dir, 'review/sheet.png')));
});
