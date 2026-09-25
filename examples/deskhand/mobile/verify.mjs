// Walk the Deskhand app's web export on a phone-sized touch screen and check what a web page can prove about a native app.
//
//   npm run export:web && node verify.mjs
//
// Uses playwright-core from the repository root (`npm ci` there, then `npx playwright-core install chromium`).
// Checks: the whole approval flow, back behaviour, touch targets (44px iOS, 48px Android), accessible names, reading order,
// no sideways scroll, text contrast, reduced motion, dark mode and a 200% text-size proxy. Saves screenshots and a
// contact sheet to verify-shots/. The web export is a layout proxy: native tab bars, sheets, Dynamic Type, safe-area
// insets and screen readers need a simulator or device (see the brand-design skill's mobile-app reference).
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './scripts/serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, 'dist');
const out = path.join(here, 'verify-shots');
execFileSync(process.execPath, [path.join(here, 'scripts/sync-brand.mjs'), '--check'], { stdio: 'inherit' });
mkdirSync(out, { recursive: true });
const server = await serve(dist);
const origin = server.origin;

const failures = [];
const shots = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);

/** Measure the page: targets, names, sideways scroll, contrast, clipped text. Runs in the browser. */
function audit({ min }) {
  const visible = el => {
    if (el.closest('[aria-hidden="true"], [inert]')) return false;
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  const describe = el => `${el.getAttribute('role') ?? el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent).trim().slice(0, 50)}"`;
  const controls = [...document.querySelectorAll('a[href], button, [role="button"], [role="link"], [role="switch"], [role="tab"], [tabindex="0"]')].filter(visible);
  const small = [], unnamed = [], inline = [];
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    // WCAG 2.5.8 exempts targets inside a sentence; the same sources are also listed as full-size rows.
    if (getComputedStyle(el).display === 'inline') inline.push(describe(el));
    else if (r.height < min - 0.5 || r.width < min - 0.5) small.push(`${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    const labelled = el.getAttribute('aria-labelledby')?.split(' ').map(id => document.getElementById(id)?.textContent ?? '').join(' ');
    if (!(el.getAttribute('aria-label') || labelled || el.textContent).trim()) unnamed.push(el.outerHTML.slice(0, 80));
  }
  const sideways = [document.documentElement, ...document.querySelectorAll('*')].filter(el => el.scrollWidth > el.clientWidth + 1 && ['auto', 'scroll'].includes(getComputedStyle(el).overflowX)).map(describe);
  if (document.documentElement.scrollWidth > innerWidth) sideways.push(`page ${document.documentElement.scrollWidth}px wide`);

  const rgb = value => { const m = value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return { c: m.slice(0, 3), a: m[3] ?? 1 }; };
  const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  // What is painted behind the text's centre, including positioned siblings such as the highlighter.
  const background = el => {
    const r = el.getBoundingClientRect();
    const stack = document.elementsFromPoint(r.left + Math.min(r.width / 2, 8), r.top + r.height / 2);
    // Text scrolled under a fixed bar is covered, not low contrast.
    if (stack[0] && !el.contains(stack[0]) && !stack[0].contains(el)) return null;
    for (const e of stack) { const b = rgb(getComputedStyle(e).backgroundColor); if (b.a > 0.5) return b.c; }
    return [255, 255, 255];
  };
  const lowContrast = [], clipped = [];
  for (const el of document.querySelectorAll('body *')) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || !visible(el)) continue;
    const s = getComputedStyle(el);
    const fg = rgb(s.color).c, bg = background(el);
    if (!bg) continue;
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const ratio = (a + 0.05) / (b + 0.05);
    const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 600);
    if (ratio < (large ? 3 : 4.5)) lowContrast.push(`"${el.textContent.trim().slice(0, 40)}" ${ratio.toFixed(2)}:1`);
    if (s.display !== 'inline' && (el.scrollWidth > el.clientWidth + 1 || s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth)) clipped.push(`"${el.textContent.trim().slice(0, 40)}"`);
    const r = el.getBoundingClientRect();
    if (r.right > innerWidth + 1 || r.left < -1) clipped.push(`"${el.textContent.trim().slice(0, 40)}" runs off screen`);
  }
  return { controls: controls.length, small, unnamed, sideways, lowContrast, clipped, inline };
}

async function check(page, where, min) {
  const r = await page.evaluate(audit, { min });
  if (r.small.length) fail(where, `targets under ${min}px: ${r.small.join('; ')}`);
  if (r.unnamed.length) fail(where, `controls without a name: ${r.unnamed.join('; ')}`);
  if (r.sideways.length) fail(where, `sideways scroll: ${r.sideways.join('; ')}`);
  if (r.lowContrast.length) fail(where, `low contrast: ${r.lowContrast.join('; ')}`);
  if (r.clipped.length) fail(where, `clipped text: ${r.clipped.join('; ')}`);
  return r;
}

async function shot(page, name, label) {
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(out, file) });
  shots.push({ file, label });
}

async function phone({ scheme = 'light', reduced = false, os = 'ios' } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  page.on('pageerror', error => fail(`${os} ${scheme}`, error.message));
  page.on('console', message => { if (message.type() === 'error') fail(`${os} ${scheme}`, message.text()); });
  const min = os === 'android' ? 48 : 44;
  // ?insets reserves the status bar and home indicator areas a phone has; ?os=android follows Android rules.
  const go = async route => { await page.goto(`${origin}${route}?insets${os === 'android' ? '&os=android' : ''}`); await page.waitForLoadState('networkidle'); await page.waitForTimeout(600); };
  return { context, page, min, go };
}

const browser = await chromium.launch();
const step = async (name, fn) => { try { await fn(); console.log(`ok   ${name}`); } catch (error) { fail(name, error.message.split('\n')[0]); console.log(`FAIL ${name}`); } };

// 1. The whole job on iOS rules, light mode: inbox, ticket, sources, approve, error, retry, chargeback, empty inbox, sent.
{
  const { context, page, min, go } = await phone();
  const tap = locator => locator.tap();
  await step('inbox lists tickets waiting for approval', async () => {
    await go('/');
    await page.getByRole('button', { name: /Ticket 2291/ }).waitFor();
    await check(page, 'inbox', min);
    await shot(page, '01-inbox', 'Inbox, iOS light');
  });
  await step('ticket shows the draft, citations, sources and approval bar', async () => {
    await tap(page.getByRole('button', { name: /Ticket 2291/ }));
    await page.getByText('Draft reply').waitFor();
    await page.getByRole('button', { name: 'Approve and send' }).waitFor();
    if (!page.url().endsWith('/ticket/2291?from=inbox')) throw new Error(`unexpected url ${page.url()}`);
    await page.waitForTimeout(400);
    await check(page, 'ticket', min);
    // Reading order: who wrote, what they asked, the draft, its sources, then the action.
    const tree = await page.locator('body').ariaSnapshot();
    writeFileSync(path.join(out, 'ticket-aria.txt'), tree);
    const order = ['Priya N.', 'Lamp arrived cracked', 'Draft reply', 'Source 1, Help center', 'Approve and send'].map(text => tree.indexOf(text));
    if (order.some(i => i < 0) || order.some((i, k) => k && i < order[k - 1])) throw new Error(`reading order wrong: ${order.join(', ')}`);
    await shot(page, '02-ticket', 'Ticket #2291 with the draft reply');
  });
  await step('a citation opens its source in a sheet; Done closes it', async () => {
    await tap(page.getByRole('link', { name: /Damaged items are refunded in full/ }));
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('heading', { name: 'Returns and refunds' }).waitFor();
    await page.waitForTimeout(1200);
    await check(page, 'source sheet', min);
    await shot(page, '03-source', 'Source 1 in a sheet, cited line highlighted');
    await tap(page.getByRole('button', { name: 'Done' }));
    await sheet.waitFor({ state: 'detached' });
  });
  await step('back closes a source sheet opened from the list', async () => {
    await tap(page.getByRole('button', { name: /Source 2, Order/ }));
    await page.getByRole('dialog').getByRole('heading', { name: 'Order #48213' }).waitFor();
    await page.goBack();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    if (!page.url().includes('/ticket/2291')) throw new Error(`back left the ticket: ${page.url()}`);
  });
  await step('approve and send ends in a sent state', async () => {
    await tap(page.getByRole('button', { name: 'Approve and send' }));
    await page.getByRole('button', { name: 'Sending' }).waitFor();
    await page.getByRole('heading', { name: 'Sent to Priya' }).waitFor();
    await page.waitForTimeout(800);
    await check(page, 'sent', min);
    await shot(page, '04-sent', 'Sent, refund started');
  });
  await step('a failed send explains itself and can be retried', async () => {
    await tap(page.getByRole('button', { name: 'Back to inbox', exact: true }));
    await page.getByRole('button', { name: /Ticket 2266/ }).waitFor();
    if (await page.getByRole('button', { name: /Ticket 2291/ }).count()) throw new Error('sent ticket still in the inbox');
    await tap(page.getByRole('tab', { name: /Settings/ }).or(page.getByRole('link', { name: /Settings/ })).first());
    await tap(page.getByRole('switch', { name: 'Fail the next send' }));
    if (await page.getByRole('switch', { name: 'Fail the next send' }).getAttribute('aria-checked') !== 'true') throw new Error('switch did not turn on');
    await check(page, 'settings', min);
    await shot(page, '05-settings', 'Settings: text size, motion, demo switch');
    await tap(page.getByRole('tab', { name: /Inbox/ }).or(page.getByRole('link', { name: /Inbox/ })).first());
    await tap(page.getByRole('button', { name: /Ticket 2266/ }));
    await tap(page.getByRole('button', { name: 'Approve and send' }));
    await page.getByRole('alert').waitFor();
    await check(page, 'error', min);
    await shot(page, '06-error', 'Send failed, nothing sent');
    await tap(page.getByRole('button', { name: 'Try again' }));
    await page.getByRole('heading', { name: 'Sent to Marco' }).waitFor();
  });
  await step('the chargeback goes to a person, then the inbox is empty', async () => {
    await tap(page.getByRole('button', { name: /Next ticket #2276/ }));
    await page.getByText('Chargebacks always go to a person.', { exact: false }).waitFor();
    await shot(page, '07-chargeback', 'Chargeback: no draft, needs a person');
    await tap(page.getByRole('button', { name: 'Mark as handled' }));
    await page.getByRole('heading', { name: 'Marked as handled' }).waitFor();
    await tap(page.getByRole('button', { name: 'Back to inbox', exact: true }));
    await page.getByRole('heading', { name: 'Nothing waits for you' }).waitFor();
    await page.waitForTimeout(600);
    await check(page, 'empty inbox', min);
    await shot(page, '08-empty', 'Empty inbox');
  });
  await step('sent lists every reply; back returns to it', async () => {
    await tap(page.getByRole('button', { name: 'See sent replies' }));
    await page.getByRole('button', { name: /Ticket 2291.*Approved by you/ }).waitFor();
    await check(page, 'sent list', min);
    await shot(page, '09-sent-list', 'Sent replies');
    await tap(page.getByRole('button', { name: /Ticket 2285/ }));
    await page.getByText('Sent by Deskhand at').waitFor();
    if (await page.getByRole('button', { name: 'Approve and send' }).count()) throw new Error('sent ticket offers approval');
    await page.goBack();
    await page.getByRole('button', { name: /Ticket 2285/ }).waitFor();
  });
  await context.close();
}

// 2. Dark mode with Reduce Motion: the highlighter is already there, and screens do not slide.
{
  const { context, page, min, go } = await phone({ scheme: 'dark', reduced: true });
  await step('dark mode and reduced motion', async () => {
    await go('/');
    await check(page, 'dark inbox', min);
    await shot(page, '10-dark-inbox', 'Inbox, dark');
    await go('/ticket/2291');
    await page.getByRole('button', { name: 'Approve and send' }).waitFor();
    await check(page, 'dark ticket', min);
    await shot(page, '11-dark-ticket', 'Ticket, dark');
    await page.getByRole('button', { name: /Source 1, Help center/ }).tap();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('heading', { name: 'Returns and refunds' }).waitFor();
    // Straight away, before the sweep's delay would end: nothing in the sheet may be mid-scale.
    const scaled = await sheet.evaluate(el => [...el.querySelectorAll('*')].map(e => getComputedStyle(e).transform).filter(t => t.startsWith('matrix(') && !t.startsWith('matrix(1,')));
    if (scaled.length) throw new Error(`highlight animates with reduced motion: ${scaled[0]}`);
    await page.waitForTimeout(600);
    await check(page, 'dark source', min);
    await shot(page, '12-dark-source', 'Source sheet, dark, reduced motion');
  });
  await context.close();
}

// 3. Android conventions via ?os=android: 48px targets, Material tab indicator, left-aligned title.
{
  const { context, page, min, go } = await phone({ os: 'android' });
  await step('android conventions', async () => {
    await go('/');
    await check(page, 'android inbox', min);
    await shot(page, '13-android-inbox', 'Inbox, Android rules');
    await page.getByRole('button', { name: /Ticket 2291/ }).tap();
    await page.getByRole('button', { name: 'Approve and send' }).waitFor();
    await page.waitForTimeout(400);
    await check(page, 'android ticket', min);
    await shot(page, '14-android-ticket', 'Ticket, Android rules');
    await page.getByRole('button', { name: /Source 2, Order/ }).tap();
    await page.getByRole('button', { name: 'Close' }).waitFor();
    await page.waitForTimeout(1200);
    await shot(page, '15-android-source', 'Source sheet, Android rules');
  });
  await context.close();
}

// 4. 200% text: a proxy for Dynamic Type and Android font size. Doubles every computed font size and line height.
{
  const { context, page, min, go } = await phone();
  const grow = () => page.evaluate(() => {
    // Tab bar labels stay fixed, as system tab bars do; the app turns their font scaling off.
    const els = [...document.querySelectorAll('body *')].filter(el => !el.closest('[role="tablist"]') && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
    const sizes = els.map(el => { const s = getComputedStyle(el); return [parseFloat(s.fontSize), parseFloat(s.lineHeight)]; });
    els.forEach((el, i) => { el.style.fontSize = `${sizes[i][0] * 2}px`; if (sizes[i][1]) el.style.lineHeight = `${sizes[i][1] * 2}px`; });
  });
  await step('200% text keeps everything readable', async () => {
    await go('/');
    await grow();
    await page.waitForTimeout(200);
    await check(page, 'inbox 200%', min);
    await shot(page, '16-text-200-inbox', 'Inbox at 200% text');
    await go('/ticket/2291');
    await page.getByRole('button', { name: 'Approve and send' }).waitFor();
    await grow();
    await page.waitForTimeout(200);
    await check(page, 'ticket 200%', min);
    await shot(page, '17-text-200-ticket', 'Ticket at 200% text');
    const bar = await page.getByRole('button', { name: 'Approve and send' }).boundingBox();
    if (!bar || bar.y + bar.height > 844) throw new Error('approve button pushed off screen');
  });
  await context.close();
}

// Contact sheet of every screenshot, for review.
{
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const cells = shots.map(s => `<figure><img src="data:image/png;base64,${readFileSync(path.join(out, s.file)).toString('base64')}"><figcaption>${s.file.replace('.png', '')} · ${s.label}</figcaption></figure>`).join('');
  await page.setContent(`<style>body{margin:24px;font:13px system-ui;background:#e9e9e4;display:grid;grid-template-columns:repeat(6,1fr);gap:20px}figure{margin:0}img{width:100%;border-radius:14px;box-shadow:0 2px 10px #0002}figcaption{margin-top:6px}</style>${cells}`);
  await page.screenshot({ path: path.join(out, 'contact-sheet.png'), fullPage: true });
}

await browser.close();
server.close();
writeFileSync(path.join(out, 'report.json'), JSON.stringify({ shots, failures }, null, 2));
console.log(`\n${shots.length} screenshots and contact-sheet.png in ${path.relative(process.cwd(), out) || '.'}`);
if (failures.length) { console.log(`\n${failures.length} problems:\n${failures.join('\n')}`); process.exit(1); }
console.log('all checks passed');
