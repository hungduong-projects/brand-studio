// Render the frame sequences behind the docs demo videos. Needs the showcase dev server on port 5188.
// Run from the repository root: node apps/showcase/source-3d/render-video.mjs [turn|macro]
// Writes PNG frames to apps/showcase/source-3d/stills/<name>/; source-3d/frames-to-video.sh turns them into the docs videos.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const tau = Math.PI * 2;
/** name: [width, height, frame count, frame index -> pose query] */
const sequences = {
  // One full turn, then the parts drift apart: the scroll-video demo.
  turn: [1280, 720, 150, i => i < 110
    ? `yaw=${(-0.62 + (i / 110) * tau).toFixed(4)}&pitch=0.22&distance=3.1&hide=strap`
    : `yaw=${(-0.62 + tau - ((i - 110) / 39) * 0.28).toFixed(4)}&pitch=${(0.22 + ((i - 110) / 39) * 0.1).toFixed(4)}&explode=${((i - 110) / 39).toFixed(4)}&distance=${(3.1 + ((i - 110) / 39) * 1.5).toFixed(4)}&hide=strap`],
  // A slow close pass over the lens and leather that loops: the video-text demo.
  macro: [1280, 720, 96, i => `yaw=${(-0.5 + Math.sin((i / 96) * tau) * 0.45).toFixed(4)}&pitch=${(0.12 + Math.cos((i / 96) * tau) * 0.06).toFixed(4)}&distance=1.25&hide=strap`],
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(sequences);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
for (const name of names) {
  const [width, height, count, pose] = sequences[name];
  const out = `apps/showcase/source-3d/stills/${name}`;
  mkdirSync(out, { recursive: true });
  const queue = Array.from({ length: count }, (_, i) => i);
  await Promise.all(Array.from({ length: 4 }, async () => {
    const page = await browser.newPage({ viewport: { width, height } });
    for (let i = queue.shift(); i !== undefined; i = queue.shift()) {
      await page.goto(`http://localhost:5188/camera/still?${pose(i)}`);
      await page.locator('canvas[data-ready]').waitFor({ timeout: 30000 });
      await page.screenshot({ path: `${out}/${String(i).padStart(4, '0')}.png`, omitBackground: true });
    }
    await page.close();
  }));
  console.log(`${out}: ${count} frames`);
}
await browser.close();
