import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { checkGlyph, normalizeGlyph } from '../plugins/brand-studio/skills/brand-design/scripts/icons.mjs';
import { checkCampaign } from '../plugins/brand-studio/skills/brand-design/scripts/campaign-render.mjs';
import { serve } from '../examples/deskhand/mobile/scripts/serve.mjs';

const scripts = new URL('../plugins/brand-studio/skills/brand-design/scripts/', import.meta.url);
const glyph = body => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

test('rejects unparsed attributes and HTML-normalized active SVG markup before normalization', () => {
  assert.deepEqual(checkGlyph(glyph('<path d="M4 4H20V20H4Z"/>')), []);
  for (const body of [
    '<path d="M4 4H20V20H4Z" onclick=globalThis.__auditMarker=1 />',
    '<path d="M4 4H20V20H4Z" onclick />',
    '<SCRIPT>globalThis.__auditMarker=1</SCRIPT><path d="M4 4H20V20H4Z"/>',
    '<foreignobject/><path d="M4 4H20V20H4Z"/>',
    '<use HREF="javascript:globalThis.__auditMarker=1"/><path d="M4 4H20V20H4Z"/>',
  ]) assert.ok(checkGlyph(glyph(body)).length, `accepted active markup: ${normalizeGlyph(glyph(body))}`);
});

test('campaign language stays inert in the rendering page', async () => {
  const source = readFileSync(new URL('campaign-render.mjs', scripts), 'utf8');
  // Exercise the actual document setup statements with a page stub, without rendering assets or loading fonts.
  const start = source.indexOf('    await page.setContent(');
  const end = source.indexOf('    await page.evaluate(loadFonts, faces);', start);
  assert.ok(start >= 0 && end > start);
  for (const lang of [undefined, 'vi', 'zh-Hant', 'en"><script>globalThis.__auditMarker=1</script><html lang="en']) {
    const campaign = { lang, message: { headline: 'Fixture', cta: 'Read' }, trace: { headline: 'Fixture', cta: 'Fixture' }, formats: ['og'] };
    assert.deepEqual(checkCampaign(campaign), []);
    const context = vm.createContext({ campaign, css: '', format: {}, document: { documentElement: { lang: '' } } });
    context.page = {
      async setContent(html) {
        context.document.documentElement.lang = /<html lang="([^"]*)"/.exec(html)?.[1] ?? '';
        // A marker-only script models execution by the HTML consumer; this is not a browser emulator.
        for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/gi)) vm.runInContext(match[1], context, { timeout: 100 });
      },
      async evaluate(fn, value) { return fn(value); },
    };
    await vm.runInContext(`(async () => {${source.slice(start, end)}})()`, context, { timeout: 100 });
    assert.equal(context.__auditMarker, undefined, 'language markup executed the dummy marker');
    assert.equal(context.document.documentElement.lang, lang ?? 'en');
  }
});

const client = `
  const fs = require('node:fs'), http = require('node:http');
  const [origin, requestPath, marker] = process.argv.slice(1);
  let directRead;
  try { fs.readFileSync(marker); directRead = 'allowed'; } catch (error) { directRead = error.code; }
  const url = new URL(origin);
  http.get({ hostname: url.hostname, port: url.port, path: requestPath }, response => {
    let body = '';
    response.on('data', chunk => body += chunk);
    response.on('end', () => console.log(JSON.stringify({ directRead, status: response.statusCode, body })));
  }).on('error', error => { console.error(error.message); process.exitCode = 1; });
`;

async function request(origin, requestPath, marker) {
  const unprivileged = process.platform !== 'win32' && process.getuid() === 0;
  const child = spawn(process.execPath, ['-e', client, origin, requestPath, marker], { ...(unprivileged ? { uid: 65534, gid: 65534 } : {}), timeout: 5000 });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => stdout += chunk);
  child.stderr.on('data', chunk => stderr += chunk);
  await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr || `client exited ${code}`))); });
  const result = JSON.parse(stdout);
  if (unprivileged) assert.equal(result.directRead, 'EACCES');
  return result;
}

for (const kind of ['docs', 'mobile']) test(`${kind} server confines encoded requests to its root`, async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'server-boundary-'));
  chmodSync(dir, 0o755);
  const root = path.join(dir, kind === 'docs' ? 'out' : 'dist');
  const sibling = `${root}-private`;
  mkdirSync(root); mkdirSync(sibling);
  writeFileSync(path.join(root, 'index.html'), 'ROOT-FIXTURE');
  const marker = path.join(sibling, 'marker.txt');
  writeFileSync(marker, 'AUDIT-DUMMY', { mode: 0o600 });
  let server;
  try {
    if (kind === 'mobile') server = await serve(root);
    else {
      const source = readFileSync(new URL('../scripts/a11y.mjs', import.meta.url), 'utf8');
      // Start the actual handler, stopping before the accessibility scanner and browser launch.
      const start = source.indexOf('const root =');
      const end = source.indexOf("await new Promise(resolve => server.once('listening'", start);
      assert.ok(start >= 0 && end > start);
      const listener = await vm.runInNewContext(`(async () => {${source.slice(start, end)}return server;})()`, {
        path: { ...path, resolve: () => root }, URL, createServer,
        readFile: (file, ...args) => file === 'apps/docs/lib/brands.ts' ? Promise.resolve('') : readFile(file, ...args),
      }, { timeout: 100 });
      await new Promise(resolve => listener.once('listening', resolve));
      server = { origin: `http://127.0.0.1:${listener.address().port}`, close: () => listener.close() };
    }
    const normal = await request(server.origin, '/', marker);
    assert.equal(normal.status, 200); assert.equal(normal.body, 'ROOT-FIXTURE');
    if (kind === 'mobile') assert.equal((await request(server.origin, '/client-route', marker)).body, 'ROOT-FIXTURE');
    const escaped = await request(server.origin, `/%2e%2e%2f${path.basename(sibling)}/marker.txt`, marker);
    assert.notEqual(escaped.body, 'AUDIT-DUMMY', `disclosed a mode-0600 sibling: ${JSON.stringify(escaped)}`);
    assert.equal(escaped.status, kind === 'docs' ? 403 : 200);
    if (kind === 'mobile') assert.equal(escaped.body, 'ROOT-FIXTURE');
  } finally { server?.close(); rmSync(dir, { recursive: true, force: true }); }
});
