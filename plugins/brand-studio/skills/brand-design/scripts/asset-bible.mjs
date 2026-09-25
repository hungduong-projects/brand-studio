#!/usr/bin/env node
// Check an asset-bible.json: family rules, per-asset provenance, derivative lineage and preserved masters.
//
//   node asset-bible.mjs <dir>/asset-bible.json
//
// Paths in the bible resolve from the bible's folder. Errors fail the check; warnings flag palette drift.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROLES = ['master', 'background', 'subject', 'object', 'atmosphere', 'other'];
const SOURCES = {
  generated: ['prompt', 'model'],
  code: ['script'],
  'open-licence': ['title', 'author', 'url', 'licence'],
  original: ['author'],
  licensed: ['author', 'licence'],
};
// IPTC digital source type codes a bible may record (https://cv.iptc.org/newscodes/digitalsourcetype/).
const IPTC = ['digitalCapture', 'digitalCreation', 'algorithmicMedia', 'trainedAlgorithmicMedia', 'compositeWithTrainedAlgorithmicMedia', 'composite', 'minorHumanEdits', 'dataDrivenMedia'];
const text = v => typeof v === 'string' && v.trim().length > 0;
const texts = v => Array.isArray(v) && v.length > 0 && v.every(text);
const hex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const inside = (root, file) => { const rel = path.relative(root, path.resolve(root, file)); return rel && !rel.startsWith('..') && !path.isAbsolute(rel); };
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');

export function validateAssetBible(bible, { root = '.' } = {}) {
  const errors = [], warnings = [];
  if (!bible || typeof bible !== 'object' || Array.isArray(bible)) return { errors: ['bible must be an object'], warnings };
  if (bible.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  for (const key of ['name', 'subject', 'lighting', 'materials']) if (!text(bible[key])) errors.push(`${key} must be nonempty text`);
  if (!text(bible.camera) && !text(bible.illustration)) errors.push('camera or illustration rules must be nonempty text');
  if (!texts(bible.exclusions)) errors.push('exclusions needs a nonempty text array');

  // Palette: hex values, ideally drawn from the brand contract's tokens.
  if (!Array.isArray(bible.palette) || !bible.palette.length) errors.push('palette needs at least one colour');
  else {
    let tokens = null;
    if (bible.brand !== undefined) {
      const file = path.resolve(root, String(bible.brand));
      if (!text(bible.brand) || !existsSync(file)) errors.push(`brand contract not found: ${bible.brand}`);
      else {
        const t = JSON.parse(readFileSync(file, 'utf8')).tokens ?? {};
        tokens = new Set(Object.values(t).flatMap(mode => Object.values(mode ?? {})).filter(hex).map(v => v.toLowerCase()));
      }
    }
    bible.palette.forEach((c, i) => {
      if (!text(c?.role) || !hex(c?.hex)) errors.push(`palette[${i}] needs a role and a six-digit hex`);
      else if (tokens && !tokens.has(c.hex.toLowerCase())) warnings.push(`palette[${i}] ${c.hex} is not a token in ${bible.brand}`);
    });
  }

  if (!Array.isArray(bible.assets) || !bible.assets.length) { errors.push('assets must be nonempty'); return { errors, warnings }; }
  const byId = new Map(), files = new Map();
  bible.assets.forEach((a, i) => {
    const at = `assets[${i}]${text(a?.id) ? ` (${a.id})` : ''}`;
    if (!a || typeof a !== 'object') { errors.push(`${at} must be an object`); return; }
    if (!/^[a-z][a-z0-9-]*$/.test(a.id ?? '')) errors.push(`${at}.id must be a lowercase slug`);
    else if (byId.has(a.id)) errors.push(`duplicate asset id: ${a.id}`);
    else byId.set(a.id, a);
    if (!ROLES.includes(a.role)) errors.push(`${at}.role must be one of ${ROLES.join(', ')}`);
    if (!Number.isInteger(a.version) || a.version < 1) errors.push(`${at}.version must be a whole number from 1`);
    if (!texts(a.uses)) errors.push(`${at}.uses must name at least one artifact type`);
    // Empty alt is allowed only for layers that sit behind copy and carry no information.
    if (typeof a.alt !== 'string' || (!a.alt.trim() && !['background', 'atmosphere'].includes(a.role))) errors.push(`${at}.alt must describe the image${a.role === 'master' ? '' : ' (empty only for background or atmosphere)'}`);

    if (!text(a.file)) errors.push(`${at}.file must be a path`);
    else if (!inside(root, a.file)) errors.push(`${at}.file must stay inside the bible's folder`);
    else if (files.has(a.file)) errors.push(`${at}.file ${a.file} is also used by ${files.get(a.file)}`);
    else {
      files.set(a.file, a.id);
      const full = path.resolve(root, a.file);
      if (!existsSync(full)) errors.push(`${at}.file not found: ${a.file}`);
      else if (a.sha256 !== undefined && sha256(full) !== a.sha256) errors.push(`${at}.file ${a.file} no longer matches its recorded sha256; ${a.role === 'master' ? 'masters are never overwritten' : 'bump the version and write a new file'}`);
      if (a.role !== 'master' && Number.isInteger(a.version) && !new RegExp(`-v${a.version}\\.[a-z0-9]+$`, 'i').test(a.file)) errors.push(`${at}.file must end in -v${a.version} before the extension`);
    }
    if (a.role === 'master') {
      if (!/^[0-9a-f]{64}$/.test(a.sha256 ?? '')) errors.push(`${at}.sha256 is required for a master, so an overwrite is caught`);
      if (a.derivedFrom !== undefined) errors.push(`${at} is a master and cannot have derivedFrom`);
    } else if (!texts(a.changes)) errors.push(`${at}.changes must list what was done to the parent`);

    const s = a.source;
    if (!s || !SOURCES[s.type]) errors.push(`${at}.source.type must be one of ${Object.keys(SOURCES).join(', ')}`);
    else {
      for (const key of SOURCES[s.type]) if (!text(s[key])) errors.push(`${at}.source.${key} is required for ${s.type} assets`);
      if (s.type === 'code' && text(s.script) && !existsSync(path.resolve(root, s.script))) errors.push(`${at}.source.script not found: ${s.script}`);
      if (s.type === 'open-licence' && text(s.url) && !/^https:\/\//.test(s.url)) errors.push(`${at}.source.url must be an HTTPS link`);
      if (s.digitalSourceType !== undefined && !IPTC.includes(s.digitalSourceType)) errors.push(`${at}.source.digitalSourceType must be an IPTC code: ${IPTC.join(', ')}`);
      if (s.type === 'generated' && s.digitalSourceType && !IPTC.slice(3, 5).includes(s.digitalSourceType)) errors.push(`${at}.source.digitalSourceType for a generated asset must be trainedAlgorithmicMedia or compositeWithTrainedAlgorithmicMedia`);
    }
  });

  // Lineage: each derivative points at an asset in this bible, and following the chain reaches a master.
  for (const a of byId.values()) {
    if (a.role === 'master') continue;
    if (!text(a.derivedFrom)) { errors.push(`${a.id}.derivedFrom must name the asset it was made from`); continue; }
    const seen = new Set([a.id]);
    let parent = byId.get(a.derivedFrom);
    if (!parent) { errors.push(`${a.id}.derivedFrom names a missing asset: ${a.derivedFrom}`); continue; }
    while (parent && parent.role !== 'master' && !seen.has(parent.id)) { seen.add(parent.id); parent = byId.get(parent.derivedFrom); }
    if (!parent || parent.role !== 'master') errors.push(`${a.id}.derivedFrom does not lead back to a master`);
  }
  if (![...byId.values()].some(a => a.role === 'master')) errors.push('the family needs at least one master');
  const kinds = new Set(bible.assets.flatMap(a => Array.isArray(a?.uses) ? a.uses.filter(text) : []));
  if (kinds.size < 2) errors.push('the family must be used in at least two artifact types');
  return { errors, warnings };
}

function main() {
  const [input, ...rest] = process.argv.slice(2);
  if (!input || rest.length) throw new Error('Usage: node asset-bible.mjs asset-bible.json');
  const bible = JSON.parse(readFileSync(input, 'utf8'));
  const { errors, warnings } = validateAssetBible(bible, { root: path.dirname(path.resolve(input)) });
  for (const w of warnings) console.warn(`warning: ${w}`);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Asset bible valid: ${bible.name}, ${bible.assets.length} assets. Rights, lineage and files checked; look at the set side by side for consistency.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
