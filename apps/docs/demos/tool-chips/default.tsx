import { ToolChips } from '@brand-studio/ui';

export default function ToolChipsDemo() {
  return (
    <ToolChips
      tools={[
        { id: '1', name: 'orders.search', detail: '14 results', status: 'done' },
        { id: '2', name: 'catalog.list', status: 'running' },
        { id: '3', name: 'stock.check', detail: 'timed out', status: 'error' },
      ]}
    />
  );
}
