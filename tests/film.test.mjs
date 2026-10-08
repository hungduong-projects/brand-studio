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

const tutorial = await (async () => {
  const file = new URL('../plugins/brand-studio/skills/brand-design/scripts/film/tutorial.tsx', import.meta.url).pathname;
  const { outputFiles } = await bundle(file, { format: 'esm', platform: 'node', loader: { '.css': 'empty' } });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
})();

test('a tutorial plan shows each screen in order and clicks where the capture measured', () => {
  const manifest = { app: 'Claims', title: 'Submit a claim', url: 'claims.example.com', viewport: [1280, 701], end: '04.jpg', steps: [
    { caption: 'Open Claims', action: 'goto', shot: '00.jpg' },
    { caption: 'Click New claim', action: 'click', shot: '01.jpg', box: { x: 1180, y: 20, width: 80, height: 30 } },
    { caption: 'Enter the amount', action: 'fill', shot: '02.jpg', box: { x: 400, y: 300, width: 200, height: 36 }, typing: ['02a.jpg', '02b.jpg'] },
    { caption: 'Your claim is pending', action: 'view', shot: '03.jpg', box: { x: 100, y: 500, width: 120, height: 24 } },
  ] };
  const plan = tutorial.tutorialPlan(manifest);
  const times = plan.screens.map(screen => screen.at);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
  // A closing view step acts on nothing, so its own screen is the last one; after an action the end screen follows.
  assert.deepEqual([...new Set(plan.screens.map(screen => screen.src))], ['00.jpg', '01.jpg', '02.jpg', '02a.jpg', '02b.jpg', '03.jpg']);
  assert.equal(tutorial.tutorialPlan({ ...manifest, steps: manifest.steps.slice(0, 2) }).screens.at(-1).src, '04.jpg');
  const click = plan.cursor.find(point => point.click);
  assert.equal(click.at, plan.steps[1].act - .2);
  assert.ok(Math.abs(click.x - 1220 * 840 / 1280) < 1e-9 && Math.abs(click.y - (34 + 35 * 840 / 1280)) < 1e-9);
  assert.equal(plan.cursor.filter(point => point.click).length, 2, 'the view step points without clicking');
  for (const shot of plan.shots) {
    assert.ok(shot.x >= 840 / (2 * shot.zoom) - 1e-9 && shot.x <= 840 - 840 / (2 * shot.zoom) + 1e-9, 'the camera keeps the window in frame');
  }
  assert.ok(Math.abs(plan.seconds - (plan.steps.at(-1).end + .4 + 2.8)) < 1e-9);
  // Captions cue each step over its own window, with the note on a second line.
  const cues = tutorial.tutorialCues({ ...manifest, steps: manifest.steps.map((step, i) => i === 2 ? { ...step, note: 'Total with GST' } : step) });
  assert.deepEqual(cues.map(cue => [cue.start, cue.end]), plan.steps.map(step => [step.start, step.end]));
  assert.equal(cues[2].text, 'Enter the amount\nTotal with GST');
  assert.equal(cues[0].text, 'Open Claims');
  // A full-width target gets less zoom, so all of it stays in view.
  const wide = tutorial.tutorialPlan({ ...manifest, steps: [manifest.steps[0], { ...manifest.steps[3], box: { x: 40, y: 500, width: 1200, height: 60 } }] });
  const aim = wide.shots.find(shot => shot.at === wide.steps[1].start + .95);
  assert.ok(1200 * 840 / 1280 <= 840 / aim.zoom, 'the wide target fits the zoomed view');
});

test('the tutorial film bundles for the renderer', async () => {
  const { errors } = await bundle(new URL('../plugins/brand-studio/skills/brand-design/scripts/film/tutorial.tsx', import.meta.url).pathname, { format: 'iife', outdir: '/tmp', minify: true });
  assert.equal(errors.length, 0);
});
