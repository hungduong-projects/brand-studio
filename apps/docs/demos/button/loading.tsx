import { Button } from '@brand-studio/ui';

export default function ButtonLoading() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Button loading>Saving</Button>
      <Button disabled>Save changes</Button>
    </div>
  );
}
