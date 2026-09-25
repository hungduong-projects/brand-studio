import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { buildDeck, fontsFrom, validateDeck } from '../plugins/brand-studio/skills/brand-design/scripts/slides.mjs';

const brand = JSON.parse(readFileSync(new URL('../plugins/brand-studio/skills/brand-design/assets/deskhand.brand.json', import.meta.url)));
const example = JSON.parse(readFileSync(new URL('../examples/deskhand/slides/deck.json', import.meta.url)));
const exampleDir = new URL('../examples/deskhand/slides/', import.meta.url).pathname;

test('the Deskhand example deck passes validation', () => assert.deepEqual(validateDeck(example), []));

test('rejects duplicate and overlong titles', () => {
  const deck = structuredClone(example);
  deck.slides[1].title = deck.slides[0].title.toUpperCase();
  deck.slides[2].title = 'This title keeps going on and on well past the point where anyone in the room could read it';
  const errors = validateDeck(deck);
  assert.ok(errors.some(e => e.includes('unique title')));
  assert.ok(errors.some(e => e.includes('words; keep it to 15')));
});

test('rejects body text below 18pt and images without alt text or a source', () => {
  const deck = structuredClone(example);
  deck.sizes = { body: 14 };
  const image = deck.slides.find(s => s.layout === 'image');
  delete image.image.alt;
  delete image.image.source;
  const errors = validateDeck(deck);
  assert.ok(errors.some(e => e.includes('sizes.body')));
  assert.ok(errors.some(e => e.includes('image.alt')));
  assert.ok(errors.some(e => e.includes('image.source')));
});

test('requires a source on data slides and a stated basis on comparisons; notes stay optional', () => {
  const deck = structuredClone(example);
  delete deck.slides.find(s => s.layout === 'data').source;
  delete deck.slides.find(s => s.layout === 'comparison').basis;
  deck.slides.forEach(s => delete s.notes);
  const errors = validateDeck(deck);
  assert.equal(errors.length, 2);
  assert.ok(errors.some(e => e.includes('source is required')));
  assert.ok(errors.some(e => e.includes('basis')));
});

test('fails cleanly on incomplete input', () => {
  assert.ok(validateDeck(null).length);
  assert.ok(validateDeck({ title: 'x', slides: [null, { layout: 'poster' }] }).length >= 2);
});

test('names the contract font with a safe fallback', () => {
  assert.deepEqual(fontsFrom(brand, example), { head: 'Geist', body: 'Geist', mono: 'Geist Mono', fallback: 'Arial', monoFallback: 'Courier New' });
});

test('builds an editable deck with layouts, title placeholders, notes and brand colours', async () => {
  const deck = structuredClone(example);
  deck.slides.push({ layout: 'data', title: 'A chart slide renders as a native chart', chart: { labels: ['A', 'B'], values: [3, 5], highlight: 1 }, source: 'Test data' });
  const zip = await JSZip.loadAsync(await buildDeck(brand, deck, { baseDir: exampleDir }));
  const files = Object.keys(zip.files);
  const slides = files.filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  assert.equal(slides.length, deck.slides.length);
  assert.ok(files.filter(f => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(f)).length >= 8);
  assert.ok(files.some(f => /^ppt\/charts\/chart\d+\.xml$/.test(f)));

  for (const [i, file] of slides.entries()) {
    const xml = await zip.file(file).async('string');
    assert.match(xml, /<p:ph[^>]*type="title"/, `slide ${i + 1} has a title placeholder`);
  }
  const all = (await Promise.all(slides.map(f => zip.file(f).async('string')))).join('');
  assert.ok(all.includes('FFE14D'), 'accent colour from the contract');
  assert.ok(all.includes('101114'), 'ink colour from the contract');
  assert.ok(all.includes('typeface="Geist Mono"'));
  assert.ok(all.includes('descr="Deskhand console'), 'image alt text');
  assert.ok(all.includes('A: 3, B: 5'), 'chart alt text from its data');

  const theme = await zip.file('ppt/theme/theme1.xml').async('string');
  assert.match(theme, /<a:clrScheme name="Deskhand">/);
  assert.match(theme, /<a:accent1><a:srgbClr val="FFE14D"\/><\/a:accent1>/);
  assert.match(theme, /<a:dk1><a:srgbClr val="101114"\/><\/a:dk1>/);
  assert.match(theme, /<a:latin typeface="Geist"/);
  assert.ok(files.some(f => f.startsWith('ppt/notesSlides/')));
});

test('fallback fonts replace the brand fonts', async () => {
  const zip = await JSZip.loadAsync(await buildDeck(brand, example, { baseDir: exampleDir, fallbackFonts: true }));
  const theme = await zip.file('ppt/theme/theme1.xml').async('string');
  assert.match(theme, /<a:latin typeface="Arial"/);
});

test('refuses a deck whose text would run past the safe area', async () => {
  const deck = structuredClone(example);
  deck.slides[1].body = Array(45).fill('overflow').join(' ');
  delete deck.slides[1].highlight;
  deck.sizes = { body: 40 };
  await assert.rejects(buildDeck(brand, deck, { baseDir: exampleDir }), /safe area/);
});
