'use client';

import { useRef, useState } from 'react';
import { RouteProgress } from '@brand-studio/ui';

const pages = [
  { name: 'Overview', ms: 1200 },
  { name: 'Orders', ms: 2400 },
  { name: 'Team', ms: 150, note: 'answers in 150 ms, so no bar shows' },
];

export default function RouteProgressDemo() {
  const [current, setCurrent] = useState('Overview');
  const [active, setActive] = useState(false);
  const nav = useRef(0);
  const go = (name: string, ms: number) => {
    const id = ++nav.current;
    setActive(true);
    window.setTimeout(() => { if (id !== nav.current) return; setActive(false); setCurrent(name); }, ms);
  };
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 520, overflow: 'hidden', border: '1px solid var(--bs-line)', borderRadius: 'var(--bs-radius)', background: 'var(--bs-elevated)' }}>
      <RouteProgress active={active} contained label="Loading page" />
      <nav aria-label="Demo pages" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8, borderBottom: '1px solid var(--bs-line)' }}>
        {pages.map(page => (
          <a key={page.name} href={`#${page.name.toLowerCase()}`} aria-current={current === page.name ? 'page' : undefined}
            onClick={event => { event.preventDefault(); go(page.name, page.ms); }}
            style={{ padding: '10px 12px', borderRadius: 8, fontWeight: current === page.name ? 600 : 400, textDecoration: 'none' }}>
            {page.name}
          </a>
        ))}
      </nav>
      <div style={{ padding: '20px 20px 24px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>{current}</h3>
        <p style={{ margin: 0, color: 'var(--bs-muted)' }}>The old page stays readable while the next one loads. Team {pages[2]!.note}.</p>
      </div>
    </div>
  );
}
