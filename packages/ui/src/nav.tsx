"use client";

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { useId, useState } from 'react';
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
