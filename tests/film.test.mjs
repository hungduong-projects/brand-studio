import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const kitFile = new URL('../plugins/brand-studio/skills/brand-design/scripts/film/kit.tsx', import.meta.url).pathname;
const bundle = (entry, options = {}) => build({ entryPoints: [entry], bundle: true, write: false, jsx: 'automatic', logLevel: 'silent', loader: { '.woff2': 'dataurl', '.woff': 'dataurl' }, ...options });
const kit = await (async () => {
  const { outputFiles } = await bundle(kitFile, { format: 'esm', platform: 'node', loader: { '.css': 'empty' } });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
})();

test('film kit curves and keyframes hold their endpoints and ease between them', () => {
  for (const curve of Object.values(kit.curves)) { assert.ok(Math.abs(curve(0)) < 1e-6); assert.ok(Math.abs(curve(1) - 1) < 1e-6); }
  assert.equal(kit.keys(-1, [[0, 10], [1, 20]]), 10);
  assert.equal(kit.keys(5, [[0, 10], [1, 20]]), 20);
  assert.ok(Math.abs(kit.keys(.5, [[0, 10], [1, 20]]) - 15) < 1e-6);
  assert.equal(kit.typed('hello', 1, 0, 3), 'hel');
});

test('film camera points where its shots say', () => {
  const shots = [{ at: 0, x: 576, y: 324, zoom: 1 }, { at: 1, x: 700, y: 200, zoom: 1.5 }];
  assert.deepEqual(kit.cameraAt(0, shots), { x: 576, y: 324, zoom: 1 });
  assert.deepEqual(kit.cameraAt(2, shots), { x: 700, y: 200, zoom: 1.5 });
});

test('the starter film and the intro film bundle for the renderer', async () => {
  for (const film of ['../plugins/brand-studio/skills/brand-design/assets/film-starter.tsx', '../examples/intro-film/film.tsx']) {
    const { errors } = await bundle(new URL(film, import.meta.url).pathname, { format: 'iife', outdir: '/tmp', minify: true });
    assert.equal(errors.length, 0, film);
  }
});
