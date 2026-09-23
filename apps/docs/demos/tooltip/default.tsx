import { Button, Tooltip } from '@brand-studio/ui';

export default function TooltipDemo() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Tooltip content="Saved to your library">
        <Button tone="secondary">Hover or focus me</Button>
      </Tooltip>
      <Tooltip content="Opens in a new tab" side="bottom">
        <Button tone="secondary">Below</Button>
      </Tooltip>
    </div>
  );
}
