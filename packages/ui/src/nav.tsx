"use client";

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useThemeRoot } from './core.js';

export interface NavLink { label: string; href: string; current?: boolean; icon?: ReactNode; badge?: ReactNode }

function NavList({ items, onNavigate, className, labelledBy }: { items: NavLink[]; onNavigate?: () => void; className: string; labelledBy?: string }) {
  return <ul className={className} aria-labelledby={labelledBy}>
    {items.map(item => <li key={item.href}>
      <a href={item.href} aria-current={item.current ? 'page' : undefined} onClick={onNavigate}>
        {item.icon && <span className="bs-nav__icon" aria-hidden="true">{item.icon}</span>}
        <span className="bs-nav__label">{item.label}</span>
        {item.badge !== undefined && <span className="bs-nav__badge">{item.badge}</span>}
      </a>
    </li>)}
  </ul>;
}

/** A menu button that opens the site's links in a full-screen panel. Focus stays inside until it closes; following a link closes it. */
export function MobileNavigation({ items, label = 'Menu', title = 'Navigation', closeLabel = 'Close menu', className = '' }: { items: NavLink[]; label?: string; title?: string; closeLabel?: string; className?: string }) {
  const container = useThemeRoot();
  const [open, setOpen] = useState(false);
  return <BaseDialog.Root open={open} onOpenChange={setOpen}>
    <BaseDialog.Trigger className={`bs-menu-button ${className}`}><span className="bs-menu-button__bars" aria-hidden="true" /><span className="bs-sr-only">{label}</span></BaseDialog.Trigger>
    <BaseDialog.Portal container={container}>
      <BaseDialog.Popup className="bs-mobile-nav">
        <div className="bs-mobile-nav__top">
          <BaseDialog.Title className="bs-mobile-nav__title">{title}</BaseDialog.Title>
          <BaseDialog.Close className="bs-dialog__x bs-mobile-nav__close" aria-label={closeLabel}><span aria-hidden="true" /></BaseDialog.Close>
        </div>
        <nav aria-label={title}><NavList items={items} className="bs-mobile-nav__list" onNavigate={() => setOpen(false)} /></nav>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  </BaseDialog.Root>;
}

/** The bar across the top of an app or site: brand, main links and actions. When the header is narrow, the links move into a Mobile Navigation panel. */
export function Header({ brand, items = [], actions, label = 'Main', className = '' }: { brand: ReactNode; items?: NavLink[]; actions?: ReactNode; label?: string; className?: string }) {
  return <header className={`bs-header ${className}`}>
    <div className="bs-header__inner">
      <div className="bs-header__brand">{brand}</div>
      {items.length > 0 && <nav aria-label={label} className="bs-header__nav"><NavList items={items} className="bs-header__list" /></nav>}
      {actions && <div className="bs-header__actions">{actions}</div>}
      {items.length > 0 && <MobileNavigation items={items} title={label} className="bs-header__menu" />}
    </div>
  </header>;
}

/** A floating glass bar for a long, chaptered page: brand, links, the chapter being read and a line that fills as you scroll. */
export function StoryHeader({ brand, items = [], current, actions, label = 'Main', className = '' }: { brand: ReactNode; items?: NavLink[]; current?: { label: ReactNode; href: string; marker?: ReactNode }; actions?: ReactNode; label?: string; className?: string }) {
  const chip = current && <a className="bs-story-header__current" href={current.href}>
    {current.marker && <span className="bs-story-header__marker">{current.marker}</span>}{current.label}
  </a>;
  return <Header className={`bs-story-header ${className}`} brand={brand} items={items} label={label} actions={chip || actions ? <>{chip}{actions}</> : undefined} />;
}

export interface SiteMenuGroup { label: string; links: { label: string; href: string }[] }
export interface SiteBarItem { label: string; href: string; current?: boolean; menu?: SiteMenuGroup[] }

/**
 * A thin bar across the top of a whole site. Items with a menu open a full-width panel on hover, or from the small arrow
 * button beside them; the page behind blurs. The first group in a panel is set large. Pair it with a Product Bar below.
 */
export function SiteBar({ brand, items, actions, label = 'Site', sticky = false, className = '' }: { brand: ReactNode; items: SiteBarItem[]; actions?: ReactNode; label?: string; sticky?: boolean; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bar = useRef<HTMLElement>(null);
  const later = (next: number | null, wait: number) => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(next), wait); };
  useEffect(() => {
    if (open === null) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(null);
      bar.current?.querySelector<HTMLElement>(`[aria-controls="${id}-${open}"]`)?.focus();
    };
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, [open, id]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <header ref={bar} className={`bs-sitebar ${className}`} data-sticky={sticky || undefined} data-open={open !== null || undefined}
    onMouseLeave={() => later(null, 160)}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(null); }}>
    <div className="bs-sitebar__inner">
      <div className="bs-sitebar__brand">{brand}</div>
      <nav aria-label={label} className="bs-sitebar__nav">
        <ul className="bs-sitebar__list">
          {items.map((item, index) => <li key={index} onMouseEnter={() => later(item.menu ? index : null, open === null ? 180 : 60)}>
            <a href={item.href} aria-current={item.current ? 'page' : undefined}>{item.label}</a>
            {item.menu && <>
              <button type="button" className="bs-sitebar__toggle" aria-expanded={open === index} aria-controls={`${id}-${index}`}
                onClick={() => setOpen(open === index ? null : index)}>
                <span className="bs-sr-only">{item.label} menu</span>
                <svg viewBox="0 0 10 10" aria-hidden="true"><path d="m2 3.5 3 3 3-3" /></svg>
              </button>
              <div id={`${id}-${index}`} className="bs-sitebar__panel" hidden={open !== index}>
                <div className="bs-sitebar__groups">
                  {item.menu.map((group, groupIndex) => <div key={group.label} className="bs-sitebar__group" data-lead={groupIndex === 0 || undefined}>
                    <p id={`${id}-${index}-${groupIndex}`} className="bs-sitebar__heading">{group.label}</p>
                    <ul aria-labelledby={`${id}-${index}-${groupIndex}`}>{group.links.map((link, i) => <li key={i}><a href={link.href}>{link.label}</a></li>)}</ul>
                  </div>)}
                </div>
              </div>
            </>}
          </li>)}
        </ul>
      </nav>
      {actions && <div className="bs-sitebar__actions">{actions}</div>}
      <MobileNavigation items={items} title={label} className="bs-sitebar__menu" />
    </div>
    <div className="bs-sitebar__curtain" aria-hidden="true" onClick={() => setOpen(null)} />
  </header>;
}

/**
 * The bar for one product: its name, the product's own pages and one action. It sticks to the top of the window while
 * the page scrolls. On a narrow bar the links fold into a list under an arrow button.
 */
export function ProductBar({ title, href = '#', items = [], action, label, className = '' }: { title: ReactNode; href?: string; items?: NavLink[]; action?: ReactNode; label?: string; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <div className={`bs-productbar ${className}`} data-open={open || undefined}>
    <div className="bs-productbar__inner">
      <a className="bs-productbar__title" href={href}>{title}</a>
      {items.length > 0 && <>
        <button type="button" className="bs-productbar__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          <span className="bs-sr-only">{open ? 'Hide' : 'Show'} {label ?? 'product'} pages</span>
          <svg viewBox="0 0 10 10" aria-hidden="true"><path d="m2 3.5 3 3 3-3" /></svg>
        </button>
        <nav id={id} aria-label={label ?? (typeof title === 'string' ? title : 'Product')} className="bs-productbar__nav">
          <NavList items={items} className="bs-productbar__list" onNavigate={() => setOpen(false)} />
        </nav>
      </>}
      {action && <div className="bs-productbar__action">{action}</div>}
    </div>
  </div>;
}

export interface SidebarSection { label?: string; items: NavLink[] }

/** Side navigation for an app: grouped links with an optional icon and count, plus a top and bottom slot. Pair it with Mobile Navigation on narrow screens. */
export function Sidebar({ sections, header, footer, label = 'Sidebar', className = '' }: { sections: SidebarSection[]; header?: ReactNode; footer?: ReactNode; label?: string; className?: string }) {
  const id = useId();
  return <aside className={`bs-sidebar ${className}`}>
    {header && <div className="bs-sidebar__header">{header}</div>}
    <nav aria-label={label} className="bs-sidebar__nav">
      {sections.map((section, index) => <div key={section.label ?? index} className="bs-sidebar__section">
        {section.label && <p id={`${id}-${index}`} className="bs-sidebar__heading">{section.label}</p>}
        <NavList items={section.items} className="bs-sidebar__list" labelledBy={section.label ? `${id}-${index}` : undefined} />
      </div>)}
    </nav>
    {footer && <div className="bs-sidebar__footer">{footer}</div>}
  </aside>;
}
