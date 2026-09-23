import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { catalog, guides } from '../apps/docs/lib/catalog.ts';

const out = new URL('../apps/docs/out/', import.meta.url);
const page = (route) => {
  const file = new URL(`${route}index.html`, out);
  assert.ok(existsSync(file), `missing ${file.pathname}; run npm run build:docs first`);
  return readFileSync(file, 'utf8');
};
const src = new URL('../packages/ui/src/', import.meta.url);

test('every exported component is documented', () => {
  const source = readdirSync(src).filter((file) => file.endsWith('.tsx')).map((file) => readFileSync(new URL(file, src), 'utf8')).join('\n');
  const components = [...source.matchAll(/^export function ([A-Z]\w+)/gm)].map((match) => match[1]).sort();
  assert.deepEqual(catalog.flatMap((entry) => entry.exports).sort(), components);
});

test('home and sidebar link every page before JavaScript runs', () => {
  assert.ok(page('').includes('href="/docs/installation/"'));
  const intro = page('docs/');
  for (const entry of catalog) assert.ok(intro.includes(`href="/docs/components/${entry.slug}/"`), entry.slug);
  for (const guide of guides) assert.ok(existsSync(new URL(`docs/${guide.slug ? `${guide.slug}/` : ''}index.html`, out)), guide.title);
});

test('each component page ships title, preview code, install, usage and props as static HTML', () => {
  for (const entry of catalog) {
    const html = page(`docs/components/${entry.slug}/`);
    assert.match(html, new RegExp(`<h1>${entry.title}</h1>`), entry.slug);
    assert.ok(html.includes('class="preview"'), `${entry.slug} preview`);
    for (const heading of ['Installation', 'Usage', 'API Reference']) assert.ok(html.includes(`>${heading}</h2>`), `${entry.slug} ${heading}`);
    assert.ok(html.includes('<table>'), `${entry.slug} props table`);
  }
  const button = page('docs/components/button/');
  for (const prop of ['tone?', 'shape?', 'loading?']) assert.ok(button.includes(`<code>${prop}</code>`), prop);
  assert.ok(!button.includes('<code>onClick?</code>'), 'inherited button attributes stay out of the table');
  assert.ok(button.includes('<code>&quot;inverse&quot; | &quot;primary&quot; | &quot;secondary&quot;</code>'), 'private tone alias is spelled out as values');
  assert.ok(button.includes('<code>&#x27;primary&#x27;</code>'), 'defaults come from the source');
  assert.ok(!button.includes('ButtonTone'), 'private alias names never reach the page');
});

test('the skill guide tells an agent when to use every exported component', () => {
  const guide = readFileSync(new URL('../plugins/brand-studio/skills/brand-design/references/ui-library.md', import.meta.url), 'utf8');
  const missing = catalog.flatMap((entry) => entry.exports).filter((name) => name !== 'DialogClose' && !guide.includes(`\`${name}\``));
  assert.deepEqual(missing, []);
});

test('component counts written in prose match the catalog', () => {
  const files = ['../packages/ui/README.md', '../README.md'].map((file) => new URL(file, import.meta.url)).filter((file) => existsSync(file));
  for (const file of files) {
    for (const [, count] of readFileSync(file, 'utf8').matchAll(/\b(\d+) (?:typed )?(?:React )?components\b/g)) assert.equal(Number(count), catalog.length, file.pathname);
  }
});

test('brand-design skill links only to references and scripts that exist', () => {
  const skill = new URL('../plugins/brand-studio/skills/brand-design/', import.meta.url);
  const docs = ['SKILL.md', ...readdirSync(new URL('references/', skill)).map((file) => `references/${file}`)];
  for (const doc of docs) {
    const text = readFileSync(new URL(doc, skill), 'utf8');
    const base = new URL(doc, skill);
    for (const [, link] of text.matchAll(/\]\(((?:references\/)?[\w-]+\.md)\)/g)) assert.ok(existsSync(new URL(link, base)), `${doc} links to missing ${link}`);
    for (const [, script] of text.matchAll(/`(?:node |python3 )?(scripts\/[\w.-]+)/g)) assert.ok(existsSync(new URL(script, skill)), `${doc} names missing ${script}`);
  }
});
