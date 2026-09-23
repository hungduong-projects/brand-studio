'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { CopyButton } from './copy-button';

export function PreviewFrame({ children, code, raw, layout }: { children: ReactNode; code: ReactNode; raw: string; layout: 'center' | 'full' }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const short = raw.split('\n').length <= 8;
  return <div className="preview" data-layout={layout}>
    <div className="preview__demo">{children}</div>
    <div className="preview__code" data-open={open || short} id={id}>
      <div className="code-frame">
        <div className="code" tabIndex={open || short ? 0 : -1}>{code}</div>
        <CopyButton text={raw} />
      </div>
      {!short && <div className="preview__expand">
        <button type="button" className="pill-button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{open ? 'Hide code' : 'View code'}</button>
      </div>}
    </div>
  </div>;
}
