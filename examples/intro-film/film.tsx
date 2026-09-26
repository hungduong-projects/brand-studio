// The Brand Studio intro film: one message to an agent, the install, the agent's visible steps, then the real example pages.
// Drawn as a pure function of time; render.mjs seeks it frame by frame.
import '@fontsource-variable/geist';
import '@fontsource/geist-mono/latin-400.css';
import '@brand-studio/ui/styles.css';
import './film.css';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { AgentThinking, ApprovalCard, BrandTheme, ChatComposer, ChatMessage, ChatThread, TaskRows, ThinkingTrace, ToolChips } from '@brand-studio/ui';
import type { BrandPalette, TaskRow, ToolCall } from '@brand-studio/ui';
import { AppWindow, BrowserWindow, Camera, Caption, Cursor, Stage, Terminal, aim, curves, ease, hover, rise, typed } from '../film-kit/kit';
import type { CursorPoint } from '../film-kit/kit';
import halden from '../../apps/showcase/src/halden.brand.json';

export const SECONDS = 40;
export const POSTER_AT = 38.5;

/** The example pages the film scrolls. render.mjs captures each one frame by frame before the film renders. */
export const pages = [
  { id: 'camera', path: '/examples/camera/', url: 'brandstudio.js.org/examples/camera', start: 25.4, seconds: 5, distance: 3200 },
  { id: 'deskhand', path: '/examples/deskhand/', url: 'brandstudio.js.org/examples/deskhand', start: 30.9, seconds: 2, distance: 1800 },
  { id: 'editions', path: '/examples/', url: 'brandstudio.js.org/examples', start: 33.2, seconds: 1.8, distance: 1400 },
];
let frames: Record<string, string[]> = {};

// The agent's own interface wears a plain palette; the pages it builds wear their brands.
const plain = { surface: '#ffffff', elevated: '#ffffff', ink: '#18181b', muted: '#71717a', accent: '#18181b', onAccent: '#ffffff', line: '#e4e4e7', font: '"Geist Variable", system-ui, sans-serif', radius: '10px' };
const palette = { light: plain, dark: plain } as unknown as BrandPalette;

const ask = 'Make a launch page for Halden, my camera brand.';
const answer = "I'll set up Brand Studio first, then build Halden's page.";
const plan = ['Install the components and the brand-design skill', "Write Halden's brand contract", 'Build the page and check it at 390 and 1440'];
const install = [
  { command: 'npm install @brand-studio/ui', at: 7.6, result: '✓ @brand-studio/ui installed' },
  { command: 'npx skills add hungduong-projects/brand-studio --skill brand-design -y', at: 9.5, result: '✓ brand-design skill added' },
];
/** The words of `text` streamed by `t`, like an agent's reply arriving. */
const streamed = (text: string, t: number, start: number, perSecond = 12) => text.split(' ').slice(0, Math.max(0, Math.floor((t - start) * perSecond))).join(' ');

function ChatScene({ t }: { t: number }) {
  if (t > 13.4) return null;
  const sent = t >= 3.9;
  const thought = t >= 5;
  const enter = ease(t, .1, .55);
  const leave = ease(t, 6.8, .6, curves.inOut);
  const exit = ease(t, 12.8, .5, curves.in);
  const ran = (at: number, command: string) => t >= at + command.length / 30 + .5;
  return <AppWindow title="Agent" className="chat" style={{ opacity: enter * (1 - exit), translate: `${-230 * leave}px ${24 * (1 - enter)}px`, scale: `${1 - .1 * leave}`, filter: `saturate(${1 - .5 * leave})` }}>
    <BrandTheme palette={palette} mode="light" className="chat__theme">
      <ChatThread label="Conversation">
        {!sent && <p className="chat__empty" style={rise(t, .4, 3.9)}>What should we build?</p>}
        {sent && <ChatMessage from="user"><p style={rise(t, 3.95, Infinity, 8)}>{ask}</p></ChatMessage>}
        {t >= 4.3 && <ChatMessage from="agent" name="Agent">
          <div className="chat__reply" style={rise(t, 4.3, Infinity, 8)}>
            <ThinkingTrace title={thought ? 'Thought for 1s' : 'Thinking'} steps={[{ id: 'read', title: 'Read the request', status: thought ? 'done' : 'active' }]} />
            {thought && <p>{streamed(answer, t, 5.05)}</p>}
            {t >= 5.8 && <ol className="chat__plan">{plan.map((item, i) => t >= 5.8 + i * .22 && <li key={item} style={rise(t, 5.8 + i * .22, Infinity, 6)}>{item}</li>)}</ol>}
            {t >= 6.6 && <div style={rise(t, 6.6, Infinity, 6)}><ToolChips tools={install.filter(line => t >= line.at - .6 || line === install[0]).map(line => ({ id: line.command, name: line.command.split(' ').slice(0, 3).join(' '), status: ran(line.at, line.command) ? 'done' : 'running' }))} /></div>}
          </div>
        </ChatMessage>}
      </ChatThread>
      <ChatComposer value={sent ? '' : typed(ask, t, 1.3)} placeholder="Ask anything" busy={t >= 4.3 && !ran(install[1].at, install[1].command)} />
    </BrandTheme>
  </AppWindow>;
}

function InstallScene({ t }: { t: number }) {
  if (t < 6.7 || t > 13.4) return null;
  const enter = ease(t, 6.9, .6);
  const leave = ease(t, 12.8, .5, curves.in);
  return <Terminal t={t} style={{ left: 470, top: 150, width: 620, height: 320, opacity: enter * (1 - leave), translate: `${(1 - enter) * 140}px 0`, scale: `${1 - .08 * leave}` }} lines={install} />;
}

const steps = [
  { label: 'Study the category', at: 13.4, thinking: 'Reading camera brand pages' },
  { label: 'Choose a concept', at: 15.2, thinking: 'Worn in. Never worn out.' },
  { label: 'Write the brand contract', at: 17, thinking: 'Writing brand.json' },
  { label: 'Build the launch page', at: 21.2, thinking: 'Composing the page' },
  { label: 'Check 390 and 1440 wide', at: 22.8, thinking: 'Checking contrast and layout' },
];
const allDone = 24.4;
const swatches = [['accent', halden.tokens.light.accent], ['surface', halden.tokens.light.surface], ['ink', halden.tokens.light.ink]] as const;
const contract = [`"concept": "${halden.direction.concept}"`, `"accent": "${halden.tokens.light.accent}"`, `"surface": "${halden.tokens.light.surface}"`, `"ink": "${halden.tokens.light.ink}"`, `"radius": "${halden.tokens.light.radius}"`];

function AgentScene({ t }: { t: number }) {
  if (t < 12.9 || t > 25.6) return null;
  const current = steps.findLastIndex(step => t >= step.at);
  const tasks: TaskRow[] = steps.map((step, i) => ({ id: step.label, label: step.label, status: t >= allDone || i < current ? 'done' : i === current ? 'active' : 'pending' }));
  const tools: ToolCall[] = [
    { id: 'refs', name: 'grab-refs.mjs', status: t >= 15 ? 'done' : 'running' },
    ...(t >= 21.4 ? [{ id: 'build', name: 'vite build', status: t >= 22.6 ? 'done' : 'running' } as ToolCall] : []),
    ...(t >= 23 ? [{ id: 'check', name: 'brand-check.mjs', detail: t >= 23.7 ? 'passed' : undefined, status: t >= 23.7 ? 'done' : 'running' } as ToolCall] : []),
    ...(t >= 23.5 ? [{ id: 'shoot', name: 'shoot.mjs', detail: t >= 24.3 ? '390 · 1440' : undefined, status: t >= 24.3 ? 'done' : 'running' } as ToolCall] : []),
  ];
  let clock = 17.3;
  const enter = ease(t, 13, .55);
  const leave = ease(t, 24.9, .5, curves.in);
  return <AppWindow title="Halden · brand-design" className="agent" style={{ opacity: enter * (1 - leave), translate: `0 ${30 * (1 - enter)}px`, scale: `${1 - .06 * leave}` }}>
    <BrandTheme palette={palette} mode="light" className="agent__theme">
      <div className="agent__side">
        <AgentThinking size={28} state={t >= allDone ? 'idle' : 'thinking'} label={t >= allDone ? 'Page ready' : steps[Math.max(0, current)].thinking} />
        <TaskRows title="Launch page" tasks={tasks} />
      </div>
      <div className="agent__main">
        <ToolChips tools={tools} />
        <div className="agent__code" style={rise(t, 17, Infinity, 10)}>
          <p className="agent__file">brand/brand.json</p>
          {contract.map(line => {
            const start = clock; clock += line.length / 34 + .15;
            return t >= start && <p key={line}>{typed(line, t, start, 34)}</p>;
          })}
        </div>
        {t >= 19.3 && <div style={rise(t, 19.3, Infinity, 12)}>
          <ApprovalCard title="Use this palette?" description="Brass accent on warm paper, from the Halden contract." status={t >= 20.7 ? 'approved' : 'pending'} approveLabel="Allow"
            detail={<span className="swatches">{swatches.map(([role, colour]) => <span key={role} className="swatch"><i style={{ background: colour }} />{role} {colour}</span>)}</span>} />
        </div>}
      </div>
    </BrandTheme>
  </AppWindow>;
}

function OutputScene({ t }: { t: number }) {
  if (t < 24.9 || t > 36) return null;
  const page = pages.findLast(p => t >= p.start - .5) ?? pages[0];
  const index = pages.indexOf(page);
  const list = frames[page.id] ?? [];
  // Floor, not round: every motion-blur sub-frame of one video frame must show the same capture, or the blend ghosts.
  const frame = list[Math.min(list.length - 1, Math.max(0, Math.floor((t - page.start) * 30 + 1e-4)))];
  const previous = index > 0 ? pages[index - 1] : undefined;
  const slide = previous ? ease(t, page.start - .5, .5, curves.inOut) : 1;
  const previousFrame = previous ? (frames[previous.id] ?? []).at(-1) : undefined;
  const enter = ease(t, 25, .6, curves.pop);
  const leave = ease(t, 35, .6, curves.inOut);
  return <BrowserWindow url={slide < .5 && previous ? previous.url : page.url} className="browser" style={{ opacity: Math.min(ease(t, 25, .3), 1 - ease(t, 35.3, .3)), scale: `${(.72 + .28 * enter) * (1 - .9 * leave)}` }}>
    {previousFrame && slide < 1 && <img className="browser__page" src={previousFrame} alt="" style={{ translate: `${-100 * slide}% 0` }} />}
    {frame && <img className="browser__page" src={frame} alt="" style={{ translate: `${100 * (1 - slide)}% 0` }} />}
  </BrowserWindow>;
}

function Lockup({ t }: { t: number }) {
  if (t < 35.3) return null;
  const out = 1 - ease(t, SECONDS - .5, .5);
  return <div className="lockup" style={{ opacity: out }}>
    <svg className="lockup__mark" viewBox="0 0 32 32" aria-hidden="true" style={{ scale: `${.5 + .5 * ease(t, 35.4, .6, curves.pop)}`, opacity: ease(t, 35.4, .25) }}>
      <rect width="32" height="32" rx="9" fill="#0a0a0a" />
      <rect x="15" y="7" width="10" height="13" rx="3" fill="#fff" style={{ translate: `${(1 - ease(t, 35.8)) * 6}px 0`, opacity: ease(t, 35.8, .3) }} />
      <rect x="7" y="12" width="10" height="13" rx="3" fill="#fff" style={{ translate: `${(ease(t, 36) - 1) * 6}px 0`, opacity: ease(t, 36, .3) }} />
    </svg>
    <p className="lockup__name" style={rise(t, 36.3)}>Brand Studio</p>
    <p className="lockup__line" style={rise(t, 36.6)}>Components that wear your brand.</p>
    <p className="lockup__foot" style={rise(t, 37)}>brandstudio.js.org</p>
  </div>;
}

// Camera shots follow the action like a screen recorder's auto-zoom.
const shots = [
  { at: 0, x: 576, y: 324, zoom: 1 }, { at: 1, x: 576, y: 324, zoom: 1 }, { at: 1.7, x: 600, y: 470, zoom: 1.45 }, { at: 3.6, x: 620, y: 470, zoom: 1.45 },
  { at: 4.4, x: 576, y: 330, zoom: 1.06 }, { at: 6.8, x: 576, y: 330, zoom: 1.06 }, { at: 7.4, x: 576, y: 324, zoom: 1 },
  { at: 8, x: 700, y: 232, zoom: 1.45 }, { at: 9.3, x: 700, y: 232, zoom: 1.45 }, { at: 10.1, x: 760, y: 262, zoom: 1.45 }, { at: 12.2, x: 760, y: 272, zoom: 1.45 },
  { at: 12.9, x: 576, y: 324, zoom: 1 }, { at: 14, x: 576, y: 324, zoom: 1 }, { at: 14.7, x: 300, y: 250, zoom: 1.45 }, { at: 16.6, x: 300, y: 260, zoom: 1.45 },
  { at: 17.3, x: 720, y: 250, zoom: 1.5 }, { at: 19.1, x: 720, y: 250, zoom: 1.5 }, { at: 19.8, x: 760, y: 440, zoom: 1.55 }, { at: 21, x: 760, y: 440, zoom: 1.55 },
  { at: 21.7, x: 576, y: 324, zoom: 1.02 }, { at: 22.8, x: 576, y: 324, zoom: 1.02 }, { at: 23.4, x: 700, y: 200, zoom: 1.5 }, { at: 24.4, x: 700, y: 200, zoom: 1.5 },
  { at: 25, x: 576, y: 324, zoom: 1 }, { at: 30, x: 576, y: 324, zoom: 1.05 }, { at: 30.4, x: 576, y: 324, zoom: 1 }, { at: 40, x: 576, y: 324, zoom: 1 },
];
// render.mjs calls window.aim, which measures each target, so the pointer lands on the real field and buttons.
const input = '.chat .bs-composer__input', send = '.chat .bs-composer__send', allow = '.agent .bs-approval .bs-button--primary';
const chatCursor: CursorPoint[] = [
  { at: .6, target: input, offset: [260, 90] }, { at: 1.1, target: input, offset: [-250, 0], click: true }, { at: 1.7, offset: [330, 34] }, { at: 3.1, offset: [0, 0] },
  { at: 3.85, target: send, click: true }, { at: 4.6, offset: [34, 46] },
];
const approveCursor: CursorPoint[] = [{ at: 19.8, target: allow, offset: [90, 110] }, { at: 20.6, target: allow, click: true }, { at: 21.2, offset: [36, 48] }];
const cursors = [chatCursor, approveCursor];

function Film({ t }: { t: number }) {
  return <Stage>
    <Camera t={t} shots={shots}>
      <ChatScene t={t} />
      <InstallScene t={t} />
      <AgentScene t={t} />
      <OutputScene t={t} />
      <Cursor t={t} path={chatCursor} />
      <Cursor t={t} path={approveCursor} />
    </Camera>
    <Lockup t={t} />
    <Caption t={t} start={.4} end={6.7}>Ask for a brand.</Caption>
    <Caption t={t} start={7} end={12.7}>Install the components and the skill.</Caption>
    <Caption t={t} start={13.2} end={24.7}>The agent works in steps you can see.</Caption>
    <Caption t={t} start={25.4} end={35}>Real pages, each from its brand contract.</Caption>
  </Stage>;
}

const root = createRoot(document.getElementById('film')!);
declare global { interface Window { seek: (t: number) => Promise<void>; aim: () => Promise<void>; setFrames: (next: Record<string, string[]>) => void; film: { seconds: number; posterAt: number; pages: typeof pages } } }
window.film = { seconds: SECONDS, posterAt: POSTER_AT, pages };
window.setFrames = next => { frames = next; };
/** Draws the film at `t` seconds, parks every CSS animation at the same moment and waits for page images to decode. */
window.seek = async t => {
  flushSync(() => root.render(<Film t={t} />));
  hover(t, cursors);
  for (const animation of document.getAnimations()) { animation.pause(); animation.currentTime = t * 1000; }
  await Promise.all([...document.images].map(image => image.decode().catch(() => undefined)));
  await document.fonts.ready;
};
window.aim = () => aim(cursors, shots, window.seek);
