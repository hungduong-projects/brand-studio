import { Button, EmptyState } from '@brand-studio/ui';

export default function EmptyStateDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 460 }}>
      <EmptyState
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7Z" /><path d="M9 7V5a3 3 0 0 1 6 0v2" /></svg>}
        title="No orders yet"
        description="Your first bag ships the Friday after you subscribe. Orders and tracking show up here."
        action={<Button>Choose a coffee</Button>}
      />
    </div>
  );
}
