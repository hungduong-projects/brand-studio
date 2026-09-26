// A starter product film: one request, the command that answers it, then the lockup. Copy it into the project as
// film/film.tsx, point the kit import at this skill's scripts/film/kit, replace the copy with verified facts and the brand's
// tokens, and render with scripts/film-render.mjs. Needs react and react-dom in the project.
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { AppWindow, Camera, Caption, Cursor, Stage, Terminal, aim, curves, ease, hover, rise, typed } from '../scripts/film/kit';
import type { CursorPoint, Shot } from '../scripts/film/kit';

const SECONDS = 12;
const ask = 'Set up the launch page.';

function Request({ t }: { t: number }) {
  if (t > 5.6) return null;
  const sent = t >= 2.4;
  return <AppWindow title="Agent" style={{ left: 256, top: 150, width: 640, height: 300, opacity: ease(t, .1, .5) * (1 - ease(t, 5, .5, curves.in)) }}>
    <div className="starter__chat">
      {sent && <p className="starter__bubble" style={rise(t, 2.45, Infinity, 8)}>{ask}</p>}
      <div className="starter__field"><span>{sent ? '' : typed(ask, t, .9)}</span><button type="button" className="starter__send" aria-label="Send">↑</button></div>
    </div>
  </AppWindow>;
}

function Lockup({ t }: { t: number }) {
  if (t < 9) return null;
  return <div className="starter__lockup" style={{ opacity: 1 - ease(t, SECONDS - .5, .5) }}>
    <p className="starter__name" style={rise(t, 9.2)}>Brand name</p>
    <p className="starter__line" style={rise(t, 9.5)}>One line from the brand contract.</p>
  </div>;
}

// Shots centre a world point at a zoom; the camera eases between them like a screen recorder's auto-zoom.
const shots: Shot[] = [{ at: 0, x: 576, y: 324, zoom: 1 }, { at: 1, x: 576, y: 324, zoom: 1 }, { at: 1.6, x: 560, y: 380, zoom: 1.4 }, { at: 2.8, x: 560, y: 380, zoom: 1.4 }, { at: 3.6, x: 576, y: 324, zoom: 1 }];
// Targeted stops are measured by aim(), so the pointer lands on the real button. An offset alone moves from the stop before.
const cursor: CursorPoint[] = [{ at: .5, target: '.starter__send', offset: [120, 80] }, { at: 2.3, target: '.starter__send', click: true }, { at: 2.9, offset: [30, 40] }];

function Film({ t }: { t: number }) {
  return <Stage>
    <Camera t={t} shots={shots}>
      <Request t={t} />
      {t >= 4.6 && t < 9.2 && <Terminal t={t} style={{ left: 266, top: 170, width: 620, height: 240, opacity: ease(t, 4.8, .5) * (1 - ease(t, 8.7, .5, curves.in)) }} lines={[{ command: 'npm run build', at: 5.4, result: '✓ built' }]} />}
      <Cursor t={t} path={cursor} />
    </Camera>
    <Lockup t={t} />
    <Caption t={t} start={.4} end={4.8}>Ask for it.</Caption>
    <Caption t={t} start={5} end={8.8}>Watch it happen.</Caption>
  </Stage>;
}

const style = document.createElement('style');
style.textContent = `
.starter__chat { display: grid; align-content: end; gap: 14px; height: 100%; box-sizing: border-box; padding: 20px; }
.starter__bubble { justify-self: end; padding: 10px 14px; border-radius: 14px; background: #f4f4f5; }
.starter__field { display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 12px 16px; border: 1px solid #e4e4e7; border-radius: 14px; font-size: 16px; }
.starter__send { width: 32px; height: 32px; border: 0; border-radius: 50%; background: #0a0a0a; color: #fff; font-size: 16px; }
.starter__lockup { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
.starter__name { font-size: 72px; font-weight: 600; letter-spacing: -.045em; }
.starter__line { margin-top: 14px !important; font-size: 26px; color: #52525b; }`;
document.head.append(style);

const root = createRoot(document.getElementById('film')!);
const cursors = [cursor];
declare global { interface Window { film: { seconds: number; posterAt: number }; seek: (t: number) => Promise<void>; aim: () => Promise<void> } }
window.film = { seconds: SECONDS, posterAt: 10.5 };
window.seek = async t => {
  flushSync(() => root.render(<Film t={t} />));
  hover(t, cursors);
  for (const animation of document.getAnimations()) { animation.pause(); animation.currentTime = t * 1000; }
  await document.fonts.ready;
};
window.aim = () => aim(cursors, shots, window.seek);
