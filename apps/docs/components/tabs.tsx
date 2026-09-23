'use client';

import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

/** Small tab set for the docs chrome. Arrow keys, Home and End move between tabs. */
export function DocsTabs({ tabs, variant = 'line', label }: { tabs: { label: string; content: ReactNode }[]; variant?: 'line' | 'code'; label: string }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (event: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: tabs.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = (keys[event.key] + tabs.length) % tabs.length;
    setActive(next);
    buttons.current[next]?.focus();
  };
  return <div className={`docs-tabs docs-tabs--${variant}`}>
    <div role="tablist" aria-label={label} className="docs-tabs__list" onKeyDown={move}>
      {tabs.map((tab, index) => <button key={tab.label} ref={(node) => { buttons.current[index] = node; }} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={index === active} tabIndex={index === active ? 0 : -1} onClick={() => setActive(index)}>{tab.label}</button>)}
    </div>
    {tabs.map((tab, index) => <div key={tab.label} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={index !== active} className="docs-tabs__panel">{tab.content}</div>)}
  </div>;
}
