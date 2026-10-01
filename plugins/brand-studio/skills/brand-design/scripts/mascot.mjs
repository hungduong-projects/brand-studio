#!/usr/bin/env node
// Check, assemble and render a mascot rig: SVG parts per slot, 6 to 10 states tied to product moments, colours from the contract.
//
//   node mascot.mjs <dir>/mascot.json [--out DIR] [--3d]
//
// Paths in the spec resolve from its folder. Writes states/<id>.svg and .png, contact-sheet.png and report.json to <dir>/out,
// plus 3d/<id>.png with --3d (needs three). The silhouette score compares each state's outline with the first state's; it
// reports drift, and a person still judges the contact sheet.
//
// Needs playwright-core and a Chromium (`npx playwright-core install chromium`).
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GPU, encodePng, hex6, inner, inside, iou, launch, mask, pixels, root, rootStyle, shapes, slug, text, texts, unsafe } from './svg-kit.mjs';

/** Lowercase hex colours of a contract's tokens, light and dark. */
export function tokenColours(brand) {
  return new Set(Object.values(brand?.tokens ?? {}).flatMap(mode => Object.values(mode ?? {})).filter(hex6).map(v => v.toLowerCase()));
}

/** Problems with one part: root viewBox, unsafe content, strokes, and fills outside the allowed colours. */
export function checkPart(svg, { viewBox, allowed }) {
  const attrs = root(svg);
  if (!attrs) return ['root element must be <svg>'];
  const errors = unsafe(svg);
  if (attrs.viewBox !== viewBox) errors.push(`viewBox must be "${viewBox}", found "${attrs.viewBox ?? ''}"`);
  const list = shapes(svg);
  if (!list.length) errors.push('draws no shapes');
  for (const { tag, attrs: a } of list) {
    if (a.stroke !== undefined && a.stroke !== 'none') errors.push(`<${tag}> has a stroke; draw filled shapes only`);
    if (a.fill === undefined) errors.push(`<${tag}> has no fill and would render black; set a palette hex`);
    else if (a.fill !== 'none' && !hex6(a.fill)) errors.push(`<${tag}> fill="${a.fill}" must be a six-digit hex or none`);
    else if (a.fill !== 'none' && !allowed.has(a.fill.toLowerCase())) errors.push(`<${tag}> fill ${a.fill} is not in the contract tokens or the spec palette`);
  }
  return [...new Set(errors)];
}

/** Errors and warnings for a mascot spec and its part files. root is the spec's folder. */
export function validateMascot(spec, { root: dir = '.' } = {}) {
  const errors = [], warnings = [];
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return { errors: ['spec must be an object'], warnings };
  if (spec.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  for (const key of ['name', 'concept', 'viewBox']) if (!text(spec[key])) errors.push(`${key} must be nonempty text`);
  for (const key of ['constants', 'variables']) if (!texts(spec[key])) errors.push(`${key} needs a nonempty text array`);
  const behaviour = spec.behaviour ?? {};
  if (!texts(behaviour.appearsWhen)) errors.push('behaviour.appearsWhen needs at least one product moment');
  if (!texts(behaviour.never)) errors.push('behaviour.never needs at least one rule');
  if (behaviour.canTurnOff !== true) errors.push('behaviour.canTurnOff must be true: people can always hide the mascot');

  // Allowed fills: the contract's token colours plus the spec palette; a palette colour outside the contract is a warning.
  let allowed = new Set();
  if (!text(spec.brand)) errors.push('brand must name the contract file');
  else if (!existsSync(path.resolve(dir, spec.brand))) errors.push(`brand contract not found: ${spec.brand}`);
  else allowed = tokenColours(JSON.parse(readFileSync(path.resolve(dir, spec.brand), 'utf8')));
  const palette = Array.isArray(spec.palette) ? spec.palette : [];
  for (const c of palette) {
    if (!hex6(c)) errors.push(`palette ${c} must be a six-digit hex`);
    else if (!allowed.has(c.toLowerCase())) warnings.push(`palette ${c} is not a token in ${spec.brand}`);
  }
  allowed = new Set([...allowed, ...palette.filter(hex6).map(c => c.toLowerCase())]);

  const slots = Array.isArray(spec.slots) ? spec.slots : [];
  if (!slots.length || !slots.every(slug) || new Set(slots).size !== slots.length) errors.push('slots must be unique lowercase names, bottom to top');
  const parts = spec.parts && typeof spec.parts === 'object' ? spec.parts : {};
  for (const [slot, variants] of Object.entries(parts)) {
    if (!slots.includes(slot)) { errors.push(`parts.${slot} is not a listed slot`); continue; }
    for (const [variant, file] of Object.entries(variants ?? {})) {
      const at = `parts.${slot}.${variant}`;
      if (!text(file) || !inside(dir, file)) { errors.push(`${at} must be a path inside the spec's folder`); continue; }
      const full = path.resolve(dir, file);
      if (!existsSync(full)) { errors.push(`${at} not found: ${file}`); continue; }
      if (text(spec.viewBox)) for (const e of checkPart(readFileSync(full, 'utf8'), { viewBox: spec.viewBox, allowed })) errors.push(`${file}: ${e}`);
    }
  }

  const states = Array.isArray(spec.states) ? spec.states : [];
  if (states.length < 6 || states.length > 10) errors.push(`states: ${states.length} found; a mascot needs 6 to 10, each for a product moment`);
  const ids = new Set();
  states.forEach((s, i) => {
    const at = `states[${i}]${text(s?.id) ? ` (${s.id})` : ''}`;
    if (!slug(s?.id)) errors.push(`${at}.id must be a lowercase slug`);
    else if (ids.has(s.id)) errors.push(`duplicate state id: ${s.id}`);
    else ids.add(s.id);
    if (!text(s?.moment)) errors.push(`${at}.moment must name the product moment it serves`);
    const chosen = Object.entries(s?.parts ?? {});
    if (!chosen.length) errors.push(`${at}.parts must pick at least one part`);
    for (const [slot, variant] of chosen) if (!Object.hasOwn(parts[slot] ?? {}, variant)) errors.push(`${at} uses ${slot}.${variant}, which parts does not define`);
  });
  return { errors, warnings };
}

/** One state as a standalone SVG: the chosen part of each slot, stacked in slot order. read(file) returns a part's text. */
export function assembleState(spec, state, read) {
  const layers = spec.slots.filter(slot => state.parts[slot]).map(slot => {
    const svg = read(spec.parts[slot][state.parts[slot]]);
    return `<g data-slot="${slot}"${rootStyle(svg)}>${inner(svg)}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${spec.viewBox}">${layers.join('')}</svg>`;
}
/** Every state at 256, 48, 24 and 16 px on the contract's light and dark surfaces. */
async function contactSheet(browser, states, tokens, file) {
  const img = (svg, n) => `<img width="${n}" height="${n}" alt="" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`;
  const row = mode => `<section style="background:${mode.surface};color:${mode.ink}">${states.map(s => `<figure>${[256, 48, 24, 16].map(n => img(s.svg, n)).join('')}<figcaption>${s.id}</figcaption></figure>`).join('')}</section>`;
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font:14px/1.4 ui-monospace,monospace}section{display:flex;flex-wrap:wrap;gap:40px 56px;padding:48px}figure{margin:0;display:grid;grid-template-columns:repeat(4,auto);align-items:end;gap:16px}figcaption{grid-column:1/-1}</style></head><body>${row(tokens.light)}${row(tokens.dark ?? tokens.light)}</body></html>`);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
}

async function main() {
  const argv = process.argv.slice(2), input = argv[0];
  if (!input || input.startsWith('--')) throw new Error('Usage: node mascot.mjs <dir>/mascot.json [--out DIR] [--3d]');
  const dir = path.dirname(path.resolve(input));
  const spec = JSON.parse(readFileSync(input, 'utf8'));
  const { errors, warnings } = validateMascot(spec, { root: dir });
  for (const w of warnings) console.warn(`warning: ${w}`);
  if (errors.length) throw new Error(errors.join('\n'));
  const at = argv.indexOf('--out'), want3d = argv.includes('--3d');
  const out = path.resolve(at > 0 ? argv[at + 1] : path.join(dir, 'out'));
  const read = file => readFileSync(path.resolve(dir, file), 'utf8');
  const tokens = JSON.parse(read(spec.brand)).tokens;
  const states = spec.states.map(s => ({ id: s.id, moment: s.moment, svg: assembleState(spec, s, read) }));
  mkdirSync(path.join(out, 'states'), { recursive: true });

  const drift = [], silhouette = {};
  const browser = await launch(want3d ? GPU : []);
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    const masks = [];
    for (const s of states) {
      writeFileSync(path.join(out, 'states', `${s.id}.svg`), `${s.svg}\n`);
      writeFileSync(path.join(out, 'states', `${s.id}.png`), encodePng(512, 512, await pixels(page, s.svg, 512)));
      masks.push(await mask(page, s.svg, 128));
    }
    states.forEach((s, i) => { silhouette[s.id] = Number(iou(masks[0], masks[i]).toFixed(3)); });
    for (const [id, score] of Object.entries(silhouette)) if (score < 0.85) drift.push(`${id} shares ${score} of its outline with ${states[0].id}; check on the contact sheet that it still reads as ${spec.name}`);
    await contactSheet(browser, states, tokens, path.join(out, 'contact-sheet.png'));
    if (want3d) {
      const { render3d } = await import('./mascot-3d.mjs');
      await render3d(browser, states, spec.slots, path.join(out, '3d'));
    }
  } finally { await browser.close(); }
  for (const d of drift) console.warn(`warning: ${d}`);
  writeFileSync(path.join(out, 'report.json'), `${JSON.stringify({ name: spec.name, states: states.map(s => ({ id: s.id, moment: s.moment, silhouette: silhouette[s.id] })), warnings: [...warnings, ...drift] }, null, 2)}\n`);
  console.log(`Mascot rendered: ${states.length} states to ${path.relative(process.cwd(), out) || '.'}. Review contact-sheet.png at 16 px before you ship it.`);
}

// realpath: Node resolves a symlinked script to its target, so compare against the resolved path.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
