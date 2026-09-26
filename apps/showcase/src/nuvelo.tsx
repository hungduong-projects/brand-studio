import { useEffect, useRef, useState } from 'react';
import { ActionLink, KeyFigures } from '@brand-studio/ui';
import '@fontsource-variable/geist';
import './nuvelo.css';
import { paintBank, paintSky } from './nuvelo-clouds';
import { startShoe } from './nuvelo-shoe';
import { at, SITE } from './paths';

const links = ['New releases', 'Men', 'Women', 'Kids', 'Customise'];

/** The Nuvelo mark: a cloud outline resting on a line. */
const Mark = () => <svg viewBox="0 0 40 24" width="40" height="24" aria-hidden="true">
  <path d="M8 18a6 6 0 0 1 1.5-11.8A8 8 0 0 1 24.8 5 6.5 6.5 0 0 1 32 18Z" fill="currentColor" />
  <rect x="4" y="20" width="32" height="2.4" rx="1.2" fill="currentColor" />
</svg>;

const icon = (d: string) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d={d} /></svg>;

export function Nuvelo() {
  const sky = useRef<HTMLCanvasElement>(null), bank = useRef<HTMLCanvasElement>(null), shoe = useRef<HTMLDivElement>(null);
  const [reduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playing, setPlaying] = useState(!reduced);
  const [ready, setReady] = useState(false);
  const stage = useRef<ReturnType<typeof startShoe>>(null);

  useEffect(() => {
    const paint = () => { paintSky(sky.current!); paintBank(bank.current!); };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(sky.current!);
    stage.current = startShoe(shoe.current!, { reduced, onReady: () => setReady(true) });
    return () => { observer.disconnect(); stage.current?.stop(); };
  }, [reduced]);

  useEffect(() => { stage.current?.setPlaying(playing); }, [playing]);

  return <div className="nv">
    <header className="nv-bar">
      <a className="nv-mark" href="#hero" aria-label="Nuvelo home"><Mark /></a>
      <nav aria-label="Shop"><ul>{links.map(label => <li key={label}><a href="#specs">{label}</a></li>)}</ul></nav>
      <div className="nv-tools">
        <a href="#specs" aria-label="Account">{icon('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0')}</a>
        <a href="#specs" aria-label="Bag, 1 item" className="nv-bag">{icon('M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2')}<span aria-hidden="true">1</span></a>
      </div>
    </header>

    <main id="main">
      <section id="hero" className="nv-hero" data-ready={ready || undefined} aria-labelledby="hero-title">
        <canvas ref={sky} className="nv-sky" aria-hidden="true" />
        <p className="nv-kind">Essential running shoe</p>
        <h1 id="hero-title" className="nv-word"><span className="nv-brand">Nuvelo</span> Drift</h1>
        <canvas ref={bank} className="nv-bank" aria-hidden="true" />
        <svg className="nv-orbit" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="10" rx="49.6" ry="9.6" /></svg>
        <div ref={shoe} className="nv-shoe" role="img" aria-label="The Nuvelo Drift, a pink running shoe with sky-blue laces, floating over pink clouds." />
        <p className="nv-line">Nuvelo Drift. 38 mm of foam under the heel, 240 g in a UK 8.</p>
        <ActionLink className="nv-cta" href="#specs" shape="pill">See the specs</ActionLink>
        <button type="button" className="nv-play" onClick={() => setPlaying(value => !value)}>
          <span className="nv-sr">{playing ? 'Pause motion' : 'Play motion'}</span>
          {playing
            ? <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="4" y="3" width="3" height="10" rx="1" /><rect x="9" y="3" width="3" height="10" rx="1" /></svg>
            : <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5Z" /></svg>}
        </button>
      </section>

      <section id="specs" className="nv-specs" aria-labelledby="specs-title">
        <h2 id="specs-title">Nuvelo Drift in numbers</h2>
        <KeyFigures label="Nuvelo Drift specs" items={[
          { lead: 'Heel foam', value: '38', unit: 'mm', detail: 'Two layers: firm pink over soft white.' },
          { lead: 'Heel to toe drop', value: '8', unit: 'mm', detail: '30 mm of foam under the forefoot.' },
          { lead: 'Weight', value: '240', unit: 'g', detail: 'One shoe, UK size 8.' },
          { lead: 'Price', value: '$150', detail: 'Pink and sky blue, UK 3 to 13.' },
        ]} />
      </section>
    </main>

    <footer className="nv-foot">
      <p>Nuvelo is a fictional brand. The specs and price are made up for a Brand Studio showcase, and nothing here is for sale. Shoe model: Materials Variants Shoe © 2021 Shopify, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, from the Khronos glTF sample assets, with marks removed and recoloured. Clouds drawn in code.</p>
      <p><a href={SITE}>Brand Studio</a> · <a href={at('/')}>Editions</a> · <a href={at('camera/')}>Halden</a></p>
    </footer>
  </div>;
}
