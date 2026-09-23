import { MagnetTabs } from '@brand-studio/ui';

export default function MagnetTabsDemo() {
  return (
    <MagnetTabs
      aria-label="Shop sections"
      items={[
        { value: 'coffee', label: 'Coffee' },
        { value: 'equipment', label: 'Equipment' },
        { value: 'subscriptions', label: 'Subscriptions' },
        { value: 'gifts', label: 'Gifts' },
      ]}
    />
  );
}
