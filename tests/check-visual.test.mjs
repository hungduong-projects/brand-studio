import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../plugins/brand-studio/skills/check-visual/scripts/check-visual.mjs', import.meta.url));
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const check = (html, ...args) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'check-visual-')), file = path.join(dir, 'page.html');
  writeFileSync(file, `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>body { margin: 0; font: 15px system-ui; }</style></head><body>${html}</body></html>`);
  const r = spawnSync(process.execPath, [SCRIPT, file, '--out', path.join(dir, 'out'), ...args], { encoding: 'utf8', cwd: ROOT });
  return { status: r.status, out: JSON.parse(r.stdout.trim() || '{}'), stderr: r.stderr, dir: path.join(dir, 'out') };
};
const has = (list, part) => assert.ok(list.some(m => m.includes(part)), `expected "${part}" in ${JSON.stringify(list)}`);

test('a tidy page passes in each state, width and theme, and gets a report and a contact sheet', () => {
  const { status, out, stderr, dir } = check(`<div data-visual="frame" style="position:relative;height:80px"><span data-visual="label" style="position:absolute;left:8px">Glass</span><span data-visual="label" style="position:absolute;left:120px">Display</span></div>
    <button style="min-height:44px">Take apart</button>
    <script>window.visual = { states: () => ['whole', { id: 'apart', sheet: true }], go: () => {}, check: () => [] };</script>`);
  assert.equal(status, 0, stderr);
  assert.equal(out.states, 8);
  assert.equal(out.fails, 0);
  assert.ok(existsSync(path.join(dir, 'sheet.png')));
  assert.equal(JSON.parse(readFileSync(path.join(dir, 'report.json'), 'utf8')).states, 8);
});

test('text on text, low contrast, overlapping labels, a label out of its frame, cut-off text, cramped targets, sideways scroll, console errors and the page\'s own check fail', () => {
  const { status, out } = check(`<div data-visual="frame" style="position:relative;width:300px;height:120px">
      <span data-visual="label" style="position:absolute;left:10px">Cover glass</span><span data-visual="label" style="position:absolute;left:40px">Display</span><span data-visual="label" style="position:absolute;left:280px">Frame label</span></div>
    <p style="width:60px;overflow:hidden;white-space:nowrap">This sentence is cut off</p>
    <button aria-label="one" style="width:16px;height:16px;padding:0;border:0;margin:0"></button><button aria-label="two" style="width:16px;height:16px;padding:0;border:0;margin:0"></button>
    <div style="width:1500px;height:4px"></div>
    <p style="color:#c8c8c8;background:#fff">Pale on white</p>
    <p style="position:absolute;top:300px;left:10px">Free shipping</p><p style="position:absolute;top:304px;left:30px">Easy returns</p>
    <script>console.error('planted error'); let state = 'a';
      window.visual = { states: () => ['a', 'b'], go: id => { state = id; }, check: () => state === 'b' ? ['planted check problem'] : [] };</script>`, '--widths', '390', '--themes', 'light');
  assert.equal(status, 1);
  for (const part of ['console error: planted error', 'text "Free shipping" overlaps "Easy returns"', 'text "Pale on white" has 1.7:1 contrast; WCAG AA needs 4.5:1', 'scrolls sideways', '"Cover glass" overlaps "Display"', '"Frame label" runs outside its frame', 'is cut off by its box', '"one" is a 16 by 16 px target', 'planted check problem (b @ 390 light)']) has(out.first, part);
});

test('a file that does not exist is reported, not thrown', () => {
  const r = spawnSync(process.execPath, [SCRIPT, path.join(tmpdir(), 'no-such-page.html')], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /does not exist/);
});
