import { ThinkingTrace } from '@brand-studio/ui';

export default function ThinkingTraceFinished() {
  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      <ThinkingTrace
        steps={[
          { id: 'read', title: 'Read the order history', status: 'done' },
          { id: 'compare', title: 'Compare roast preferences', status: 'done' },
          { id: 'pick', title: 'Pick three new coffees', status: 'done' },
        ]}
      />
    </div>
  );
}
