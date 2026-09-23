import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrandTheme } from '@brand-studio/ui';
import '@brand-studio/ui/styles.css';
import './styles.css';
import { Deskhand, DeskhandHeader } from './deskhand';
import deskhand from './deskhand.brand.json';
import edition from './edition.brand.json';
import { Release } from './release';
import { Halden } from './halden';
import halden from './halden.brand.json';
import { HaldenStill } from './halden-still';

function App() {
  if (import.meta.env.DEV && window.location.pathname === '/camera/still') return <HaldenStill />;
  if (window.location.pathname === '/deskhand') return <BrandTheme palette={deskhand.tokens} mode="light">
    <a className="skip-link" href="#main">Skip to content</a>
    <DeskhandHeader />
    <Deskhand />
  </BrandTheme>;
  if (window.location.pathname === '/camera') return <BrandTheme palette={halden.tokens} mode="dark">
    <a className="skip-link" href="#main">Skip to content</a>
    <Halden />
  </BrandTheme>;
  return <BrandTheme palette={edition.tokens} mode="light">
    <a className="skip-link" href="#main">Skip to content</a>
    <Release />
  </BrandTheme>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
