'use client';

import { BrandImage, PageTransition, transitionTo } from '@brand-studio/ui';
import { useState } from 'react';
import { cameraViews } from '@/demos/assets';

const pages = [
  { id: 'camera', label: 'Camera', title: 'Halden R', body: 'A rangefinder with three dials and no menus.', image: cameraViews[0] },
  { id: 'lens', label: 'Lens', title: '35 mm f/2', body: 'One fixed lens, sharp from edge to edge.', image: cameraViews[1] },
  { id: 'grip', label: 'Grip', title: 'Walnut grip', body: 'Cut from one piece and oiled by hand.', image: cameraViews[2] },
];

export default function PageTransitionDemo() {
  const [page, setPage] = useState(pages[0]);
  return (
    <div style={{ width: '100%', maxWidth: 640, border: '1px solid var(--bs-line-soft)', borderRadius: 20, overflow: 'hidden', background: 'var(--bs-elevated)' }}>
      <nav aria-label="Product" style={{ display: 'flex', gap: 4, padding: 8, borderBottom: '1px solid var(--bs-line-soft)' }}>
        {pages.map(item => (
          <button key={item.id} type="button" aria-current={item.id === page.id ? 'page' : undefined} onClick={() => transitionTo(() => setPage(item))}
            style={{ minHeight: 40, padding: '0 16px', border: 0, borderRadius: 999, font: 'inherit', fontWeight: 600, cursor: 'pointer', background: item.id === page.id ? 'var(--bs-line-soft)' : 'transparent', color: 'inherit' }}>
            {item.label}
          </button>
        ))}
      </nav>
      <PageTransition>
        <div key={page.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', alignItems: 'center', gap: 16, padding: 24 }}>
          <BrandImage asset={page.image} sizes="300px" className="demo-page-image" />
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: 28 }}>{page.title}</h3>
            <p style={{ margin: 0, color: 'var(--bs-muted)' }}>{page.body}</p>
          </div>
        </div>
      </PageTransition>
      <style>{'.demo-page-image { aspect-ratio: 1; }'}</style>
    </div>
  );
}
