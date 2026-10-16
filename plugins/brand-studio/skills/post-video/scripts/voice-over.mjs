// Turn a narration script into voice lines with Fish Audio, one clip per line, for post-video.mjs to place on the film's beats.
//
//   node --env-file-if-exists=.env voice-over.mjs <script.json> [--out DIR] [--model s2.1-pro] [--voice ID] [--speed 1]
//   node --env-file-if-exists=.env voice-over.mjs --voices [--search WORDS]
//   node --env-file-if-exists=.env voice-over.mjs --credit
//
// script.json is { "voice": "<Fish Audio voice model id>", "lines": [{ "id": "intro", "text": "...", "caption": "..." }, ...] };
// each id names a beat the page calls window.filmBeat() with (take-apart.mjs --beats lists a take-apart page's beats), and the
// optional caption is what the captions show when the spoken text is spelled for the ear ("brand studio dot J S dot org").
// --voice overrides the script's voice; with neither, Fish Audio picks its default voice.
// Reads FISH_API_KEY from the environment and never prints it. A line whose text, voice, model and speed match the last run is
// kept, so changing one line generates one line. Writes DIR/<id>.mp3 and DIR/voice.json, { model, voice, speed, lines: [{ id,
// text, caption, file, seconds, key }] }, and prints one JSON line { voice, lines, generated, seconds, bytes, model }. Fish Audio bills the
// text's UTF-8 bytes; s2.1-pro-free costs nothing, and a paid model that runs out of API credit (402) falls back to it.
// --voices lists popular English voice models, { voices: [{ id, title, tags, uses }] }, to choose one. --credit prints the
// account's plan and API credit, { plan: { type, total, balance }, api: { credit } }, before a long run.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
const key = process.env.FISH_API_KEY;
if (!key) { console.error('FISH_API_KEY is not set. Create a key at https://fish.audio/app/api-keys, put FISH_API_KEY=... in a git-ignored .env, and run with node --env-file-if-exists=.env.'); process.exit(1); }
const api = (route, init = {}) => fetch(`https://api.fish.audio${route}`, { ...init, headers: { Authorization: `Bearer ${key}`, ...init.headers } });

if (args.includes('--credit')) {
  const [plan, credit] = await Promise.all(['/wallet/self/package', '/wallet/self/api-credit'].map(async route => { const res = await api(route); return res.ok ? res.json() : { error: res.status }; }));
  console.log(JSON.stringify({ plan: plan.error ? plan : { type: plan.type, total: plan.total, balance: plan.balance }, api: credit.error ? credit : { credit: credit.credit } }));
  process.exit(0);
}
if (args.includes('--voices')) {
  const query = new URLSearchParams({ page_size: '12', sort_by: 'task_count', language: 'en', ...(flag('search') ? { title: flag('search') } : {}) });
  const res = await api(`/model?${query}`);
  if (!res.ok) { console.error(`Fish Audio ${res.status}: ${(await res.text()).slice(0, 300)}`); process.exit(1); }
  const { items } = await res.json();
  console.log(JSON.stringify({ voices: items.map(m => ({ id: m._id, title: m.title, tags: m.tags, uses: m.task_count })) }));
  process.exit(0);
}

const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!file) { console.error('usage: node --env-file-if-exists=.env voice-over.mjs <script.json> [--out DIR] [--model s2.1-pro] [--voice ID] [--speed 1]'); process.exit(1); }
const script = JSON.parse(readFileSync(file, 'utf8'));
const out = path.resolve(flag('out', path.join(path.dirname(file), 'voice')));
const voice = flag('voice', script.voice ?? null), speed = Number(flag('speed', script.speed ?? 1));
let model = flag('model', script.model ?? 's2.1-pro');
const ids = new Set();
for (const line of script.lines ?? []) {
  if (!/^[\w:#~.-]+$/.test(line.id ?? '') || ids.has(line.id)) { console.error(`each line needs an id of its own, made of letters, digits and : # ~ . - (got "${line.id}")`); process.exit(1); }
  if (!line.text?.trim()) { console.error(`line ${line.id} has no text`); process.exit(1); }
  ids.add(line.id);
}
mkdirSync(out, { recursive: true });
const manifest = path.join(out, 'voice.json');
const before = existsSync(manifest) ? Object.fromEntries(JSON.parse(readFileSync(manifest, 'utf8')).lines.map(l => [l.id, l])) : {};
const seconds = f => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim());

async function speak(text) {
  for (let attempt = 0; ; attempt++) {
    const res = await api('/v1/tts', { method: 'POST', headers: { 'Content-Type': 'application/json', model },
      body: JSON.stringify({ text, reference_id: voice, format: 'mp3', mp3_bitrate: 192, latency: 'normal', prosody: { speed, normalize_loudness: true } }) });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const body = (await res.text()).slice(0, 300);
    if (res.status === 402 && model !== 's2.1-pro-free') { console.error(`Fish Audio 402: no API credit for ${model}; using s2.1-pro-free.`); model = 's2.1-pro-free'; continue; }
    if ((res.status === 429 || res.status >= 500) && attempt < 4) { await new Promise(done => setTimeout(done, 1000 * 2 ** attempt)); continue; }
    throw new Error(`Fish Audio ${res.status}: ${body}`);
  }
}

const lines = [];
let generated = 0, bytes = 0;
for (const line of script.lines) {
  const target = path.join(out, `${line.id.replace(/[:#~]/g, '_')}.mp3`);
  const hash = createHash('sha256').update(JSON.stringify([line.text, voice, model, speed])).digest('hex').slice(0, 16);
  if (before[line.id]?.key !== hash || !existsSync(target)) {
    try { writeFileSync(target, await speak(line.text)); } catch (error) { console.error(`${line.id}: ${error.message}`); process.exit(1); }
    generated++; bytes += Buffer.byteLength(line.text);
  }
  lines.push({ id: line.id, text: line.text, caption: line.caption, file: path.basename(target), seconds: +seconds(target).toFixed(3), key: hash });
}
writeFileSync(manifest, JSON.stringify({ model, voice, speed, lines }, null, 2));
console.log(JSON.stringify({ voice: manifest, lines: lines.length, generated, seconds: +lines.reduce((a, l) => a + l.seconds, 0).toFixed(2), bytes, model }));
