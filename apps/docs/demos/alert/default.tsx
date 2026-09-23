import { Alert, Button } from '@brand-studio/ui';

export default function AlertDemo() {
  return (
    <div style={{ display: 'grid', gap: 14, width: '100%', maxWidth: 480 }}>
      <Alert title="Friday deliveries move to Saturday" action={<Button tone="secondary">Choose a day</Button>}>
        The courier is closed on 3 October. Your order still ships on Thursday.
      </Alert>
      <Alert tone="critical" title="Your card was declined">
        Update the card before Wednesday so the next bag ships on time.
      </Alert>
    </div>
  );
}
