import { Badge } from '@brand-studio/ui';

export default function BadgeDemo() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Badge>Single origin</Badge>
      <Badge tone="accent">New</Badge>
      <Badge tone="outline">Decaf</Badge>
    </div>
  );
}
