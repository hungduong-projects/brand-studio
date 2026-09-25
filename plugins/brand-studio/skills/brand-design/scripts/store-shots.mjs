// Make App Store, Google Play and web-app install screenshots from a running app, captioned in the brand's colours and type.
//
//   node store-shots.mjs <url> --brand brand/brand.json --plan brand/store-shots.json [--stores apple,play,pwa] [--out store-shots]
//
// The plan lists the screens in store order: [{ "path": "/inbox", "caption": "Answer every customer from one inbox",
// "scheme": "light", "click": ["text=Open ticket"], "wait": 1500 }]. The first three are the ones people see in search.
// Each screen is captured at the exact store pixel size with reduced motion, so entrance animations have finished,
// then saved twice: raw and captioned. Output is JPEG, because
// both stores reject images with an alpha channel. No device frames: Google Play forbids them, and Apple's bezels are
// licensed to Developer Program members only.
//
// Needs playwright-core and a Chromium (`npx playwright-core install chromium`). A web page is a layout proxy for a
// native app: for a native build, capture in the simulator and pass the images to your store tool instead.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Store sizes in pixels, as CSS viewport times device scale. Checked 2026-09-25 against Apple and Google help pages. */
export const targets = {
  apple: [
    { id: 'iphone-6.9', width: 440, height: 956, scale: 3, mobile: true },
    { id: 'ipad-13', width: 1032, height: 1376, scale: 2, mobile: true },
  ],
  'apple-mac': [{ id: 'mac', width: 1440, height: 900, scale: 2, mobile: false }],
  play: [
    { id: 'play-phone', width: 360, height: 640, scale: 3, mobile: true },
    { id: 'play-tablet', width: 960, height: 540, scale: 2, mobile: true },
  ],
  pwa: [
    { id: 'pwa-narrow', width: 360, height: 640, scale: 3, mobile: true, formFactor: 'narrow' },
    { id: 'pwa-wide', width: 1280, height: 720, scale: 1.5, mobile: false, formFactor: 'wide' },
  ],
};

/** Screen counts each store accepts per device size. */
export const limits = { apple: [1, 10], 'apple-mac': [1, 10], play: [2, 8], pwa: [1, 8] };

/** Largest share of the image height a caption may take. Google Play asks for text over no more than 20% of the image. */
export const captionShare = 0.18;

export const pixels = target => ({ width: Math.round(target.width * target.scale), height: Math.round(target.height * target.scale) });

/** Problems with a plan for the chosen stores, as readable strings. */
export function checkPlan(plan, stores) {
  const errors = [];
  if (!Array.isArray(plan) || !plan.length) return ['plan must be a non-empty array of screens'];
  plan.forEach((shot, index) => {
    if (typeof shot?.path !== 'string' || !shot.path.startsWith('/')) errors.push(`screen ${index + 1}: path must start with /`);
    if (shot?.caption !== undefined && (typeof shot.caption !== 'string' || shot.caption.length > 60)) errors.push(`screen ${index + 1}: caption must be text of 60 characters or fewer`);
    if (shot?.scheme !== undefined && !['light', 'dark'].includes(shot.scheme)) errors.push(`screen ${index + 1}: scheme must be light or dark`);
    // Store rules: no rankings, prices or calls to action in screenshot text.
    if (/#\s?1\b|\bbest\b|\bfree\b|\d+%\s?off|download now|install now/i.test(shot?.caption ?? '')) errors.push(`screen ${index + 1}: caption uses ranking, price or call-to-action wording the stores reject`);
  });
  for (const store of stores) {
    if (!targets[store]) { errors.push(`unknown store ${store}; use ${Object.keys(targets).join(', ')}`); continue; }
    const [min, max] = limits[store];
    if (plan.length < min || plan.length > max) errors.push(`${store} takes ${min} to ${max} screens; the plan has ${plan.length}`);
  }
  return errors;
}

async function main() {
  let chromium;
  try { ({ chromium } = await import('playwright-core')); } catch {
    console.error('playwright-core is not installed here. Run: npm install --no-save playwright-core && npx playwright-core install chromium');
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const flag = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
  const url = args[0];
  if (!url || url.startsWith('--') || !flag('brand') || !flag('plan')) {
    console.error('usage: node store-shots.mjs <url> --brand brand.json --plan store-shots.json [--stores apple,play,pwa] [--out DIR]');
    process.exit(1);
  }
  const brand = JSON.parse(readFileSync(flag('brand'), 'utf8'));
  const plan = JSON.parse(readFileSync(flag('plan'), 'utf8'));
  const stores = (flag('stores') ?? 'apple,play,pwa').split(',');
  const out = flag('out') ?? 'store-shots';
  const errors = checkPlan(plan, stores);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

  const browser = await chromium.launch();
  const problems = [];
  const manifest = [];
  for (const store of stores) for (const target of targets[store]) {
    const dir = path.join(out, target.id);
    mkdirSync(dir, { recursive: true });
    const size = pixels(target);
    for (const [index, shot] of plan.entries()) {
      const scheme = shot.scheme ?? 'light';
      const tokens = brand.tokens?.[scheme] ?? brand.tokens?.light ?? {};
      const page = await browser.newPage({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: target.scale, isMobile: target.mobile, hasTouch: target.mobile, colorScheme: scheme, reducedMotion: 'reduce' });
      page.on('pageerror', error => problems.push(`${target.id} ${shot.path}: ${error.message}`));
      await page.goto(new URL(shot.path, url).href);
      for (const selector of shot.click ?? []) await page.click(selector);
      await page.waitForTimeout(shot.wait ?? 1500);
      const name = `${String(index + 1).padStart(2, '0')}-${shot.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}`;
      const raw = await page.screenshot({ type: 'jpeg', quality: 92 });
      writeFileSync(path.join(dir, `${name}.jpg`), raw);
      const wide = await page.evaluate(() => document.documentElement.scrollWidth);
      if (wide > target.width) problems.push(`${target.id} ${shot.path}: page is ${wide}px wide on a ${target.width}px screen`);
      if (shot.caption) {
        // Draw the caption over the app's own page, so the brand's loaded web fonts apply.
        const band = Math.round(target.height * captionShare);
        await page.evaluate(({ image, caption, tokens, band }) => {
          const layer = document.createElement('div');
          Object.assign(layer.style, { position: 'fixed', inset: '0', zIndex: '2147483647', display: 'grid', gridTemplateRows: `${band}px 1fr`, background: tokens.surface ?? '#fff', color: tokens.ink ?? '#000', fontFamily: tokens.voiceFont ?? tokens.font ?? 'system-ui' });
          const text = document.createElement('p');
          text.textContent = caption;
          Object.assign(text.style, { margin: '0', display: 'grid', placeItems: 'center', padding: '0 8%', textAlign: 'center', fontWeight: '650', letterSpacing: '-.02em', lineHeight: '1.1', fontSize: `${Math.min(band * 0.3, innerWidth * 0.07)}px`, textWrap: 'balance' });
          const frame = document.createElement('div');
          Object.assign(frame.style, { display: 'grid', justifyItems: 'center', alignItems: 'start' });
          const img = document.createElement('img');
          img.src = image;
          img.alt = '';
          // Fit the whole screen below the caption with an even margin; the capture has the viewport's aspect ratio.
          const margin = innerWidth * 0.07;
          const fit = Math.min((innerWidth - margin * 2) / innerWidth, (innerHeight - band - margin) / innerHeight);
          Object.assign(img.style, { width: `${innerWidth * fit}px`, height: `${innerHeight * fit}px`, borderRadius: tokens.radius ?? '12px', border: `1px solid ${tokens.line ?? 'transparent'}`, boxShadow: '0 1.5rem 3rem rgb(0 0 0 / .18)' });
          frame.append(img);
          layer.append(text, frame);
          document.body.append(layer);
        }, { image: `data:image/jpeg;base64,${raw.toString('base64')}`, caption: shot.caption, tokens, band });
        await page.waitForTimeout(200);
        writeFileSync(path.join(dir, `${name}-caption.jpg`), await page.screenshot({ type: 'jpeg', quality: 92 }));
      }
      manifest.push({ store, device: target.id, width: size.width, height: size.height, file: path.join(target.id, `${name}${shot.caption ? '-caption' : ''}.jpg`), label: shot.caption ?? shot.path, formFactor: target.formFactor });
      await page.close();
    }
  }
  await browser.close();
  writeFileSync(path.join(out, 'shots.json'), JSON.stringify(manifest, null, 2));
  // Ready to paste into a web app manifest's "screenshots" field; adjust src to where you host the files.
  const pwa = manifest.filter(entry => entry.formFactor).map(entry => ({ src: `/${entry.file}`, sizes: `${entry.width}x${entry.height}`, type: 'image/jpeg', form_factor: entry.formFactor, label: entry.label }));
  if (pwa.length) writeFileSync(path.join(out, 'manifest-screenshots.json'), JSON.stringify(pwa, null, 2));
  console.log(`${manifest.length} screenshots in ${out}`);
  if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
