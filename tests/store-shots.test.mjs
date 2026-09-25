import test from 'node:test';
import assert from 'node:assert/strict';
import { captionShare, checkPlan, limits, pixels, targets } from '../plugins/brand-studio/skills/brand-design/scripts/store-shots.mjs';

const plan = [{ path: '/', caption: 'Every question in one inbox' }, { path: '/reply', scheme: 'dark' }];

test('store targets produce the exact store pixel sizes', () => {
  const sizes = Object.fromEntries(Object.values(targets).flat().map(target => [target.id, pixels(target)]));
  assert.deepEqual(sizes['iphone-6.9'], { width: 1320, height: 2868 });
  assert.deepEqual(sizes['ipad-13'], { width: 2064, height: 2752 });
  assert.deepEqual(sizes.mac, { width: 2880, height: 1800 });
  assert.deepEqual(sizes['play-phone'], { width: 1080, height: 1920 });
  assert.deepEqual(sizes['play-tablet'], { width: 1920, height: 1080 });
  for (const target of targets.pwa) {
    const { width, height } = pixels(target);
    assert.ok(Math.max(width, height) / Math.min(width, height) <= 2.3, `${target.id} exceeds the 2.3 aspect limit`);
  }
});

test('captions stay under the 20 percent text share Google Play allows', () => assert.ok(captionShare <= 0.2));

test('accepts a valid plan', () => assert.deepEqual(checkPlan(plan, ['apple', 'play', 'pwa']), []));

test('enforces each store screen count', () => {
  assert.ok(checkPlan([plan[0]], ['play']).some(error => error.includes('play takes 2 to 8')));
  assert.ok(checkPlan(Array(11).fill(plan[0]), ['apple']).some(error => error.includes('apple takes 1 to 10')));
  assert.deepEqual(limits.play, [2, 8]);
});

test('rejects store-banned caption wording, bad paths and unknown stores', () => {
  const errors = checkPlan([{ path: '/', caption: 'The #1 inbox, free' }, { path: 'inbox', scheme: 'sepia' }], ['play', 'steam']);
  assert.ok(errors.some(error => error.includes('ranking, price or call-to-action')));
  assert.ok(errors.some(error => error.includes('path must start with /')));
  assert.ok(errors.some(error => error.includes('scheme must be light or dark')));
  assert.ok(errors.some(error => error.includes('unknown store steam')));
  assert.ok(checkPlan([], ['apple']).length);
});
