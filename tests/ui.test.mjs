import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { Alert, ApprovalCard, BrandTheme, Checkbox, DataTable, Dialog, EmptyState, Header, Sidebar, Skeleton, StoryCover, StoryHeader, Spinner, StatCard, Textarea, FlipText, HorizontalStory, ScrollTextReveal, StreamingText, StorySequence, Switch, TaskRows, TextField, AgentThinking, ThinkingTrace, ToolChips, Button, SiteBar, ProductBar, HighlightsGallery, ProductViewer, CardCarousel, KeyFigures, ModelCompare, FooterDirectory } from '../packages/ui/dist/index.js';

test('loading action is disabled and exposed as busy', () => {
  const html = render(h(Button, { loading: true }, 'Save'));
  assert.match(html, /type="button"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-busy="true"/);
});
test('field links label, hint and error without losing supplied descriptions', () => {
  const html = render(h(TextField, { id: 'email', label: 'Email', hint: 'Private', error: 'Required', 'aria-describedby': 'external' }));
  assert.match(html, /for="email"/);
  assert.match(html, /aria-describedby="external email-hint email-error"/);
  assert.match(html, /aria-invalid="true"/);
});
test('server story rendering preserves all chapters before enhancement', () => {
  const chapters = ['beans', 'pour', 'cup'].map(id => ({ id, title: id, body: `About ${id}`, asset: { src: `/${id}.webp`, alt: `View of ${id}`, width: 100, height: 100 } }));
  const html = render(h(StorySequence, { title: 'Ritual', chapters }));
  assert.match(html, /data-enhanced="false"/);
  for (const { id } of chapters) {
    assert.ok(html.includes(`id="${id}"`));
    assert.ok(html.includes(`alt="View of ${id}"`));
  }
  assert.equal(render(h(StorySequence, { title: 'Empty', chapters: [] })), '');
});

const asset = (id) => ({ src: `/${id}.webp`, alt: `View of ${id}`, width: 100, height: 100 });

test('streamed and revealed text is complete in server HTML and read once', () => {
  const html = render(h(StreamingText, { text: 'Brew it slowly' }));
  assert.match(html, /<span class="bs-sr-only">Brew it slowly<\/span>/);
  assert.equal((html.match(/bs-stream__word/g) ?? []).length, 3);
  assert.match(html, /<span aria-hidden="true">/);
  const reveal = render(h(ScrollTextReveal, { text: 'Every cup starts here' }));
  assert.match(reveal, />Every<\/span> <span[^>]*>cup<\/span> <span[^>]*>starts<\/span> <span[^>]*>here<\/span>/);
});
test('agent states announce status in words, not only colour or motion', () => {
  assert.match(render(h(AgentThinking, { state: 'listening' })), /role="status".*Listening/);
  const trace = render(h(ThinkingTrace, { steps: [{ id: 'a', title: 'Read brief', status: 'done' }, { id: 'b', title: 'Draft', status: 'active' }] }));
  assert.match(trace, /<details/);
  assert.match(trace, /Thinking/);
  assert.match(trace, /\(active\)/);
  assert.match(render(h(ToolChips, { tools: [{ id: 't', name: 'search', status: 'error' }] })), /failed/);
  const tasks = render(h(TaskRows, { tasks: [{ id: '1', label: 'One', status: 'done' }, { id: '2', label: 'Two', status: 'failed' }] }));
  assert.match(tasks, /1 of 2/);
  assert.match(tasks, /Failed/);
});
test('approval card swaps buttons for the outcome once decided', () => {
  const pending = render(h(ApprovalCard, { title: 'Run tests' }));
  assert.equal((pending.match(/<button/g) ?? []).length, 2);
  const done = render(h(ApprovalCard, { title: 'Run tests', status: 'rejected' }));
  assert.ok(!done.includes('<button'));
  assert.match(done, /Denied/);
});
test('flip text gives screen readers every word', () => {
  assert.match(render(h(FlipText, { words: ['calm', 'clear'] })), /bs-sr-only">calm, clear</);
});
test('switch is a labelled native button and dialog trigger renders closed', () => {
  const html = render(h(Switch, { label: 'Email me', description: 'Weekly' }));
  assert.match(html, /<button[^>]*role="switch"/);
  const id = html.match(/<button[^>]*id="([^"]+)"/)[1];
  assert.ok(html.includes(`for="${id}"`));
  assert.ok(html.includes(`aria-describedby="${id}-description"`));
  const dialog = render(h(BrandTheme, { palette: { light: {}, dark: {} } }, h(Dialog, { trigger: h('button', null, 'Open'), title: 'Hello' })));
  assert.match(dialog, />Open<\/button>/);
  assert.ok(!dialog.includes('Hello'), 'popup stays unmounted until opened');
});
test('horizontal story keeps every chapter in a keyboard-scrollable row before enhancement', () => {
  const chapters = ['beans', 'pour'].map(id => ({ id, title: id, body: `About ${id}`, asset: asset(id) }));
  const html = render(h(HorizontalStory, { title: 'Ritual', chapters }));
  assert.match(html, /tabindex="0"/);
  for (const { id } of chapters) assert.ok(html.includes(`alt="View of ${id}"`));
});

test('textarea links label, hint and error like the text field', () => {
  const html = render(h(Textarea, { id: 'note', label: 'Note', hint: 'Optional', error: 'Too long' }));
  assert.match(html, /for="note"/);
  assert.match(html, /<textarea[^>]*aria-describedby="note-hint note-error"/);
  assert.match(html, /aria-invalid="true"/);
});
test('checkbox is a labelled native button that can report a mixed state', () => {
  const html = render(h(Checkbox, { label: 'All bags', indeterminate: true }));
  assert.match(html, /<button[^>]*role="checkbox"/);
  assert.match(html, /aria-checked="mixed"/);
  const id = html.match(/<button[^>]*id="([^"]+)"/)[1];
  assert.ok(html.includes(`for="${id}"`));
});
test('alert, skeleton and spinner speak in words with the right urgency', () => {
  assert.match(render(h(Alert, { tone: 'critical', title: 'Card declined' })), /role="alert"/);
  assert.match(render(h(Alert, { title: 'Moved to Saturday' })), /role="status"/);
  const skeleton = render(h(Skeleton, { label: 'Loading orders', lines: 2 }));
  assert.match(skeleton, /role="status".*Loading orders/);
  assert.equal((skeleton.match(/bs-skeleton__line"/g) ?? []).length, 2);
  assert.match(render(h(Spinner, { label: 'Saving', hideLabel: true })), /<span class="bs-sr-only">Saving<\/span>/);
  assert.match(render(h(EmptyState, { title: 'No orders yet' })), /<h3[^>]*>No orders yet<\/h3>/);
});
test('data table names its scroll frame by the caption and covers empty and loading states', () => {
  const columns = [{ key: 'name', header: 'Name', sortValue: (row) => row.name }, { key: 'bags', header: 'Bags' }];
  const html = render(h(DataTable, { caption: 'Orders', columns, rows: [{ id: '1', name: 'Ana', bags: 2 }], rowKey: (row) => row.id }));
  const id = html.match(/aria-labelledby="([^"]+)"/)[1];
  assert.match(html, new RegExp(`<caption id="${id}"[^>]*>Orders</caption>`));
  assert.match(html, /role="region"[^>]*tabindex="0"|tabindex="0"[^>]*role="region"/);
  assert.match(html, /<th scope="col"><button type="button"[^>]*>Name/);
  assert.ok(!html.includes('aria-sort'), 'no column claims a sort before one is chosen');
  assert.match(render(h(DataTable, { caption: 'Orders', columns, rows: [], rowKey: (row) => row.id, empty: 'None yet' })), /<td colspan="2"[^>]*>None yet<\/td>/i);
  assert.match(render(h(DataTable, { caption: 'Orders', columns, rows: [], rowKey: (row) => row.id, loading: true })), /aria-busy="true"/);
});
test('stat card states the direction of change in words', () => {
  const html = render(h(StatCard, { label: 'Subscribers', value: '1,284', change: '+6%', trend: 'up', series: [1, 2, 3] }));
  assert.match(html, /<span class="bs-sr-only">Up <\/span>\+6%/);
  assert.match(html, /<svg[^>]*aria-hidden="true"/);
});
test('navigation marks the current page and names each group', () => {
  const sidebar = render(h(Sidebar, { label: 'Roastery', sections: [{ label: 'Stock', items: [{ label: 'Beans', href: '/beans', current: true }] }] }));
  assert.match(sidebar, /<nav aria-label="Roastery"/);
  const heading = sidebar.match(/<p id="([^"]+)" class="bs-sidebar__heading">Stock/)[1];
  assert.ok(sidebar.includes(`aria-labelledby="${heading}"`));
  assert.match(sidebar, /aria-current="page"/);
  const header = render(h(BrandTheme, { palette: { light: {}, dark: {} } }, h(Header, { brand: 'Still', items: [{ label: 'Coffee', href: '/coffee' }] })));
  assert.match(header, /<header[^>]*>.*<nav aria-label="Main"/);
  assert.match(header, /<span class="bs-sr-only">Menu<\/span>/);
});

test('story header links the current chapter and story cover lists chapters in a named nav', () => {
  const header = render(h(BrandTheme, { palette: { light: {}, dark: {} } }, h(StoryHeader, { brand: 'Still', items: [{ label: 'Coffee', href: '/coffee' }], current: { label: 'The pour', href: '#pour', marker: 'II' } })));
  assert.match(header, /<header class="bs-header bs-story-header/);
  assert.match(header, /<a class="bs-story-header__current" href="#pour"><span class="bs-story-header__marker">II<\/span>The pour<\/a>/);
  const cover = render(h(StoryCover, { title: 'Three plates', chapters: [{ label: 'The bean', href: '#beans', marker: 'I' }] }));
  assert.match(cover, /<h1 class="bs-cover__title">Three plates<\/h1>/);
  assert.match(cover, /<nav aria-label="Chapters"><ol class="bs-cover__index"><li><a href="#beans">/);
  assert.ok(!render(h(StoryCover, { title: 'Bare' })).includes('<nav'), 'no empty nav without chapters');
});

test('site bar menus open from a labelled toggle and product bar names its pages', () => {
  const site = render(h(SiteBar, { brand: 'Halden', items: [
    { label: 'Cameras', href: '/cameras', current: true, menu: [{ label: 'Explore', links: [{ label: 'Halden R', href: '/r' }] }] },
    { label: 'Film', href: '/film' },
  ] }));
  assert.match(site, /<a href="\/cameras" aria-current="page">Cameras<\/a>/);
  const panel = site.match(/aria-controls="([^"]+)"/)[1];
  assert.match(site, /aria-expanded="false"/);
  assert.match(site, new RegExp(`<div id="${panel}" class="bs-sitebar__panel" hidden="">`));
  assert.match(site, /<span class="bs-sr-only">Cameras menu<\/span>/);
  assert.match(site, /data-lead="true"/);
  assert.equal((site.match(/bs-sitebar__toggle/g) ?? []).length, 1, 'items without a menu get no toggle');
  const product = render(h(ProductBar, { title: 'Halden R', items: [{ label: 'Overview', href: '#o', current: true }] }));
  assert.match(product, /<nav id="[^"]+" aria-label="Halden R" class="bs-productbar__nav">/);
  assert.match(product, /aria-expanded="false"/);
});

test('highlights name each slide and hide the ones not showing', () => {
  const html = render(h(HighlightsGallery, { items: [{ media: 'a', caption: 'First' }, { media: 'b', caption: 'Second' }] }));
  assert.match(html, /<section class="bs-highlights "[^>]*aria-label="Highlights"/);
  assert.match(html, /aria-label="Slide 1 of 2" aria-current="true"/);
  assert.equal((html.match(/<li class="bs-highlights__slide" aria-hidden="true">/g) ?? []).length, 1);
  assert.match(html, /aria-label="Pause Highlights"/);
  assert.ok(!render(h(HighlightsGallery, { items: [{ media: 'a', caption: 'Only' }] })).includes('bs-highlights__controls'), 'one slide needs no controls');
});

test('product viewer renders tabs for each view', () => {
  const html = render(h(ProductViewer, { items: [{ value: 'front', label: 'Front', media: 'F' }, { value: 'back', label: 'Back', media: 'B' }] }));
  assert.match(html, /role="tablist"[^>]*aria-label="Views"|aria-label="Views"[^>]*role="tablist"/);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 2);
  assert.match(html, /role="tabpanel"/);
});

test('card carousel labels its list and starts with previous disabled', () => {
  const html = render(h(CardCarousel, { title: 'Guides', cards: [{ title: 'One', href: '/one' }, { title: 'Two' }] }));
  const id = html.match(/aria-labelledby="([^"]+)"/)[1];
  assert.match(html, new RegExp(`<h2 id="${id}" class="bs-carousel__title">Guides</h2>`));
  assert.match(html, /<button type="button" aria-label="Previous cards" disabled="">/);
  assert.match(html, /<li class="bs-carousel__card" style="--i:0"><a href="\/one">/);
});

test('key figures keep lead, value with unit, then meaning', () => {
  const html = render(h(KeyFigures, { label: 'In numbers', items: [{ lead: 'Up to', value: '1/1000', unit: 's', detail: 'Shutter' }] }));
  assert.match(html, /<ul class="bs-figures " aria-label="In numbers"><li class="bs-figures__item" style="--i:0"><span class="bs-figures__lead">Up to<\/span><strong class="bs-figures__value">1\/1000<small>s<\/small><\/strong><span class="bs-figures__detail">Shutter<\/span>/);
});

test('model compare reads a missing feature aloud and marks the current model', () => {
  const html = render(h(ModelCompare, { models: [{ name: 'Body', action: 'Buy' }, { name: 'Kit', current: true }], rows: [{ label: 'Lens', values: [null, '50 mm'] }] }));
  assert.match(html, /<article class="bs-compare__model" aria-label="Body">/);
  assert.match(html, /<span class="bs-sr-only">Lens: Not included<\/span>/);
  assert.match(html, /<p class="bs-compare__current">Currently viewing<\/p>/);
  assert.match(html, /<dd>50 mm<\/dd>/);
});

test('footer directory marks the last breadcrumb and labels each column', () => {
  const html = render(h(FooterDirectory, { breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Cameras', href: '/cameras' }], columns: [{ title: 'Shop', links: [{ label: 'Film', href: '/film' }] }], notes: ['Note'] }));
  assert.match(html, /<nav aria-label="Breadcrumb"/);
  assert.match(html, /<a href="\/cameras" aria-current="page">Cameras<\/a>/);
  const id = html.match(/<h3 id="([^"]+)">Shop<\/h3>/)[1];
  assert.match(html, new RegExp(`<ul aria-labelledby="${id}">`));
  assert.match(html, /<ol class="bs-directory__notes"><li>Note<\/li><\/ol>/);
});

test('motion comes from the shared tokens and lists number their items for the stagger', () => {
  const src = new URL('../packages/ui/src/', import.meta.url);
  const tokens = readFileSync(new URL('styles.css', src), 'utf8');
  for (const token of ['--bs-ease-out', '--bs-ease-in-out', '--bs-ease-spring', '--bs-ease', '--bs-duration-fast', '--bs-duration', '--bs-duration-slow', '--bs-stagger']) assert.match(tokens, new RegExp(`${token}:`), token);
  for (const file of readdirSync(src).filter(name => name.endsWith('.css') && name !== 'styles.css')) assert.doesNotMatch(readFileSync(new URL(file, src), 'utf8'), /cubic-bezier/, `${file} hardcodes an easing curve`);
  const html = render(h(Sidebar, { sections: [{ items: [{ label: 'Beans', href: '/beans' }, { label: 'Cups', href: '/cups' }] }] }));
  assert.match(html, /<li style="--i:0"><a href="\/beans">.*<li style="--i:1"><a href="\/cups">/);
});
