// Record a page's animation as a video for a social post: an H.264 MP4 at the platform's size, and one contact sheet of its frames
// to review instead of the video itself.
//
//   node post-video.mjs <file or URL> [--format feed|reel|story|square|wide] [--out FILE.mp4] [--seconds N] [--slow 0.2] [--fps 30]
//                      [--voice voice.json] [--locale en_US] [--browser PATH]
//
// Formats, from Meta's Ads Guide on 2026-10-16 (Facebook Feed, Reels and Stories video specs):
//   feed    1440x1800  4:5, Facebook Feed
//   reel    1440x2560  9:16, Reels; keep text and key visuals out of the top 14%, the bottom 35% and 6% at each side
//   story   1440x2560  9:16, Stories; keep text out of the top 14% and the bottom 20%
//   square  1080x1080  1:1
//   wide    1920x1080  16:9, a page, a slide or YouTube
// Meta asks for H.264, a fixed frame rate, stereo AAC at 128 kb/s or more and no edit lists, which is what this writes. The AAC
// target is 192 kb/s because pauses between voice lines pull the average about a quarter below the target.
// The page renders about 500 px across at a whole-number pixel ratio, so text stays sharp. Its clocks (timers, animation frames, dates, media,
// and CSS and Web Animations through the DevTools protocol) run at --slow of real time while screenshots are taken back to back.
// Each video frame takes the last screenshot taken by its moment on the page's clock, so a slow screenshot never makes the video stutter.
// When the page defines window.filmStart(), the recording calls it and ends once window.filmDone is set (a take-apart page opened
// with ?film does both); otherwise it records --seconds of the page as it plays (10 by default).
// --voice takes the voice.json voice-over.mjs writes. The page gets window.filmVoice, { id: seconds }, so a take-apart film holds
// each beat until its line ends, and window.filmBeat(id), which marks when a beat starts. Each line plays from its beat's moment,
// the mix is evened to -16 LUFS, and the captions go beside the MP4 as <name>.<locale>.srt, the name Facebook reads the language
// from: two lines of 42 characters at most per caption, as in Netflix's English style guide. Lines whose beat never starts are
// left out, with a warning.
// Writes the MP4 (yuv420p in TV range, fast start; AAC sound with --voice) and <name>-sheet.png, and prints one JSON line:
// { file, format, size, seconds, frames, held, sheet, captions, warnings, errors }. `held` is the share of frames that repeat the
// one before because no new screenshot was ready in time; above 0.2, run again with a lower --slow. Warnings name text that sits
// under the platform's buttons, and voice lines that are left out, run into the next or read faster than 20 characters a
// second. Needs ffmpeg on the PATH.
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const formats = { feed: [1440, 1800, 0, 0], reel: [1440, 2560, .14, .35], story: [1440, 2560, .14, .2], square: [1080, 1080, 0, 0], wide: [1920, 1080, 0, 0] };
const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
const target = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const format = flag('format', 'feed');
if (!target || !formats[format]) { console.error(`usage: node post-video.mjs <file or URL> [--format ${Object.keys(formats).join('|')}] [--out FILE.mp4] [--seconds N] [--slow 0.2] [--fps 30]`); process.exit(1); }
if (spawnSync('ffmpeg', ['-version']).status !== 0) { console.error('ffmpeg is not on the PATH. Install it (brew install ffmpeg) and run again.'); process.exit(1); }
const [W, H, safeTop, safeBottom] = formats[format], SLOW = Number(flag('slow', .2)), FPS = Number(flag('fps', 30));
const [file, query] = target.split('?');
const url = /^(https?|file):/.test(target) ? target : pathToFileURL(path.resolve(file)).href + (query ? `?${query}` : '');
if (url.startsWith('file:') && !existsSync(new URL(url))) { console.error(`${target} does not exist.`); process.exit(1); }
const stem = (p => (p.name === 'index' ? path.basename(p.dir) : p.name) || 'page')(path.parse(new URL(url).pathname));
const out = path.resolve(flag('out', `${stem}-${format}.mp4`)), base = out.replace(/\.mp4$/i, ''), sheet = `${base}-sheet.png`;
const voiced = flag('voice') && { dir: path.dirname(path.resolve(flag('voice'))), ...JSON.parse(readFileSync(flag('voice'), 'utf8')) };
const captions = voiced && `${base}.${flag('locale', 'en_US')}.srt`, silent = voiced ? `${base}.silent.mp4` : out;

let chromium;
try { ({ chromium } = createRequire(path.join(process.cwd(), 'package.json'))('playwright-core')); } catch {
  try { ({ chromium } = await import('playwright-core')); } catch { console.error('playwright-core is not installed here. Run: npm install --no-save playwright-core && npx playwright-core install chromium'); process.exit(1); }
}
/* Playwright's own Chromium, else a Chrome-family browser already on the machine. */
async function launch() {
  if (flag('browser')) return chromium.launch({ executablePath: flag('browser') });
  try { return await chromium.launch(); } catch (error) {
    const local = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
    if (!local) throw error;
    return chromium.launch({ executablePath: local });
  }
}

const browser = await launch();
// A whole-number pixel ratio that leaves the page about 500 px across, the width its layout is made for; a fractional ratio
// leaves seams under rounded boxes. ffmpeg scales the result to the exact size.
const DPR = Math.max(1, Math.round(Math.min(W, H) / 500));
const context = await browser.newContext({ viewport: { width: Math.round(W / DPR), height: Math.round(H / DPR) }, deviceScaleFactor: DPR });
await context.addInitScript(([slow, voice]) => {
  if (voice) { window.filmVoice = voice; window.__beats = []; window.filmBeat = id => window.__beats.push([id, performance.now()]); }
  const real = performance.now.bind(performance), t0 = real(), clock = t => t0 + (t - t0) * slow;
  performance.now = () => clock(real());
  const realDate = Date.now, d0 = realDate();
  Date.now = () => Math.round(d0 + (realDate() - d0) * slow);
  // DevTools' animation rate already slows the frame clock behind animation-frame timestamps, so callbacks get the slowed
  // performance.now() instead; slowing that timestamp again would leave it behind every timer.
  const raf = requestAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => raf(() => callback(performance.now()));
  for (const name of ['setTimeout', 'setInterval']) { const timer = window[name].bind(window); window[name] = (callback, ms = 0, ...rest) => timer(callback, ms / slow, ...rest); }
  document.addEventListener('play', e => { e.target.playbackRate = slow; }, true);
}, [SLOW, voiced && Object.fromEntries(voiced.lines.map(l => [l.id, l.seconds]))]);
const page = await context.newPage(), errors = [], warnings = new Set();
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
const cdp = await context.newCDPSession(page);
await cdp.send('Animation.enable');
await cdp.send('Animation.setPlaybackRate', { playbackRate: SLOW });

/* Text inside the bands the platform's buttons cover. */
const covered = () => safeTop || safeBottom ? page.evaluate(([top, bottom]) => [...document.querySelectorAll('body *')].filter(el => {
  if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return false;
  const r = el.getBoundingClientRect(), s = getComputedStyle(el);
  return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && +s.opacity > .5 && r.bottom > 0 && r.top < innerHeight && (r.top < innerHeight * top || r.bottom > innerHeight * (1 - bottom));
}).map(el => el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)), [safeTop, safeBottom]) : [];

const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
  '-profile:v', 'high', '-vf', `scale=${W}:${H}:in_range=pc:out_range=tv,format=yuv420p`, '-color_range', 'tv', '-r', String(FPS), '-movflags', '+faststart', '-use_editlist', '0', '-an', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
let start = null, last = null, shot = 0, written = 0, held = 0, previous = -1, queue = Promise.resolve();
/* Writes every video frame due before `until` (real ms) as the last screenshot taken. */
const flush = until => { queue = queue.then(async () => {
  while (start !== null && last && start + written * 1000 / FPS / SLOW < until) {
    if (shot === previous) held++;
    previous = shot;
    if (!ffmpeg.stdin.write(last)) await once(ffmpeg.stdin, 'drain');
    written++;
  }
}); return queue; };
const grab = async () => { const before = Date.now(), image = await page.screenshot({ type: 'jpeg', quality: 92 }); await flush((before + Date.now()) / 2); last = image; shot++; };

await grab();
const driven = await page.evaluate(() => typeof window.filmStart === 'function');
await page.evaluate(() => { window.__t0 = performance.now(); window.filmStart?.(); });
start = Date.now();
let end = driven ? null : start + Number(flag('seconds', 10)) * 1000 / SLOW, shots = 0;
while (!end || Date.now() < end) {
  await grab();
  if (++shots % 8 === 0 && !end && await page.evaluate(() => !!window.filmDone)) end = Date.now();
  if (shots % 40 === 0) for (const text of await covered()) warnings.add(`"${text}" sits where the platform's buttons cover it`);
}
await flush(end);
ffmpeg.stdin.end();
await once(ffmpeg, 'close');
const beats = voiced ? await page.evaluate(() => window.__beats.map(([id, t]) => [id, (t - window.__t0) / 1000])) : [];
await browser.close();

const seconds = written / FPS;
if (voiced) narrate();
const tiles = Math.min(48, Math.max(8, Math.ceil(seconds * 1.5)));
spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-vf', `fps=${tiles / seconds},scale=216:-1,tile=8x${Math.ceil(tiles / 8)}:padding=3:color=gray`, '-frames:v', '1', sheet]);
console.log(JSON.stringify({ file: out, format, size: `${W}x${H}`, seconds: +seconds.toFixed(2), frames: written, held: +(held / Math.max(written, 1)).toFixed(2), sheet, captions, warnings: [...warnings], errors }));
if (errors.length) process.exitCode = 1;

/* Plays each voice line from its beat's moment over the silent video, evens the loudness, and writes the captions. */
function narrate() {
  const at = new Map();
  for (const [id, t] of beats) if (!at.has(id)) at.set(id, t);
  const placed = voiced.lines.filter(l => at.has(l.id) || !warnings.add(`voice line "${l.id}" has no beat on the page, so it is left out`))
    .map(l => ({ ...l, start: at.get(l.id) })).sort((a, b) => a.start - b.start);
  placed.forEach((l, i) => {
    if (placed[i + 1] && l.start + l.seconds > placed[i + 1].start + .05) warnings.add(`voice line "${l.id}" runs into "${placed[i + 1].id}"`);
  });
  const mix = placed.length ? `${placed.map((l, i) => `[${i + 1}:a]adelay=${Math.round(l.start * 1000)}:all=1[v${i}]`).join(';')};${placed.map((_, i) => `[v${i}]`).join('')}`
    + `amix=inputs=${placed.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad[a]` : 'anullsrc=r=48000:cl=stereo[a]';
  const run = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, ...placed.flatMap(l => ['-i', path.join(voiced.dir, l.file)]), '-filter_complex', mix,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', seconds.toFixed(3), '-movflags', '+faststart', '-use_editlist', '0', out], { encoding: 'utf8' });
  if (run.status !== 0) { errors.push(`ffmpeg could not add the voice: ${run.stderr.trim().slice(0, 300)}; the silent video is ${silent}`); return; }
  unlinkSync(silent);
  const stamp = s => new Date(Math.round(s * 1000)).toISOString().slice(11, 23).replace('.', ',');
  /* One row of 42 characters if it fits. Else the even, slightly bottom-heavy two-row split that breaks after punctuation, not
     after an article, preposition or conjunction, as Netflix's English guide asks; more rows mean the text needs another cue. */
  const small = /^(a|an|the|and|or|but|of|to|in|on|at|by|for|from|with|into|its|your|their|our|my|is|are)$/i;
  const rows = text => {
    if (text.length <= 42) return [text];
    const words = text.split(' ');
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const top = words.slice(0, i).join(' '), bottom = words.slice(i).join(' ');
      if (top.length > 42 || bottom.length > 42) continue;
      const score = Math.abs(top.length - bottom.length) + (top.length > bottom.length ? 5 : 0) + (/[,;:.!?]$/.test(top) ? -8 : 0) + (small.test(words[i - 1]) ? 30 : 0);
      if (!best || score < best.score) best = { score, rows: [top, bottom] };
    }
    return best?.rows ?? words.reduce((r, w) => (r.length && `${r.at(-1)} ${w}`.length <= 42 ? r[r.length - 1] += ` ${w}` : r.push(w), r), []);
  };
  const cues = placed.flatMap(l => {
    const text = (l.caption ?? l.text).replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim(), parts = [];
    for (const sentence of text.split(/(?<=[.!?])\s+/)) for (const w of sentence.split(' ')) {
      if (!parts.length || parts.at(-1).done || rows(`${parts.at(-1).text} ${w}`).length > 2) parts.push({ text: w }); else parts.at(-1).text += ` ${w}`;
      if (/[.!?]$/.test(w)) parts.at(-1).done = true;
    }
    let used = 0;
    return parts.map(p => ({ id: l.id, chars: text.length, start: l.start + l.seconds * used / text.length, spoken: l.start + l.seconds * Math.min(used += p.text.length + 1, text.length) / text.length, text: rows(p.text).join('\n') }));
  });
  /* Netflix's timing guide: a subtitle stays at least half a second past its speech, two frames separate subtitles, and a gap
     under half a second closes to two frames rather than flicker. Reading speed counts the time a line's captions are up. */
  const two = 2 / FPS;
  cues.forEach((c, i) => {
    const next = cues[i + 1]?.start;
    c.end = Math.min(c.spoken + .5, (next ?? seconds) - two);
    if (next !== undefined && next - c.end < .5) c.end = next - two;
  });
  for (const l of placed) {
    const own = cues.filter(c => c.id === l.id), cps = own[0]?.chars / (own.at(-1)?.end - own[0]?.start);
    if (cps > 20) warnings.add(`voice line "${l.id}" reads at ${cps.toFixed(0)} characters a second; captions past 20 are hard to follow`);
  }
  writeFileSync(captions, cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(Math.min(c.end, seconds))}\n${c.text}\n`).join('\n'));
}
