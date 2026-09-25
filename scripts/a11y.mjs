// Accessibility scan of every component demo in the built docs, with axe in headless Chromium. Run `npm run build:docs` first.
// Scans each demo stage under every demo brand in light and dark mode, with reduced motion so animated content has settled.
import { chromium } from 'playwright-core';
import { AxeBuilder } from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('apps/docs/out');
// The demo brands in apps/docs/lib/brands.ts, read from source because that module imports JSON without attributes.
const brandKeys = [...(await readFile('apps/docs/lib/brands.ts', 'utf8')).matchAll(/^  (\w+): \{ label:/gm)].map(match => match[1]);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json', '.txt': 'text/plain' };
const server = createServer(async (request, response) => {
  let file = path.join(root, decodeURIComponent(new URL(request.url, 'http://x').pathname));
  if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
  if (file.endsWith('/')) file = path.join(file, 'index.html');
  try { response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' }).end(await readFile(file)); }
  catch { response.writeHead(404).end(); }
}).listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const slugs = (await readdir(path.join(root, 'docs/components'))).sort();
const browser = await chromium.launch();
const failures = [];
for (const brand of brandKeys) for (const mode of ['light', 'dark']) {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.addInitScript(saved => localStorage.setItem('bs-docs-demo', saved), JSON.stringify({ brand, mode }));
  const queue = [...slugs];
  await Promise.all(Array.from({ length: 4 }, async () => {
    const page = await context.newPage();
    for (let slug = queue.shift(); slug; slug = queue.shift()) {
      await page.goto(`${origin}/docs/components/${slug}/`);
      await page.waitForTimeout(300);
      const { violations } = await new AxeBuilder({ page }).include('.preview__stage').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      for (const violation of violations) for (const node of violation.nodes) failures.push(`${brand} ${mode} ${slug}: ${violation.id} at ${node.target.join(' ')}. ${node.any[0]?.message ?? violation.help}`);
    }
    await page.close();
  }));
  await context.close();
}
await browser.close();
server.close();
console.log(`scanned ${slugs.length} demos in ${brandKeys.length} brands, light and dark`);
if (failures.length) { console.log(failures.join('\n')); process.exit(1); }
