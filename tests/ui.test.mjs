import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { Alert, ApprovalCard, BrandTheme, Checkbox, DataTable, Dialog, EmptyState, Header, Sidebar, Skeleton, Spinner, StatCard, Textarea, FlipText, HorizontalStory, ScrollTextReveal, StreamingText, StorySequence, Switch, TaskRows, TextField, AgentThinking, ThinkingTrace, ToolChips, Button } from '../packages/ui/dist/index.js';

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
