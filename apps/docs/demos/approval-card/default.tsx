'use client';

import { useState } from 'react';
import { ApprovalCard } from '@brand-studio/ui';
import type { ApprovalStatus } from '@brand-studio/ui';

export default function ApprovalCardDemo() {
  const [status, setStatus] = useState<ApprovalStatus>('pending');
  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <ApprovalCard
        title="Place a reorder?"
        description="The agent wants to buy your usual coffee."
        detail={'orders.create({ item: "ethiopia-guji-250", quantity: 2 })'}
        status={status}
        onApprove={() => setStatus('approved')}
        onReject={() => setStatus('rejected')}
      />
    </div>
  );
}
