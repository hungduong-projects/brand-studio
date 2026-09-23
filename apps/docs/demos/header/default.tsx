import { Button, Header } from '@brand-studio/ui';

export default function HeaderDemo() {
  return (
    <div style={{ width: '100%' }}>
      <Header
        brand={<a href="#">Still</a>}
        items={[
          { label: 'Coffee', href: '#coffee', current: true },
          { label: 'Subscriptions', href: '#subscriptions' },
          { label: 'Brew guides', href: '#guides' },
        ]}
        actions={<Button>Subscribe</Button>}
      />
    </div>
  );
}
