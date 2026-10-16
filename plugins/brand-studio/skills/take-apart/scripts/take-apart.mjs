// Check a take-apart model and build it into one self-contained, interactive page in the brand's colours and fonts.
//
//   node take-apart.mjs <model.js> [--brand brand/brand.json] [--out DIR]
//   node take-apart.mjs <model.js> --beats
//
// Runs the model with assets/kit.js in Node, so no browser is needed for these checks: every figure draws, every part that
// opens a figure names one and has a hit() in its drawing, every figure is reachable from the top, pins sit on their layer,
// and the film tour follows real parts. Then writes DIR/index.html (by default a folder named after the model, next to it)
// with the viewer, the kit, the model and the brand's tokens inlined. Prints one JSON line,
// { out, figures, layers, parts, depth, fails, warnings }, and exits 1 when anything fails.
// Next: check-visual on DIR/index.html for layout, and post-video on 'DIR/index.html?film' for a social video.
// --beats prints the ?film tour's beats in order, { beats: [{ id, shows }] }, with the text each one shows: the ids a voice-over
// script for post-video uses.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!file) { console.error('usage: node take-apart.mjs <model.js> [--brand brand.json] [--out DIR]'); process.exit(1); }
const assets = fileURLToPath(new URL('../assets/', import.meta.url));
const kit = readFileSync(path.join(assets, 'kit.js'), 'utf8'), source = readFileSync(file, 'utf8');
const fails = [], warnings = [];
const done = extra => { console.log(JSON.stringify({ ...extra, fails, warnings })); process.exit(fails.length ? 1 : 0); };

// The kit and the model run as one module, the way the page runs them as two scripts.
let M, drawLayer, P;
try {
  const code = `${kit}\n${source}\nexport default [MODEL, drawLayer, P];`;
  ({ default: [M, drawLayer, P] } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`));
} catch (error) { fails.push(`the model does not run: ${error.message}`); done({}); }
if (!M?.figures || !Object.keys(M.figures).length) { fails.push('the model never calls model({ figures: { ... } })'); done({}); }

const figures = M.figures, root = Object.keys(figures)[0], drawn = {};
let layerCount = 0, partCount = 0;
for (const [key, fig] of Object.entries(figures)) {
  const where = `figure ${key}`;
  for (const field of ['crumb', 'heading', 'alt', 'caption']) if (typeof fig[field] !== 'string' || !fig[field]) fails.push(`${where}: needs ${field}`);
  if (!Array.isArray(fig.gap) || fig.gap.length !== 2 || !fig.gap.every(Number.isFinite)) fails.push(`${where}: gap must be [wide, narrow], two numbers`);
  if (!Array.isArray(fig.layers) || fig.layers.length < 2) { fails.push(`${where}: needs at least two layers to come apart`); continue; }
  if (fig.layers.length > 7) warnings.push(`${where}: ${fig.layers.length} layers; more than 7 crowd the labels`);
  if (key === root && fig.layers.length < 4) warnings.push(`${where}: the first view has ${fig.layers.length} layers; 4 to 7 show how the whole thing is built`);
  if (fig.caption?.length > 120) warnings.push(`${where}: caption runs ${fig.caption.length} characters; keep it under 120`);
  const keys = new Set();
  drawn[key] = fig.layers.map(layer => {
    const at = `${where}, layer ${layer.key}`;
    layerCount++;
    if (!layer.key || keys.has(layer.key)) fails.push(`${at}: needs a key of its own`);
    keys.add(layer.key);
    if (!layer.title || !layer.readout) fails.push(`${at}: needs a title and a readout`);
    if (!Number.isFinite(layer.zA)) fails.push(`${at}: zA must be a number`);
    if (layer.title?.length > 30) warnings.push(`${at}: title runs ${layer.title.length} characters; keep it under 30`);
    if (layer.readout?.length > 110) warnings.push(`${at}: readout runs ${layer.readout.length} characters; about two lines is under 110`);
    if (typeof layer.draw !== 'function') { fails.push(`${at}: draw must be a function`); return null; }
    let out;
    try { out = drawLayer(layer); } catch (error) { fails.push(`${at}: draw() throws: ${error.message}`); return null; }
    const box = out.box;
    if (!Number.isFinite(box.minX)) { fails.push(`${at}: draws no solid or outline, so it has no size`); return null; }
    const parts = layer.parts || [];
    if (parts.length > 6) warnings.push(`${at}: ${parts.length} parts; more than 6 pins crowd the layer`);
    for (const part of parts) {
      partCount++;
      const name = `${at}, part "${part.name}"`;
      if (!part.name) fails.push(`${at}: a part needs a name`);
      if (part.at) {
        if (part.at.length !== 3 || !part.at.every(Number.isFinite)) fails.push(`${name}: at must be [x, y, z]`);
        else { const [a, b] = P(...part.at); if (a < box.minX - 6 || a > box.maxX + 6 || b < box.minY - 6 || b > box.maxY + 6) warnings.push(`${name}: its pin sits off the layer's drawing`); }
      }
      if (!part.open) continue;
      if (!figures[part.open]) fails.push(`${name}: opens ${part.open}, which is not a figure`);
      if (!part.id) fails.push(`${name}: opens a figure, so it needs an id`);
      else if (!out.body.includes(`class="hit" data-open="${part.open}" data-part="${part.id}"`)) fails.push(`${name}: no hit('${part.open}', '${part.id}', ...) in the layer's drawing to click`);
    }
    return out;
  });
}

// Every figure is reached from the top through the parts that open it.
const depthOf = { [root]: 1 }, queue = [root];
while (queue.length) {
  const key = queue.shift();
  for (const l of figures[key].layers || []) for (const p of l.parts || []) if (p.open && figures[p.open] && !(p.open in depthOf)) { depthOf[p.open] = depthOf[key] + 1; queue.push(p.open); }
}
for (const key of Object.keys(figures)) if (!(key in depthOf)) fails.push(`figure ${key}: no part opens it, so no one can reach it`);

// The film tour: each dive follows parts that exist, figure by figure.
if (M.tour !== undefined && !Array.isArray(M.tour)) fails.push('tour must be a list of { dive, light } stops');
for (const [d, stop] of (Array.isArray(M.tour) ? M.tour : []).entries()) {
  if (!Array.isArray(stop?.dive) || !stop.dive.length) { fails.push(`tour ${d + 1}: needs dive, a list of part ids`); continue; }
  let key = root;
  for (const id of stop.dive || []) {
    const part = (figures[key].layers || []).flatMap(l => l.parts || []).find(p => p.id === id);
    if (!part?.open) { fails.push(`tour ${d + 1}: figure ${key} has no part ${id} that opens a figure`); key = null; break; }
    key = part.open;
  }
  if (key) for (const lit of stop.light || []) if (!figures[key].layers.some(l => l.key === lit)) fails.push(`tour ${d + 1}: figure ${key} has no layer ${lit} to light`);
}
if (M.end && (!Array.isArray(M.end) || M.end.length < 2)) fails.push('end must be [title, line] or [title, line, link]');

const summary = { figures: Object.keys(figures).length, layers: layerCount, parts: partCount, depth: Math.max(...Object.values(depthOf)) };
if (fails.length) done(summary);

// The film's beats, as the page's tour plays them (viewer.html, ?film).
if (args.includes('--beats')) {
  const beats = [], seen = {}, owner = (key, id) => figures[key].layers.findIndex(l => (l.parts || []).some(p => p.id === id));
  const add = (id, shows) => { seen[id] = (seen[id] || 0) + 1; beats.push({ id: seen[id] > 1 ? `${id}~${seen[id]}` : id, shows }); };
  const lit = (key, layer) => add(`${key}#${layer.key}`, `${layer.title}: ${layer.readout}`);
  const auto = () => { // the page's default: the first part that opens, from the top layer down, three levels at most
    const dive = [], used = new Set([root]);
    let key = root;
    while (dive.length < 3) {
      const p = [...figures[key].layers].reverse().flatMap(l => l.parts || []).find(p => p.open && figures[p.open] && !used.has(p.open));
      if (!p) break;
      dive.push(p.id); used.add(p.open); key = p.open;
    }
    return dive.length ? [{ dive, light: [figures[key].layers.at(-1).key] }] : [];
  };
  add('intro', `${figures[root].heading}. ${figures[root].caption}`);
  for (const [d, stop] of (M.tour || auto()).entries()) {
    let key = root;
    for (const [k, id] of stop.dive.entries()) {
      const layers = figures[key].layers, i = owner(key, id);
      if (d === 0 && k === 0) for (let j = layers.length - 1; j > i; j--) lit(key, layers[j]);
      lit(key, layers[i]);
      key = layers[i].parts.find(p => p.id === id).open;
      add(`into:${key}`, `${figures[key].heading}. ${figures[key].caption}`);
    }
    for (const name of stop.light || []) lit(key, figures[key].layers.find(l => l.key === name));
    add('home', figures[root].heading);
  }
  add('together', figures[root].heading);
  if (M.end) add('end', M.end.join(' / '));
  console.log(JSON.stringify({ beats }));
  process.exit(0);
}

// Build the page: the viewer with the kit, the model and the brand's tokens inlined.
const out = path.resolve(flag('out') ?? path.join(path.dirname(file), path.basename(file, path.extname(file))));
const inline = text => text.replace(/<\/script/gi, '<\\/script');
const esc = text => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let html = readFileSync(path.join(assets, 'viewer.html'), 'utf8')
  .replace('<title>Exploded view</title>', () => `<title>${esc(figures[root].heading)}</title>`)
  .replace('<script src="kit.js"></script>', () => `<script>\n${inline(kit)}</script>`)
  .replace('<script src="model.js"></script>', () => `<script>\n${inline(source)}</script>`);
if (flag('brand')) {
  const tokens = JSON.parse(readFileSync(flag('brand'), 'utf8')).tokens ?? {};
  const roles = { surface: 'surface', elevated: 'elevated', ink: 'ink', muted: 'muted', accent: 'accent', onAccent: 'on-accent', line: 'line' };
  const vars = mode => Object.entries(roles).filter(([k]) => tokens[mode]?.[k]).map(([k, v]) => `--bs-${v}: ${tokens[mode][k]};`)
    .concat(tokens[mode]?.font ? [`--font: ${tokens[mode].font};`] : []).join(' ');
  if (!tokens.light || !tokens.dark) warnings.push('the brand has no tokens.light and tokens.dark; the page keeps its neutral colours');
  html = html.replace('</style>', () => `/* brand */\n:root { ${vars('light')} }\n:root[data-theme="dark"] { ${vars('dark')} }\n</style>`);
}
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, 'index.html'), html);
done({ out: path.join(out, 'index.html'), ...summary });
