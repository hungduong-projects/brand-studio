'use client';

import { useState } from 'react';
import { Button, FlowDiagram } from '@brand-studio/ui';
import type { FlowEdge, FlowNode } from '@brand-studio/ui';

const nodes: FlowNode[] = [
  { id: 'read', label: 'Read the ticket', tag: 'Agent' },
  { id: 'found', label: 'Order found?', kind: 'decision' },
  { id: 'window', label: 'Inside 30 days?', kind: 'decision' },
  { id: 'ask', label: 'Ask for the order number', tag: 'Agent' },
  { id: 'refund', label: 'Draft a refund', tag: 'Agent' },
  { id: 'credit', label: 'Offer store credit', tag: 'Agent' },
  { id: 'approve', label: 'Approve the reply', tag: 'You', note: 'Nothing is sent before this.' },
  { id: 'send', label: 'Send', tag: 'Agent' },
];
const edges: FlowEdge[] = [
  { from: 'read', to: 'found' },
  { from: 'found', to: 'window', label: 'Yes' },
  { from: 'found', to: 'ask', label: 'No' },
  { from: 'ask', to: 'read', label: 'Reply' },
  { from: 'window', to: 'refund', label: 'Yes' },
  { from: 'window', to: 'credit', label: 'No' },
  { from: 'refund', to: 'approve' },
  { from: 'credit', to: 'approve' },
  { from: 'approve', to: 'send' },
];
const tickets = [
  { name: 'Ticket 4812', path: ['read', 'found', 'window', 'refund', 'approve', 'send'] },
  { name: 'Ticket 4813', path: ['read', 'found', 'window', 'credit', 'approve', 'send'] },
  { name: 'Ticket 4814', path: ['read', 'found', 'ask'] },
];

export default function FlowDiagramDemo() {
  const [ticket, setTicket] = useState(0);
  return (
    <div style={{ width: '100%', maxWidth: 620, display: 'grid', gap: 16 }}>
      <div role="group" aria-label="Ticket" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tickets.map((item, index) => <Button key={item.name} tone={index === ticket ? 'primary' : 'secondary'} aria-pressed={index === ticket} onClick={() => setTicket(index)}>{item.name}</Button>)}
      </div>
      <FlowDiagram title="How a refund request is handled" nodes={nodes} edges={edges} lit={tickets[ticket].path} />
    </div>
  );
}
