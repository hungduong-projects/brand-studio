import { MobileNavigation } from '@brand-studio/ui';

export default function MobileNavigationDemo() {
  return (
    <MobileNavigation
      title="Still"
      items={[
        { label: 'Coffee', href: '#coffee', current: true },
        { label: 'Subscriptions', href: '#subscriptions' },
        { label: 'Brew guides', href: '#guides' },
        { label: 'Account', href: '#account' },
      ]}
    />
  );
}
