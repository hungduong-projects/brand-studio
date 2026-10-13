import { FlowDiagram } from '@brand-studio/ui';

export default function FlowDiagramAcrossDemo() {
  return (
    <div style={{ width: '100%' }}>
      <FlowDiagram
        title="Where an answer comes from"
        nodes={[
          { id: 'ask', label: 'Your question' },
          { id: 'notes', label: 'Search the notes', tag: 'Tool' },
          { id: 'orders', label: 'Look up the order', tag: 'Tool' },
          { id: 'answer', label: 'Write the answer', tag: 'Agent', note: 'Each claim cites its source.' },
        ]}
        edges={[{ from: 'ask', to: 'notes' }, { from: 'ask', to: 'orders' }, { from: 'notes', to: 'answer' }, { from: 'orders', to: 'answer' }]}
        lit={['ask', 'notes', 'answer']}
      />
    </div>
  );
}
