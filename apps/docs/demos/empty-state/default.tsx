import { Button, EmptyState } from '@brand-studio/ui';
import { ShoppingBag } from 'lucide-react';

export default function EmptyStateDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 460 }}>
      <EmptyState
        icon={<ShoppingBag strokeWidth={1.8} />}
        title="No orders yet"
        description="Your first bag ships the Friday after you subscribe. Orders and tracking show up here."
        action={<Button>Choose a coffee</Button>}
      />
    </div>
  );
}
