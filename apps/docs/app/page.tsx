import { AgentPromptButton } from '@/components/agent-prompt';
import { DemoTheme } from '@/components/demo-brand';
import { HeroSpecimens } from '@/components/hero-specimens';
import { HeroMascot } from '@/components/hero-mascot';
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
        <div className="hero__heading">
          <h1>Components that wear your brand.</h1>
          <HeroMascot />
        </div>
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
    <section className="asset-workflows" aria-labelledby="asset-workflows-title">
      <div className="asset-workflows__intro">
        <h2 id="asset-workflows-title">Create your brand assets.</h2>
        <p>The brand-design skill takes the same brand contract into character design, sticker-style artwork and icon exports.</p>
        <a href="/docs/asset-creation/" className="ghost-button">Explore asset creation</a>
      </div>
      <dl className="asset-workflows__list">
        <div><dt><a href="/docs/asset-creation/#mascots">Mascots</a></dt><dd>Define a character, build expression states and review SVG, PNG or optional 3D renders.</dd></div>
        <div><dt><a href="/docs/asset-creation/#sticker-style-artwork">Sticker-style artwork</a></dt><dd>Use the mascot workflow to make outlined character artwork with a consistent silhouette and palette.</dd></div>
        <div><dt><a href="/docs/asset-creation/#icons-and-app-icons">Icons and app icons</a></dt><dd>Check UI glyphs and export sprites, favicons and app icons for web, iOS and Android.</dd></div>
      </dl>
      <figure className="asset-workflows__sheet">
        <img src="/images/mascot/deskhand-contact-sheet.webp" alt="Contact sheet of Deskhand, an ink-black character with a yellow visor, in eight states: welcome, reading, drafting, waiting, sent, missing source, handoff and idle. Each state repeats at three small sizes." width={1384} height={983} loading="lazy" />
        <figcaption>The mascot workflow’s contact sheet for Deskhand, an example product: eight expression states, each checked at small sizes. The <a href="https://github.com/hungduong-projects/brand-studio/blob/main/examples/deskhand/mascot/out/contact-sheet.png">full sheet</a> also reviews dark backgrounds, greyscale and blur.</figcaption>
      </figure>
    </section>
  </main>;
}
