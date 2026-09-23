'use client';

import { Button, DataTable, EmptyState } from '@brand-studio/ui';

const columns = [{ key: 'id', header: 'Order' }, { key: 'customer', header: 'Customer' }, { key: 'status', header: 'Status' }];

export default function DataTableStates() {
  return (
    <div style={{ display: 'grid', gap: 20, width: '100%', maxWidth: 560 }}>
      <DataTable caption="Loading" rows={[]} rowKey={() => ''} columns={columns} loading />
      <DataTable caption="Refunds" rows={[]} rowKey={() => ''} columns={columns} empty={<EmptyState title="No refunds this month" description="Refunds you issue show up here." action={<Button tone="secondary">Issue a refund</Button>} />} />
    </div>
  );
}
