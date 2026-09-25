'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Copies `text`, or the text of the element `from` points at. */
export function CopyButton({ text, from, label = 'Copy code' }: { text?: string; from?: () => HTMLElement | null; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text ?? from?.()?.textContent ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return <button type="button" className="copy" onClick={copy} aria-label={label}>
    {copied
      ? <Check aria-hidden="true" size={14} />
      : <Copy aria-hidden="true" size={14} />}
    <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
  </button>;
}
