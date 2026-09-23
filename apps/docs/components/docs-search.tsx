'use client';

import { useEffect, useRef, useState } from 'react';
import { catalog, componentHref, guideHref, guides } from '@/lib/catalog';

const pages: { title: string; group: string; href: string; description?: string }[] = [
  ...guides.map((guide) => ({ title: guide.title, group: 'Getting Started', href: guideHref(guide.slug) })),
  ...catalog.map((entry) => ({ title: entry.title, group: entry.category, href: componentHref(entry.slug), description: entry.description })),
];

/** Search button with a ⌘K shortcut. Opens a native modal dialog, so Escape and focus return come from the browser. */
export function DocsSearch() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const results = pages.filter((page) => `${page.title} ${page.group} ${page.description ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); dialog.current?.showModal(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  return <>
    <button type="button" className="search-trigger" onClick={() => dialog.current?.showModal()}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <span>Search docs…</span>
      <kbd>⌘ K</kbd>
    </button>
    <dialog ref={dialog} className="search-dialog" aria-label="Search docs" onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }} onClose={() => setQuery('')}>
      <form method="dialog" onSubmit={(event) => { event.preventDefault(); if (results[0]) location.href = results[0].href; }}>
        <input autoFocus type="text" placeholder="Search components and guides" aria-label="Search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); dialog.current?.close(); } }} />
      </form>
      <ul>
        {results.map((page) => <li key={page.href}><a href={page.href}><span>{page.title}</span><small>{page.group}</small></a></li>)}
        {results.length === 0 && <li className="search-dialog__empty">No page matches “{query}”.</li>}
      </ul>
    </dialog>
  </>;
}
