// Render product stills of the Halden camera from the 3D model. Needs the showcase dev server on port 5188.
// Run from the repository root: node apps/showcase/source-3d/render-stills.mjs [name ...]
// Writes transparent PNGs to apps/showcase/source-3d/stills/, then source-3d/stills-to-webp.py crops them and writes the web copies.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = 'apps/showcase/source-3d/stills';
mkdirSync(out, { recursive: true });
/** name: [width, height, pose query] */
const shots = {
  front: [1600, 900, 'yaw=0&pitch=0.04&distance=2.8&hide=strap'],
  three: [1600, 900, 'yaw=-0.62&pitch=0.26&distance=3&hide=strap'],
  top: [1600, 900, 'yaw=0&pitch=1.25&distance=2.8&hide=strap'],
  back: [1600, 900, 'yaw=3.14159&pitch=0.06&distance=2.8&hide=strap'],
  side: [1600, 900, 'yaw=-1.5708&pitch=0.05&distance=2.8&hide=strap'],
  lens: [1600, 900, 'yaw=-0.35&pitch=0.12&distance=1.7&x=-0.2&y=0.05&hide=strap'],
  apart: [1600, 900, 'yaw=-0.9&pitch=0.32&explode=1&distance=4.6&hide=strap'],
  strap: [1600, 900, 'yaw=-0.6&pitch=0.3&distance=5'],
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(shots);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
for (const name of names) {
  const [width, height, query] = shots[name];
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:5188/camera/still?${query}`);
  await page.locator('canvas[data-ready]').waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${out}/${name}.png`, omitBackground: true });
  console.log(`${out}/${name}.png`);
  await page.close();
}
await browser.close();
