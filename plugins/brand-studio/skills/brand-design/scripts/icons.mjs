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
