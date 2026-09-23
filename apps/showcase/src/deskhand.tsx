import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, PointerEvent, RefObject } from 'react';
import { ActionLink, Button, TextField } from '@brand-studio/ui';
import '@fontsource-variable/geist';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import './deskhand.css';

/* One fictional ticket runs through the whole page: #2291, a cracked lamp, an $84 refund. */

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

type Part = string | { cite: number; text: string };
const reply: Part[] = [
  'Hi Priya, sorry the lamp arrived cracked.', { cite: 1, text: 'Damaged items are refunded in full,' },
  'so no need to send it back. I’ve set up a refund of', { cite: 2, text: '$84.00 for order #48213.' },
  { cite: 3, text: 'It reaches your card in 3 to 5 business days.' },
];

/** Split the reply into words with a running index, so CSS can reveal them in order. */
const replyWords = (() => {
  let i = 0;
  return reply.map(part => {
    const text = typeof part === 'string' ? part : part.text;
    return { list: text.split(' ').map(word => ({ word, i: i++ })), cite: typeof part === 'string' ? 0 : part.cite };
  });
})();
const WORD_COUNT = replyWords.reduce((sum, part) => sum + part.list.length, 0);

function ReplyText({ onFocusCite, describe }: { onFocusCite?: (n: number) => void; describe?: (n: number) => string }) {
  return <p className="dh-reply__text">{replyWords.map((part, k) => {
    const text = part.list.map(({ word, i }, j) => <Fragment key={i}><span className="dh-word" style={{ '--i': i } as CSSProperties}>{word}</span>{part.cite && j === part.list.length - 1 ? '' : ' '}</Fragment>);
    if (!part.cite) return <Fragment key={k}>{text}</Fragment>;
    const n = part.cite;
    return <Fragment key={k}><mark className="dh-cite" data-cite={n} style={{ '--c': n } as CSSProperties} tabIndex={0} aria-describedby={describe?.(n)}
      onPointerEnter={() => onFocusCite?.(n)} onPointerLeave={() => onFocusCite?.(0)} onFocus={() => onFocusCite?.(n)} onBlur={() => onFocusCite?.(0)}>
      {text}<sup className="dh-mono">{n}</sup></mark>{' '}</Fragment>;
  })}</p>;
}

/** Curves from each citation to its source. Coordinates are relative to the SVG's positioned parent. */
function useConnectors(root: RefObject<HTMLElement | null>, frame: string, active = true) {
  const [paths, setPaths] = useState<{ n: number; d: string }[]>([]);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !active) return;
    const measure = () => {
      const svg = el.querySelector<SVGElement>('.dh-lines');
      const box = el.querySelector(frame)?.getBoundingClientRect();
      if (!svg || !box || getComputedStyle(svg).display === 'none') { setPaths([]); return; }
      // Transforms are mid-animation (or scroll-scrubbed): read the resting layout.
      el.dataset.measure = '';
      const next = [1, 2, 3].map(n => {
        const rects = el.querySelector(`[data-cite="${n}"]`)?.getClientRects();
        const target = el.querySelector(`[data-source="${n}"] [data-target]`)?.getBoundingClientRect();
        if (!rects?.length || !target) return { n, d: '' };
        const mark = rects[rects.length - 1];
        const text = el.querySelector(`[data-cite="${n}"]`)!.closest('p')!.getBoundingClientRect();
        const toRight = target.left > mark.right;
        // Start at the paragraph edge so the line never runs through the words after the mark.
        const x1 = (toRight ? text.right + 4 : text.left - 4) - box.left, y1 = mark.top + mark.height / 2 - box.top;
        const x2 = (toRight ? target.left - 6 : target.right + 6) - box.left, y2 = target.top + Math.min(target.height, 22) / 2 - box.top;
        const bend = (x2 - x1) * .5;
        return { n, d: `M${x1} ${y1} C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}` };
      });
      delete el.dataset.measure;
      setPaths(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    document.fonts.addEventListener('loadingdone', measure);
    el.addEventListener('animationend', measure);
    return () => { observer.disconnect(); document.fonts.removeEventListener('loadingdone', measure); el.removeEventListener('animationend', measure); };
  }, [root, frame, active]);
  return paths;
}

function Lines({ paths }: { paths: { n: number; d: string }[] }) {
  return <svg className="dh-lines" aria-hidden="true">{paths.map(({ n, d }) => d && <path key={n} d={d} pathLength={1} data-line={n} style={{ '--c': n } as CSSProperties} />)}</svg>;
}

const queue = [
  ['#2291', 'Lamp arrived cracked'], ['#2290', 'Change delivery address'], ['#2288', 'Charged twice'], ['#2287', 'Gift wrap request'],
  ['#2285', 'Parcel a week late'], ['#2283', 'Promo code failed'], ['#2279', 'Wrong size'], ['#2276', 'Chargeback threat'],
  ['#2274', 'Invoice copy'], ['#2272', 'Missing screws'], ['#2270', 'Where is my order?'], ['#2268', 'Cancel order'],
];

const chips = [
  { n: 1, title: 'Returns and refunds', line: 'Damaged in transit: full refund, no return.' },
  { n: 2, title: 'Order #48213', line: 'Orla table lamp, $84.00' },
  { n: 3, title: 'Payments', line: 'Refunds reach the card in 3 to 5 business days.' },
];

/** Hero console: plays ticket #2291 once on a CSS timeline. Click or type inside to skip to the end. */
function Console() {
  const root = useRef<HTMLDivElement>(null);
  const uid = useId();
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [focus, setFocus] = useState(0);
  const paths = useConnectors(root, '.dh-console__body');
  return <div ref={root} className={`dh-console${done ? ' dh-console--done' : ''}`} data-focus={focus || undefined} style={{ '--words': WORD_COUNT } as CSSProperties}
    onPointerDown={() => setDone(true)} onKeyDown={() => setDone(true)}>
    <div className="dh-console__bar"><span className="dh-console__dots" aria-hidden="true"><i /><i /><i /></span><span>Deskhand</span><span className="dh-console__count">Open <b className="dh-mono">{sent ? 11 : 12}</b></span></div>
    <div className="dh-console__grid">
      <ol className="dh-queue-list" aria-label="Open tickets">
        {queue.map(([id, subject], k) => <li key={id} style={{ '--k': k } as CSSProperties} aria-current={k === 0 ? 'true' : undefined}><span className="dh-mono">{id}</span>{subject}</li>)}
      </ol>
      <div className="dh-console__main">
        <div className="dh-console__ticket">
          <p className="dh-ticket__meta"><span className="dh-mono">#2291</span><span>Priya N.</span></p>
          <p className="dh-ticket__message">The Orla lamp arrived with a cracked base. Can I get a refund?</p>
        </div>
        <div className="dh-console__body">
          <div className="dh-reply">
            <p className="dh-reply__label">Draft reply</p>
            <ReplyText onFocusCite={setFocus} describe={n => `${uid}-${n}`} />
            <div className="dh-approve">
              {sent ? <p role="status"><b>Sent.</b> Refund started.</p> : <>
                <p>Refund <span className="dh-mono">$84</span> is over your <span className="dh-mono">$50</span> limit.</p>
                <Button shape="pill" onClick={() => setSent(true)}>Approve and send</Button>
              </>}
            </div>
          </div>
          <ol className="dh-chips" aria-label="Sources">
            {chips.map(c => <li key={c.n} id={`${uid}-${c.n}`} className="dh-chip" data-source={c.n} style={{ '--n': c.n } as CSSProperties}>
              <p className="dh-chip__head"><span className="dh-chip__n dh-mono">{c.n}</span>{c.title}</p>
              <p className="dh-chip__line"><span data-target>{c.line}</span></p>
            </li>)}
          </ol>
          <Lines paths={paths} />
        </div>
      </div>
    </div>
  </div>;
}

/* The source documents for the exploded view. `hl` marks the cited line. */
const docs: { n: number; kind: string; title: string; rows: { text: string; value?: string; hl?: boolean }[] }[] = [
  { n: 1, kind: 'Help center', title: 'Returns and refunds', rows: [
    { text: 'Unused items can be returned within 30 days for a full refund.' },
    { text: 'Items damaged in transit are refunded in full. No return is needed.', hl: true },
    { text: 'Sale items can be exchanged for another size or colour.' },
    { text: 'Use the prepaid label in your order email.' },
  ] },
  { n: 2, kind: 'Order', title: '#48213', rows: [
    { text: 'Placed', value: '11 Sep' }, { text: 'Delivered', value: '16 Sep' },
    { text: 'Orla table lamp', value: '$84.00', hl: true }, { text: 'Shipping', value: '$0.00' }, { text: 'Paid', value: 'Visa 4417' },
  ] },
  { n: 3, kind: 'Help center', title: 'Payments', rows: [
    { text: 'We accept Visa, Mastercard and PayPal.' },
    { text: 'Refunds reach the original card in 3 to 5 business days.', hl: true },
    { text: 'Store credit appears in your account at once.' },
  ] },
];

const captions = ['Ticket #2291 comes in', 'Deskhand opens three sources', 'Each claim cites a line', 'Over $50? It waits for you'];

/** Pinned for three screens. Scroll progress (--p, 0 to 1) drives every move in CSS. */
function Exploded() {
  const root = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState(0);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const el = root.current!;
    const media = matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)');
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -rect.top / (rect.height - innerHeight)));
      el.style.setProperty('--p', p.toFixed(4));
      setPhase(p < .16 ? 0 : p < .38 ? 1 : p < .72 ? 2 : 3);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const apply = () => { setPinned(media.matches); if (media.matches) { update(); addEventListener('scroll', onScroll, { passive: true }); } else { removeEventListener('scroll', onScroll); el.style.setProperty('--p', '1'); } };
    apply();
    media.addEventListener('change', apply);
    // Documents start behind the reply card: measure each one's offset to the centre.
    const place = () => {
      const card = el.querySelector('.dh-x__card')!.getBoundingClientRect();
      el.dataset.measure = '';
      el.querySelectorAll<HTMLElement>('.dh-doc').forEach(doc => {
        const r = doc.getBoundingClientRect();
        doc.style.setProperty('--fx', `${card.left + card.width / 2 - (r.left + r.width / 2)}px`);
        doc.style.setProperty('--fy', `${card.top + card.height / 2 - (r.top + r.height / 2)}px`);
      });
      delete el.dataset.measure;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(el);
    return () => { removeEventListener('scroll', onScroll); media.removeEventListener('change', apply); observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  const paths = useConnectors(root, '.dh-x__scene', pinned);

  return <section ref={root} id="how" className="dh-x" data-tone="dark" data-pinned={pinned || undefined} aria-labelledby="dh-x-title" style={{ '--words': WORD_COUNT } as CSSProperties}>
    <div className="dh-x__pin">
      <div className="dh-x__captions bs-container">
        <h2 id="dh-x-title">How a reply gets made</h2>
        <ol>{captions.map((c, i) => <li key={c} aria-current={phase === i ? 'step' : undefined}><span className="dh-mono">{i + 1}</span>{c}</li>)}</ol>
      </div>
      <div className="dh-x__scene">
        {docs.map((doc, k) => <article key={doc.n} className={`dh-doc dh-doc--${doc.n}`} data-source={doc.n} style={{ '--k': k } as CSSProperties} aria-label={`${doc.kind}: ${doc.title}`}>
          <p className="dh-doc__kind"><span className="dh-chip__n dh-mono">{doc.n}</span>{doc.kind}</p>
          <h3 className={doc.n === 2 ? 'dh-mono' : undefined}>{doc.title}</h3>
          {doc.rows.map(row => row.value
            ? <p key={row.text} className="dh-doc__row"><span {...(row.hl ? { 'data-target': '', className: 'dh-doc__hl' } : {})}>{row.text}<b className="dh-mono">{row.value}</b></span></p>
            : <p key={row.text}><span {...(row.hl ? { 'data-target': '', className: 'dh-doc__hl' } : {})}>{row.text}</span></p>)}
        </article>)}
        <div className="dh-x__card">
          <p className="dh-ticket__meta"><span className="dh-mono">#2291</span><span>Priya N.</span></p>
          <p className="dh-ticket__message">The Orla lamp arrived with a cracked base. Can I get a refund?</p>
          <div className="dh-reply">
            <p className="dh-reply__label">Draft reply</p>
            <ReplyText />
          </div>
          <div className="dh-approve"><p>Refund <span className="dh-mono">$84</span> is over your <span className="dh-mono">$50</span> limit.</p><span className="dh-approve__wait">Waiting for you</span></div>
        </div>
        <Lines paths={paths} />
      </div>
    </div>
  </section>;
}

const tickets = [
  { id: '#2291', subject: 'Lamp arrived cracked', refund: 84 },
  { id: '#2288', subject: 'Charged twice', refund: 46 },
  { id: '#2285', subject: 'Parcel a week late', refund: 12 },
  { id: '#2279', subject: 'Wrong size', refund: 0 },
  { id: '#2276', subject: 'Chargeback threat', refund: 60, person: true },
  { id: '#2270', subject: 'Where is my order?', refund: 0 },
  { id: '#2266', subject: 'Scratched table top', refund: 120 },
];

/** Tickets slide between lanes as the limit moves (FLIP, positions relative to the panel). */
function Limits() {
  const [limit, setLimit] = useState(50);
  const panel = useRef<HTMLDivElement>(null);
  const last = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const box = panel.current!.getBoundingClientRect();
    panel.current!.querySelectorAll<HTMLElement>('[data-ticket]').forEach(el => {
      const r = el.getBoundingClientRect();
      const now = new DOMRect(r.left - box.left, r.top - box.top);
      const before = last.current.get(el.dataset.ticket!);
      if (before && !reduced() && (before.x !== now.x || before.y !== now.y)) {
        el.animate([{ transform: `translate(${before.x - now.x}px, ${before.y - now.y}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
      last.current.set(el.dataset.ticket!, now);
    });
  }, [limit]);
  const lane = (t: typeof tickets[number]) => t.person || t.refund > limit ? 'waits' : 'sends';
  const lanes = [['sends', 'Deskhand sends'], ['waits', 'Waits for you']] as const;
  return <section id="limits" className="dh-limits bs-container" aria-labelledby="dh-limits-title">
    <div className="dh-limits__copy">
      <h2 id="dh-limits-title">You set the limit</h2>
      <p>Chargebacks always go to a person.</p>
    </div>
    <div className="dh-limits__panel" ref={panel}>
      <label className="dh-range" htmlFor="dh-limit"><span>Refund limit</span><output htmlFor="dh-limit" className="dh-mono">${limit}</output></label>
      <input id="dh-limit" type="range" min={0} max={150} step={5} value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ '--p': `${(limit / 150) * 100}%` } as CSSProperties} />
      <div className="dh-lanes">
        {lanes.map(([key, title]) => {
          const list = tickets.filter(t => lane(t) === key);
          return <div key={key} className={`dh-lane dh-lane--${key}`}>
            <p className="dh-lane__title">{title}<span className="dh-mono" aria-live="polite">{list.length}</span></p>
            <ul>{list.map(t => <li key={t.id} data-ticket={t.id}>
              <span className="dh-mono">{t.id}</span><span className="dh-lane__subject">{t.subject}</span>
              <span className="dh-mono dh-lane__amount">{t.person ? 'person' : t.refund ? `$${t.refund}` : ''}</span>
            </li>)}</ul>
          </div>;
        })}
      </div>
    </div>
  </section>;
}

function Trial() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a work email, such as sam@yourshop.com.'); setDone(false); return; }
    setError(''); setDone(true);
  };
  return <section id="trial" className="dh-trial" data-tone="accent" aria-labelledby="dh-trial-title">
    <div className="bs-container dh-trial__inner">
      <h2 id="dh-trial-title">Try it free for 14 days</h2>
      <form className="dh-trial__form" noValidate onSubmit={submit}>
        <TextField label="Work email" name="email" type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); setDone(false); }} error={error} hint="Demo form. Nothing is sent." />
        <Button type="submit" tone="inverse" shape="pill">Start free trial</Button>
        <p role="status" className="dh-trial__status">{done ? 'Checked. This demo sends nothing.' : ''}</p>
      </form>
    </div>
  </section>;
}

export function Deskhand() {
  return <>
    <main id="main" tabIndex={-1} className="dh">
      <section id="top" className="dh-hero" aria-labelledby="dh-title">
        <div className="dh-hero__copy bs-container">
          <h1 id="dh-title">{'Deskhand answers your support tickets'.split(' ').map((w, i) => <Fragment key={i}><span className="dh-hw" style={{ '--i': i } as CSSProperties}>{w}</span>{' '}</Fragment>)}</h1>
          <p className="dh-hero__lead"><span className="dh-sweep">Every reply cites the order and policy it used.</span></p>
          <div className="dh-hero__actions">
            <ActionLink href="#trial" shape="pill">Start free trial</ActionLink>
            <ActionLink href="#how" tone="secondary" shape="pill">See a reply get made</ActionLink>
          </div>
        </div>
        <div className="dh-hero__stage"><Console /></div>
      </section>

      <Exploded />
      <Limits />

      <section id="pricing" className="dh-pricing bs-container" aria-labelledby="dh-pricing-title">
        <h2 id="dh-pricing-title">Pricing</h2>
        <div className="dh-plans">
          <article><h3>Trial</h3><p className="dh-plans__price">Free for 14 days</p><p>300 tickets. No card.</p></article>
          <article><h3>Team</h3><p className="dh-plans__price">$0.60 per sent reply</p><p>Edited or rejected replies are free.</p></article>
        </div>
      </section>

      <Trial />
    </main>
    <footer className="dh-footer" data-tone="dark"><div className="site-footer bs-container"><strong>Deskhand</strong><p>Fictional product for a Brand Studio demo. Tickets, orders and prices are made up.</p><a href="/">Brand Studio</a></div></footer>
  </>;
}

type MenuKey = 'product' | 'resources';
const menus: Record<MenuKey, { label: string; items: { href: string; title: string; line: string; icon: string }[] }> = {
  product: { label: 'Product', items: [
    { href: '#how', title: 'Cited replies', line: 'Each claim links to its order or policy.', icon: 'M4 5h9M4 9h12M4 13h7m6-2 3 3-3 3' },
    { href: '#limits', title: 'Refund limits', line: 'Replies over your limit wait for you.', icon: 'M4 7h16M4 17h16M9 4v6M15 14v6' },
    { href: '#top', title: 'Approval bar', line: 'Approve and send from the ticket.', icon: 'm5 12 4 4 10-10' },
  ] },
  resources: { label: 'Resources', items: [
    { href: '/', title: 'Brand Studio', line: 'The design system behind this page.', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
    { href: '/coffee', title: 'Still. coffee study', line: 'Another page built with it.', icon: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M9 3v3M12 3v3' },
  ] },
};
const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

/** Header: clear over the hero, a floating bar once scrolled, light text over dark sections, and a marker on the section in view. */
export function DeskhandHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [tone, setTone] = useState('light');
  const [section, setSection] = useState<string | null>(null);
  const active = section === 'pricing' ? 'pricing' : section ? 'product' : null;
  const [open, setOpen] = useState<MenuKey | null>(null);
  const nav = useRef<HTMLUListElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(scrollY > 8);
      const at = (el: Element | null, y: number) => { const r = el?.getBoundingClientRect(); return !!r && r.top <= y && r.bottom > y; };
      const toned = [...document.querySelectorAll<HTMLElement>('[data-tone]:not(.dh-header)')].find(el => at(el, 36));
      setTone(toned?.dataset.tone ?? 'light');
      const probe = innerHeight * .4;
      setSection(['how', 'limits', 'pricing'].find(id => at(document.getElementById(id), probe)) ?? null);
    };
    const onScroll = () => { frame ||= requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
  }, []);

  // The yellow marker sits under the section in view; the hover pill follows the pointer.
  const place = (prefix: 'a' | 'h', item: Element | null) => {
    const list = nav.current;
    if (!list) return;
    list.toggleAttribute(`data-${prefix}`, !!item);
    if (!item) return;
    const el = item as HTMLElement;
    list.style.setProperty(`--${prefix}x`, `${el.offsetLeft}px`);
    list.style.setProperty(`--${prefix}w`, `${el.offsetWidth}px`);
  };
  useLayoutEffect(() => {
    const apply = () => place('a', active ? nav.current!.querySelector(`[data-key="${active}"]`) : null);
    apply();
    document.fonts.ready.then(apply);
    addEventListener('resize', apply);
    return () => removeEventListener('resize', apply);
  }, [active]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); document.querySelector<HTMLElement>(`[aria-controls="dh-menu-${open}"]`)?.focus(); } };
    const onDown = (e: globalThis.PointerEvent) => { if (!(e.target as Element).closest('.dh-header__nav')) setOpen(null); };
    addEventListener('keydown', onKey);
    addEventListener('pointerdown', onDown);
    return () => { removeEventListener('keydown', onKey); removeEventListener('pointerdown', onDown); };
  }, [open]);

  const hoverOpen = (key: MenuKey | null) => (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(closeTimer.current);
    setOpen(key);
  };
  const closeSheet = () => sheet.current?.close();

  return <header className="dh-header" data-scrolled={scrolled || undefined} data-tone={tone} data-open={open || undefined}>
    <div className="dh-header__bar">
      <a className="dh-header__mark" href="/deskhand"><span className="dh-header__logo" aria-hidden="true" />Deskhand</a>
      <nav className="dh-header__nav" aria-label="Main navigation" onPointerLeave={e => { if (e.pointerType === 'mouse') closeTimer.current = window.setTimeout(() => setOpen(null), 180); place('h', null); }}>
        <ul ref={nav}>
          {(['product', 'pricing', 'resources'] as const).map(key => key === 'pricing'
            ? <li key={key} data-key={key} onPointerEnter={e => { place('h', e.currentTarget); hoverOpen(null)(e); }}>
                <a href="#pricing" aria-current={active === 'pricing' ? 'location' : undefined}>Pricing</a>
              </li>
            : <li key={key} data-key={key} onPointerEnter={e => { place('h', e.currentTarget); hoverOpen(key)(e); }}>
                <button type="button" aria-expanded={open === key} aria-controls={`dh-menu-${key}`} onClick={() => setOpen(open === key ? null : key)}>
                  {menus[key].label}<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="m2.5 4.5 3.5 3.5 3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
                <div id={`dh-menu-${key}`} className={`dh-menu dh-menu--${key}`} hidden={open !== key}>
                  <ul>{menus[key].items.map(item => <li key={item.title}>
                    <a href={item.href} onClick={() => setOpen(null)} aria-current={item.href === '#' + section ? 'location' : undefined}>
                      <span className="dh-menu__icon"><Icon d={item.icon} /></span>
                      <span><b>{item.title}</b><small>{item.line}</small></span>
                    </a>
                  </li>)}</ul>
                  {key === 'product'
                    ? <a className="dh-menu__feature" href="#how" onClick={() => setOpen(null)}>
                        <span className="dh-mono">#2291 · $84 refund</span>
                        <b>Watch one ticket get answered</b>
                        <span className="dh-menu__feature-lines" aria-hidden="true"><i /><i /><i /></span>
                      </a>
                    : <p className="dh-menu__note">Deskhand is fictional. Tickets, orders and prices on this page are made up.</p>}
                </div>
              </li>)}
        </ul>
      </nav>
      <div className="dh-header__actions">
        <a className="dh-header__signin" href="#trial">Sign in</a>
        <ActionLink href="#trial" shape="pill" className="dh-header__cta">Start free trial</ActionLink>
        <button type="button" className="dh-header__menu" aria-haspopup="dialog" onClick={() => sheet.current?.showModal()}>
          <span aria-hidden="true" /><span className="bs-sr-only">Menu</span>
        </button>
      </div>
    </div>
    <dialog ref={sheet} className="dh-sheet" aria-label="Menu" onClick={e => { if (e.target === e.currentTarget) closeSheet(); }}>
      <div className="dh-sheet__top"><span className="dh-header__mark"><span className="dh-header__logo" aria-hidden="true" />Deskhand</span><button type="button" className="dh-sheet__close" onClick={closeSheet}>Close</button></div>
      {(['product', 'resources'] as const).map(key => <section key={key} aria-label={menus[key].label}>
        <p className="dh-sheet__label">{menus[key].label}</p>
        <ul>{menus[key].items.map(item => <li key={item.title}><a href={item.href} onClick={closeSheet}><span className="dh-menu__icon"><Icon d={item.icon} /></span>{item.title}</a></li>)}</ul>
      </section>)}
      <ul className="dh-sheet__plain"><li><a href="#pricing" onClick={closeSheet}>Pricing</a></li><li><a href="#trial" onClick={closeSheet}>Sign in</a></li></ul>
      <ActionLink href="#trial" shape="pill" className="dh-sheet__cta" onClick={closeSheet}>Start free trial</ActionLink>
    </dialog>
  </header>;
}
