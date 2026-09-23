import { catalog, categories, componentHref, guideHref, guides } from '@/lib/catalog';
import { BrandPicker, ModeToggle } from './demo-brand';
import { DocsSearch } from './docs-search';
import { MainNav } from './main-nav';
import pkg from '../../../packages/ui/package.json';

export function SiteHeader() {
  return <header className="site-header">
    <div className="site-header__inner">
      <a href="/" className="logo"><svg className="logo__mark" aria-hidden="true" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="currentColor" /><rect x="15" y="7" width="10" height="13" rx="3" fill="var(--background)" /><rect x="7" y="12" width="10" height="13" rx="3" fill="var(--background)" /></svg><strong>Brand Studio UI</strong><em>v{pkg.version}</em></a>
      <DocsSearch />
      <div className="site-header__tools">
        <MainNav />
        <BrandPicker />
        <a className="icon-button icon-button--framed" href="https://github.com/hungduong-projects/brand-studio" aria-label="GitHub repository">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>
        </a>
        <ModeToggle />
      </div>
      <details className="mobile-menu">
        <summary className="icon-button icon-button--framed"><span className="sr-only">Menu</span><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg></summary>
        <nav aria-label="Docs" className="mobile-menu__panel">
          <h2>Getting Started</h2>
          <ul>{guides.map((guide) => <li key={guide.slug}><a href={guideHref(guide.slug)}>{guide.title}</a></li>)}</ul>
          {categories.map((category) => <div key={category}><h2>{category}</h2><ul>{catalog.filter((entry) => entry.category === category).map((entry) => <li key={entry.slug}><a href={componentHref(entry.slug)}>{entry.title}</a></li>)}</ul></div>)}
        </nav>
      </details>
    </div>
  </header>;
}
