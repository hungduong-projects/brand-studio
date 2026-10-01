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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GPU, encodePng, hex6, inner, inside, iou, launch, mask, pixels, root, shapes, slug, text, texts, unsafe } from './svg-kit.mjs';

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
  const layers = spec.slots.filter(slot => state.parts[slot]).map(slot => `<g data-slot="${slot}">${inner(read(spec.parts[slot][state.parts[slot]]))}</g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${spec.viewBox}">${layers.join('')}</svg>`;
}
