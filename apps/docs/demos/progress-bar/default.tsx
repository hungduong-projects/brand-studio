'use client';

import { useEffect, useState } from 'react';
import { Button, ProgressBar } from '@brand-studio/ui';

const steps = ['Collect orders', 'Match payments', 'Check totals', 'Write the report'];
const doing = ['Reading 412 orders from the shop', 'Matching 398 payments to their orders', 'Comparing each total with the ledger', 'Laying out 6 pages and charts'];

export default function ProgressBarDemo() {
  const [value, setValue] = useState(0);
  const [stopped, setStopped] = useState(false);
  const done = value >= 100;
  useEffect(() => {
    if (stopped || done) return;
    const timer = window.setTimeout(() => setValue(current => Math.min(100, current + 2.5)), 250);
    return () => clearTimeout(timer);
  }, [value, stopped, done]);
  const step = Math.min(steps.length - 1, Math.floor(value / 25));
  const restart = () => { setValue(0); setStopped(false); };
  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <ProgressBar
        value={value}
        label="Building the March sales report"
        status={stopped ? 'Stopped. Nothing was changed.' : done ? 'Your report is ready.' : `${doing[step]}…`}
        steps={steps}
        step={step}
        onCancel={stopped ? undefined : () => setStopped(true)}
        action={(done || stopped) && <Button onClick={restart}>{done ? 'Run again' : 'Start again'}</Button>}
      />
    </div>
  );
}
