import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appTargets, checkAppLayer, checkGlyph, composeApp, encodeIco, faviconSvg, manifestIcons, normalizeGlyph, safeZones, sprite, validateIcons } from '../plugins/brand-studio/skills/brand-design/scripts/icons.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/brand-studio/skills/brand-design/scripts/icons.mjs', import.meta.url));
const STYLE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const glyph = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${STYLE}>${body}</svg>`;
const layer = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${body}</svg>`;

function setup(edit = s => s, files = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'icons-'));
  mkdirSync(path.join(dir, 'glyphs')); mkdirSync(path.join(dir, 'app'));
  const all = { 'glyphs/ticket.svg': glyph('<path d="M4 12h16"/>'), 'app/card.svg': layer('<rect x="300" y="300" width="424" height="424" fill="#101114"/>'), ...files };
  for (const [file, svg] of Object.entries(all)) writeFileSync(path.join(dir, file), svg);
  const spec = edit({ schemaVersion: 1, prefix: 'dh', grid: 24, stroke: 2, glyphs: [{ name: 'ticket', file: 'glyphs/ticket.svg', meaning: 'A customer ticket' }], app: { background: '#ffe14d', layers: ['app/card.svg'] } });
  return { spec, dir };
}
const set = (edit, files) => { const { spec, dir } = setup(edit, files); return validateIcons(spec, { root: dir }).errors; };

test('accepts a Lucide-style glyph with attributes on the root or a group', () => {
  assert.deepEqual(checkGlyph(glyph('<path d="M4 12h16"/>')), []);
  assert.deepEqual(checkGlyph('<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/></g></svg>', { stroke: 1.8 }), []);
});

test('rejects wrong canvas, colours, stroke width, caps, joins and live text', () => {
  const cases = [
    [glyph('<path d="M4 12h16"/>').replace('0 0 24 24', '0 0 32 32'), 'viewBox'],
    [glyph('<path d="M4 12h16" stroke="#101114"/>'), 'currentColor'],
    [glyph('<path d="M4 12h16" fill="#101114"/>'), 'fill must be none'],
    [glyph('<path d="M4 12h16" stroke-width="3"/>'), 'stroke-width must be 2'],
    [glyph('<path d="M4 12h16" stroke-linecap="butt"/>'), 'linecap'],
    [glyph('<path d="M4 12h16" stroke-linejoin="miter"/>'), 'linejoin'],
    [glyph('<text>A</text><path d="M4 12h16"/>'), '<text>'],
  ];
  for (const [svg, expected] of cases) assert.ok(checkGlyph(svg).some(e => e.includes(expected)), `expected ${expected}`);
});

test('normalizes a glyph to root attributes, without titles or size', () => {
  const svg = normalizeGlyph(`<svg viewBox="0 0 24 24" width="24" height="24"><title>Ticket</title><g ${STYLE}>\n  <path d="M4 12h16"/>\n</g></svg>`);
  assert.equal(svg, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${STYLE}><g><path d="M4 12h16"/></g></svg>`);
  assert.deepEqual(checkGlyph(svg), []);
});

test('sprite symbols take the prefix', () => {
  assert.match(sprite([{ name: 'ticket', svg: glyph('<path d="M4 12h16"/>') }], { prefix: 'dh' }), /<symbol id="dh-ticket" viewBox="0 0 24 24"[^>]*><path d="M4 12h16"\/><\/symbol>/);
});

test('accepts a valid set; rejects a non-object spec', () => {
  assert.deepEqual(set(), []);
  assert.deepEqual(validateIcons(null).errors, ['spec must be an object']);
});

test('each glyph needs a unique kebab-case name, a meaning and a path inside the folder', () => {
  assert.ok(set(s => { s.glyphs[0].meaning = ''; return s; }).some(e => e.includes('meaning')));
  assert.ok(set(s => { s.glyphs.push({ ...s.glyphs[0] }); return s; }).some(e => e.includes('duplicate glyph')));
  assert.ok(set(s => { s.glyphs[0].name = 'Ticket'; return s; }).some(e => e.includes('kebab-case')));
  assert.ok(set(s => { s.glyphs[0].file = '../ticket.svg'; return s; }).some(e => e.includes("inside the spec's folder")));
  assert.ok(set(s => s, { 'glyphs/ticket.svg': glyph('<path d="M4 12h16" stroke-width="3"/>') }).some(e => e.startsWith('glyphs/ticket.svg:')));
});

test('app icons take 1 to 4 layers on a 1024 canvas, a hex background and no live text', () => {
  assert.ok(set(s => { s.app.layers = Array(5).fill('app/card.svg'); return s; }).some(e => e.includes('1 to 4')));
  assert.ok(set(s => { s.app.background = 'yellow'; return s; }).some(e => e.includes('app.background')));
  assert.ok(checkAppLayer(layer('<text>D</text><rect fill="#101114"/>')).some(e => e.includes('<text>')));
  assert.ok(checkAppLayer('<svg viewBox="0 0 512 512"><rect fill="#101114"/></svg>').some(e => e.includes('1024')));
});

test('app.dark takes its own background and 1 to 4 layers', () => {
  assert.deepEqual(set(s => { s.app.dark = { background: '#101114', layers: ['app/card.svg'] }; return s; }), []);
  assert.ok(set(s => { s.app.dark = { background: 'black', layers: ['app/card.svg'] }; return s; }).some(e => e.includes('app.dark.background')));
  assert.ok(set(s => { s.app.dark = { background: '#101114', layers: [] }; return s; }).some(e => e.includes('app.dark.layers')));
  assert.ok(set(s => { s.app.dark = { background: '#101114', layers: ['app/missing.svg'] }; return s; }).some(e => e.includes('app.dark.layers[0] not found')));
});

test('encodeIco packs each PNG behind a directory entry', () => {
  const images = [16, 32, 48].map(size => ({ size, png: Buffer.from(`png-${size}`) }));
  const ico = encodeIco(images);
  assert.deepEqual([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)], [0, 1, 3]);
  images.forEach(({ size, png }, i) => {
    const entry = 6 + 16 * i, offset = ico.readUInt32LE(entry + 12);
    assert.deepEqual([ico[entry], ico[entry + 1], ico.readUInt16LE(entry + 4), ico.readUInt16LE(entry + 6)], [size, size, 1, 32]);
    assert.equal(ico.readUInt32LE(entry + 8), png.length);
    assert.deepEqual(ico.subarray(offset, offset + png.length), png);
  });
});

test('faviconSvg shows the dark drawing when the browser is in dark mode', () => {
  const light = composeApp([layer('<rect width="1" height="1" fill="#101114"/>')], '#ffe14d');
  const dark = composeApp([layer('<rect width="2" height="2" fill="#ffe14d"/>')], '#101114');
  assert.equal(faviconSvg(light), light);
  const both = faviconSvg(light, dark);
  assert.match(both, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 1024 1024"><style>/);
  assert.match(both, /@media \(prefers-color-scheme: dark\)/);
  assert.ok(both.indexOf('width="1"') < both.indexOf('width="2"'));
});

test('safe zones follow Android 66 of 108 dp and the web.dev 40% radius', () => {
  assert.equal(safeZones.android, 33 / 108);
  assert.equal(safeZones.maskable, 0.4);
});

test('exports cover each store at its size, opaque where stores need it', () => {
  const sizes = Object.fromEntries(appTargets.map(t => [t.file, [t.size, t.kind]]));
  assert.deepEqual(sizes['ios/icon-1024.png'], [1024, 'flat']);
  assert.deepEqual(sizes['android/foreground.png'], [1024, 'layers']);
  assert.deepEqual(sizes['android/monochrome.png'], [1024, 'mono']);
  assert.deepEqual(sizes['play-512.png'], [512, 'flat']);
  assert.deepEqual(sizes['web/apple-touch-icon.png'], [180, 'flat']);
  assert.deepEqual(sizes['pwa/icon-192.png'], [192, 'flat']);
  assert.ok(manifestIcons.some(i => i.purpose === 'maskable' && i.sizes === '512x512'));
});

test('composeApp puts the background under the layers', () => {
  const svg = composeApp([layer('<rect id="a"/>'), layer('<rect id="b"/>')], '#ffe14d');
  assert.ok(svg.indexOf('fill="#ffe14d"') < svg.indexOf('id="a"') && svg.indexOf('id="a"') < svg.indexOf('id="b"'));
  assert.ok(!composeApp([layer('<rect/>')]).includes('<rect width="1024"'));
});

test('normalizing, sprites and app layers keep styling set on the root', () => {
  const dashed = `<svg viewBox="0 0 24 24" ${STYLE} stroke-dasharray="2 2"><path d="M4 12h16"/></svg>`;
  assert.deepEqual(checkGlyph(dashed), []);
  assert.match(normalizeGlyph(dashed), /<g stroke-dasharray="2 2"><path d="M4 12h16"\/><\/g><\/svg>$/);
  assert.match(sprite([{ name: 'dash', svg: normalizeGlyph(dashed) }], { prefix: 'dh' }), /<g stroke-dasharray="2 2">/);
  assert.match(composeApp(['<svg viewBox="0 0 1024 1024" fill="#ffffff"><rect width="10" height="10"/></svg>']), /<g fill="#ffffff"><rect/);
});

test('the CLI runs when started through a symlink', () => {
  const link = path.join(mkdtempSync(path.join(tmpdir(), 'link-')), 'icons.mjs');
  symlinkSync(SCRIPT, link);
  const run = spawnSync(process.execPath, [link], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Usage: node icons\.mjs/);
});

test('the CLI writes favicon.ico and warns when a layer disappears into the background', () => {
  const { spec, dir } = setup(s => { s.app.background = '#101114'; return s; });
  writeFileSync(path.join(dir, 'icons.json'), JSON.stringify(spec));
  const run = spawnSync(process.execPath, [SCRIPT, path.join(dir, 'icons.json')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stderr, /app\/card\.svg keeps 0% of its pixels at 3:1 against the background/);
  const ico = readFileSync(path.join(dir, 'out', 'app', 'web', 'favicon.ico'));
  assert.equal(ico.readUInt16LE(4), 3);
  assert.ok(existsSync(path.join(dir, 'out', 'app-sheet.png')));
});
