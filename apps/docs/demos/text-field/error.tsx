import { TextField } from '@brand-studio/ui';

export default function TextFieldError() {
  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
      <TextField label="Postcode" defaultValue="12" error="Enter a full postcode, such as SW1A 1AA." />
    </div>
  );
}
