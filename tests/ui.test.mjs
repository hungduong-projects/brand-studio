import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { Alert, ApprovalCard, ChapterRail, TopicMap, BrandTheme, Checkbox, DataTable, Dialog, EmptyState, Header, Sidebar, Skeleton, StoryCover, StoryHeader, Spinner, StatCard, Textarea, FlipText, HorizontalStory, ScrollTextReveal, StreamingText, StorySequence, Switch, TaskRows, TextField, AgentThinking, ThinkingTrace, ToolChips, Button, SiteBar, ProductBar, HighlightsGallery, ProductViewer, CardCarousel, KeyFigures, ModelCompare, FooterDirectory, ChatThread, ChatMessage, ChatComposer, PromptBar, Attachment, SuggestionChips, MessageActions, CodeBlock, SourceCards, SelectionActions, RecommendationCard, VoiceOrb, DictationButton, LiveTranscript, InfiniteCanvas, Lightbox, RingGallery, ShaderBackground, KineticText, DistortionImage, VelocityMarquee, StaggerGrid, ScrollFormation, MagneticButton, CustomCursor, TiltCard, SpotlightCard, ScrambleText } from '../packages/ui/dist/index.js';

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

test('chapter rail is a named list of chapter links that stays hidden until it docks', () => {
  const chapters = [{ label: 'The bean', href: '#bean', marker: 'I' }, { label: 'The cup', href: '#cup' }];
  const fixed = render(h(ChapterRail, { chapters, cover: 'cover' }));
  assert.match(fixed, /^<nav class="bs-rail " aria-label="Chapters" data-placement="fixed"><ol class="bs-rail__list"><li><a href="#bean"><span class="bs-rail__marker">I<\/span><span class="bs-rail__label">The bean<\/span><\/a><\/li>/);
  assert.doesNotMatch(fixed, /data-show|aria-current/);
  const inline = render(h(ChapterRail, { chapters, placement: 'inline', title: 'Still', label: 'Plates' }));
  assert.match(inline, /aria-label="Plates" data-placement="inline" data-show="true"><p class="bs-rail__title">Still<\/p>/);
  assert.match(render(h(StoryCover, { id: 'cover', title: 'Three plates' })), /^<div id="cover" class="bs-cover /);
});

test('topic map is a named list of buttons, each tied to its closed detail, with one line per link', () => {
  const html = render(h(TopicMap, { label: 'Roastery', topics: [
    { id: 'origin', label: 'Origin', weight: 3, links: ['farm', 'missing'], detail: 'Where it grows' },
    { id: 'farm', label: 'The farm', detail: 'Huila' },
  ] }));
  assert.match(html, /<ul class="bs-topics__list" aria-label="Roastery">/);
  const button = html.match(/<button type="button" id="([^"]+)" class="bs-topics__word" aria-expanded="false" aria-controls="([^"]+)">Origin<\/button>/);
  assert.ok(button, 'origin button');
  assert.match(html, new RegExp(`<div id="${button[2]}" class="bs-topics__detail" role="region" aria-labelledby="${button[1]}" hidden="">`));
  assert.equal((html.match(/<line /g) ?? []).length, 1, 'links to unknown topics draw nothing');
  assert.match(html, /<svg class="bs-topics__lines" aria-hidden="true">/);
});

test('chat thread is a named log of messages, each an article named by its speaker', () => {
  const html = render(h(ChatThread, { label: 'Brew assistant' }, h(ChatMessage, { from: 'user' }, 'Hi'), h(ChatMessage, { name: 'Brew', avatar: 'B' }, 'Hello')));
  assert.match(html, /role="log" aria-label="Brew assistant" tabindex="0"/);
  assert.match(html, /<article class="bs-msg " data-from="user" aria-label="You">/);
  assert.match(html, /aria-label="Brew"><header class="bs-msg__head"><span class="bs-msg__avatar" aria-hidden="true">B<\/span>/);
  assert.doesNotMatch(html, /Jump to latest/, 'the jump button waits until you scroll away');
});

test('composer labels its box, disables send while empty and swaps send for stop while busy', () => {
  const empty = render(h(ChatComposer, { label: 'Ask' }));
  assert.match(empty, /<label for="([^"]+)" class="bs-sr-only">Ask<\/label><textarea id="\1"/);
  assert.match(empty, /type="submit" class="bs-composer__send" aria-label="Send" disabled=""/);
  const typed = render(h(ChatComposer, { defaultValue: 'Grind?' }));
  assert.doesNotMatch(typed, /disabled=""/);
  const busy = render(h(ChatComposer, { busy: true }));
  assert.match(busy, /aria-label="Stop"/);
  assert.doesNotMatch(busy, /aria-label="Send"/);
});

test('prompt bar tells people about @ and / and keeps the list closed until they type', () => {
  const html = render(h(PromptBar, { sources: [{ id: 'log', label: 'Roast log' }], commands: [{ id: 'sum', label: 'summarise' }], models: [{ value: 'fast', label: 'Fast' }] }));
  const hint = html.match(/aria-describedby="([^"]+)"/);
  assert.ok(hint, 'described textbox');
  assert.match(html, new RegExp(`id="${hint[1]}" class="bs-sr-only">Type @ to add a source. Type / to run a command.`));
  assert.doesNotMatch(html, /role="listbox"/);
  assert.match(html, /aria-label="Model: Fast"/);
});

test('attachment names the file in its buttons and reports progress or error', () => {
  const uploading = render(h(Attachment, { name: 'notes.pdf', progress: 42.4, onRemove() {} }));
  assert.match(uploading, /role="progressbar" aria-label="Uploading notes.pdf" aria-valuemin="0" aria-valuemax="100" aria-valuenow="42"/);
  assert.match(uploading, /Uploading 42%/);
  assert.match(uploading, /aria-label="Remove notes.pdf"/);
  const failed = render(h(Attachment, { name: 'visit.mov', error: 'Too large', onRetry() {} }));
  assert.match(failed, /role="alert">Too large</);
  assert.match(failed, /aria-label="Retry visit.mov"/);
  assert.doesNotMatch(failed, /progressbar/);
  assert.match(render(h(Attachment, { name: 'log.csv', size: '18 KB' })), /data-state="done".*>csv<.*18 KB/);
});

test('suggestions are a named list of buttons numbered for the stagger', () => {
  const html = render(h(SuggestionChips, { label: 'Follow-ups', suggestions: ['Why?', 'Save it'] }));
  assert.match(html, /<ul class="bs-suggest " aria-label="Follow-ups"><li style="--i:0"><button type="button">Why\?<\/button><\/li><li style="--i:1">/);
});

test('message actions show only what is supported and report rating as pressed', () => {
  const bare = render(h(MessageActions, {}));
  assert.match(bare, /role="group" aria-label="Message actions"/);
  assert.doesNotMatch(bare, /aria-label="(Copy|Retry|Edit)"/);
  const full = render(h(MessageActions, { copyText: 'x', onRetry() {}, onEdit() {}, feedback: 'up' }));
  for (const name of ['Copy', 'Retry', 'Edit']) assert.match(full, new RegExp(`aria-label="${name}"`));
  assert.match(full, /aria-label="Good answer" aria-pressed="true"/);
  assert.match(full, /aria-label="Bad answer" aria-pressed="false"/);
});

test('code block keeps every line in the HTML, focusable for scrolling, with a worded copy button', () => {
  const html = render(h(CodeBlock, { code: 'a\n\nb\n', filename: 'brew.ts', language: 'TypeScript', reveal: true }));
  assert.equal((html.match(/class="bs-code__line"/g) ?? []).length, 3);
  assert.match(html, /<pre class="bs-code__pre" tabindex="0">/);
  assert.match(html, /brew.ts<\/span><span class="bs-code__lang">TypeScript/);
  assert.match(html, /<span>Copy code<\/span>/);
  assert.match(html, /animation-delay:0.042s/);
});

test('source cards are a named ordered list, linked when they have an address', () => {
  const html = render(h(SourceCards, { sources: [{ id: 'a', source: 'Notes', title: 'Cupping', href: '/cupping' }, { id: 'b', source: 'Prices', title: 'Spring list' }] }));
  assert.match(html, /<ol class="bs-sources " aria-label="Sources">/);
  assert.match(html, /<a class="bs-sources__card" href="\/cupping"><span class="bs-sources__origin"><span class="bs-sources__index">1<\/span>Notes/);
  assert.match(html, /<div class="bs-sources__card"><span class="bs-sources__origin"><span class="bs-sources__index">2<\/span>/);
});

test('selection actions render the text alone until something is selected', () => {
  const html = render(h(SelectionActions, { actions: [{ id: 'x', label: 'Explain' }] }, h('p', null, 'Long finish')));
  assert.match(html, /<p>Long finish<\/p>/);
  assert.doesNotMatch(html, /toolbar|Explain/);
});

test('recommendation card writes confidence in words and keeps alternatives closed', () => {
  const html = render(h(RecommendationCard, { options: [{ id: 'a', title: 'Grind 18', confidence: 0.824 }, { id: 'b', title: 'Grind 17', confidence: 0.5 }] }));
  const title = html.match(/aria-labelledby="([^"]+)"/)[1];
  assert.match(html, new RegExp(`<h3 id="${title}" tabindex="-1">Grind 18</h3>`));
  assert.match(html, /82% confident/);
  const others = html.match(/aria-expanded="false" aria-controls="([^"]+)">See 1 alternative</);
  assert.ok(others, 'alternatives toggle');
  assert.match(html, new RegExp(`<ul id="${others[1]}" class="bs-rec__others" hidden="">`));
  assert.match(html, /aria-label="Use Grind 17 instead"/);
  assert.equal(render(h(RecommendationCard, { options: [] })), '');
});

test('voice pieces say their state in words and keep guesses away from screen readers', () => {
  const orb = render(h(VoiceOrb, { state: 'speaking', level: 3 }));
  assert.match(orb, /role="status"/);
  assert.match(orb, /--level:1.000/);
  assert.match(orb, /Speaking/);
  const button = render(h(DictationButton, { mode: 'hold' }));
  assert.match(button, /aria-pressed="false" aria-label="Hold to talk"/);
  assert.match(button, /class="bs-dictate__note" role="status"><\/span>/);
  const transcript = render(h(LiveTranscript, { text: 'Two bags', interim: 'of Huila', listening: true }));
  assert.match(transcript, /<p class="bs-sr-only" aria-live="polite"><span>Two<\/span><span> <\/span><span>bags<\/span><\/p>/);
  assert.match(transcript, /<p class="bs-transcript__text" aria-hidden="true">.*of Huila.*bs-transcript__caret/);
});

test('select draws its own tick, so the library default emoji never shows', () => {
  const source = readFileSync('packages/ui/src/app.tsx', 'utf8');
  assert.match(source, /<BaseSelect\.ItemIndicator className="bs-select__check"><svg /);
});

const galleryImages = ['a', 'b', 'c', 'd', 'e'].map((name) => ({ src: `/${name}.webp`, alt: `Photo ${name}`, width: 800, height: 800 }));

test('infinite canvas is a focusable labelled region that names each image once before enhancement', () => {
  const html = render(h(InfiniteCanvas, { images: galleryImages, label: 'Archive' }));
  assert.match(html, /role="region" aria-label="Archive, drag or use arrow keys to explore" tabindex="0"/);
  for (const image of galleryImages) assert.equal(html.split(`alt="${image.alt}"`).length - 1, 1, image.alt);
  assert.equal((html.match(/aria-hidden="true"/g) ?? []).length, 1, 'the filler cell in a 3 by 2 grid is hidden');
  assert.ok(!html.includes('data-enhanced'), 'not enhanced before scripts run');
});

test('lightbox renders thumbnail buttons and a closed dialog', () => {
  const html = render(h(Lightbox, { images: galleryImages, label: 'Field notes' }));
  assert.match(html, /<ul class="bs-lightbox__grid" aria-label="Field notes">/);
  assert.equal((html.match(/aria-haspopup="dialog"/g) ?? []).length, 5);
  assert.match(html, /<dialog class="bs-lightbox__dialog" aria-label="Field notes">/);
  assert.match(html, /aria-live="polite">1 \/ 5</);
});

test('ring gallery exposes only the image facing the viewer', () => {
  const html = render(h(RingGallery, { images: galleryImages, label: 'Every angle' }));
  assert.match(html, /aria-roledescription="carousel" aria-label="Every angle"/);
  assert.equal((html.match(/aria-roledescription="slide"/g) ?? []).length, 5);
  assert.equal((html.match(/aria-hidden="true" data-front|<li[^>]*aria-hidden="true"/g) ?? []).length, 4);
  assert.match(html, /aria-label="Previous image"/);
  assert.ok(!render(h(RingGallery, { images: galleryImages.slice(0, 1) })).includes('bs-ring__nav'), 'one image needs no controls');
});

test('lightbox masonry keeps the same thumbnails and dialog in a masonry list', () => {
  const html = render(h(Lightbox, { images: galleryImages, layout: 'masonry' }));
  assert.match(html, /class="bs-lightbox bs-lightbox--masonry /);
  assert.equal((html.match(/aria-haspopup="dialog"/g) ?? []).length, 5);
});

test('shader background hides its canvas and keeps content as plain markup', () => {
  const html = render(h(ShaderBackground, null, h('h2', null, 'Autumn lot')));
  assert.match(html, /<canvas class="bs-shader__canvas" aria-hidden="true">/);
  assert.match(html, /<div class="bs-shader__content"><h2>Autumn lot<\/h2><\/div>/);
});

test('kinetic text reads once to screen readers and splits pieces for the eye', () => {
  const words = render(h(KineticText, { text: 'In your cup', as: 'h1' }));
  assert.match(words, /^<h1 class="bs-kinetic /);
  assert.match(words, /<span class="bs-sr-only">In your cup<\/span><span aria-hidden="true">/);
  assert.equal((words.match(/bs-kinetic__piece/g) ?? []).length, 3);
  assert.equal((render(h(KineticText, { text: 'Cup', by: 'letter' })).match(/bs-kinetic__piece/g) ?? []).length, 3);
});

test('distortion image keeps a described picture under a hidden canvas', () => {
  const html = render(h(DistortionImage, { asset: galleryImages[0] }));
  assert.match(html, /alt="Photo a"/);
  assert.match(html, /<canvas class="bs-distort__canvas" aria-hidden="true">/);
});

test('velocity marquee names each line once and hides the repeats', () => {
  const html = render(h(VelocityMarquee, { lines: ['Single origin', 'Shipped Friday'] }));
  assert.match(html, /<ul class="bs-sr-only"><li>Single origin<\/li><li>Shipped Friday<\/li><\/ul>/);
  assert.equal((html.match(/class="bs-marquee__row" aria-hidden="true"/g) ?? []).length, 2);
});

test('stagger grid and scroll formation render flat, labelled image lists before enhancement', () => {
  const grid = render(h(StaggerGrid, { images: galleryImages, label: 'Notes' }));
  assert.match(grid, /<ul class="bs-stagger " aria-label="Notes">/);
  assert.ok(!grid.includes('data-enhanced'));
  const formation = render(h(ScrollFormation, { images: galleryImages, title: 'In the box', label: 'Kit' }));
  assert.match(formation, /<section class="bs-formation " aria-label="Kit" style="--cols:3;--rows:2">/);
  assert.match(formation, /<h2 class="bs-formation__title">In the box<\/h2>/);
  for (const image of galleryImages) assert.ok(formation.includes(`alt="${image.alt}"`), image.alt);
  assert.ok(!formation.includes('data-enhanced'));
});

test('pointer effects render plain, usable markup before any pointer arrives', () => {
  const button = render(h(MagneticButton, { shape: 'pill' }, 'Pre-order'));
  assert.match(button, /^<button style="--bs-magnetic-strength:1" type="button" class="bs-button bs-button--primary bs-button--pill bs-magnetic "/);
  assert.match(button, /<span class="bs-magnetic__label">Pre-order<\/span>/);
  const cursor = render(h(CustomCursor, null, h('a', { href: '/lens', 'data-cursor': 'Read' }, 'Lens')));
  assert.match(cursor, /<a href="\/lens" data-cursor="Read">Lens<\/a><span class="bs-cursor__dot" aria-hidden="true"><\/span>/);
  const tilt = render(h(TiltCard, { max: 6 }, 'Halden R'));
  assert.match(tilt, /style="--bs-tilt-max:6deg"/);
  assert.match(tilt, /<div class="bs-tilt__face">Halden R<span class="bs-tilt__glare" aria-hidden="true"><\/span><\/div>/);
  assert.equal(render(h(SpotlightCard, { id: 'plan' }, 'Regular')), '<div id="plan" class="bs-spotlight ">Regular</div>');
});

test('scramble text renders the settled text, once for screen readers', () => {
  const html = render(h(ScrambleText, { as: 'p', text: 'LOT 27' }));
  assert.equal(html, '<p class="bs-scramble "><span class="bs-sr-only">LOT 27</span><span aria-hidden="true">LOT 27</span></p>');
});
