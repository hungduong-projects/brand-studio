'use client';

import { useState } from 'react';

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
      ? <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      : <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>}
    <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
  </button>;
}
