import { TaskRows } from '@brand-studio/ui';

export default function TaskRowsFailed() {
  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <TaskRows
        title="Import"
        tasks={[
          { id: 'a', label: 'Download the price list', status: 'done', meta: '2s' },
          { id: 'b', label: 'Match 212 products', status: 'failed', meta: '3 missing' },
          { id: 'c', label: 'Update the shop', status: 'pending' },
        ]}
      />
    </div>
  );
}
