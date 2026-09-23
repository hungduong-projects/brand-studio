'use client';

import { Badge, DataTable } from '@brand-studio/ui';

interface Order { id: string; customer: string; coffee: string; bags: number; status: 'Roasting' | 'Shipped' | 'Delivered' }

const orders: Order[] = [
  { id: 'A-1042', customer: 'Linh Tran', coffee: 'Ethiopia Guji', bags: 2, status: 'Roasting' },
  { id: 'A-1041', customer: 'Sam Okafor', coffee: 'Colombia Huila', bags: 1, status: 'Shipped' },
  { id: 'A-1039', customer: 'Ana Ruiz', coffee: 'Kenya Nyeri', bags: 3, status: 'Delivered' },
  { id: 'A-1036', customer: 'Minh Pham', coffee: 'Ethiopia Guji', bags: 1, status: 'Delivered' },
];

export default function DataTableDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 620 }}>
      <DataTable
        caption="This week’s orders"
        rows={orders}
        rowKey={(order) => order.id}
        columns={[
          { key: 'id', header: 'Order' },
          { key: 'customer', header: 'Customer', sortValue: (order) => order.customer },
          { key: 'coffee', header: 'Coffee' },
          { key: 'bags', header: 'Bags', align: 'end', sortValue: (order) => order.bags },
          { key: 'status', header: 'Status', cell: (order) => <Badge tone={order.status === 'Roasting' ? 'accent' : 'neutral'}>{order.status}</Badge> },
        ]}
      />
    </div>
  );
}
