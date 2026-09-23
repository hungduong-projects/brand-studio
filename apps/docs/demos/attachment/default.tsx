'use client';

import { useEffect, useState } from 'react';
import { Attachment } from '@brand-studio/ui';

export default function AttachmentDemo() {
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(true);
  const [files, setFiles] = useState(['tasting-notes.pdf', 'roast-log.csv']);
  useEffect(() => {
    if (progress >= 100) return;
    const timer = setTimeout(() => setProgress(value => Math.min(100, value + 7)), 180);
    return () => clearTimeout(timer);
  }, [progress]);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
      {files.includes('tasting-notes.pdf') && <Attachment name="tasting-notes.pdf" size="240 KB" progress={progress} onRemove={() => setFiles(list => list.filter(file => file !== 'tasting-notes.pdf'))} />}
      {files.includes('roast-log.csv') && <Attachment name="roast-log.csv" size="18 KB" onRemove={() => setFiles(list => list.filter(file => file !== 'roast-log.csv'))} />}
      <Attachment name="farm-visit.mov" size="1.2 GB" error={failed ? 'Too large to upload' : undefined} progress={failed ? undefined : 30} onRetry={() => setFailed(false)} />
    </div>
  );
}
