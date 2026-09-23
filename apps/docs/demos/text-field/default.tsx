import { TextField } from '@brand-studio/ui';

export default function TextFieldDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
      <TextField label="Email" type="email" placeholder="you@example.com" hint="We only use it for your receipt." />
    </div>
  );
}
