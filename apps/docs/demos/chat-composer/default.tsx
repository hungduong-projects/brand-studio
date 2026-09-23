'use client';

import { useRef, useState } from 'react';
import { Attachment, ChatComposer, DictationButton } from '@brand-studio/ui';

export default function ChatComposerDemo() {
  const [sent, setSent] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <div style={{ width: '100%', maxWidth: 560, display: 'grid', gap: 16 }}>
      <p style={{ margin: 0, minHeight: 24, color: 'var(--bs-muted)' }}>{sent ? `Sent: ${sent}` : 'Enter sends. Shift+Enter starts a new line.'}</p>
      <ChatComposer
        placeholder="Ask about your coffee"
        busy={busy}
        onSubmit={text => { setSent(text); setBusy(true); timer.current = setTimeout(() => setBusy(false), 2500); }}
        onStop={() => { clearTimeout(timer.current); setBusy(false); }}
        attachments={file && <Attachment name="roast-log.csv" size="18 KB" onRemove={() => setFile(false)} />}
        start={<DictationButton />}
      />
    </div>
  );
}
