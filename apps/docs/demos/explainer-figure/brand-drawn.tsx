'use client';

import { useState } from 'react';
import { BrandTheme, ExplainerFigure } from '@brand-studio/ui';
import { brands } from '../../lib/brands';
import { useDemoBrand } from '../../components/demo-brand';
import { ReplyDesk, type DeskStory } from '../../lab/paper/reply-desk';
import replyDesk from './reply-desk.json';

// Ticket #2291 as the Deskhand showcase tells it: the same claims, sources and numbering.
const story: DeskStory = {
  fig: 'Fig. 1', title: 'How a reply gets made',
  alt: 'A support ticket on a paper desk. Three source documents slide out, a highlighter marks the line used in each, the drafted reply highlights three claims joined by lines to those lines, and the $84 refund stops at the $50 limit to wait for approval.',
  caption: 'Ticket #2291: Deskhand reads three sources, cites each claim, and holds the $84 refund until you approve it.',
  ticket: { label: 'Ticket', id: '#2291', from: 'Priya N.', text: 'The Orla lamp arrived with a cracked base. Can I get a refund?' },
  sources: [
    { kind: 'Help center', title: 'Returns and refunds', form: 'article', rows: [
      { text: 'Unused items can be returned within 30 days for a full refund.' },
      { text: 'Items damaged in transit are refunded in full. No return is needed.', cited: true },
      { text: 'Sale items can be exchanged for another size or colour.' },
    ] },
    { kind: 'Order', title: '#48213', form: 'receipt', rows: [
      { text: 'Placed', value: '11 Sep' }, { text: 'Delivered', value: '16 Sep' },
      { text: 'Orla table lamp', value: '$84.00', cited: true }, { text: 'Shipping', value: '$0.00' }, { text: 'Paid', value: 'Visa 4417' },
    ] },
    { kind: 'Help center', title: 'Payments', form: 'page', rows: [
      { text: 'We accept Visa, Mastercard and PayPal.' },
      { text: 'Refunds reach the original card in 3 to 5 business days.', cited: true },
    ], days: { from: 3, to: 5, of: 5, label: 'Business days' } },
  ],
  reply: { draft: 'Draft', held: 'Waiting for you', parts: [
    'Hi Priya, sorry the lamp arrived cracked.', { cite: 1, text: 'Damaged items are refunded in full,' },
    'so no need to send it back. I’ve set up a refund of', { cite: 2, text: '$84.00 for order #48213.' },
    { cite: 3, text: 'It reaches your card in 3 to 5 business days.' },
  ] },
  gate: { text: 'Refund $84 is over your $50 limit.', action: 'Approve and send', amount: 84, limit: 50, currency: '$', limitLabel: 'Refund limit' },
  steps: [
    { label: 'Ticket #2291 comes in', readout: 'The Orla lamp arrived with a cracked base' },
    { label: 'Deskhand opens three sources', readout: 'Returns and refunds · Order #48213 · Payments' },
    { label: 'Each claim cites a line', readout: '3 claims · 3 sources · $84.00 refund' },
    { label: 'Over $50? It waits for you', readout: 'Refund $84 is over your $50 limit' },
  ],
  legend: [{ tone: 'lit', label: 'Highlighter: what Deskhand read, cited and holds' }, { tone: 'subject', label: 'Paper: the ticket, sources and reply' }],
};

export default function ExplainerFigureBrandDrawnDemo() {
  const { mode } = useDemoBrand();
  const [view, setView] = useState<'brand' | 'machine'>('brand');
  return (
    <BrandTheme palette={brands.deskhand.palette} mode={mode} style={{ width: '100%', maxWidth: 760, display: 'grid', gap: 12, padding: 12, borderRadius: 16, background: 'var(--bs-surface)', color: 'var(--bs-ink)' }}>
      <div role="group" aria-label="Figure style" style={{ display: 'flex', gap: 4, padding: 3, justifySelf: 'start', borderRadius: 999, boxShadow: 'inset 0 0 0 1px var(--bs-line)' }}>
        {([['brand', 'Brand-drawn'], ['machine', 'Machine (now)']] as const).map(([key, label]) => (
          <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}
            style={{ minHeight: 36, padding: '0 14px', border: 0, borderRadius: 999, font: 'inherit', fontSize: 13, cursor: 'pointer', color: view === key ? 'var(--bs-on-accent)' : 'var(--bs-muted)', background: view === key ? 'var(--bs-accent)' : 'transparent' }}>
            {label}
          </button>
        ))}
      </div>
      {view === 'brand' ? <ReplyDesk story={story} /> : <ExplainerFigure figure={replyDesk} />}
    </BrandTheme>
  );
}
