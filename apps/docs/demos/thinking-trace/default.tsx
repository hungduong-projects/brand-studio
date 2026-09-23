import { ThinkingTrace } from '@brand-studio/ui';

export default function ThinkingTraceDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      <ThinkingTrace
        defaultOpen
        steps={[
          { id: 'read', title: 'Read the order history', detail: '14 orders since March', status: 'done' },
          { id: 'compare', title: 'Compare roast preferences', detail: 'Mostly light, two medium', status: 'done' },
          { id: 'pick', title: 'Pick three new coffees', status: 'active' },
          { id: 'write', title: 'Write the recommendation', status: 'pending' },
        ]}
      />
    </div>
  );
}
