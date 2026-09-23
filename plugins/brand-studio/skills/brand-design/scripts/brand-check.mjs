#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const colorKeys = ['surface', 'elevated', 'ink', 'muted', 'accent', 'onAccent', 'line'];
const isString = value => typeof value === 'string' && value.trim().length > 0;
const hex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function contrast(a, b) {
  const luminance = value => {
    const channels = value.slice(1).match(/../g).map(c => parseInt(c, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

export function validateBrand(brand) {
  const errors = [];
  const requireText = (object, keys, prefix) => keys.forEach(key => { if (!isString(object?.[key])) errors.push(`${prefix}${key} must be nonempty text`); });
  if (!brand || typeof brand !== 'object' || Array.isArray(brand)) return ['brand must be an object'];
  if (brand.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  requireText(brand, ['name','positioning','audience'], '');
  if (!Array.isArray(brand.voice) || brand.voice.length < 3 || !brand.voice.every(isString)) errors.push('voice needs at least three text traits');
  requireText(brand.primaryAction, ['label','href'], 'primaryAction.');
  const href = brand.primaryAction?.href;
  if (isString(href) && !/^(#[a-z][\w-]*|\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/i.test(href)) errors.push('primaryAction.href must be an anchor, project path or HTTPS URL');
  for (const mode of ['light', 'dark']) {
    const tokens = brand.tokens?.[mode];
    for (const key of colorKeys) if (!hex(tokens?.[key])) errors.push(`tokens.${mode}.${key} must be a six-digit hex color`);
    if (!isString(tokens?.font) || !/^[a-z0-9 ,"'-]+$/i.test(tokens.font)) errors.push(`tokens.${mode}.font must be a plain CSS font-family`);
    if (tokens?.voiceFont !== undefined && (!isString(tokens.voiceFont) || !/^[a-z0-9 ,"'-]+$/i.test(tokens.voiceFont))) errors.push(`tokens.${mode}.voiceFont must be a plain CSS font-family`);
    if (!isString(tokens?.radius) || !/^(?:\d+(?:\.\d+)?)(?:px|rem)$/.test(tokens.radius)) errors.push(`tokens.${mode}.radius must be a nonnegative px/rem dimension`);
    for (const [fg,bg] of [['ink','surface'],['muted','surface'],['ink','elevated'],['muted','elevated'],['onAccent','accent']]) {
      if (hex(tokens?.[fg]) && hex(tokens?.[bg]) && contrast(tokens[fg],tokens[bg]) < 4.5) errors.push(`tokens.${mode}: ${fg}/${bg} contrast is ${contrast(tokens[fg],tokens[bg]).toFixed(2)}:1, below 4.5:1`);
    }
  }
  requireText(brand.imagery, ['subject','materials','lighting','palette'], 'imagery.');
  for (const key of ['invariants','avoid']) if (!Array.isArray(brand.imagery?.[key]) || !brand.imagery[key].length || !brand.imagery[key].every(isString)) errors.push(`imagery.${key} needs a nonempty text array`);
  requireText(brand.motion, ['character','reducedMotion'], 'motion.');
  if (brand.direction !== undefined) {
    requireText(brand.direction, ['concept','tier'], 'direction.');
    for (const key of ['devices','invariants','variables']) if (!Array.isArray(brand.direction?.[key]) || !brand.direction[key].length || !brand.direction[key].every(isString)) errors.push(`direction.${key} needs a nonempty text array`);
  }
  if (!Array.isArray(brand.evidence)) errors.push('evidence must be an array; use [] for a fictional concept');
  else brand.evidence.forEach((item,i) => requireText(item,['fact','source'],`evidence[${i}].`));
  if (!Array.isArray(brand.chapters) || !brand.chapters.length) errors.push('chapters must be nonempty');
  else {
    const ids = new Set();
    brand.chapters.forEach((chapter,i) => {
      requireText(chapter,['id','question','message','visual','transition','mobileFallback'],`chapters[${i}].`);
      if (!/^[a-z][a-z0-9-]*$/.test(chapter?.id ?? '')) errors.push(`chapters[${i}].id must be a lowercase anchor slug`);
      if (ids.has(chapter?.id)) errors.push(`duplicate chapter id: ${chapter?.id}`);
      ids.add(chapter?.id);
    });
  }
  return errors;
}

export function brandCSS(brand) {
  const errors = validateBrand(brand);
  if (errors.length) throw new Error(errors.join('\n'));
  const slug = brand.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'brand';
  const declarations = mode => [...colorKeys,'font','radius',...(brand.tokens[mode].voiceFont ? ['voiceFont'] : [])].map(key => `  --brand-${key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}: ${brand.tokens[mode][key]};`).join('\n');
  return `/* Scope: data-brand="${slug}"; set data-theme="light" or "dark" on the same element, otherwise follow system. */\n[data-brand="${slug}"] {\n${declarations('light')}\n  color-scheme: light;\n}\n[data-brand="${slug}"][data-theme="dark"] {\n${declarations('dark')}\n  color-scheme: dark;\n}\n@media (prefers-color-scheme: dark) {\n[data-brand="${slug}"]:not([data-theme="light"]) {\n${declarations('dark')}\n  color-scheme: dark;\n}\n}\n`;
}

function main() {
  const [input, flag, output, ...rest] = process.argv.slice(2);
  if (!input || (flag && flag !== '--css') || (flag && !output) || rest.length) throw new Error('Usage: node brand-check.mjs brand.json [--css NEW-output.css]');
  const brand = JSON.parse(readFileSync(input,'utf8'));
  const errors = validateBrand(brand);
  if (errors.length) throw new Error(errors.join('\n'));
  if (output) writeFileSync(output,brandCSS(brand),{flag:'wx'});
  console.log(`Brand contract valid: ${brand.name}. Checked both theme palettes for text contrast. Visual and browser review still required.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
