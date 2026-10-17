// Check a page or a visual in every state it can be in, at phone and desktop widths, light and dark, and put the states on
// one contact sheet, so a review reads one verdict line and one image instead of a dozen screenshots.
//
//   node check-visual.mjs <file or URL> [--widths 1440,390] [--themes light,dark] [--out DIR] [--motion] [--browser PATH]
//
// For each width and theme it loads the page and walks the states the page lists in window.visual.states(), drawing each
// with window.visual.go(id). A page without window.visual is checked as it loads. In every state it fails on:
//   - console errors and uncaught exceptions;
//   - a page that scrolls sideways;
//   - text that overlaps other text;
//   - [data-visual="label"] elements that overlap one another, or run outside their [data-visual="frame"] or the viewport;
//   - text cut off by a box that hides its overflow;
//   - text below WCAG 2.2 AA contrast with the solid colour behind it: 4.5:1, or 3:1 from 24 px (18.66 px bold); text over an
//     image or gradient is skipped;
//   - buttons and links under 24 by 24 px without room around them (WCAG 2.2 target size, level AA);
//   - every problem window.visual.check() returns.
// It warns about buttons under 44 px tall at phone widths, and text under the smallest size Apple's Human Interface Guidelines
// allow: 11 px at phone widths (iOS), 10 px wider (macOS).
// Writes report.json and sheet.png to DIR (default ./visual-check). The sheet holds the states marked `sheet` at the first width
// and theme, and the first state at each other width and theme. Prints one JSON line, { states, fails, warnings, sheet, report,
// first }, where `first` lists up to 12 fails, and exits 1 on any fail. States are drawn with reduced motion, so each one is
// settled; --motion turns animation back on.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const target = args.find((a, i) => !a.startsWith('--') && !(args[i - 1]?.startsWith('--') && args[i - 1] !== '--motion'));
if (!target) { console.error('usage: node check-visual.mjs <file or URL> [--widths 1440,390] [--themes light,dark] [--out DIR] [--motion] [--browser PATH]'); process.exit(1); }
const url = /^(https?|file):/.test(target) ? target : (([file, query]) => pathToFileURL(path.resolve(file)).href + (query ? `?${query}` : ''))(target.split('?'));
if (url.startsWith('file:') && !existsSync(new URL(url))) { console.error(`${target} does not exist.`); process.exit(1); }
const widths = (flag('widths') ?? '1440,390').split(',').map(Number), themes = (flag('themes') ?? 'light,dark').split(',');
const out = path.resolve(flag('out') ?? 'visual-check');

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

/* Runs in the page: the checks every visual gets. */
function generic({ phone }) {
  const fails = [], warnings = [], small = [], least = phone ? 11 : 10;
  const shown = el => {
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) return false;
    for (let e = el, o = 1; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || (o *= +s.opacity) < .5) return false; }
    return true;
  };
  const name = el => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
  const ownText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const sideways = document.documentElement.scrollWidth - innerWidth;
  if (sideways > 1) fails.push(`the page scrolls sideways by ${sideways}px`);

  const labels = [...document.querySelectorAll('[data-visual="label"]')].filter(shown).map(el => ({ el, r: el.getBoundingClientRect() }));
  labels.forEach((a, i) => {
    const f = a.el.parentElement.closest('[data-visual="frame"]')?.getBoundingClientRect() ?? { left: 0, right: innerWidth, top: -Infinity, bottom: Infinity };
    if (a.r.left < f.left - 1 || a.r.right > f.right + 1 || a.r.top < f.top - 1 || a.r.bottom > f.bottom + 1 || a.r.left < -1 || a.r.right > innerWidth + 1) fails.push(`label "${name(a.el)}" runs outside its frame`);
    for (const b of labels.slice(i + 1)) {
      const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (x > 1 && y > 1) fails.push(`label "${name(a.el)}" overlaps "${name(b.el)}" by ${Math.round(Math.min(x, y))}px`);
    }
  });

  const texts = [...document.querySelectorAll('body *')].filter(el => !el.closest('svg') && ownText(el) && shown(el));
  /* Text drawn over other text: the line boxes of each text node, compared with every other node's. Labels are compared above. */
  const runs = texts.filter(el => !el.closest('[data-visual="label"]')).flatMap(el => [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => {
    const range = document.createRange(); range.selectNodeContents(n);
    return { el, rects: [...range.getClientRects()].filter(r => r.width > 1 && r.height > 1) };
  }));
  const clash = new Set();
  runs.forEach((a, i) => { for (const b of runs.slice(i + 1)) {
    if (a.el === b.el || clash.has(a.el) || clash.has(b.el)) continue;
    const hit = a.rects.some(r => b.rects.some(q => Math.min(r.right, q.right) - Math.max(r.left, q.left) > 2 && Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 2));
    if (hit) { clash.add(a.el); fails.push(`text "${name(a.el)}" overlaps "${name(b.el)}"`); }
  } });
  /* sRGB channels 0 to 1 and alpha from a computed colour, or null for colour spaces this does not convert. */
  const rgba = c => {
    const m = c.match(/^rgba?\(([^)]+)\)$/) || c.match(/^color\(srgb ([^)]+)\)$/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return c.startsWith('rgb') ? [r / 255, g / 255, b / 255, a] : [r, g, b, a];
  };
  const over = (top, under) => top.slice(0, 3).map((v, i) => v * top[3] + under[i] * (1 - top[3])).concat(1);
  const lum = c => c.slice(0, 3).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  /* The solid colour behind an element, with translucent layers above it mixed in; null over an image or with no solid colour. */
  const behind = el => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e), bg = rgba(s.backgroundColor);
      if (s.backgroundImage !== 'none' || !bg) return null;
      if (bg[3] > 0) layers.push(bg);
      if (bg[3] >= .99) return layers.reverse().reduce((under, top) => over(top, under));
    }
    return null;
  };
  for (const el of texts) {
    const s = getComputedStyle(el);
    const ink = rgba(s.color), bg = !el.closest(':disabled, [aria-disabled="true"]') && ink && behind(el);
    if (bg) {
      const [a, b] = [lum(over(ink, bg)), lum(bg)], ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05), size = parseFloat(s.fontSize);
      const need = size >= 24 || (size >= 18.66 && +s.fontWeight >= 700) ? 3 : 4.5;
      if (ratio < need) fails.push(`text "${name(el)}" has ${ratio.toFixed(1)}:1 contrast; WCAG AA needs ${need}:1`);
    }
    if (/hidden|clip/.test(s.overflowX + s.overflowY) && s.textOverflow !== 'ellipsis' && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) fails.push(`text "${name(el)}" is cut off by its box`);
    if (parseFloat(s.fontSize) < least) small.push(`"${name(el)}" ${parseFloat(s.fontSize)}px`);
  }

  /* Targets under 24 px pass when a 24 px circle on each one's centre touches no other target. */
  const targets = [...document.querySelectorAll('button, [role="button"], summary, select, input:not([type="hidden"]), a[href]')]
    .filter(el => shown(el) && !(el.tagName === 'A' && el.parentElement && el.parentElement.textContent.trim() !== el.textContent.trim()))
    .map(el => { const r = el.getBoundingClientRect(); return { el, r, cx: r.left + r.width / 2, cy: r.top + r.height / 2, small: r.width < 24 || r.height < 24 }; });
  for (const t of targets) {
    if (t.small && targets.some(o => o !== t && (o.small ? Math.hypot(o.cx - t.cx, o.cy - t.cy) < 24
      : Math.hypot(Math.max(o.r.left - t.cx, 0, t.cx - o.r.right), Math.max(o.r.top - t.cy, 0, t.cy - o.r.bottom)) < 12))) fails.push(`"${name(t.el)}" is a ${Math.round(t.r.width)} by ${Math.round(t.r.height)} px target with no room around it`);
    if (phone && t.el.matches('button, [role="button"]') && t.r.height < 44) warnings.push(`button "${name(t.el)}" is ${Math.round(t.r.height)}px tall on a phone`);
  }
  if (small.length) warnings.push([`text under ${least}px, the smallest Apple's guidelines allow ${phone ? 'on iOS' : 'on macOS'}`, small.slice(0, 3).join(', ')]);
  return { fails, warnings };
}

const browser = await launch();
const fails = new Map(), warnings = new Map(), shots = [];
const note = (map, message, where) => { if (!map.has(message)) map.set(message, []); map.get(message).push(where); };
let count = 0;
for (const [w, width] of widths.entries()) for (const [t, theme] of themes.entries()) {
  const combo = `${width} ${theme}`;
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: args.includes('--motion') ? 'no-preference' : 'reduce' });
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error') note(fails, `console error: ${m.text()}`, combo); });
  page.on('pageerror', e => note(fails, `uncaught: ${e.message}`, combo));
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const states = (await page.evaluate(() => window.visual?.states?.() ?? null))?.map(s => typeof s === 'string' ? { id: s } : s) ?? [{ id: 'page', sheet: true }];
  for (const [k, state] of states.entries()) {
    const where = `${state.id} @ ${combo}`;
    if (state.id !== 'page') await page.evaluate(id => window.visual.go(id), state.id);
    const found = await page.evaluate(generic, { phone: width <= 480 });
    const own = await page.evaluate(() => window.visual?.check?.() ?? []);
    for (const m of [...found.fails, ...own]) note(fails, m, where);
    for (const m of found.warnings) Array.isArray(m) ? note(warnings, m[0], `${where}: ${m[1]}`) : note(warnings, m, where);
    count++;
    if ((w === 0 && t === 0 && state.sheet) || (k === 0 && (w || t))) shots.push({ where, image: (await page.screenshot({ type: 'jpeg', quality: 70, fullPage: true })).toString('base64') });
  }
  await context.close();
}

mkdirSync(out, { recursive: true });
const sheet = path.join(out, 'sheet.png'), report = path.join(out, 'report.json');
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.setContent(`<body style="margin:0;padding:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;align-items:start;background:#d4d4d4;font:12px/1.3 monospace">${shots.map(s =>
  `<figure style="margin:0"><img style="display:block;width:100%;max-height:640px;object-fit:contain;object-position:top;background:#fff" src="data:image/jpeg;base64,${s.image}"><figcaption>${s.where.replace(/[<&]/g, '')}</figcaption></figure>`).join('')}</body>`);
await page.screenshot({ path: sheet, fullPage: true });
await browser.close();

const list = map => [...map].map(([message, where]) => ({ message, count: where.length, where: where.slice(0, 5) }));
writeFileSync(report, JSON.stringify({ url, widths, themes, states: count, fails: list(fails), warnings: list(warnings) }, null, 2));
console.log(JSON.stringify({ states: count, fails: fails.size, warnings: warnings.size, sheet, report, first: [...fails].slice(0, 12).map(([m, where]) => `${m} (${where[0]}${where.length > 1 ? ` +${where.length - 1}` : ''})`) }));
process.exitCode = fails.size ? 1 : 0;
