import { AgentPromptButton } from '@/components/agent-prompt';
import { DemoTheme } from '@/components/demo-brand';
import { HeroSpecimens } from '@/components/hero-specimens';
import { IntroFilm } from '@/components/intro-film';
import { registry } from '@/demos/registry';
import { catalog, componentHref } from '@/lib/catalog';

// Row order: each row of three ends on one line; Magnet Tabs takes two columns because its tab row is wide.
const showcase = ['agent-thinking/default', 'task-rows/default', 'card/default', 'approval-card/default', 'thinking-trace/default', 'tool-chips/default', 'magnet-tabs/default', 'switch/description'];
const wide = new Set(['magnet-tabs/default']);

export default function Home() {
  return <main id="main" tabIndex={-1} className="home">
    <section className="hero">
      <div className="hero__copy">
        <div className="hero__badges">
          <a className="hero__badge" href="https://www.npmjs.com/package/@brand-studio/ui"><span aria-hidden="true" />@brand-studio/ui on npm</a>
          <AgentPromptButton />
        </div>
        <h1>Components that wear your brand.</h1>
        <p className="hero__lead">React components for apps, AI agents and story pages. Each one reads its colours, type and corners from a brand contract, so one switch re-skins them all.</p>
        <div className="hero__actions">
          <a href="/docs/installation/" className="solid-button">Get started</a>
          <a href="/docs/" className="ghost-button">Browse components</a>
          <a href="/examples/camera/" className="ghost-button">See a full page</a>
        </div>
        <p className="hero__hint">Same markup on each card. Click a card behind, or pick a brand in the header, to bring it forward.</p>
      </div>
      <HeroSpecimens />
    </section>
    <IntroFilm />
    <section className="showcase" aria-label="Live examples">
      {showcase.map((name) => {
        const Demo = registry[name];
        const entry = catalog.find((item) => item.slug === name.split('/')[0])!;
        return <figure key={name} className="showcase__card" data-wide={wide.has(name) || undefined}>
          <DemoTheme className="showcase__stage"><Demo /></DemoTheme>
          <figcaption><a href={componentHref(entry.slug)}>{entry.title}</a></figcaption>
        </figure>;
      })}
    </section>
  </main>;
}
