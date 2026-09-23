import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { ApprovalCard, BrandTheme, Dialog, FlipText, HorizontalStory, ScrollTextReveal, StreamingText, StorySequence, Switch, TaskRows, TextField, AgentThinking, ThinkingTrace, ToolChips, Button } from '../packages/ui/dist/index.js';

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
  assert.equal(reveal.replace(/<[^>]+>/g, ''), 'Every cup starts here');
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
