// Screenshot a page at desktop and phone widths, one shot per section, and report console errors and sideways scroll.
//
//   node shoot.mjs <url> [--sections id,id,...] [--out DIR] [--wait 4000]
//
// Needs playwright-core and a Chromium (`npx playwright-core install chromium`). Run it from a project that has
// playwright-core installed, or install it first. The GPU flags keep WebGL and canvas pages at full frame rate;
// a throttled browser window can make scroll-driven scenes look stuck.
import { mkdirSync } from 'node:fs';
import path from 'node:path';

let chromium;
try { ({ chromium } = await import('playwright-core')); } catch {
  console.error('playwright-core is not installed here. Run: npm install --no-save playwright-core && npx playwright-core install chromium');
  process.exit(1);
}

const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const flag = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
if (!url) { console.error('usage: node shoot.mjs <url> [--sections id,id] [--out DIR] [--wait 4000]'); process.exit(1); }
const out = flag('out') ?? 'screenshots';
const wait = Number(flag('wait') ?? 4000);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [])] });
const problems = [];
for (const [name, viewport, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const page = await browser.newPage({ viewport, isMobile: mobile, hasTouch: mobile });
  page.on('pageerror', error => problems.push(`${name}: ${error.message}`));
  page.on('console', message => message.type() === 'error' && problems.push(`${name}: ${message.text()}`));
  await page.goto(url);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: path.join(out, `${name}-00-top.png`) });
  const sections = flag('sections')?.split(',') ?? await page.$$eval('main section[id]', list => list.map(s => s.id));
  for (const [index, id] of sections.entries()) {
    const found = await page.evaluate(id => {
      const section = document.getElementById(id);
      if (!section) return false;
      scrollTo(0, section.getBoundingClientRect().top + scrollY + innerHeight * 0.25);
      return true;
    }, id);
    if (!found) { problems.push(`${name}: no section #${id}`); continue; }
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(out, `${name}-${String(index + 1).padStart(2, '0')}-${id}.png`) });
  }
  // A phone browser widens its layout to fit content that overflows, so compare with the device width, not innerWidth.
  const wide = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, innerWidth));
  if (wide > viewport.width) problems.push(`${name}: page is ${wide}px wide on a ${viewport.width}px screen`);
  await page.close();
}
await browser.close();
console.log(`screenshots in ${out}`);
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
