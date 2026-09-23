import { Spinner } from '@brand-studio/ui';

export default function SpinnerDemo() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 32 }}>
      <Spinner label="Checking stock" />
      <Spinner size={32} label="Loading orders" hideLabel />
    </div>
  );
}
