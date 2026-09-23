import { Textarea } from '@brand-studio/ui';

export default function TextareaError() {
  return (
    <div style={{ width: '100%', maxWidth: 380 }}>
      <Textarea label="Gift message" defaultValue="Happy birthday! Enjoy three months of fresh coffee, delivered every other Friday, and think of me with every single cup you pour." error="Keep it under 120 characters so it fits on the card." />
    </div>
  );
}
