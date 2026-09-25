import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { artFor, checkCampaign, checkLayout, checkWeight, familyFor, formats, insideSafe, minFont, safeRect, typeScale } from '../plugins/brand-studio/skills/brand-design/scripts/campaign-render.mjs';

const campaign = JSON.parse(readFileSync(new URL('../examples/deskhand/campaign/campaign.json', import.meta.url)));

test('format table matches the published sizes and budgets', () => {
  assert.deepEqual([formats.og.width, formats.og.height], [1200, 630]);
  assert.deepEqual([formats.feed.width, formats.feed.height], [1080, 1350]);
  assert.deepEqual([formats.story.width, formats.story.height], [1080, 1920]);
  assert.equal(formats['email-header'].width, 600);
  assert.deepEqual(Object.fromEntries(['mrec', 'leaderboard', 'skyscraper', 'mobile-banner'].map(id => [id, formats[id].maxBytes])), { mrec: 150_000, leaderboard: 100_000, skyscraper: 150_000, 'mobile-banner': 50_000 });
  // A3 at 96 CSS px per inch, exported at 150 dpi.
  const a3 = formats['poster-a3'];
  assert.deepEqual([Math.round(a3.width * a3.scale), Math.round(a3.height * a3.scale)], [1755, 2480]);
  for (const [id, format] of Object.entries(formats)) assert.ok(format.safe.length === 4 && format.seenAt > 0, id);
});

test('each ratio family gets its own layout', () => {
  assert.equal(familyFor(728, 90), 'strip');
  assert.equal(familyFor(1200, 630), 'wide');
  assert.equal(familyFor(300, 250), 'square');
  assert.equal(familyFor(1080, 1350), 'portrait');
  assert.equal(familyFor(1123, 1587), 'portrait');
  assert.equal(familyFor(1080, 1920), 'tall');
  const proof = new Set(campaign.formats.map(id => familyFor(formats[id].width, formats[id].height)));
  assert.ok(proof.size >= 3, 'the Deskhand proof covers at least three layouts');
});

test('legibility floors scale with the size people see the image at', () => {
  assert.equal(minFont(formats.mrec, 'support'), 11);
  assert.equal(minFont(formats.og, 'support'), 34);
  assert.equal(minFont(formats['email-header'], 'headline'), 27);
  for (const [id, format] of Object.entries(formats)) {
    const sizes = typeScale(format);
    for (const role of Object.keys(sizes)) assert.ok(sizes[role] >= minFont(format, role), `${id} ${role}`);
  }
});

test('safe zones keep story text clear of the top and bottom bars', () => {
  const story = safeRect(formats.story);
  assert.equal(Math.round(story.top), 269);
  assert.equal(Math.round(story.bottom), 1536);
  assert.ok(insideSafe({ x: 100, y: 300, width: 800, height: 400 }, formats.story));
  assert.ok(!insideSafe({ x: 100, y: 1500, width: 800, height: 100 }, formats.story));
  assert.ok(!insideSafe({ x: 0, y: 300, width: 100, height: 100 }, formats.story));
});

test('layout check reports safe zone, legibility, overflow, hierarchy and font problems', () => {
  const ok = { roles: [
    { role: 'headline', box: { x: 100, y: 300, width: 800, height: 200 }, minFont: 110, maxFont: 110, overflow: false },
    { role: 'cta', box: { x: 100, y: 600, width: 400, height: 90 }, minFont: 40, maxFont: 40, overflow: false },
  ], overflow: [], fontsLoaded: true };
  assert.deepEqual(checkLayout(formats.story, ok, ['headline', 'cta']), []);
  const bad = { roles: [
    { role: 'headline', box: { x: 100, y: 100, width: 800, height: 200 }, minFont: 40, maxFont: 40, overflow: true },
    { role: 'cta', box: { x: 100, y: 600, width: 400, height: 90 }, minFont: 20, maxFont: 36, overflow: false },
  ], overflow: ['.stage'], fontsLoaded: false };
  const problems = checkLayout(formats.story, bad, ['headline', 'cta', 'disclosure']).join('\n');
  for (const text of ['disclosure is missing', 'headline at 100,100', 'cta text is 20px', 'headline overflows', '.stage content overflows', 'competes with the headline', 'did not load']) assert.ok(problems.includes(text), text);
});

test('ad units must fit the IAB initial-load budget', () => {
  assert.deepEqual(checkWeight(formats.mrec, 149_000), []);
  assert.match(checkWeight(formats['mobile-banner'], 60_000)[0], /budget is 50 KB/);
  assert.deepEqual(checkWeight(formats.og, 5_000_000), []);
});

test('the Deskhand campaign is valid and traces every line', () => assert.deepEqual(checkCampaign(campaign), []));

test('campaign check rejects untraced copy, unsupported claims and unknown formats', () => {
  const bad = structuredClone(campaign);
  delete bad.trace.support;
  delete bad.message.proof;
  delete bad.trace.proof;
  bad.message.headline = 'The #1 support agent';
  bad.formats.push('billboard');
  const errors = checkCampaign(bad).join('\n');
  assert.match(errors, /trace\.support/);
  assert.match(errors, /headline makes a ranking/);
  assert.match(errors, /unknown format billboard/);
  assert.ok(checkCampaign({ ...campaign, dataFont: 'x; color: red' }).some(error => error.includes('dataFont')));
  assert.ok(checkCampaign({ ...campaign, art: { src: 'a.jpg', alt: 'A lamp' } }).some(error => error.includes('choose one')));
  assert.ok(checkCampaign(null).length);
});

test('art direction picks a source and focal point per family', () => {
  const art = { src: 'wide.jpg', alt: 'Lamp', focus: '70% 40%', byFamily: { tall: { src: 'tall.jpg', focus: '50% 30%' } } };
  assert.deepEqual(artFor(art, 'wide'), { src: 'wide.jpg', alt: 'Lamp', focus: '70% 40%' });
  assert.deepEqual(artFor(art, 'tall'), { src: 'tall.jpg', alt: 'Lamp', focus: '50% 30%' });
  assert.equal(artFor(undefined, 'wide'), undefined);
});

test('the rendered proof passed its own checks', () => {
  const report = JSON.parse(readFileSync(new URL('../examples/deskhand/campaign/renders/report.json', import.meta.url)));
  assert.deepEqual(report.map(entry => entry.id), campaign.formats);
  for (const entry of report) assert.deepEqual(entry.problems, [], entry.id);
});
