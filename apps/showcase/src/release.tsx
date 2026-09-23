import { Fragment, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  ActionLink, AgentThinking, Alert, ApprovalCard, Badge, BorderBeam, Button, Card, Checkbox, ClickSpark, DataTable, Dialog, DialogClose,
  DropdownMenu, EmptyState, FlipText, Header, MagnetTabs, MetalButton, MobileNavigation, ParallaxGallery, ScrollTextReveal, Select, Sidebar,
  StoryCover, StoryHeader,
  Skeleton, Spinner, StatCard, StreamingText, Switch, Tabs, TaskRows, Textarea, TextField, ThinkingTrace, ToastProvider, ToolChips, useToast,
} from '@brand-studio/ui';
import type { ApprovalStatus, ImageAsset, TableColumn } from '@brand-studio/ui';
import { catalog } from '../../docs/lib/catalog';
import { startStage } from './stage';
import type { Scene } from './stage';
import '@fontsource-variable/geist';
import '@fontsource/geist-mono/400.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './release.css';

const DOCS = 'https://brand-studio-c7e.pages.dev/docs/';
const docs = (slug: string) => `${DOCS}components/${slug}/`;
const NEW = new Set(['textarea', 'checkbox', 'dropdown-menu', 'alert', 'empty-state', 'skeleton', 'spinner', 'header', 'sidebar', 'mobile-navigation', 'data-table', 'stat-card']);

interface Credit { who: string; title: string; date: string; museum: string; href: string }
interface Demo { slug: string; node: ReactNode; wide?: boolean }
interface Chapter {
  id: string; numeral: string; word: string; title: string; body: string; side: 'left' | 'right';
  prop: ReactNode; propSlug: string; credit: Credit; demos: Demo[];
}

const met = (id: number) => `https://www.metmuseum.org/art/collection/search/${id}`;
const hero: Credit = { who: 'Giovanni Bellini and Titian', title: 'The Feast of the Gods', date: '1514/1529', museum: 'National Gallery of Art, Washington', href: 'https://www.nga.gov/artworks/1138-feast-gods' };

/** One scene per [data-scene] section: the hero, then each chapter. */
const scenes = (px: number): Scene[] => [
  { src: `/images/release/bellini-${px}.webp`, position: [0.5, 0.62], focus: [0.52, 0.55], zoom: [1, 1.12], light: 'dapple', shade: 'left' },
  { src: `/images/release/fragonard-${px}.webp`, position: [0.5, 0.28], focus: [0.36, 0.3], anchor: [0.2, 0.36], zoom: [1, 1.3], light: 'gold', shade: 'right' },
  { src: `/images/release/pickenoy-${px}.webp`, position: [0.5, 0.3], focus: [0.8, 0.72], anchor: [0.62, 0.6], zoom: [1, 1.5], light: 'gold', shade: 'left' },
  { src: `/images/release/botticelli-${px}.webp`, position: [0.5, 0.5], focus: [0.6, 0.5], anchor: [0.61, 0.44], zoom: [1, 1.15], light: 'gold', shade: 'bottom' },
  { src: `/images/release/christus-${px}.webp`, position: [0.5, 0.3], focus: [0.57, 0.78], anchor: [0.3, 0.8], zoom: [1, 1.25], light: 'flicker', shade: 'right' },
  { src: `/images/release/elgreco-${px}.webp`, position: [0.5, 0.3], focus: [0.5, 0.28], anchor: [0.16, 0.5], zoom: [1, 1.15], light: 'flicker', shade: 'right' },
  { src: `/images/release/kalf-${px}.webp`, position: [0.5, 0.62], focus: [0.4, 0.7], anchor: [0.64, 0.5], zoom: [1, 1.35], light: 'flicker', shade: 'right' },
  { src: `/images/release/sassetta-${px}.webp`, position: [0.5, 0.5], focus: [0.66, 0.55], anchor: [0.3, 0.3], zoom: [1, 1.2], light: 'gold', shade: 'left' },
];

function ToastDemo() {
  const toast = useToast();
  return <Button onClick={() => toast.add({ title: 'Draft saved', description: 'You can close this page.' })}>Save draft</Button>;
}

function ApprovalDemo() {
  const [status, setStatus] = useState<ApprovalStatus>('pending');
  return <div className="rl-stack">
    <ApprovalCard title="Send the refund?" description="The agent wants to refund $84 to order #1042." detail="refund(order: 1042, amount: 84.00)" status={status} onApprove={() => setStatus('approved')} onReject={() => setStatus('rejected')} />
    {status !== 'pending' && <Button tone="secondary" onClick={() => setStatus('pending')}>Ask again</Button>}
  </div>;
}

function StreamDemo() {
  const [run, setRun] = useState(0);
  return <div className="rl-stack">
    <StreamingText key={run} text="Your order shipped on Tuesday. It should reach you by Friday, and the tracking link is in your email." />
    <Button tone="secondary" onClick={() => setRun(r => r + 1)}>Write it again</Button>
  </div>;
}

interface Order { id: string; customer: string; items: number; total: number }
const orders: Order[] = [
  { id: '#1042', customer: 'Ana Ruiz', items: 2, total: 184 },
  { id: '#1041', customer: 'Tom Becker', items: 1, total: 62 },
  { id: '#1040', customer: 'Mei Lin', items: 4, total: 315 },
  { id: '#1039', customer: 'Sam Okafor', items: 1, total: 48 },
];
const orderColumns: TableColumn<Order>[] = [
  { key: 'id', header: 'Order', sortValue: o => o.id },
  { key: 'customer', header: 'Customer', sortValue: o => o.customer },
  { key: 'items', header: 'Items', align: 'end', sortValue: o => o.items },
  { key: 'total', header: 'Total', align: 'end', sortValue: o => o.total, cell: o => `$${o.total}` },
];

// Portrait crops at one size, so the columns read as a set; the focal point keeps each painting's subject in frame.
const art = (name: string, height: number, focalPoint: string, alt: string): ImageAsset => ({ src: `/images/release/${name}-1000.webp`, alt, width: 1000, height, focalPoint });
const gallery: ImageAsset[] = [
  art('fragonard', 1237, '35% 30%', 'Fragonard, The Love Letter: a woman at a desk holds a letter.'),
  art('pickenoy', 1358, '50% 35%', 'Pickenoy, Man with a Celestial Globe: a man in a ruff rests a hand on a globe.'),
  art('botticelli', 604, '28% 50%', 'Botticelli, The Annunciation: an angel kneels before Mary.'),
  art('christus', 1169, '55% 45%', 'Petrus Christus, A Goldsmith in his Shop: a goldsmith weighs a ring for a couple.'),
  art('elgreco', 1213, '50% 30%', 'El Greco, Saint Jerome as Scholar: an old man in red reads a book.'),
  art('kalf', 1159, '40% 60%', 'Kalf, Still Life with Fruit, Glassware, and a Wanli Bowl.'),
];

const chapters: Chapter[] = [
  {
    id: 'act', numeral: 'I', word: 'Act', side: 'right', title: 'Take action',
    body: 'Buttons, text fields, selects, switches and menus. New in 0.2.0: Textarea, Checkbox and Dropdown Menu.',
    propSlug: 'textarea',
    prop: <form className="rl-prop__form" onSubmit={e => e.preventDefault()}><Textarea label="Reply" defaultValue="Thursday at four suits me." /><Button type="submit">Send reply</Button></form>,
    credit: { who: 'Jean Honoré Fragonard', title: 'The Love Letter', date: 'early 1770s', museum: 'The Metropolitan Museum of Art', href: met(436322) },
    demos: [
      { slug: 'button', node: <div className="rl-row"><Button>Save</Button><Button tone="secondary">Cancel</Button><Button loading>Saving</Button></div> },
      { slug: 'checkbox', node: <div className="rl-stack"><Checkbox label="Send me a copy" defaultChecked /><Checkbox label="Add a read receipt" /></div> },
      { slug: 'dropdown-menu', node: <DropdownMenu trigger={<Button tone="secondary">More actions</Button>} items={[{ label: 'Reply' }, { label: 'Forward' }, 'separator', { label: 'Archive' }]} /> },
      { slug: 'text-field', node: <TextField label="Email" type="email" placeholder="you@example.com" hint="We reply within a day." /> },
      { slug: 'select', node: <Select label="Paper" defaultValue="laid" options={[{ value: 'laid', label: 'Laid' }, { value: 'wove', label: 'Wove' }, { value: 'vellum', label: 'Vellum' }]} /> },
      { slug: 'switch', node: <Switch label="Read receipts" description="Tell the sender when you open it." defaultChecked /> },
    ],
  },
  {
    id: 'find', numeral: 'II', word: 'Find', side: 'left', title: 'Find your way',
    body: 'A header, a sidebar and a phone menu. Each one marks the page you are on. All three are new.',
    propSlug: 'sidebar',
    prop: <Sidebar label="Star atlas" header={<strong className="rl-prop__title">Star atlas</strong>} sections={[{ label: 'Sky', items: [{ label: 'Northern sky', href: '#north', current: true }, { label: 'Southern sky', href: '#south' }, { label: 'Constellations', href: '#constellations', badge: '48' }] }]} />,
    credit: { who: 'Nicolaes Eliasz Pickenoy', title: 'Man with a Celestial Globe', date: '1624', museum: 'The Metropolitan Museum of Art', href: met(437282) },
    demos: [
      { slug: 'header', wide: true, node: <Header brand={<strong>Atlas</strong>} items={[{ label: 'Charts', href: '#charts', current: true }, { label: 'Globes', href: '#globes' }, { label: 'Ledgers', href: '#ledgers' }]} actions={<Button tone="secondary">Sign in</Button>} /> },
      { slug: 'tabs', node: <Tabs aria-label="Sky" items={[{ value: 'north', label: 'North', content: <p>Polaris sits almost still above the pole.</p> }, { value: 'south', label: 'South', content: <p>The Southern Cross points toward the pole.</p> }]} /> },
      { slug: 'mobile-navigation', node: <MobileNavigation items={[{ label: 'Charts', href: '#charts', current: true }, { label: 'Globes', href: '#globes' }, { label: 'Ledgers', href: '#ledgers' }]} /> },
    ],
  },
  {
    id: 'know', numeral: 'III', word: 'Know', side: 'left', title: 'Know what happened',
    body: 'Alerts, toasts, skeletons and spinners, announced to screen readers. New: Alert, Empty State, Skeleton and Spinner.',
    propSlug: 'alert',
    prop: <Alert title="You have a new message" action={<Button tone="secondary">Open</Button>}>Sent a moment ago.</Alert>,
    credit: { who: 'Botticelli', title: 'The Annunciation', date: 'about 1490', museum: 'The Metropolitan Museum of Art', href: met(459016) },
    demos: [
      { slug: 'alert', node: <Alert tone="critical" title="Card declined">Try another card to finish the order.</Alert> },
      { slug: 'toast', node: <ToastDemo /> },
      { slug: 'dialog', node: <Dialog trigger={<Button tone="secondary">Delete draft</Button>} title="Delete this draft?" description="You cannot undo this."><div className="rl-row"><DialogClose><Button>Delete</Button></DialogClose><DialogClose><Button tone="secondary">Keep it</Button></DialogClose></div></Dialog> },
      { slug: 'skeleton', node: <Skeleton avatar lines={3} label="Loading the message" /> },
      { slug: 'spinner', node: <Spinner label="Sending" /> },
      { slug: 'empty-state', node: <EmptyState title="No messages yet" description="Messages you receive show up here." action={<Button>Write one</Button>} /> },
    ],
  },
  {
    id: 'read', numeral: 'IV', word: 'Read', side: 'right', title: 'Read the numbers',
    body: 'A table you can sort and a stat card that writes its trend in words. Both are new.',
    propSlug: 'stat-card',
    prop: <StatCard label="Rings sold this week" value="12" change="3 more than last week" trend="up" series={[4, 6, 5, 7, 9, 8, 12]} />,
    credit: { who: 'Petrus Christus', title: 'A Goldsmith in his Shop', date: '1449', museum: 'The Metropolitan Museum of Art', href: met(459052) },
    demos: [
      { slug: 'data-table', wide: true, node: <DataTable caption="Orders this week" columns={orderColumns} rows={orders} rowKey={o => o.id} /> },
      { slug: 'badge', node: <div className="rl-row"><Badge>Draft</Badge><Badge tone="accent">Paid</Badge><Badge tone="outline">Refunded</Badge></div> },
      { slug: 'card', node: <Card title="Order #1042" description="Two gold rings, shipped Tuesday." footer={<Button tone="secondary">View order</Button>} /> },
    ],
  },
  {
    id: 'agent', numeral: 'V', word: 'Agent', side: 'right', title: 'Work with an agent',
    body: 'Show what an AI agent is doing: its state, its steps and the tools it calls. Ask before it acts.',
    propSlug: 'task-rows',
    prop: <TaskRows title="Translation" tasks={[{ id: 'h', label: 'Read the Hebrew text', status: 'done' }, { id: 'g', label: 'Compare the Greek', status: 'active' }, { id: 'l', label: 'Write the Latin', status: 'pending' }]} />,
    credit: { who: 'El Greco', title: 'Saint Jerome as Scholar', date: 'about 1610', museum: 'The Metropolitan Museum of Art', href: met(459088) },
    demos: [
      { slug: 'approval-card', node: <ApprovalDemo /> },
      { slug: 'thinking-trace', node: <ThinkingTrace defaultOpen title="Checked the order" steps={[{ id: '1', title: 'Found order #1042', status: 'done' }, { id: '2', title: 'Read the refund policy', status: 'done' }, { id: '3', title: 'Drafting the reply', status: 'active' }]} /> },
      { slug: 'tool-chips', node: <ToolChips tools={[{ id: 'o', name: 'orders.get', status: 'done' }, { id: 'p', name: 'policy.search', status: 'done' }, { id: 'r', name: 'refund.create', status: 'running' }]} /> },
      { slug: 'streaming-text', node: <StreamDemo /> },
      { slug: 'agent-thinking', node: <div className="rl-row"><AgentThinking state="thinking" label="Thinking" /><AgentThinking state="speaking" label="Speaking" /></div> },
    ],
  },
  {
    id: 'brand', numeral: 'VI', word: 'Brand', side: 'right', title: 'Show the brand',
    body: 'Effects for one brand moment per page: a light around a card, a metal button, tabs that follow the pointer.',
    propSlug: 'border-beam',
    prop: <BorderBeam className="rl-prop__beam"><strong className="rl-prop__title">Wanli bowl</strong><p>Kalf painted this bowl in 1659.</p></BorderBeam>,
    credit: { who: 'Willem Kalf', title: 'Still Life with Fruit, Glassware, and a Wanli Bowl', date: '1659', museum: 'The Metropolitan Museum of Art', href: met(436805) },
    demos: [
      { slug: 'magnet-tabs', node: <MagnetTabs aria-label="Objects" items={[{ value: 'fruit', label: 'Fruit' }, { value: 'glass', label: 'Glass' }, { value: 'bowl', label: 'Bowl' }]} /> },
      { slug: 'metal-button', node: <MetalButton>Polish</MetalButton> },
      { slug: 'click-spark', node: <ClickSpark className="rl-spark"><Button>Click me</Button></ClickSpark> },
      { slug: 'flip-text', node: <p className="rl-flip">Still life with <FlipText words={['lemon', 'glass', 'bowl']} /></p> },
    ],
  },
  {
    id: 'story', numeral: 'VII', word: 'Story', side: 'left', title: 'Tell the story',
    body: 'Pinned images, sideways chapters and text that brightens as you read.',
    propSlug: 'flip-text',
    prop: <p className="rl-prop__flip"><FlipText words={['Setting out', 'On the road', 'Arriving']} /></p>,
    credit: { who: 'Sassetta', title: 'The Journey of the Magi', date: 'about 1433–35', museum: 'The Metropolitan Museum of Art', href: met(437611) },
    demos: [
      { slug: 'scroll-text-reveal', node: <ScrollTextReveal text="Three kings ride uphill behind a star. Sassetta painted the whole journey on one small panel." /> },
      { slug: 'parallax-gallery', wide: true, node: <ParallaxGallery images={gallery} className="rl-gallery" /> },
    ],
  },
];

/** A torn paper edge: a jagged top line, then straight down the sides. */
function tornEdge(seed: number) {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const points = Array.from({ length: 41 }, (_, i) => `${i * 2.5}% ${(rand() * 36).toFixed(1)}px`);
  return { '--torn': `polygon(${points.join(', ')}, 100% 100%, 0% 100%)` } as CSSProperties;
}

const entry = (slug: string) => catalog.find(item => item.slug === slug)!;

function CreditLine({ credit }: { credit: Credit }) {
  return <p className="rl-credit"><a href={credit.href}>{credit.who}, <cite>{credit.title}</cite>, {credit.date}</a>. {credit.museum}.</p>;
}

function InstallBlock() {
  const [copied, setCopied] = useState(false);
  const command = 'npm install @brand-studio/ui';
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  return <div className="rl-install__command">
    <code>{command}</code>
    <Button tone="inverse" onClick={() => navigator.clipboard.writeText(command).then(() => setCopied(true))}>{copied ? 'Copied' : 'Copy'}</Button>
    <span className="bs-sr-only" aria-live="polite">{copied ? 'Install command copied' : ''}</span>
  </div>;
}

export function Release() {
  const [current, setCurrent] = useState('');
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const now = chapters.find(c => c.id === current);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(item => { if (item.isIntersecting) setCurrent((item.target as HTMLElement).dataset.chapter ?? ''); }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('[data-chapter]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sections = [...document.querySelectorAll<HTMLElement>('[data-scene]')];
    const px = Math.min(devicePixelRatio || 1, 2) * innerWidth > 1200 ? 2000 : 1000;
    return startStage(canvas, sections, scenes(px), {
      paused: () => pausedRef.current,
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      onAnchor: (i, x, y) => {
        sections[i].style.setProperty('--ax', `${x.toFixed(1)}px`);
        sections[i].style.setProperty('--ay', `${y.toFixed(1)}px`);
        // Only the chapter whose painting is on the stage shows its component.
        if (!sections[i].hasAttribute('data-live')) sections.forEach((section, n) => section.toggleAttribute('data-live', n === i));
      },
    });
  }, []);

  return <ToastProvider>
    <StoryHeader className="rl-header" brand={<a href="/" className="rl-mark">Brand Studio <em>Editions</em><span className="rl-mark__version">0.2</span></a>}
      items={[{ label: 'Components', href: DOCS }, { label: 'Deskhand study', href: '/deskhand' }, { label: 'Camera study', href: '/camera' }, { label: 'npm', href: 'https://www.npmjs.com/package/@brand-studio/ui' }]}
      current={now && { label: now.title, href: `#${now.id}`, marker: <span className="rl-numeral">{now.numeral}</span> }}
      actions={<ActionLink href={`${DOCS}installation/`} shape="pill">Install</ActionLink>} />
    <main id="main" tabIndex={-1} className="rl" data-paused={paused || undefined}>
      <div className="rl-world">
        <div className="rl-stage" aria-hidden="true"><canvas ref={canvasRef} /></div>

        <section className="rl-hero" data-scene aria-label="The 0.2 Edition">
          <StoryCover className="rl-hero__card" kicker="Brand Studio UI" title="The 0.2 Edition"
            lead={`${catalog.length} React components that take their colours, type and corners from your brand. 12 are new in 0.2.`}
            chapters={chapters.map(c => ({ label: c.title, href: `#${c.id}`, marker: <span className="rl-numeral">{c.numeral}</span> }))}
            actions={<><ActionLink href={DOCS} shape="pill">Read the docs</ActionLink><ActionLink href="#notes" tone="inverse" shape="pill">See all {catalog.length}</ActionLink></>} />
          <CreditLine credit={hero} />
        </section>

        <nav className="rl-rail" aria-label="Chapters" data-show={current !== '' || undefined}>
          <ol>{chapters.map(c => <li key={c.id}><a href={`#${c.id}`} aria-current={current === c.id ? 'true' : undefined}><span className="rl-numeral">{c.numeral}</span><span className="rl-rail__word">{c.word}</span></a></li>)}</ol>
        </nav>

        {chapters.map((c, i) => <Fragment key={c.id}>
          <section id={c.id} data-scene data-chapter={c.id} className={`rl-scene rl-scene--${c.side}`} aria-labelledby={`${c.id}-title`}>
            <div className="rl-pin">
              <div className="rl-scene__text">
                <p className="rl-scene__numeral">{c.numeral}</p>
                <h2 id={`${c.id}-title`}>{c.title}</h2>
                <p>{c.body}</p>
              </div>
              <figure className="rl-prop">
                <div className="rl-prop__object">{c.prop}</div>
                <figcaption><a href={docs(c.propSlug)}>{entry(c.propSlug).title}</a>{NEW.has(c.propSlug) && <span className="rl-new">New</span>}</figcaption>
              </figure>
              <CreditLine credit={c.credit} />
            </div>
          </section>
          <section className="rl-panel" data-chapter={c.id} style={tornEdge(i * 17 + 5)} aria-label={`${c.title}: components`}>
            <div className="rl-panel__grid">
              {c.demos.map(d => <article key={d.slug} className="rl-demo" data-wide={d.wide || undefined}>
                <div className="rl-demo__stage">{d.node}</div>
                <h3>{entry(d.slug).title}{NEW.has(d.slug) && <span className="rl-new">New</span>}</h3>
                <p>{entry(d.slug).description}</p>
                <a href={docs(d.slug)}>Read the docs<span aria-hidden="true"> ↗</span></a>
              </article>)}
            </div>
          </section>
        </Fragment>)}
      </div>

      <section id="notes" data-chapter="" className="rl-notes" aria-labelledby="notes-title">
        <h2 id="notes-title">Every component</h2>
        <ul>{catalog.map(item => <li key={item.slug}><a href={docs(item.slug)}>{item.title}</a>{NEW.has(item.slug) && <span className="rl-new">New</span>}<p>{item.description}</p></li>)}</ul>
      </section>

      <section className="rl-install" data-chapter="" aria-labelledby="install-title">
        <h2 id="install-title">Install</h2>
        <InstallBlock />
        <p>Then import <code>@brand-studio/ui/styles.css</code> and wrap your app in <code>BrandTheme</code>.</p>
        <ActionLink href={`${DOCS}installation/`} shape="pill">Read the setup guide</ActionLink>
      </section>
    </main>
    <button type="button" className="rl-pause" onClick={() => setPaused(p => !p)}>{paused ? 'Play motion' : 'Pause motion'}</button>
    <footer className="site-footer bs-container rl-footer">
      <strong>Brand Studio</strong>
      <p>Paintings are public domain: The Metropolitan Museum of Art, Open Access, and the National Gallery of Art, Washington. Orders and names in the demos are made up.</p>
      <span className="rl-footer__links"><a href="/deskhand">Deskhand study</a><a href="/camera">Camera study</a></span>
    </footer>
  </ToastProvider>;
}
