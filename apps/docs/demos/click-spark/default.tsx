import { Button, ClickSpark } from '@brand-studio/ui';

export default function ClickSparkDemo() {
  return (
    <ClickSpark style={{ display: 'grid', placeItems: 'center', width: '100%', minHeight: 220 }}>
      <Button shape="pill">Click anywhere here</Button>
    </ClickSpark>
  );
}
