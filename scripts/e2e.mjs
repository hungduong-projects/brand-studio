// End-to-end smoke test of the built showcase in headless Chromium. Run `npm run build` first.
// Checks the edition page on desktop, phone and reduced motion, the camera page on desktop and phone, and the Deskhand page. Saves screenshots.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const port = 4317;
const base = `http://127.0.0.1:${port}`;
const shots = process.env.SHOTS_DIR ?? path.join(tmpdir(), 'brand-studio-e2e');
mkdirSync(shots, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: 'apps/showcase', stdio: 'ignore' });
const stop = () => server.kill();

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`vite preview did not start on ${base}`);
}

// A phone browser widens its layout to fit overflowing content, so the phone checks compare with the device width, not innerWidth.

/** Opens a page that fails the run on any console error or uncaught exception. */
async function open(context, route) {
  const page = await context.newPage();
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + route);
  return { page, errors };
}

const results = [];
async function check(name, run) {
  try { await run(); results.push(`ok   ${name}`); } catch (error) { results.push(`FAIL ${name}\n     ${error.message.split('\n')[0]}`); }
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();

  await check('desktop: stage paints, each chapter goes live, copy works', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const { page, errors } = await open(context, '/');
    await page.waitForTimeout(3500);
    assert.equal(await page.locator('h1').textContent(), 'The 0.2 Edition');
    const painted = await page.evaluate(() => {
      const canvas = document.querySelector('.rl-stage canvas');
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const colours = new Set();
      for (let i = 0; i < data.length; i += 4 * 997) colours.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      return colours.size;
    });
    assert.ok(painted > 50, `stage looks blank (${painted} colours sampled)`);
    await page.screenshot({ path: path.join(shots, 'desktop-00-hero.png') });

    const chapters = await page.$$eval('section[data-scene][id]', sections => sections.map(s => ({ id: s.id, title: s.querySelector('h2').textContent })));
    assert.equal(chapters.length, 7, 'chapter count');
    for (const [index, chapter] of chapters.entries()) {
      await page.evaluate(id => { const s = document.getElementById(id); scrollTo(0, s.getBoundingClientRect().top + scrollY + innerHeight * 0.3); }, chapter.id);
      await page.waitForTimeout(1600);
      assert.equal(await page.locator('.bs-story-header__current').textContent(), `${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][index]}${chapter.title}`, `${chapter.id}: header chip`);
      assert.equal(await page.locator('.rl-rail a[aria-current]').getAttribute('href'), `#${chapter.id}`, `${chapter.id}: rail`);
      assert.ok(await page.locator(`#${chapter.id}`).evaluate(s => s.hasAttribute('data-live')), `${chapter.id}: component not live`);
      await page.screenshot({ path: path.join(shots, `desktop-${String(index + 1).padStart(2, '0')}-${chapter.id}.png`) });
    }

    const install = page.locator('.rl-install');
    await install.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.rl-rail[data-show]').count(), 0, 'rail should hide after the chapters');
    await install.getByRole('button', { name: 'Copy' }).click();
    await page.waitForTimeout(150);
    assert.equal(await install.getByRole('button', { name: 'Copied' }).count(), 1, 'Copy button did not confirm');
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'npm install @brand-studio/ui');
    await page.screenshot({ path: path.join(shots, 'desktop-08-install.png') });
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check('phone: no sideways scroll, rail hidden', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const { page, errors } = await open(context, '/');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(shots, 'phone-00-hero.png') });
    await page.evaluate(() => document.getElementById('agent').scrollIntoView());
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(shots, 'phone-05-agent.png') });
    assert.ok(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, innerWidth)) <= 390, 'page is wider than the phone');
    assert.equal(await page.locator('.rl-rail').evaluate(el => getComputedStyle(el).display), 'none');
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check('reduced motion: paintings and components show at rest', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const { page, errors } = await open(context, '/');
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const s = document.getElementById('know'); scrollTo(0, s.getBoundingClientRect().top + scrollY + innerHeight * 0.3); });
    await page.waitForTimeout(800);
    assert.equal(await page.locator('#know .rl-prop').evaluate(el => getComputedStyle(el).opacity), '1');
    await page.screenshot({ path: path.join(shots, 'reduced-03-know.png') });
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check('camera: model loads, parts get labels, menus, bars, highlights and views work', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const { page, errors } = await open(context, '/camera');
    await page.locator('.hd[data-loaded]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(shots, 'camera-00-hero.png') });
    await page.evaluate(() => { const s = document.getElementById('parts'); scrollTo(0, s.getBoundingClientRect().top + scrollY + innerHeight * 0.25); });
    await page.waitForTimeout(1800);
    const labels = await page.$$eval('.hd-labels li', items => items.map(li => {
      const r = li.getBoundingClientRect();
      return { part: li.dataset.part, opacity: getComputedStyle(li).opacity, onScreen: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight };
    }));
    assert.equal(labels.length, 4, 'part label count');
    for (const label of labels) assert.ok(label.opacity === '1' && label.onScreen, `${label.part}: label hidden or off screen`);
    await page.screenshot({ path: path.join(shots, 'camera-02-parts.png') });
    assert.equal(await page.locator('.bs-productbar').evaluate(el => Math.round(el.getBoundingClientRect().top)), 0, 'product bar does not stick');
    const siteBar = page.locator('.bs-sitebar');
    await siteBar.getByRole('button', { name: 'Cameras menu' }).click();
    const panel = siteBar.locator('.bs-sitebar__panel:not([hidden])');
    await panel.waitFor();
    await page.screenshot({ path: path.join(shots, 'camera-01-menu.png') });
    await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'detached' }).catch(() => {});
    assert.equal(await siteBar.locator('.bs-sitebar__panel:not([hidden])').count(), 0, 'menu stays open after Escape');
    const highlights = page.locator('#highlights');
    await highlights.scrollIntoViewIfNeeded();
    await highlights.getByRole('button', { name: 'Pause Highlights' }).click();
    await highlights.getByRole('button', { name: 'Play Highlights' }).waitFor();
    const look = page.locator('#look');
    await look.scrollIntoViewIfNeeded();
    await look.getByRole('tab', { name: 'Back' }).click();
    assert.equal(await look.getByRole('tab', { name: 'Back' }).getAttribute('aria-selected'), 'true');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(shots, 'camera-06-look-back.png') });
    assert.match(await page.locator('.hd-directory').textContent(), /fictional brand/);
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check('camera on a phone: no sideways scroll, labels hidden', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const { page, errors } = await open(context, '/camera');
    await page.locator('.hd[data-loaded]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(shots, 'camera-phone-00-hero.png') });
    assert.ok(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, innerWidth)) <= 390, 'page is wider than the phone');
    assert.equal(await page.locator('.hd-labels').evaluate(el => getComputedStyle(el).display), 'none');
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check('deskhand page loads', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const { page, errors } = await open(context, '/deskhand');
    await page.waitForTimeout(1000);
    assert.ok(await page.locator('h1').count() > 0, 'no h1');
    await page.screenshot({ path: path.join(shots, 'deskhand.png') });
    assert.deepEqual(errors, []);
    await context.close();
  });
} finally {
  await browser?.close();
  stop();
}

console.log(results.join('\n'));
console.log(`screenshots: ${shots}`);
if (results.some(line => line.startsWith('FAIL'))) process.exit(1);
