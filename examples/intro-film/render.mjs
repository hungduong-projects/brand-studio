// Render the Brand Studio intro film to MP4 plus a poster frame.
//
//   node examples/intro-film/render.mjs [--out apps/docs/public/videos] [--fps 30] [--stills 1,6,12]
//
// Bundles film.tsx with esbuild, opens it in headless Chromium at 1152x648 with a 2x device scale, seeks every frame and
// pipes the screenshots to ffmpeg, which scales them to 1920x1080. A 5/3 device scale would land on 1920x1080 directly,
// but Chromium leaves seams under rounded boxes at that fractional scale. --stills writes only those moments as PNGs, for review.
// Needs playwright-core with a Chromium, and ffmpeg on the PATH.
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
const out = path.resolve(flag('out', path.join(here, '../../apps/docs/public/videos')));
const fps = Number(flag('fps', 30));
const stills = flag('stills')?.split(',').map(Number);
const size = 'scale=1920:1080:flags=lanczos';

if (!stills && spawnSync('ffmpeg', ['-version']).status !== 0) { console.error('ffmpeg is not on the PATH. Install it (brew install ffmpeg) and run again.'); process.exit(1); }

const work = mkdtempSync(path.join(tmpdir(), 'intro-film-'));
await build({ entryPoints: [path.join(here, 'film.tsx')], bundle: true, outdir: work, format: 'iife', jsx: 'automatic', minify: true, loader: { '.woff2': 'dataurl', '.woff': 'dataurl' }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning' });
writeFileSync(path.join(work, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="film.css"></head><body><div id="film"></div><script src="film.js"></script></body></html>');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, deviceScaleFactor: 2 });
const problems = [];
page.on('pageerror', error => problems.push(error.message));
page.on('console', message => message.type() === 'error' && problems.push(message.text()));
await page.goto(pathToFileURL(path.join(work, 'index.html')).href);
await page.waitForFunction(() => typeof window.seek === 'function');
const { seconds, posterAt } = await page.evaluate(() => ({ seconds: window.filmSeconds, posterAt: window.posterAt }));
const shot = async (t, options = {}) => { await page.evaluate(time => window.seek(time), t); return page.screenshot(options); };
await shot(0);
await page.evaluate(() => Promise.all(['16px "Geist Variable"', '16px "Geist Mono"', '16px Manrope', '600 16px Manrope'].map(font => document.fonts.load(font))));

mkdirSync(out, { recursive: true });
if (stills) {
  for (const t of stills) await shot(t, { path: path.join(out, `intro-${String(t).replace('.', '_')}s.png`) });
} else {
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-vf', size, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(out, 'brand-studio-intro.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  const frames = Math.round(seconds * fps);
  for (let frame = 0; frame < frames; frame++) {
    const png = await shot(frame / fps);
    if (!ffmpeg.stdin.write(png)) await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    if (frame % fps === 0) process.stdout.write(`\r${frame / fps}s of ${seconds}s`);
  }
  ffmpeg.stdin.end();
  await done;
  const poster = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'png_pipe', '-i', '-', '-vf', size, '-q:v', '3', path.join(out, 'brand-studio-intro.jpg')], { input: await shot(posterAt) });
  if (poster.status !== 0) throw new Error(`poster export failed: ${poster.stderr}`);
  console.log(`\nWrote brand-studio-intro.mp4 and brand-studio-intro.jpg to ${out}`);
}
await browser.close();
rmSync(work, { recursive: true, force: true });
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
