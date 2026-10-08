// Capture a how-to tutorial from the running product, one screen per step, for scripts/film/tutorial.tsx.
//
//   node tutorial-capture.mjs --steps tutorials/submit-claim.json --base http://localhost:5173 [--out DIR] [--setup tutorials/setup.mjs]
//
// The steps file holds { app, title, url, steps: [...] }. Each step names one action and the caption the viewer reads:
//   { "goto": "/claims", "caption": "Open Claims" }
//   { "click": "#new-claim", "caption": "Click New claim" }
//   { "fill": "#amount", "text": "45.60", "caption": "Enter the amount" }
//   { "select": "#currency", "value": "USD", "caption": "Pick the currency" }
//   { "upload": "input[type=file]", "files": ["tutorials/demo/receipt.jpg"], "aim": "#dropzone", "caption": "Attach the receipt" }
//   { "press": "Enter", "caption": "Press Enter" }
//   { "view": "#status", "caption": "Your claim shows Pending" }
// Optional on any step: "aim" points the cursor at a different element than the one acted on, "waitFor" waits for a
// selector after the action, "settle" sets the pause in milliseconds before the next screen (default 600), and "note"
// adds a sentence the written guide shows under the caption.
// --setup names a module whose default export receives (context, base) before the first step, to sign in a demo user.
// Use demo data only: every screen ends up in a video that anyone with the link can watch.
// Run it from the project, which supplies playwright-core with a Chromium.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
const stepsFile = flag('steps');
const base = flag('base', '').replace(/\/$/, '');
if (!stepsFile || !base) { console.error('Pass --steps <file.json> and --base <origin of the running product>.'); process.exit(1); }
const script = JSON.parse(readFileSync(stepsFile, 'utf8'));
const out = path.resolve(flag('out', path.join('tutorials', 'captures', path.basename(stepsFile, '.json'))));
const setup = flag('setup');
const viewport = { width: 1280, height: 701 };
const actions = ['goto', 'view', 'click', 'fill', 'select', 'upload', 'press'];

const fromProject = createRequire(path.join(process.cwd(), 'package.json'));
let chromium;
try { ({ chromium } = fromProject('playwright-core')); } catch { console.error('playwright-core is not installed in this project. Run: npm install --no-save playwright-core && npx playwright-core install chromium'); process.exit(1); }

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport, deviceScaleFactor: 2, reducedMotion: 'reduce' });
if (setup) await (await import(pathToFileURL(path.resolve(setup)).href)).default(context, base);
const page = await context.newPage();
const problems = [];
page.on('pageerror', error => problems.push(error.message));

let count = 0;
const shoot = async () => {
  const file = `${String(count++).padStart(2, '0')}.jpg`;
  await page.screenshot({ path: path.join(out, file), type: 'jpeg', quality: 90, animations: 'disabled', caret: 'hide' });
  return file;
};
const settle = async step => {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  if (step.waitFor) await page.locator(step.waitFor).first().waitFor({ state: 'visible' });
  await page.waitForTimeout(step.settle ?? 600);
};
const boxOf = async selector => {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error(`${selector} has no box on screen`);
  return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
};

const steps = [];
for (const [i, step] of script.steps.entries()) {
  const action = actions.find(name => name in step);
  if (!action) throw new Error(`step ${i + 1} names no action (${actions.join(', ')})`);
  if (!step.caption) throw new Error(`step ${i + 1} has no caption`);
  const selector = step[action];
  const record = { caption: step.caption, action, ...(step.note && { note: step.note }) };
  if (action === 'goto') {
    await page.goto(base + selector);
    await settle(step);
  } else if (action !== 'press') {
    record.box = await boxOf(step.aim ?? selector);
  } else record.key = selector;
  record.shot = await shoot();

  const target = action === 'goto' || action === 'press' || action === 'view' ? null : page.locator(selector).first();
  if (action === 'click') await target.click();
  if (action === 'select') await target.selectOption(step.value);
  if (action === 'upload') await target.setInputFiles(step.files.map(file => path.resolve(file)));
  if (action === 'press') await page.keyboard.press(selector);
  if (action === 'fill') {
    await target.click();
    record.typing = [];
    // A date or month picker drops keys typed across the pauses for screenshots, so it takes the ISO value at once.
    if (await target.evaluate(el => ['date', 'month', 'week', 'time', 'datetime-local'].includes(el.type))) {
      await target.fill(step.text);
      record.typing.push(await shoot());
    } else {
      await target.fill('');
      const every = Math.max(1, Math.ceil(step.text.length / 12));
      for (let n = 1; n <= step.text.length; n++) {
        await page.keyboard.type(step.text[n - 1]);
        if (n % every === 0 || n === step.text.length) record.typing.push(await shoot());
      }
    }
  }
  if (action !== 'goto') await settle(step);
  steps.push(record);
  console.log(`${i + 1}. ${action} ${selector}`);
}
const end = await shoot();
await browser.close();

writeFileSync(path.join(out, 'manifest.json'), `${JSON.stringify({ app: script.app, title: script.title, url: script.url, viewport: [viewport.width, viewport.height], steps, end }, null, 2)}\n`);
console.log(`Wrote ${count} screens and manifest.json to ${out}`);
if (problems.length) { console.error(`The page threw while capturing:\n${problems.join('\n')}`); process.exit(1); }
