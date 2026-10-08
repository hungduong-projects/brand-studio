import { VoiceOrb } from '@brand-studio/ui';
import { AgentPromptButton } from '@/components/agent-prompt';
import { BrandBoard } from '@/components/brand-board';
import { CopyButton } from '@/components/copy-button';
import { IntroFilm } from '@/components/intro-film';
import { catalog } from '@/lib/catalog';

export default function Home() {
  return <main id="main" tabIndex={-1} className="home">
    <section className="hero">
      <div className="hero__title">
        <div className="hero__badges">
          <a className="hero__badge" href="https://www.npmjs.com/package/@brand-studio/ui"><span aria-hidden="true" />@brand-studio/ui on npm</a>
          <AgentPromptButton />
        </div>
        <h1>Components that wear your brand.</h1>
      </div>
      <div className="hero__aside">
        {/* Decoration: the lead below says the same thing in words. */}
        <div className="hero-orb" aria-hidden="true"><VoiceOrb state="thinking" shape="network" size={96} label="Reading brand.json" /></div>
        <p className="hero__lead">{catalog.length} React components for apps, AI agents and story pages. Each one reads its colours, typeface and corners from a brand contract.</p>
        <div className="hero__actions">
          <a href="/docs/installation/" className="solid-button">Read the install steps</a>
          <span className="hero__install"><code>npm i @brand-studio/ui</code><CopyButton text="npm i @brand-studio/ui" label="Copy the install command" /></span>
        </div>
        <p className="hero__links"><a href="/docs/">Browse all {catalog.length} components</a><a href="/examples/camera/">See a full product page</a></p>
      </div>
    </section>
    <BrandBoard />
    <IntroFilm />
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
