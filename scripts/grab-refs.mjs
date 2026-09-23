// List (and optionally download) the media a page loads: video, images, SVG, 3D models, animation files.
//
//   npm run refs -- <url> [--out DIR] [--only video,image,svg,3d,anim] [--match REGEX] [--download]
//
// Opens the page in headless Chromium, scrolls to the end so lazy media loads, and collects URLs from
// network responses, the DOM (src, srcset, poster, href, CSS backgrounds) and the raw HTML.
// Writes DIR/sources.json. DIR must be git-ignored: reference media is for local study only.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: opt, positionals: [page_url] } = parseArgs({ allowPositionals: true, options: {
  out: { type: 'string' }, only: { type: 'string' }, match: { type: 'string' }, download: { type: 'boolean' },
} });
if (!page_url) throw new Error('Usage: npm run refs -- <url> [--out DIR] [--only video,image,svg,3d,anim] [--match REGEX] [--download]');

const root = fileURLToPath(new URL('..', import.meta.url));
const out = path.resolve(root, opt.out ?? `workbench/references/media/${new URL(page_url).hostname.replace(/^www\./, '')}`);
mkdirSync(out, { recursive: true });
if (spawnSync('git', ['check-ignore', '-q', out], { cwd: root }).status !== 0) throw new Error(`${out} is not git-ignored. Add it to .git/info/exclude first.`);

const TYPES = {
  video: /\.(mp4|webm|mov|m3u8|mpd)$/, image: /\.(jpe?g|png|webp|avif|gif)$/, svg: /\.svg$/,
  '3d': /\.(usdz?|usd[ac]|reality|glb|gltf|obj|fbx|stl|splat|ply|ktx2|drc)$/, anim: /\.(lottie|riv)$|lottie.*\.json$|\/anim.*\.json$/,
};
const CONTENT_TYPES = { video: /^video\/|mpegurl|dash\+xml/, image: /^image\/(?!svg)/, svg: /svg/, '3d': /model\/|usdz|gltf/ };
const only = opt.only?.split(',');
const match = opt.match && new RegExp(opt.match);
const classify = (url, contentType = '') => {
  const file = new URL(url).pathname.toLowerCase();
  return Object.keys(TYPES).find(t => TYPES[t].test(file)) ?? Object.keys(CONTENT_TYPES).find(t => CONTENT_TYPES[t].test(contentType));
};

const browser = await chromium.launch();
// A plain Chrome user agent: some sites serve bot walls or empty shells to "HeadlessChrome".
const ua = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`;
const page = await browser.newPage({ userAgent: ua, viewport: { width: 1440, height: 900 } });
const found = new Map();
const add = (raw, from, extra = {}) => {
  let url;
  try { url = new URL(raw, page_url).href; } catch { return; }
  if (!url.startsWith('http')) return;
  const type = classify(url, extra.contentType);
  if (!type || (only && !only.includes(type)) || (match && !match.test(url))) return;
  found.set(url, { url, type, from, ...found.get(url), ...extra });
};
page.on('response', res => {
  const headers = res.headers();
  // Skip redirects and extensionless beacons (analytics pixels answer with image/gif).
  if (res.status() >= 300 && res.status() < 400) return;
  if (!/\.\w+$/.test(new URL(res.url()).pathname) && !(+headers['content-length'] >= 1024)) return;
  add(res.url(), 'network', { status: res.status(), contentType: headers['content-type'] });
});

await page.goto(page_url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
for (let y = 0, h = 1; y < h; y += 700) {
  h = await page.evaluate(top => { scrollTo(0, top); return document.documentElement.scrollHeight; }, y);
  await page.waitForTimeout(400);
}
await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => console.warn('Network never went idle; the list may be missing late requests.'));

const dom = await page.evaluate(() => {
  const urls = [];
  for (const el of document.querySelectorAll('img, source, video, a[href], link[href], meta[content]')) {
    for (const attr of ['src', 'poster', 'href', 'content']) if (el.getAttribute(attr)) urls.push(el.getAttribute(attr));
    const set = el.getAttribute('srcset');
    if (set) urls.push(...set.split(',').map(s => s.trim().split(/\s+/)[0]));
  }
  for (const el of document.querySelectorAll('*')) {
    for (const [, u] of getComputedStyle(el).backgroundImage.matchAll(/url\("?([^")]+)"?\)/g)) urls.push(u);
  }
  return urls;
});
dom.forEach(u => add(u, 'dom'));
const html = await page.content();
for (const [u] of html.matchAll(/(?:https?:)?\/?\/?[\w\-./%]+\.(?:mp4|webm|m3u8|usdz?|usd[ac]|reality|glb|gltf|lottie|riv|jpe?g|png|webp|avif|gif|svg)(?=["'\s)?,\\])/gi)) add(u.replace(/\\\//g, '/'), 'html');
await browser.close();

const items = [...found.values()].sort((a, b) => a.type.localeCompare(b.type) || a.url.localeCompare(b.url));
if (opt.download) {
  // Generic names (large.mp4) repeat across folders; prefix those with their parent folder.
  const base = url => new URL(url).pathname.split('/').filter(Boolean).slice(-2);
  const seen = items.reduce((n, i) => n.set(base(i.url)[1], (n.get(base(i.url)[1]) ?? 0) + 1), new Map());
  for (const item of items) {
    // Fetch with the page as referrer; a 200 that returns HTML is a fallback or bot wall, not the file.
    const res = await fetch(item.url, { headers: { 'User-Agent': ua, Referer: page_url, Accept: '*/*' } }).catch(e => ({ ok: false, status: e.message }));
    const contentType = res.headers?.get('content-type') ?? '';
    const body = res.ok && !contentType.includes('text/html') ? Buffer.from(await res.arrayBuffer()) : null;
    if (!body?.length) { item.error = `${res.status} ${contentType}`.trim(); continue; }
    const [folder, file] = base(item.url);
    const name = seen.get(file) > 1 ? `${folder}_${file}` : file;
    mkdirSync(path.join(out, item.type), { recursive: true });
    writeFileSync(path.join(out, item.type, name), body);
    Object.assign(item, { file: `${item.type}/${name}`, bytes: body.length, contentType });
  }
}
const manifest = path.join(out, 'sources.json');
writeFileSync(manifest, JSON.stringify({ page: page_url, fetchedAt: new Date().toISOString(), note: 'Local study only. Do not commit or deploy.', items }, null, 2));

const count = t => items.filter(i => i.type === t).length;
console.log(Object.keys(TYPES).map(t => `${t}: ${count(t)}`).join('  '));
if (opt.download) console.log(`downloaded ${items.filter(i => i.file).length}, failed ${items.filter(i => i.error).length}`);
console.log(manifest);
