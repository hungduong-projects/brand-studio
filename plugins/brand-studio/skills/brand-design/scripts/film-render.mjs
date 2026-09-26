// Render a product film to MP4 plus a poster frame, or to review stills.
//
//   node film-render.mjs --film film/film.tsx [--name intro] [--out DIR] [--site https://example.com] [--fps 30] [--blur 4] [--crf 26] [--stills 2,10,23]
//
// A film is a React file drawn as a pure function of time with film/kit.tsx. It sets `window.film = { seconds, posterAt, pages? }`
// and `window.seek(t)`, and may set `window.setFrames` and `window.aim` (see assets/film-starter.tsx).
// 1. Captures each page in `film.pages` from --site, one screenshot per film frame while it scrolls, and hands them to setFrames.
// 2. Bundles the film with esbuild and opens it in headless Chromium at 1152x648 with a 2x device scale. Calls aim, so cursor
//    stops land on their real targets.
// 3. Seeks --blur sub-frames per frame and pipes them to ffmpeg, which averages each group into one frame (motion blur)
//    and scales to 1920x1080. A 5/3 device scale would land on 1920x1080 directly, but Chromium leaves seams under
//    rounded boxes at that fractional scale.
// --stills writes only those moments as PNGs, for review. Run it from the project that holds the film: react, react-dom,
// esbuild and playwright-core (with a Chromium) load from that project's node_modules. Needs ffmpeg on the PATH.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
const entry = flag('film');
if (!entry) { console.error('Pass --film <path to film.tsx>.'); process.exit(1); }
const name = flag('name', path.basename(path.dirname(path.resolve(entry))));
const out = path.resolve(flag('out', path.join(path.dirname(entry), 'out')));
const site = flag('site', '').replace(/\/$/, '');
const fps = Number(flag('fps', 30));
const blur = Number(flag('blur', 4));
const crf = flag('crf', '26');
const stills = flag('stills')?.split(',').map(Number);
const size = 'scale=1920:1080:flags=lanczos';

const fromProject = createRequire(path.join(process.cwd(), 'package.json'));
const load = id => { try { return fromProject(id); } catch { console.error(`${id} is not installed in this project. Run: npm install --no-save react react-dom esbuild playwright-core && npx playwright-core install chromium`); process.exit(1); } };
const { build } = load('esbuild');
const { chromium } = load('playwright-core');
if (spawnSync('ffmpeg', ['-version']).status !== 0) { console.error('ffmpeg is not on the PATH. Install it (brew install ffmpeg) and run again.'); process.exit(1); }

const work = mkdtempSync(path.join(tmpdir(), 'film-'));
// nodePaths lets the kit, which lives with this skill, resolve react from the project.
await build({ entryPoints: { film: path.resolve(entry) }, bundle: true, outdir: work, format: 'iife', jsx: 'automatic', minify: true, nodePaths: [path.join(process.cwd(), 'node_modules')], loader: { '.woff2': 'dataurl', '.woff': 'dataurl' }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning' });
const css = existsSync(path.join(work, 'film.css')) ? '<link rel="stylesheet" href="film.css">' : '';
writeFileSync(path.join(work, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>html,body{margin:0;width:1152px;height:648px;overflow:hidden}</style>${css}</head><body><div id="film"></div><script src="film.js"></script></body></html>`);

const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [])] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, deviceScaleFactor: 2 });
const problems = [];
page.on('pageerror', error => problems.push(error.message));
page.on('console', message => message.type() === 'error' && problems.push(message.text()));
await page.goto(pathToFileURL(path.join(work, 'index.html')).href);
await page.waitForFunction(() => typeof window.seek === 'function');
const film = await page.evaluate(() => window.film);

// A BrowserWindow's page area is 960x526 CSS pixels in the film, 1920x1052 at 2x: capture at 1280x701 and 1.5x.
if (film.pages?.length) {
  if (!site) { console.error('This film shows pages. Pass --site <origin> to capture them.'); process.exit(1); }
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
}

const shot = async (t, options = {}) => { await page.evaluate(time => window.seek(time), t); return page.screenshot(options); };
await shot(0);
// Load every bundled face now, so a font first used late in the film is ready before its first frame.
await page.evaluate(() => Promise.all([...document.fonts].map(face => face.load())));
await page.evaluate(() => window.aim?.());

mkdirSync(out, { recursive: true });
if (stills) {
  for (const t of stills) await shot(t, { path: path.join(out, `${name}-${String(t).replace('.', '_')}s.png`) });
  console.log(`Wrote ${stills.length} stills to ${out}`);
} else {
  const filters = blur > 1 ? `tmix=frames=${blur},select='eq(mod(n\\,${blur})\\,${blur - 1})',setpts=N/(${fps}*TB),${size}` : size;
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps * blur), '-i', '-', '-vf', filters, '-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(out, `${name}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  const total = Math.round(film.seconds * fps) * blur;
  for (let n = 0; n < total; n++) {
    const image = await shot(n / (fps * blur), { type: 'jpeg', quality: 95 });
    if (!ffmpeg.stdin.write(image)) await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    if (n % (fps * blur) === 0) process.stdout.write(`\r${n / (fps * blur)}s of ${film.seconds}s`);
  }
  ffmpeg.stdin.end();
  await done;
  const poster = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'png_pipe', '-i', '-', '-vf', size, '-q:v', '3', path.join(out, `${name}.jpg`)], { input: await shot(film.posterAt) });
  if (poster.status !== 0) throw new Error(`poster export failed: ${poster.stderr}`);
  console.log(`\nWrote ${name}.mp4 and ${name}.jpg to ${out}`);
}
await browser.close();
rmSync(work, { recursive: true, force: true });
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
