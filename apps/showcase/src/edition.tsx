import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ActionLink } from '@brand-studio/ui';
import { startStage } from './edition-stage';
import type { Scene } from './edition-stage';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import './edition.css';

interface Plate {
  id: string; numeral: string; word: string; voice: string; body: string; layout: 'left' | 'wide' | 'right';
  name: string; alt: string; detailAlt: string;
  credit: { who: string; title: string; date: string; museum: string; href: string };
}

const plates: Plate[] = [
  { id: 'gift', numeral: 'I', word: 'Gift', layout: 'left', name: 'mantegna',
    voice: 'The eldest king holds a porcelain cup full of gold coins.',
    body: 'The Getty catalogue calls it a rare Chinese cup of delicate porcelain. Mantegna painted it around 1500.',
    alt: 'Mantegna, Adoration of the Magi. Three kings bring gifts to the Christ Child; the eldest holds a blue-and-white porcelain cup.',
    detailAlt: 'Detail: the blue-and-white porcelain cup in the eldest king’s hand.',
    credit: { who: 'Andrea Mantegna', title: 'Adoration of the Magi', date: 'about 1500', museum: 'J. Paul Getty Museum, Open Content', href: 'https://www.getty.edu/art/collection/object/103RHD' } },
  { id: 'feast', numeral: 'II', word: 'Feast', layout: 'wide', name: 'bellini',
    voice: 'A nymph holds out a blue-and-white bowl at the feast.',
    body: 'Giovanni Bellini began the picture and Titian finished it. The National Gallery of Art dates it 1514/1529.',
    alt: 'Bellini and Titian, The Feast of the Gods. Gods and nymphs picnic in a wooded landscape, carrying blue-and-white bowls.',
    detailAlt: 'Detail: a nymph holds out a blue-and-white bowl.',
    credit: { who: 'Giovanni Bellini and Titian', title: 'The Feast of the Gods', date: '1514/1529', museum: 'National Gallery of Art, Washington, public domain', href: 'https://www.nga.gov/artworks/1138-feast-gods' } },
  { id: 'still', numeral: 'III', word: 'Still', layout: 'right', name: 'kalf',
    voice: 'Kalf put a peeled lemon beside a Wanli bowl of fruit.',
    body: 'Wanli bowls take their name from the Chinese reign of 1573 to 1620. Kalf painted this one in 1659.',
    alt: 'Kalf, Still Life with Fruit, Glassware, and a Wanli Bowl. A blue-and-white bowl of fruit and a glass of wine on a dark table.',
    detailAlt: 'Detail: the blue-and-white Wanli bowl with a peeled lemon.',
    credit: { who: 'Willem Kalf', title: 'Still Life with Fruit, Glassware, and a Wanli Bowl', date: '1659', museum: 'The Metropolitan Museum of Art, Open Access', href: 'https://www.metmuseum.org/art/collection/search/436805' } },
];
const chapters = [...plates.map(p => ({ id: p.id, numeral: p.numeral, word: p.word })), { id: 'now', numeral: 'IV', word: 'Now' }];

/** One scene per stage section: the hero, then each plate. The hero and plate I share Mantegna; the camera moves in between them. */
const scenes = (px: number): Scene[] => [
  { src: `/images/edition/mantegna-${px}.webp`, position: [0.62, 1], focus: [0.548, 0.88], zoom: [1, 1.12], light: 'gold', shade: 'left' },
  { src: `/images/edition/mantegna-${px}.webp`, position: [0.62, 1], focus: [0.548, 0.88], zoom: [1.9, 2.4], light: 'gold', shade: 'left' },
  { src: `/images/edition/bellini-${px}.webp`, position: [0.5, 0.6], focus: [0.52, 0.53], zoom: [1.05, 1.35], light: 'dapple', shade: 'bottom' },
  { src: `/images/edition/kalf-${px}.webp`, position: [0.5, 0.6], focus: [0.4, 0.71], zoom: [1.05, 1.4], light: 'flicker', shade: 'right' },
];

/** A torn paper edge: a jagged top line, then straight down the sides. */
function tornEdge(seed: number) {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const points = Array.from({ length: 41 }, (_, i) => `${i * 2.5}% ${(rand() * 70).toFixed(1)}%`);
  return { '--torn': `polygon(${points.join(', ')}, 100% 100%, 0% 100%)` } as CSSProperties;
}

/** The giant chapter word, one span per letter so each can rise on its own. */
function ChapterWord({ id, numeral, word }: { id: string; numeral: string; word: string }) {
  return <h2 id={id} className="ed-word" aria-label={`${numeral}. ${word}`}>
    <span className="ed-word__numeral" aria-hidden="true">{numeral}</span>
    {[...word].map((letter, i) => <span key={i} className="ed-letter" style={{ '--i': i } as CSSProperties} aria-hidden="true">{letter}</span>)}
  </h2>;
}

export function Edition() {
  const [current, setCurrent] = useState('');
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) setCurrent(entry.target.id); }), { rootMargin: '-45% 0px -50% 0px' });
    chapters.forEach(({ id }) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sections = [...document.querySelectorAll<HTMLElement>('[data-scene]')];
    const px = Math.min(devicePixelRatio || 1, 2) * innerWidth > 1200 ? 2000 : 1000;
    return startStage(canvas, sections, scenes(px), { paused: () => pausedRef.current, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches });
  }, []);

  return <>
    <main id="main" tabIndex={-1} className="ed" data-paused={paused || undefined}>
      <div className="ed-world">
        <div className="ed-stage" aria-hidden="true"><canvas ref={canvasRef} /></div>

        <section className="ed-hero" data-scene aria-labelledby="ed-title">
          <div className="ed-hero__copy">
            <h1 id="ed-title">{'Blue-and-white porcelain in three paintings'.split(' ').map((word, i) => <span key={i} className="ed-hw" style={{ '--i': i } as CSSProperties}>{word} </span>)}</h1>
            <p className="ed-voice">Still’s cup is cobalt blue. Mantegna, Bellini and Kalf each painted a blue-and-white porcelain cup or bowl between 1500 and 1659.</p>
            <ActionLink href="#gift" shape="pill">See the paintings</ActionLink>
          </div>
          <p className="bs-sr-only">Mantegna, Adoration of the Magi, about 1500. The eldest king offers a blue-and-white porcelain cup.</p>
        </section>

        <nav className="ed-rail" aria-label="Chapters">
          <ol>{chapters.map(c => <li key={c.id}><a href={`#${c.id}`} aria-current={current === c.id ? 'true' : undefined}><span className="ed-rail__numeral">{c.numeral}</span><span className="ed-rail__word">{c.word}</span></a></li>)}</ol>
        </nav>

        {plates.map(plate => <section key={plate.id} id={plate.id} data-scene className={`ed-plate ed-plate--${plate.layout}`} aria-labelledby={`${plate.id}-title`}>
          <div className="ed-pin">
            <ChapterWord id={`${plate.id}-title`} numeral={plate.numeral} word={plate.word} />
            <div className="ed-plate__text">
              <p className="ed-voice ed-voice--initial">{plate.voice}</p>
              <p className="ed-plate__body">{plate.body}</p>
            </div>
            <figure className="ed-plate__figure">
              <p className="bs-sr-only">{plate.alt}</p>
              <div className="ed-loupe"><img src={`/images/edition/${plate.name}-detail.webp`} width={900} height={900} alt={plate.detailAlt} loading="lazy" decoding="async" /></div>
              <figcaption><a href={plate.credit.href}>{plate.credit.who}, <cite>{plate.credit.title}</cite>, {plate.credit.date}</a>. {plate.credit.museum}.</figcaption>
            </figure>
          </div>
        </section>)}
      </div>

      <section id="now" className="ed-now" style={tornEdge(29)} aria-labelledby="now-title">
        <ChapterWord id="now-title" numeral="IV" word="Now" />
        <figure className="ed-now__figure">
          <div className="ed-now__frame">
            <img src="/images/cup.webp" srcSet="/images/cup-768.webp 768w, /images/cup.webp 1536w" sizes="(min-width: 1024px) 60vw, 100vw" width={1536} height={1024} alt="Still’s cobalt ceramic cup of espresso on a brushed steel counter in morning light." loading="lazy" decoding="async" />
            <img className="ed-now__past" src="/images/edition/mantegna-detail.webp" width={900} height={900} alt="" loading="lazy" decoding="async" />
            <span className="ed-steam" aria-hidden="true"><i /><i /><i /></span>
          </div>
          <figcaption>Still concept image, generated for this fictional brand study.</figcaption>
        </figure>
        <div className="ed-now__text">
          <p className="ed-voice ed-voice--initial">This is Still’s cup, with an espresso on a steel counter.</p>
          <p className="ed-plate__body">As you scroll, Mantegna’s cup fades into it.</p>
        </div>
      </section>

      <section className="ed-finish" aria-labelledby="ed-finish-title">
        <h2 id="ed-finish-title">See how Still serves coffee</h2>
        <ActionLink href="/coffee" tone="inverse" shape="pill">Go to the coffee page</ActionLink>
      </section>
    </main>
    <button type="button" className="ed-pause" onClick={() => setPaused(p => !p)}>{paused ? 'Play motion' : 'Pause motion'}</button>
    <footer className="site-footer bs-container ed-footer"><a href="/coffee">Still.</a><p>Still is a fictional brand study. Paintings are public domain, courtesy of the J. Paul Getty Museum, the National Gallery of Art and The Metropolitan Museum of Art. The chapter IV photograph is generated.</p><a href="/">Brand Studio</a></footer>
  </>;
}
