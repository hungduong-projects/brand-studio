// Render the Brand Studio intro film to MP4 plus a poster frame.
//
//   node examples/intro-film/render.mjs [--site https://brandstudio.js.org] [--out apps/docs/public/videos] [--fps 30] [--blur 4] [--stills 2,10,23]
//
// 1. Captures each example page the film shows, one screenshot per film frame while it scrolls, from --site.
// 2. Bundles film.tsx with esbuild and opens it in headless Chromium at 1152x648 with a 2x device scale.
// 3. Seeks --blur sub-frames per frame and pipes them to ffmpeg, which averages each group into one frame (motion blur)
//    and scales to 1920x1080. A 5/3 device scale would land on 1920x1080 directly, but Chromium leaves seams under
//    rounded boxes at that fractional scale.
// --stills writes only those moments as PNGs, for review. Needs playwright-core with a Chromium, and ffmpeg on the PATH.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
const site = flag('site', 'https://brandstudio.js.org').replace(/\/$/, '');
const out = path.resolve(flag('out', path.join(here, '../../apps/docs/public/videos')));
const fps = Number(flag('fps', 30));
const blur = Number(flag('blur', 4));
const stills = flag('stills')?.split(',').map(Number);
const size = 'scale=1920:1080:flags=lanczos';

if (spawnSync('ffmpeg', ['-version']).status !== 0) { console.error('ffmpeg is not on the PATH. Install it (brew install ffmpeg) and run again.'); process.exit(1); }

const work = mkdtempSync(path.join(tmpdir(), 'intro-film-'));
await build({ entryPoints: [path.join(here, 'film.tsx')], bundle: true, outdir: work, format: 'iife', jsx: 'automatic', minify: true, loader: { '.woff2': 'dataurl', '.woff': 'dataurl' }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning' });
writeFileSync(path.join(work, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="film.css"></head><body><div id="film"></div><script src="film.js"></script></body></html>');

const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [])] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, deviceScaleFactor: 2 });
const problems = [];
page.on('pageerror', error => problems.push(error.message));
page.on('console', message => message.type() === 'error' && problems.push(message.text()));
await page.goto(pathToFileURL(path.join(work, 'index.html')).href);
await page.waitForFunction(() => typeof window.seek === 'function');
const film = await page.evaluate(() => window.film);

// The browser window's page area is 960x526 CSS pixels in the film, 1920x1052 at 2x: capture at 1280x701 and 1.5x.
const frames = {};
const sitePage = await browser.newPage({ viewport: { width: 1280, height: 701 }, deviceScaleFactor: 1.5 });
for (const shown of film.pages) {
  await sitePage.goto(site + shown.path, { waitUntil: 'networkidle' });
  await sitePage.waitForTimeout(1500);
  const count = Math.round(shown.seconds * fps) + 1;
  const reach = await sitePage.evaluate(distance => Math.min(distance, document.documentElement.scrollHeight - innerHeight), shown.distance);
  frames[shown.id] = [];
  for (let i = 0; i < count; i++) {
    const x = i / (count - 1);
    const eased = x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
    await sitePage.evaluate(y => { scrollTo(0, y); return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }, Math.round(reach * eased));
    await sitePage.waitForTimeout(40);
    const file = `${shown.id}-${String(i).padStart(3, '0')}.jpg`;
    await sitePage.screenshot({ path: path.join(work, file), type: 'jpeg', quality: 88 });
    frames[shown.id].push(file);
  }
  console.log(`captured ${count} frames of ${shown.path}`);
}
await sitePage.close();
await page.evaluate(next => window.setFrames(next), frames);

const shot = async (t, options = {}) => { await page.evaluate(time => window.seek(time), t); return page.screenshot(options); };
await shot(0);
await page.evaluate(() => Promise.all(['16px "Geist Variable"', '600 16px "Geist Variable"', '16px "Geist Mono"'].map(font => document.fonts.load(font))));
await page.evaluate(() => window.aim());

mkdirSync(out, { recursive: true });
if (stills) {
  for (const t of stills) await shot(t, { path: path.join(out, `intro-${String(t).replace('.', '_')}s.png`) });
} else {
  const filters = blur > 1 ? `tmix=frames=${blur},select='eq(mod(n\\,${blur})\\,${blur - 1})',setpts=N/(${fps}*TB),${size}` : size;
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps * blur), '-i', '-', '-vf', filters, '-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(out, 'brand-studio-intro.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  const total = Math.round(film.seconds * fps) * blur;
  for (let n = 0; n < total; n++) {
    const image = await shot(n / (fps * blur), { type: 'jpeg', quality: 95 });
    if (!ffmpeg.stdin.write(image)) await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    if (n % (fps * blur) === 0) process.stdout.write(`\r${n / (fps * blur)}s of ${film.seconds}s`);
  }
  ffmpeg.stdin.end();
  await done;
  const poster = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'png_pipe', '-i', '-', '-vf', size, '-q:v', '3', path.join(out, 'brand-studio-intro.jpg')], { input: await shot(film.posterAt) });
  if (poster.status !== 0) throw new Error(`poster export failed: ${poster.stderr}`);
  console.log(`\nWrote brand-studio-intro.mp4 and brand-studio-intro.jpg to ${out}`);
}
await browser.close();
rmSync(work, { recursive: true, force: true });
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
