'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { BrandTheme } from '@brand-studio/ui';
import { brands, brandKeys, type BrandKey } from '@/lib/brands';
import { Contrast } from 'lucide-react';

type Mode = 'light' | 'dark';
interface DemoBrand { brand: BrandKey; mode: Mode; set: (next: Partial<{ brand: BrandKey; mode: Mode }>) => void }

const DemoBrandContext = createContext<DemoBrand | null>(null);
const storageKey = 'bs-docs-demo';

/** Holds the demo brand and the site mode. public/theme.js applies the saved mode before paint; this keeps React in step. */
export function DemoBrandProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ brand: BrandKey; mode: Mode }>({ brand: 'hollis', mode: 'light' });

  useEffect(() => {
    let saved: Partial<{ brand: BrandKey; mode: Mode }> | null = null;
    try { saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null'); } catch { /* A corrupt entry falls back to the defaults. */ }
    setState({
      brand: saved?.brand && brandKeys.includes(saved.brand) ? saved.brand : 'hollis',
      mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    });
  }, []);

  const set: DemoBrand['set'] = (next) => {
    const apply = () => flushSync(() => setState((current) => {
      const updated = { ...current, ...next };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      document.documentElement.classList.toggle('dark', updated.mode === 'dark');
      return updated;
    }));
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(apply);
    else apply();
  };

  return <DemoBrandContext.Provider value={{ ...state, set }}>{children}</DemoBrandContext.Provider>;
}

export function useDemoBrand() {
  const value = useContext(DemoBrandContext);
  if (!value) throw new Error('useDemoBrand needs DemoBrandProvider');
  return value;
}

/** Renders children in the brand and mode picked in the header. */
export function DemoTheme({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { brand, mode } = useDemoBrand();
  return <BrandTheme palette={brands[brand].palette} mode={mode} className={`demo-theme ${className}`} data-brand={brand}>{children}</BrandTheme>;
}

export function BrandPicker() {
  const { brand, set } = useDemoBrand();
  return <fieldset className="brand-picker">
    <legend className="sr-only">Demo brand</legend>
    {brandKeys.map((key) => <label key={key}>
      <input type="radio" name="demo-brand" value={key} checked={brand === key} onChange={() => set({ brand: key })} />
      <span className="brand-picker__swatch" style={{ background: brands[key].palette.light.accent }} aria-hidden="true" />
      <span className="brand-picker__name">{brands[key].label}</span>
    </label>)}
  </fieldset>;
}

export function ModeToggle() {
  const { mode, set } = useDemoBrand();
  return <button type="button" className="icon-button icon-button--framed" aria-pressed={mode === 'dark'} onClick={() => set({ mode: mode === 'light' ? 'dark' : 'light' })}>
    <span className="sr-only">Dark mode</span>
    <Contrast aria-hidden="true" size={16} />
  </button>;
}
