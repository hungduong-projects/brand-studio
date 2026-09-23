import { Textarea } from '@brand-studio/ui';

export default function TextareaDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 380 }}>
      <Textarea label="Delivery note" hint="We pass this to the courier." placeholder="Leave it with the concierge." />
    </div>
  );
}
