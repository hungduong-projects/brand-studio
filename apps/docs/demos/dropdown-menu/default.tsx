import { Button, DropdownMenu } from '@brand-studio/ui';

export default function DropdownMenuDemo() {
  return (
    <DropdownMenu
      trigger={<Button tone="secondary">Subscription</Button>}
      items={[
        { label: 'Skip next delivery' },
        { label: 'Change grind' },
        { label: 'Delivery history', href: '#history' },
        'separator',
        { label: 'Pause for a month' },
        { label: 'Cancel subscription', disabled: true },
      ]}
    />
  );
}
