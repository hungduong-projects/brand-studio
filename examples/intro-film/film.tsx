// The Brand Studio intro film, drawn as a pure function of time. render.mjs seeks it frame by frame.
import '@fontsource-variable/geist';
import '@fontsource/geist-mono/latin-400.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-600.css';
import '@brand-studio/ui/styles.css';
import './film.css';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';
import { AgentThinking, ApprovalCard, BrandTheme, Button, Switch, TaskRows, ToolChips } from '@brand-studio/ui';
import type { BrandPalette } from '@brand-studio/ui';
import hollis from '../../apps/docs/brand/hollis.brand.json';
import deskhand from '../../apps/showcase/src/deskhand.brand.json';
import still from '../../plugins/brand-studio/skills/brand-design/assets/still.brand.json';

export const SECONDS = 24;
export const POSTER_AT = 23;

const brands = [
  { name: 'Hollis', palette: hollis.tokens as BrandPalette },
  { name: 'Deskhand', palette: deskhand.tokens as BrandPalette },
  { name: 'Still', palette: still.tokens as BrandPalette },
];

const plain = { surface: '#f4f4f5', elevated: '#ffffff', ink: '#18181b', muted: '#71717a', accent: '#52525b', onAccent: '#ffffff', line: '#d4d4d8', font: '"Geist Variable", system-ui, sans-serif', radius: '4px' };

/** Eased progress from 0 to 1 between two moments. */
const ease = (t: number, from: number, length = .5) => {
  const x = Math.min(1, Math.max(0, (t - from) / length));
  return 1 - (1 - x) ** 3;
};
/** Visible from `start` to `end`, rising in and fading out. */
const rise = (t: number, start: number, end = Infinity, distance = 14): CSSProperties => {
  const p = Math.min(ease(t, start), 1 - ease(t, end - .35, .35));
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
};

const mix = (from: string, to: string, p: number) => {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map(i => Math.round(channel(from, i) + (channel(to, i) - channel(from, i)) * p).toString(16).padStart(2, '0')).join('');
};

// The contract lines typed in beat two, in order, with the moment each finishes.
const contract = [
  { key: 'surface', also: ['line'], at: 6.1 },
  { key: 'elevated', also: [], at: 6.9 },
  { key: 'ink', also: ['muted'], at: 7.7 },
  { key: 'accent', also: ['onAccent'], at: 8.5 },
  { key: 'radius', also: [], at: 9.3 },
] as const;

/** The plain palette turning into Hollis one contract line at a time. */
function contractPalette(t: number): BrandPalette {
  const light: Record<string, string> = { ...plain };
  const target = hollis.tokens.light as Record<string, string>;
  for (const line of contract) {
    const p = ease(t, line.at, .45);
    for (const key of [line.key, ...line.also]) {
      light[key] = key === 'radius' ? `${Math.round(4 + (parseFloat(target.radius) - 4) * p)}px` : mix(plain[key as keyof typeof plain], target[key], p);
    }
  }
  return { light, dark: light } as unknown as BrandPalette;
}

function OrderCard({ tag, t, build = false }: { tag: string; t: number; build?: boolean }) {
  const part = (i: number) => build ? rise(t, .7 + i * .35) : undefined;
  return <>
    <p className="card__tag" style={part(0)}>{tag}</p>
    <div style={part(1)}><AgentThinking size={20} label="Checking your order" /></div>
    <p className="card__title" style={part(2)}>Your order ships Friday.</p>
    <p className="card__body" style={part(3)}>Two bags are in stock. The third arrives Thursday, so everything leaves together.</p>
    <div className="card__actions" style={part(4)}><Button>Confirm</Button><Button tone="secondary">Change</Button></div>
  </>;
}

// Beat three: the picker steps through brands, then dark mode.
const switches = [{ at: 12, brand: 1, dark: false }, { at: 13, brand: 2, dark: false }, { at: 14, brand: 2, dark: true }];
const pickerState = (t: number) => switches.reduce((state, s) => t >= s.at ? s : state, { at: 11, brand: 0, dark: false });

function Picker({ t }: { t: number }) {
  const state = pickerState(t);
  return <div className="picker" style={rise(t, 11.1, 15.3)}>
    <p className="picker__label">Brand</p>
    <div className="picker__row">{brands.map((brand, i) => <span key={brand.name} className="pill" data-on={state.brand === i || undefined}>{brand.name}</span>)}</div>
    <p className="picker__label">Mode</p>
    <div className="picker__row"><span className="pill" data-on={!state.dark || undefined}>Light</span><span className="pill" data-on={state.dark || undefined}>Dark</span></div>
  </div>;
}

/** Stacked theme layers: the newest fades in over the one before. */
function Crossfade({ t, steps, className, children }: { t: number; steps: { at: number; brand: number; dark: boolean }[]; className: string; children: (tag: string) => ReactNode }) {
  const shown = steps.filter((s, i) => i === 0 || t >= s.at);
  return <>{shown.slice(-2).map((s, i, list) => <BrandTheme key={s.at} palette={brands[s.brand].palette} mode={s.dark ? 'dark' : 'light'} className={className}
    style={{ opacity: i === list.length - 1 && list.length > 1 ? ease(t, s.at, .4) : 1 }}>{children(`${brands[s.brand].name} · fictional brand`)}</BrandTheme>)}</>;
}

const tiles: ((tag: string) => ReactNode)[] = [
  () => <AgentThinking size={56} label="Comparing roast notes" />,
  () => <TaskRows title="Launch email" tasks={[{ id: 'a', label: 'Read the brief', status: 'done', meta: '3s' }, { id: 'b', label: 'Draft the email', status: 'active' }, { id: 'c', label: 'Schedule the send', status: 'pending' }]} />,
  () => <ApprovalCard title="Place a reorder?" description="The agent wants to buy your usual coffee." />,
  () => <ToolChips tools={[{ id: '1', name: 'orders.search', detail: '14 results', status: 'done' }, { id: '2', name: 'catalog.list', status: 'running' }, { id: '3', name: 'stock.check', detail: 'timed out', status: 'error' }]} />,
  () => <Switch label="Email me when my order ships" defaultChecked />,
  () => <div className="tile__buttons"><Button>Confirm</Button><Button tone="secondary">Change</Button><Button shape="pill">See the specs</Button></div>,
];

function Film({ t }: { t: number }) {
  const cardOut = 1 - ease(t, 15, .4);
  const lockupOut = 1 - ease(t, SECONDS - .5, .5);
  return <div className="film">
    <h1 className="caption" style={rise(t, .3, 5)}>One card, no brand yet.</h1>
    <h1 className="caption" style={rise(t, 5.2, 11)}>A brand contract sets its colour, type and corners.</h1>
    <h1 className="caption" style={rise(t, 11.2, 18.4)}>One switch re-skins them all.</h1>

    {t < 15.5 && <div className="stage-card" style={{ opacity: Math.min(ease(t, .2, .4), cardOut), transform: `scale(${.96 + .04 * cardOut})` }}>
      {t < 11
        ? <BrandTheme palette={contractPalette(t)} mode="light" className="card"><OrderCard t={t} build tag={t < 9.4 ? 'No brand yet' : 'Hollis · fictional brand'} /></BrandTheme>
        : <Crossfade t={t} steps={[{ at: 11, brand: 0, dark: false }, ...switches]} className="card">{tag => <OrderCard t={t} tag={tag} />}</Crossfade>}
    </div>}

    {t >= 5 && t < 11.2 && <div className="code" style={rise(t, 5.4, 11)}>
      <p className="code__file">hollis.brand.json · tokens.light</p>
      {contract.map(line => {
        const value = (hollis.tokens.light as Record<string, string>)[line.key];
        const text = `"${line.key}": "${value}",`;
        const typed = Math.round(text.length * ease(t, line.at - .6, .6));
        return <p key={line.key} className="code__line" style={{ opacity: typed ? 1 : 0 }}>
          <span className="swatch" style={{ background: line.key === 'radius' ? 'transparent' : value, borderRadius: line.key === 'radius' ? value : undefined, opacity: ease(t, line.at, .3) }} />
          {text.slice(0, typed)}
        </p>;
      })}
    </div>}

    {t >= 11 && t < 15.5 && <Picker t={t} />}

    {t >= 15 && t < 18.8 && <div className="grid" style={{ opacity: 1 - ease(t, 18.3, .4) }}>
      {tiles.map((tile, i) => {
        const delay = (i % 3) * .18 + Math.floor(i / 3) * .12;
        return <div key={i} className="tile" style={rise(t, 15.2 + i * .08)}>
          <Crossfade t={t} steps={[{ at: 15, brand: 0, dark: false }, { at: 16 + delay, brand: 1, dark: false }, { at: 17 + delay, brand: 2, dark: false }]} className="tile__theme">{tile}</Crossfade>
        </div>;
      })}
    </div>}

    {t >= 18.5 && <div className="lockup" style={{ opacity: lockupOut }}>
      <svg className="lockup__mark" viewBox="0 0 32 32" aria-hidden="true" style={{ transform: `scale(${.6 + .4 * ease(t, 18.6)})`, opacity: ease(t, 18.6, .3) }}>
        <rect width="32" height="32" rx="9" fill="#0a0a0a" />
        <rect x="15" y="7" width="10" height="13" rx="3" fill="#fff" style={{ transform: `translateX(${(1 - ease(t, 19)) * 6}px)`, opacity: ease(t, 19, .3) }} />
        <rect x="7" y="12" width="10" height="13" rx="3" fill="#fff" style={{ transform: `translateX(${(ease(t, 19.25) - 1) * 6}px)`, opacity: ease(t, 19.25, .3) }} />
      </svg>
      <p className="lockup__name" style={rise(t, 19.6)}>Brand Studio</p>
      <p className="lockup__line" style={rise(t, 19.95)}>Components that wear your brand.</p>
      <p className="lockup__foot" style={rise(t, 20.35)}>98 React components · brandstudio.js.org</p>
    </div>}
  </div>;
}

const root = createRoot(document.getElementById('film')!);
declare global { interface Window { seek: (t: number) => Promise<void>; filmSeconds: number; posterAt: number } }
window.filmSeconds = SECONDS;
window.posterAt = POSTER_AT;
/** Draws the film at `t` seconds and parks every CSS animation at the same moment. */
window.seek = async t => {
  flushSync(() => root.render(<Film t={t} />));
  for (const animation of document.getAnimations()) { animation.pause(); animation.currentTime = t * 1000; }
  await document.fonts.ready;
};
