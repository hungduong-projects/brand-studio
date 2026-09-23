import { useEffect, useRef, useState } from 'react';
import { ActionLink, BrandTheme, Button, CardCarousel, FooterDirectory, HighlightsGallery, KeyFigures, ModelCompare, ProductBar, ProductViewer, SiteBar, ToastProvider, useToast } from '@brand-studio/ui';
import brand from './halden.brand.json';
import { startHalden } from './halden-stage';
import type { Part, Pose } from './halden-stage';
import '@fontsource-variable/geist';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import './halden.css';

/** One pose per [data-shot] section, in page order. */
const poses: Pose[] = [
  { yaw: -0.5, pitch: 0.18, explode: 0, distance: 5.6, x: 0, y: 0.3 },
  { yaw: -0.55, pitch: 0.2, explode: 0, distance: 5.4, x: 0.35, y: -0.05 },
  { yaw: -0.9, pitch: 0.32, explode: 1, distance: 7.6, x: 0.55, y: -0.3 },
  { yaw: -0.15, pitch: 0.06, explode: 0, distance: 3.9, x: 0.5, y: 0.05 },
  { yaw: 0.35, pitch: 0.95, explode: 0, distance: 4.4, x: -0.45, y: 0 },
  { yaw: 2.3, pitch: 0.2, explode: 0, distance: 5.2, x: 0.7, y: 0 },
  { yaw: -0.6, pitch: 0.25, explode: 0, distance: 5.8, x: 0, y: 0.1 },
];

const labels: { part: Part; name: string; note: string }[] = [
  { part: 'body', name: 'Body', note: 'Brass top plate under black paint' },
  { part: 'barrel', name: 'Lens barrel', note: '50 mm, brass helicoid' },
  { part: 'glass', name: 'Glass', note: 'Seven elements, coated' },
  { part: 'strap', name: 'Strap', note: 'Full-grain leather, 110 cm' },
];

const still = (name: string, alt: string) => <img src={`/images/halden/${name}.webp`} alt={alt} width={2400} height={1350} loading="lazy" decoding="async" />;

const highlights = [
  { media: still('three', 'The Halden R from the front left, black paint worn to brass at the edges.'), caption: <><strong>Worn to brass.</strong> The paint gives way where your hands go.</> },
  { media: still('top', 'The top plate from above, with the shutter dial, film advance and rewind crank.'), caption: <><strong>Every control on top.</strong> Shutter, advance and rewind. Nothing hides in a menu.</> },
  { media: still('apart', 'The camera taken apart: body, lens barrel and the seven glass elements in a row.'), caption: <><strong>Comes apart for service.</strong> The lens leaves the body in one turn.</> },
  { media: still('strap', 'The camera with its brown leather strap looped beside it.'), caption: <><strong>Leather strap included.</strong> Full grain, 110 cm, softens with use.</> },
];

const viewer = [
  { value: 'front', label: 'Front', media: still('front', 'The Halden R seen straight from the front.'), caption: 'Rangefinder windows on the left, frame-line window on the right.' },
  { value: 'top', label: 'Top', media: still('top', 'The Halden R seen from above.'), caption: 'Shutter dial, advance lever and rewind crank.' },
  { value: 'back', label: 'Back', media: still('back', 'The back of the Halden R, with the viewfinder and film door.'), caption: 'A bright finder and a door you open with one coin.' },
  { value: 'side', label: 'Side', media: still('side', 'The Halden R from the side, the lens pointing left.'), caption: 'The 50 mm lens adds 42 mm to the body.' },
  { value: 'lens', label: 'Lens', media: still('lens', 'A close view of the lens and its focus scale.'), caption: 'Distance and depth-of-field scales, engraved and filled.' },
];

const kits = [
  { name: 'Halden R body', media: still('front-square', 'The Halden R body.'), summary: 'Bring your own lens.', price: '$1,080', action: <ActionLink href="#buy" shape="pill">Buy</ActionLink> },
  { name: 'Halden R 50 mm kit', media: still('three-square', 'The Halden R with the 50 mm lens.'), badge: 'Most chosen', summary: 'Body, 50 mm ƒ/1.4 lens and strap.', price: '$1,480', current: true },
  { name: 'Halden R 35 mm kit', media: still('side-square', 'The Halden R with a lens from the side.'), summary: 'Body, 35 mm ƒ/2 lens and strap.', price: '$1,420', action: <ActionLink href="#buy" shape="pill">Buy</ActionLink> },
];

const kitRows = [
  { label: 'Lens', values: [null, '50 mm ƒ/1.4', '35 mm ƒ/2'] },
  { label: 'Closest focus', values: [null, '0.7 m', '0.5 m'] },
  { label: 'Strap', values: [null, 'Leather, 110 cm', 'Leather, 110 cm'] },
  { label: 'Shutter', values: ['1 s to 1/1000 s', '1 s to 1/1000 s', '1 s to 1/1000 s'] },
  { label: 'Weight', values: ['590 g', '820 g', '760 g'] },
];

const guides = [
  { eyebrow: 'Guide', title: 'Loading film without looking.', body: 'Three steps you learn once.', media: still('back-square', 'The back of the camera, where the film door opens.'), href: '#specs' },
  { eyebrow: 'Guide', title: 'Sunny 16 in one page.', body: 'Set exposure with no meter at all.', media: still('top-square', 'The shutter dial on the top plate.'), href: '#specs' },
  { eyebrow: 'Service', title: 'Every part has a price.', body: 'Order a single screw or a new shutter.', media: still('apart-square', 'The camera taken apart into its parts.'), href: '#specs' },
  { eyebrow: 'Service', title: 'Clean, lube, adjust.', body: 'Send it in every ten years. We return it in three weeks.', media: still('side-square', 'The camera from the side.'), href: '#specs' },
  { eyebrow: 'Film', title: 'Which film to start with.', body: 'Two colour stocks and one black and white.', media: still('three-square', 'The camera from the front left.'), href: '#specs' },
];

const menu = (products: string[]) => [
  { label: `Explore ${products[0].split(' ')[0]}`, links: products.map(name => ({ label: name, href: '#hero' })) },
  { label: 'Shop', links: [{ label: 'Buy a camera', href: '#buy' }, { label: 'Compare kits', href: '#compare' }, { label: 'Straps and cases', href: '#buy' }] },
  { label: 'More', links: [{ label: 'Service', href: '#buy' }, { label: 'Guides', href: '#guides' }] },
];

const siteItems = [
  { label: 'Cameras', href: '#hero', current: true, menu: menu(['Halden R', 'Halden R Black Paint', 'Halden S']) },
  { label: 'Lenses', href: '#look', menu: menu(['Lenses 35 mm ƒ/2', 'Lenses 50 mm ƒ/1.4', 'Lenses 90 mm ƒ/2.8']) },
  { label: 'Film', href: '#guides' },
  { label: 'Service', href: '#buy' },
  { label: 'Support', href: '#specs' },
];

const specs: [string, string][] = [
  ['Type', '35 mm rangefinder, fully mechanical'],
  ['Lens', 'Halden 50 mm ƒ/1.4, seven elements in five groups'],
  ['Aperture', 'ƒ/1.4 to ƒ/16, half stops'],
  ['Focus', '0.7 m to infinity, rangefinder patch'],
  ['Shutter', 'Cloth focal plane, 1 s to 1/1000 s and B'],
  ['Flash sync', '1/50 s'],
  ['Viewfinder', '0.72×, frame lines for 35, 50 and 90 mm'],
  ['Metering', 'None. Use the sunny 16 rule or a hand meter'],
  ['Battery', 'None'],
  ['Weight', '590 g body, 820 g with lens'],
  ['Size', '138 × 80 × 42 mm'],
  ['Service', 'Every part has a number and a price'],
];

function BuyButton() {
  const toast = useToast();
  return <Button onClick={() => toast.add({ title: 'Nothing is for sale', description: 'Halden is a fictional brand made to study a product page.' })}>Buy</Button>;
}

export function Halden() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLOListElement>(null);
  const [current, setCurrent] = useState('hero');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) setCurrent((entry.target as HTMLElement).id);
    }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.hd > section, .hd-paper > section').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sections = [...document.querySelectorAll<HTMLElement>('.hd [data-shot]')];
    return startHalden(canvas, sections, poses, {
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      spin: () => 0,
      onReady: () => setLoaded(true),
      onParts: parts => {
        const list = labelsRef.current;
        if (!list) return;
        for (const item of list.children as HTMLCollectionOf<HTMLElement>) {
          const point = parts[item.dataset.part as Part];
          item.style.setProperty('--x', `${point.x.toFixed(1)}px`);
          item.style.setProperty('--y', `${point.y.toFixed(1)}px`);
        }
      },
    });
  }, []);

  return <ToastProvider>
    <SiteBar className="hd-sitebar" label="Halden" brand={<a href="/camera" className="hd-mark">Halden</a>} items={siteItems}
      actions={<a className="hd-sitebar__link" href="/">Editions</a>} />
    <ProductBar className="hd-productbar" title="Halden R" href="#hero" label="Halden R"
      items={[{ label: 'Overview', href: '#hero', current: current !== 'specs' }, { label: 'Parts', href: '#parts' }, { label: 'Compare', href: '#compare' }, { label: 'Tech specs', href: '#specs', current: current === 'specs' }]}
      action={<ActionLink href="#buy" shape="pill">Buy</ActionLink>} />
    <main id="main" tabIndex={-1} className="hd" data-current={current} data-loaded={loaded || undefined}>
      <div className="hd-stage" aria-hidden="true"><canvas ref={canvasRef} /></div>
      <ol ref={labelsRef} className="hd-labels" aria-hidden="true">
        {labels.map(label => <li key={label.part} data-part={label.part}><strong>{label.name}</strong><span>{label.note}</span></li>)}
      </ol>

      <section id="hero" data-shot className="hd-hero" aria-labelledby="hd-title">
        <div className="hd-hero__name">
          <p className="hd-engraved">New</p>
          <h1 id="hd-title">Halden R</h1>
          <p className="hd-hero__line">Worn in. Never worn out.</p>
        </div>
        <div className="hd-hero__buy"><span>From $1,480</span><ActionLink href="#buy" shape="pill">Buy</ActionLink></div>
      </section>

      <section id="highlights" className="hd-solid" aria-labelledby="highlights-title">
        <h2 id="highlights-title" className="hd-title">Get the highlights.</h2>
        <HighlightsGallery className="hd-highlights" label="Highlights" items={highlights} />
      </section>

      <section id="statement" className="hd-solid hd-statement" aria-labelledby="statement-title">
        <p className="hd-engraved">Fully mechanical</p>
        <h2 id="statement-title">No screen. No battery. <span>Nothing to update.</span></h2>
      </section>

      <section id="keep" data-shot className="hd-chapter hd-chapter--left" aria-labelledby="keep-title">
        <div className="hd-copy">
          <h2 id="keep-title">A camera you keep for thirty years.</h2>
          <p>Metal body, mechanical shutter, a lens you can service. Nothing in it needs a charger.</p>
        </div>
      </section>

      <section id="parts" data-shot className="hd-chapter hd-chapter--left hd-chapter--tall" aria-labelledby="parts-title">
        <div className="hd-copy">
          <p className="hd-engraved">Design</p>
          <h2 id="parts-title">Four parts. Each one replaceable.</h2>
          <ul className="hd-parts">{labels.map(label => <li key={label.part}><strong>{label.name}</strong> {label.note}.</li>)}</ul>
        </div>
      </section>

      <section id="focus" data-shot className="hd-chapter hd-chapter--left" aria-labelledby="focus-title">
        <div className="hd-copy">
          <p className="hd-engraved">Rangefinder</p>
          <h2 id="focus-title">Line up two images. That is focus.</h2>
          <p>Turn the lens until the bright patch in the finder sits on your subject. It works in low light, and it never hunts.</p>
          <ul className="hd-cards">
            <li><strong>35, 50, 90</strong>Frame lines for three lenses.</li>
            <li><strong>0.7 m</strong>Closest focus.</li>
            <li><strong>Half stops</strong>From ƒ/1.4 to ƒ/16.</li>
          </ul>
        </div>
      </section>

      <section id="shutter" data-shot className="hd-chapter hd-chapter--right" aria-labelledby="shutter-title">
        <div className="hd-copy">
          <p className="hd-engraved">Shutter</p>
          <h2 id="shutter-title">No battery. No menu. One dial.</h2>
          <p>Every speed is set by a spring and a gear. Cold, heat and a flat battery change nothing.</p>
          <ul className="hd-cards">
            <li><strong>1 s to 1/1000 s</strong>Plus B for long exposures.</li>
            <li><strong>Cloth curtain</strong>Quiet enough for a church.</li>
            <li><strong>1/50 s</strong>Flash sync.</li>
          </ul>
        </div>
      </section>

      <section id="wear" data-shot className="hd-chapter hd-chapter--left" aria-labelledby="wear-title">
        <div className="hd-copy">
          <p className="hd-engraved">Materials</p>
          <h2 id="wear-title">The paint wears through to brass. That is the point.</h2>
          <p>Each mark shows where your hands go. There is no version that stays new.</p>
        </div>
      </section>

      <section id="look" className="hd-solid" aria-labelledby="look-title">
        <ProductViewer className="hd-viewer" title={<span id="look-title">Take a closer look.</span>} label="Views" items={viewer} />
      </section>

      <section id="numbers" className="hd-solid" aria-labelledby="numbers-title">
        <h2 id="numbers-title" className="hd-title">Built to be measured.</h2>
        <KeyFigures className="hd-figures" label="Halden R in numbers" items={[
          { lead: 'Lens up to', value: 'ƒ/1.4', detail: 'Enough light for a room lit by one lamp.' },
          { lead: 'Shutter up to', value: '1/1000', unit: 's', detail: 'Set by a spring and a gear.' },
          { lead: 'Batteries', value: '0', detail: 'Cold, heat and a flat battery change nothing.' },
          { lead: 'Weight', value: '820', unit: 'g', detail: 'Body and 50 mm lens together.' },
        ]} />
      </section>

      <section id="compare" className="hd-solid">
        <ModelCompare className="hd-compare" title="Which Halden R is right for you?" models={kits} rows={kitRows} />
      </section>

      <section id="guides" className="hd-solid">
        <CardCarousel className="hd-guides" title="Keep it running." label="Guides and service" cards={guides} />
      </section>

      <BrandTheme palette={brand.tokens} mode="light" className="hd-paper">
      <section id="specs" className="hd-specs" aria-labelledby="specs-title">
        <h2 id="specs-title">Tech specs</h2>
        <dl>{specs.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
      </section>

      <section id="buy" className="hd-buy" aria-labelledby="buy-title">
        <h2 id="buy-title">Halden R</h2>
        <p>From $1,480, with the 50 mm lens and strap.</p>
        <BuyButton />
      </section>
      <FooterDirectory className="hd-directory"
        notes={['Halden is a fictional brand. The product, prices and specs are made up to study a product page.', '3D model: Camera 01 by Rajil Jose Macatangay. Lighting: Studio Small 09 by Sergej Majboroda. Both from Poly Haven, CC0.']}
        breadcrumbs={[{ label: 'Halden', href: '/camera' }, { label: 'Cameras', href: '#hero' }, { label: 'Halden R', href: '#hero' }]}
        columns={[
          { title: 'Cameras', links: [{ label: 'Halden R', href: '#hero' }, { label: 'Compare kits', href: '#compare' }, { label: 'Tech specs', href: '#specs' }] },
          { title: 'Service', links: [{ label: 'Guides', href: '#guides' }, { label: 'Buy', href: '#buy' }] },
          { title: 'Brand Studio', links: [{ label: 'Editions', href: '/' }, { label: 'Deskhand', href: '/deskhand' }] },
        ]}
        legal={<p>A Brand Studio showcase. Nothing here is for sale.</p>} />
      </BrandTheme>
    </main>
  </ToastProvider>;
}
