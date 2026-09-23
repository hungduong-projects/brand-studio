'use client';

import { useRef } from 'react';
import type { ComponentProps } from 'react';
import { CopyButton } from './copy-button';

/** Wraps every highlighted `pre` from MDX with a copy button. */
export function CodeFrame({ className = '', ...props }: ComponentProps<'pre'>) {
  const ref = useRef<HTMLPreElement>(null);
  return <div className="code-frame">
    <pre ref={ref} {...props} className={`${className} code`} tabIndex={0} />
    <CopyButton from={() => ref.current} />
  </div>;
}
