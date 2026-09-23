'use client';

import { useEffect, useState } from 'react';
import { TaskRows } from '@brand-studio/ui';
import type { TaskRow } from '@brand-studio/ui';

const labels = ['Read the brief', 'Collect product photos', 'Draft the launch email', 'Check links', 'Schedule the send'];

export default function TaskRowsDemo() {
  const [step, setStep] = useState(1);
  useEffect(() => {
    const timer = setInterval(() => setStep((current) => (current + 1) % (labels.length + 2)), 1400);
    return () => clearInterval(timer);
  }, []);
  const tasks: TaskRow[] = labels.map((label, index) => ({
    id: label,
    label,
    status: index < step ? 'done' : index === step ? 'active' : 'pending',
    meta: index < step ? `${index * 4 + 3}s` : undefined,
  }));
  return <div style={{ width: '100%', maxWidth: 440 }}><TaskRows title="Launch email" tasks={tasks} /></div>;
}
