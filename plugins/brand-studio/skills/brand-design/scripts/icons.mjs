#!/usr/bin/env node
// Check and export a brand icon set: UI glyphs that sit beside the product's existing set, and a layered app icon.
//
//   node icons.mjs <dir>/icons.json [--out DIR]
//
// Glyphs follow the Lucide specification (24 px canvas, strokes 1 px from the edge, round caps and joins) at the spec's
// stroke width. Writes glyphs/, sprite.svg and glyph-sheet.png; with an app block, app/ exports for iOS Icon Composer,
// Android, Google Play, PWA and web plus app-sheet.png. Sizes checked 2026-10-01 against WWDC25 session 361, Android's
// adaptive icon guide and web.dev's maskable icon article.
//
// Needs playwright-core and a Chromium (`npx playwright-core install chromium`).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { encodePng, hex6, inner, inside, launch, mask, outsideCircle, pixels, root, shapes, slug, text, unsafe } from './svg-kit.mjs';

/** Shares of the icon width: Android always shows the inner 66 of 108 dp; web.dev keeps maskable content within a 40% radius. */
export const safeZones = { android: 33 / 108, maskable: 0.4 };

/** App icon exports. flat: background and layers, opaque. layers: transparent foreground. mono: one colour, transparent. */
export const appTargets = [
  { file: 'ios/icon-1024.png', size: 1024, kind: 'flat', use: 'App Store and Expo icon' },
  { file: 'android/foreground.png', size: 1024, kind: 'layers', use: 'Expo android.adaptiveIcon.foregroundImage' },
  { file: 'android/monochrome.png', size: 1024, kind: 'mono', use: 'Expo android.adaptiveIcon.monochromeImage, themed icons on Android 13+' },
  { file: 'play-512.png', size: 512, kind: 'flat', use: 'Google Play listing icon' },
  { file: 'pwa/icon-192.png', size: 192, kind: 'flat', use: 'Web app manifest' },
  { file: 'pwa/icon-512.png', size: 512, kind: 'flat', use: 'Web app manifest' },
  { file: 'pwa/maskable-512.png', size: 512, kind: 'flat', use: 'Web app manifest, purpose maskable' },
  { file: 'web/favicon-48.png', size: 48, kind: 'flat', use: 'Favicon fallback and Expo web.favicon' },
  { file: 'web/apple-touch-icon.png', size: 180, kind: 'flat', use: 'apple-touch-icon link' },
];

/** The manifest icons array for the PWA exports, with paths relative to app/. */
export const manifestIcons = [
  { src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: 'pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
  { src: 'pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

/** Problems with one glyph: canvas, unsafe content, and the stroke style on every shape. */
export function checkGlyph(svg, { grid = 24, stroke = 2 } = {}) {
  const attrs = root(svg);
  if (!attrs) return ['root element must be <svg>'];
  const errors = unsafe(svg);
  if (attrs.viewBox !== `0 0 ${grid} ${grid}`) errors.push(`viewBox must be "0 0 ${grid} ${grid}"`);
  const list = shapes(svg);
  if (!list.length) errors.push('draws no shapes');
  for (const { tag, attrs: a } of list) {
    if (a.fill !== 'none') errors.push(`<${tag}> fill must be none; glyphs are drawn in strokes`);
    if (a.stroke !== 'currentColor') errors.push(`<${tag}> stroke must be currentColor so the glyph takes the text colour`);
    if (Number(a['stroke-width']) !== stroke) errors.push(`<${tag}> stroke-width must be ${stroke}`);
    if (a['stroke-linecap'] !== 'round') errors.push(`<${tag}> stroke-linecap must be round`);
    if (a['stroke-linejoin'] !== 'round') errors.push(`<${tag}> stroke-linejoin must be round`);
  }
  return [...new Set(errors)];
}

/** A checked glyph rebuilt with the set's attributes on the root, none repeated on shapes, and no title or size. */
export function normalizeGlyph(svg, { grid = 24, stroke = 2 } = {}) {
  const body = inner(svg)
    .replace(/<(title|desc)\b[\s\S]*?<\/\1>/g, '')
    .replace(/\s(fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)\s*=\s*("[^"]*"|'[^']*')/g, '')
    .replace(/>\s+</g, '><')
    .trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

/** One SVG of <symbol> elements with id prefix-name, for <svg><use href="sprite.svg#prefix-name"/></svg>. */
export function sprite(glyphs, { prefix, grid = 24, stroke = 2 }) {
  const symbols = glyphs.map(g => `<symbol id="${prefix}-${g.name}" viewBox="0 0 ${grid} ${grid}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${inner(g.svg)}</symbol>`);
  return `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`;
}

/** Problems with one app icon layer: the 1024 Icon Composer canvas and no live text or embedded media. */
export function checkAppLayer(svg) {
  const attrs = root(svg);
  if (!attrs) return ['root element must be <svg>'];
  const errors = unsafe(svg);
  if (attrs.viewBox !== '0 0 1024 1024') errors.push('viewBox must be "0 0 1024 1024", the Icon Composer canvas');
  if (!shapes(svg).length) errors.push('draws no shapes');
  return errors;
}

/** The app icon as one SVG: an optional background square, then the layers bottom to top. */
export function composeApp(layers, background) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}${layers.map(inner).join('')}</svg>`;
}

function fileErrors(dir, file, at, check) {
  if (!text(file) || !inside(dir, file)) return [`${at} must be a path inside the spec's folder`];
  const full = path.resolve(dir, file);
  if (!existsSync(full)) return [`${at} not found: ${file}`];
  return check(readFileSync(full, 'utf8')).map(e => `${file}: ${e}`);
}

/** Errors for an icons spec and its files. root is the spec's folder. */
export function validateIcons(spec, { root: dir = '.' } = {}) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return { errors: ['spec must be an object'] };
  const errors = [];
  if (spec.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!slug(spec.prefix)) errors.push('prefix must be a short lowercase slug, such as dh');
  const grid = spec.grid ?? 24, stroke = spec.stroke ?? 2;
  if (!Number.isInteger(grid) || grid < 12) errors.push('grid must be a whole number of at least 12');
  if (!(typeof stroke === 'number' && stroke > 0 && stroke <= 3)) errors.push('stroke must be a number above 0 and at most 3');
  const glyphs = Array.isArray(spec.glyphs) ? spec.glyphs : [];
  if (!glyphs.length && spec.app === undefined) errors.push('add glyphs, an app icon or both');
  const names = new Set();
  glyphs.forEach((g, i) => {
    const at = `glyphs[${i}]${text(g?.name) ? ` (${g.name})` : ''}`;
    if (!slug(g?.name)) errors.push(`${at}.name must be kebab-case`);
    else if (names.has(g.name)) errors.push(`duplicate glyph: ${g.name}`);
    else names.add(g.name);
    if (!text(g?.meaning)) errors.push(`${at}.meaning must say what the glyph stands for; a glyph without one is decoration`);
    errors.push(...fileErrors(dir, g?.file, `${at}.file`, svg => checkGlyph(svg, { grid, stroke })));
  });
  if (spec.app !== undefined) {
    const app = spec.app ?? {};
    if (!hex6(app.background)) errors.push('app.background must be a six-digit hex; Icon Composer sets it, so it is not a layer');
    const layers = Array.isArray(app.layers) ? app.layers : [];
    if (layers.length < 1 || layers.length > 4) errors.push('app.layers needs 1 to 4 SVG files, bottom to top (Icon Composer groups)');
    layers.forEach((file, i) => errors.push(...fileErrors(dir, file, `app.layers[${i}]`, checkAppLayer)));
    if (app.monochrome !== undefined) errors.push(...fileErrors(dir, app.monochrome, 'app.monochrome', checkAppLayer));
  }
  return { errors };
}
/** Each glyph at 16, 24, 32 and 48 px in text colour on light and dark. */
async function glyphSheet(browser, set, file) {
  const cell = g => `<figure>${[16, 24, 32, 48].map(n => g.svg.replace('<svg ', `<svg width="${n}" height="${n}" `)).join('')}<figcaption>${g.name}</figcaption></figure>`;
  const page = await browser.newPage({ viewport: { width: 1200, height: 600 } });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font:13px ui-monospace,monospace}section{display:grid;grid-template-columns:repeat(4,1fr);gap:32px;padding:40px}figure{margin:0;display:flex;flex-wrap:wrap;gap:14px;align-items:end}figcaption{width:100%}</style></head><body><section style="background:#ffffff;color:#111111">${set.map(cell).join('')}</section><section style="background:#111111;color:#f5f5f5">${set.map(cell).join('')}</section></body></html>`);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
}

/** The icon under square, rounded and circle masks with both safe zones drawn, then at small sizes on light and dark. */
async function appSheet(browser, flat, foreground, background, file) {
  const src = svg => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const zone = share => `<i style="position:absolute;inset:${((0.5 - share) * 100).toFixed(2)}%;border:2px dashed #e5484d;border-radius:50%"></i>`;
  const masks = [['Square, Android and maskable safe zones', '0', true], ['Rounded (iOS approximation)', '22.4%', false], ['Circle (Android)', '50%', false]]
    .map(([label, radius, zones]) => `<figure><div style="position:relative;width:256px;height:256px;border-radius:${radius};overflow:hidden;background:${background}"><img src="${src(foreground)}" width="256" height="256" alt="">${zones ? zone(safeZones.android) + zone(safeZones.maskable) : ''}</div><figcaption>${label}</figcaption></figure>`).join('');
  const small = bg => `<figure style="background:${bg};padding:16px">${[180, 48, 32, 16].map(n => `<img src="${src(flat)}" width="${n}" height="${n}" alt="" style="border-radius:22.4%">`).join('')}<figcaption style="color:#888">${bg}</figcaption></figure>`;
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:40px;display:flex;flex-wrap:wrap;gap:40px;align-items:end;font:13px ui-monospace,monospace;background:#fff}figure{margin:0;display:flex;flex-wrap:wrap;gap:16px;align-items:end}figcaption{width:100%}</style></head><body>${masks}${small('#ffffff')}${small('#111111')}</body></html>`);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
}

/** Write every app icon export and the review sheet; return problems found. */
async function exportApp(browser, page, app, read, out, sheetFile) {
  const layers = app.layers.map(read);
  const foreground = composeApp(layers), flat = composeApp(layers, app.background);
  const problems = [];
  const outside = outsideCircle(await mask(page, foreground, 256), 256, safeZones.android);
  if (outside) problems.push(`app icon: ${outside} pixels at 256 px fall outside Android's 66 dp safe zone; scale the mark toward the centre`);
  for (const sub of ['ios', 'android', 'pwa', 'web']) mkdirSync(path.join(out, sub), { recursive: true });
  app.layers.forEach((file, i) => writeFileSync(path.join(out, 'ios', `${i + 1}-${path.basename(file)}`), read(file)));
  for (const t of appTargets) {
    const svg = t.kind === 'mono' && app.monochrome ? read(app.monochrome) : t.kind === 'flat' ? flat : foreground;
    const px = await pixels(page, svg, t.size, t.kind === 'flat' ? app.background : undefined);
    if (t.kind === 'mono' && !app.monochrome) for (let i = 0; i < px.length; i += 4) px[i] = px[i + 1] = px[i + 2] = 0;
    writeFileSync(path.join(out, t.file), encodePng(t.size, t.size, px, { alpha: t.kind !== 'flat' }));
  }
  writeFileSync(path.join(out, 'web', 'favicon.svg'), `${flat}\n`);
  writeFileSync(path.join(out, 'manifest-icons.json'), `${JSON.stringify(manifestIcons, null, 2)}\n`);
  await appSheet(browser, flat, foreground, app.background, sheetFile);
  return problems;
}

async function main() {
  const argv = process.argv.slice(2), input = argv[0];
  if (!input || input.startsWith('--')) throw new Error('Usage: node icons.mjs <dir>/icons.json [--out DIR]');
  const dir = path.dirname(path.resolve(input));
  const spec = JSON.parse(readFileSync(input, 'utf8'));
  const { errors } = validateIcons(spec, { root: dir });
  if (errors.length) throw new Error(errors.join('\n'));
  const at = argv.indexOf('--out');
  const out = path.resolve(at > 0 ? argv[at + 1] : path.join(dir, 'out'));
  const read = file => readFileSync(path.resolve(dir, file), 'utf8');
  const grid = spec.grid ?? 24, stroke = spec.stroke ?? 2, glyphs = spec.glyphs ?? [];
  const problems = [];
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    if (glyphs.length) {
      const set = glyphs.map(g => ({ name: g.name, svg: normalizeGlyph(read(g.file), { grid, stroke }) }));
      mkdirSync(path.join(out, 'glyphs'), { recursive: true });
      for (const g of set) {
        writeFileSync(path.join(out, 'glyphs', `${g.name}.svg`), `${g.svg}\n`);
        // The drawn box plus half the stroke must stay 1 px inside the canvas (Lucide canvas rule 3).
        const [x0, y0, x1, y1] = await page.evaluate(svg => {
          document.body.innerHTML = svg.replace(/(<svg[^>]*>)/, '$1<g id="drawn">').replace('</svg>', '</g></svg>');
          const b = document.getElementById('drawn').getBBox();
          return [b.x, b.y, b.x + b.width, b.y + b.height];
        }, g.svg);
        const gap = Math.min(x0, y0, grid - x1, grid - y1) - stroke / 2;
        if (gap < 1 - 1e-6) problems.push(`${g.name}: strokes come within ${gap.toFixed(2)} px of the edge; keep 1 px clear`);
      }
      writeFileSync(path.join(out, 'sprite.svg'), sprite(set, { prefix: spec.prefix, grid, stroke }));
      await glyphSheet(browser, set, path.join(out, 'glyph-sheet.png'));
    }
    if (spec.app) problems.push(...await exportApp(browser, page, spec.app, read, path.join(out, 'app'), path.join(out, 'app-sheet.png')));
  } finally { await browser.close(); }
  if (problems.length) throw new Error(problems.join('\n'));
  console.log(`Icons exported to ${path.relative(process.cwd(), out) || '.'}: ${glyphs.length} glyphs${spec.app ? ' and the app icon' : ''}. Review the sheets at 16 px; importing the iOS layers into Icon Composer is a manual step.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
