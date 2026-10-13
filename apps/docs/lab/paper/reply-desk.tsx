'use client';

import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Clip, DESK, Greek, Pen, Sheet, barcode, cameraAt, deskTransform, kitCss, onDesk, penAt, splitWindow, useScrub, type Camera, type Frag, type PenPose, type Place, type Pt, type Stroke } from './kit';

/* Prototype: how a support reply gets made, drawn on a paper desk. A ticket comes in, Deskhand pulls three
   sources and highlights the line it uses in each, writes the reply, joins every claim to its line, and holds
   the refund at the limit. The author writes the story; where each part sits and when it moves lives here. */

export interface DeskStory {
  fig: string; title: string; alt: string; caption: string;
  ticket: { label: string; id: string; from: string; text: string };
  sources: { kind: string; title: string; form: 'article' | 'receipt' | 'page'; rows: { text: string; value?: string; cited?: boolean }[];
    days?: { from: number; to: number; of: number; label: string } }[];
  reply: { draft: string; held: string; parts: (string | { cite: number; text: string })[] };
  gate: { text: string; action: string; amount: number; limit: number; currency: string; limitLabel: string };
  steps: { label: string; readout: string }[];
  legend: { tone: 'lit' | 'subject'; label: string }[];
}

const WIDE: Camera[] = [
  { x: 505, y: 292, zoom: 1.8, tilt: 38, turn: -9 },
  { x: 500, y: 316, zoom: .96, tilt: 32, turn: -6 },
  { x: 505, y: 300, zoom: 1.01, tilt: 16, turn: -2 },
  { x: 515, y: 378, zoom: 1.32, tilt: 0, turn: 0 },
];
const NARROW: Camera[] = [
  { x: 505, y: 288, zoom: 2.2, tilt: 34, turn: -9 },
  { x: 500, y: 318, zoom: 1.12, tilt: 38, turn: -6 },
  { x: 505, y: 305, zoom: 1.12, tilt: 22, turn: -2 },
  { x: 505, y: 408, zoom: 2.15, tilt: 0, turn: 0 },
];
const REPLY: Place = { x: 340, y: 34, w: 330, r: .6 };
const TICKET: Place = { x: 56, y: 44, w: 250, r: -4, from: { dx: 330, dy: 196, r: -1.5 }, t: [.05, .42], lift: 70 };
const SOURCES: Place[] = [{ x: 46, y: 216, w: 252, r: -3 }, { x: 722, y: 42, w: 206, r: 3.5 }, { x: 704, y: 336, w: 254, r: -2 }]
  .map((at, k) => ({ ...at, from: { dx: 505 - at.x - at.w / 2, dy: 250 - at.y - 110, r: 0 }, t: [.12 + k * .07, .4 + k * .07] as [number, number] }));
const STICKY: Place = { x: 548, y: 512, w: 112, r: 3 };
const REST: PenPose = { at: [84, 576], lift: 0, rise: 0, turn: -7 };
const PEN_UP = .36, PEN_DOWN = 1.98;

/** Even windows for n strokes between two positions, each followed by a gap for the pen to travel. */
const windows = (n: number, from: number, to: number) => Array.from({ length: n }, (_, k) => {
  const each = (to - from) / n;
  return [from + k * each, from + k * each + each * .68] as [number, number];
});

const css = `
.pd { width: 100%; container-type: inline-size; }
.pd-ticket .pd-paper { display: grid; grid-template-columns: 42px 1fr; padding: 0; border-radius: 6px;
  mask: radial-gradient(circle 6px at 42px 0, #0000 96%, #000) top / 100% 51% no-repeat, radial-gradient(circle 6px at 42px 100%, #0000 96%, #000) bottom / 100% 51% no-repeat; }
.pd-stub { display: grid; place-items: center; padding: 22px 0 12px; border-right: 1px dashed var(--pd-hair); writing-mode: vertical-rl; font-size: 10px; letter-spacing: .16em; color: var(--bs-muted); }
.pd-stub::before { content: ""; position: absolute; top: 10px; left: 50%; width: 7px; height: 7px; margin-left: -3.5px; border-radius: 50%; background: var(--pd-pad); box-shadow: inset 0 1px 1.5px color-mix(in srgb, var(--pd-shade) calc(28% * var(--pd-s)), transparent); }
.pd-ticket__main { padding: 11px 14px 13px 13px; }
.pd-ticket__text { margin-top: 7px !important; font-size: 13px; line-height: 1.45; font-weight: 500; }
.pd-ticket .pd-greek { margin-top: 8px; font-size: 9px; }
.pd-reply { --g: clamp(0, calc((var(--p) - 2.12) * 2.4), 1); --held: clamp(0, calc((var(--p) - 2.5) * 6), 1); --show: clamp(0, calc((var(--p) - 2.02) * 6), 1); }
.pd-reply .pd-paper { padding: 13px 16px 0; font-size: 12px; line-height: 20px; border-radius: 12px; }
.pd-reply__head { display: grid; grid-template-columns: 26px 1fr auto; align-items: center; gap: 9px; padding-bottom: 10px; border-bottom: 1px solid var(--pd-hair); }
.pd-avatar { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--pd-hair); font-size: 11px; font-weight: 600; }
.pd-who { display: grid; line-height: 1.25; } .pd-who b { font-size: 12px; } .pd-who small { font-size: 9px; color: var(--bs-muted); }
.pd-status { display: grid; justify-items: end; font-size: 8.5px; letter-spacing: .06em; text-transform: uppercase; }
.pd-status > span { grid-area: 1 / 1; padding: 4px 8px; border-radius: 999px; line-height: 1; white-space: nowrap; }
.pd-status > span:first-child { box-shadow: inset 0 0 0 1px var(--pd-hair); color: var(--bs-muted); opacity: calc(1 - var(--held)); }
.pd-status > span:last-child { background: var(--bs-ink); color: var(--bs-elevated); opacity: var(--held); }
.pd-quote { margin: 11px 0 2px !important; padding: 7px 10px; border-radius: 7px; background: color-mix(in srgb, var(--bs-surface), var(--bs-ink) 4%); box-shadow: inset 2px 0 0 var(--pd-hair);
  color: var(--bs-muted); font-size: 10.5px; line-height: 1.45; opacity: clamp(0, calc((var(--p) - .3) * 6), 1); }
.pd-body { min-height: 120px; padding-top: 6px; background: repeating-linear-gradient(transparent 0 19px, var(--pd-rule) 19px 20px) content-box; }
.pd-word { opacity: clamp(0, calc((var(--p) - var(--wa)) * 10), 1); }
.pd-body sup { margin-left: 1px; font: 600 8px/0 ui-monospace, SFMono-Regular, Menlo, monospace; vertical-align: 5px; }
.pd-gate { margin: 12px -16px 0; padding: 8px 16px 14px; border-top: 1px solid var(--pd-hair); }
.pd-gauge { position: relative; height: 38px; opacity: var(--show); }
.pd-gauge > * { position: absolute !important; }
.pd-gauge__track { left: 0; right: 0; top: 14px; height: 8px; border-radius: 2px; box-shadow: inset 0 0 0 1px var(--pd-hair); }
.pd-gauge__track::after { content: ""; position: absolute; left: 0; right: 0; top: 10px; height: 4px; border-right: 1px solid var(--pd-hair); background: repeating-linear-gradient(90deg, var(--pd-hair) 0 1px, transparent 1px 10%); }
.pd-gauge__fill { left: 0; top: 14px; height: 8px; width: calc(min(var(--g) * var(--amount), var(--limit)) * 100%); border-radius: 2px 0 0 2px; background: color-mix(in srgb, var(--bs-ink) 30%, transparent); }
.pd-gauge__over { left: calc(var(--limit) * 100%); top: 13px; height: 10px; width: calc(max(0, var(--g) * var(--amount) - var(--limit)) * 100%); background: var(--bs-accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bs-on-accent) 35%, transparent); }
.pd-gauge__limit { left: calc(var(--limit) * 100%); top: 0; height: 26px; padding-left: 4px; border-left: 1.5px solid var(--bs-ink); font-size: 8.5px; line-height: 1; letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; }
.pd-gauge__value { top: 27px; left: calc(var(--g) * var(--amount) * 100%); translate: -100% 0; padding-right: 1px; font-size: 9px; font-weight: 600; line-height: 1; white-space: nowrap; opacity: var(--g); }
.pd-gate__row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 4px; font-size: 11px; line-height: 1.35; }
.pd-gate__text { opacity: var(--show); }
.pd-send { flex: none; opacity: clamp(0, calc((var(--p) - 1.3) * 5), 1); padding: 6px 12px; border-radius: 999px; background: var(--bs-ink); color: var(--bs-elevated); font-size: 11px; font-weight: 500; line-height: 1.2; white-space: nowrap;
  box-shadow: 0 0 0 calc(var(--held) * 3px) var(--bs-accent), 0 0 0 calc(var(--held) * 4px) color-mix(in srgb, var(--bs-on-accent) 30%, transparent); }
.pd-src .pd-paper { font-size: 10.5px; line-height: 15px; }
.pd-src__top { justify-content: flex-start !important; margin-bottom: 8px !important; }
.pd-seal { display: inline-flex; align-items: center; justify-content: center; gap: 2px; width: 15px; height: 15px; border-radius: 4px; background: var(--bs-accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bs-on-accent) 35%, transparent); }
.pd-seal i { width: 2.6px; height: 2.6px; border-radius: 50%; background: var(--bs-on-accent); }
.pd-src h4 { margin: 0 0 6px; font-size: 13px; line-height: 17px; font-weight: 600; letter-spacing: -.01em; }
.pd-src .pd-greek { margin: 0 0 6px; }
.pd-src p + p { margin-top: 5px; }
.pd-src p:not(.pd-hl) { color: var(--bs-muted); }
.pd-article { --stack: color-mix(in srgb, var(--bs-elevated), var(--bs-ink) 3%); }
.pd-article::before, .pd-article::after { content: ""; position: absolute; inset: 0; z-index: -1; border-radius: 10px; background: var(--stack); box-shadow: inset 0 0 0 1px var(--pd-hair); }
.pd-article::before { transform: translate(4px, 5px) rotate(1.3deg); } .pd-article::after { transform: translate(7px, 9px) rotate(-.7deg); }
.pd-receipt .pd-paper { padding: 16px 14px 26px; border-radius: 3px 3px 0 0; font: 10px/17px ui-monospace, SFMono-Regular, Menlo, monospace; --tooth: 7px;
  mask: linear-gradient(#000 0 0) top / 100% calc(100% - var(--tooth)) no-repeat, conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / calc(var(--tooth) * 2) var(--tooth) repeat-x; }
.pd-receipt h4 { margin-bottom: 8px; font: 600 15px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0; }
.pd-receipt .pd-paper p + p { margin-top: 0; }
.pd-line { display: flex; align-items: baseline; gap: 4px; }
.pd-line i { flex: 1; min-width: 8px; border-bottom: 1px dotted var(--pd-hair); }
.pd-barcode { display: block; width: 132px; height: 26px; margin: 12px auto 0; }
.pd-receipt .pd-clip { right: 28px; top: -20px; }
.pd-page .pd-paper { clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%); }
.pd-page .pd-paper > .pd-fold { position: absolute; right: 0; top: 0; width: 22px; height: 22px; border-bottom-left-radius: 4px;
  background: linear-gradient(to bottom left, transparent 50%, color-mix(in srgb, var(--bs-elevated), var(--bs-ink) 9%) 50%); box-shadow: -1px 1px 2px color-mix(in srgb, var(--pd-shade) calc(10% * var(--pd-s)), transparent); }
.pd-days { --h: clamp(0, calc((var(--p) - var(--a)) / .1), 1); display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 3px; margin-top: 9px; }
.pd-days span { display: grid; place-items: center; height: 17px; border-radius: 3px; box-shadow: inset 0 0 0 1px var(--pd-hair); font: 8.5px/1 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--bs-muted); }
.pd-days span[data-on] { background: color-mix(in srgb, var(--bs-accent) calc(var(--h) * 60%), transparent); color: color-mix(in srgb, var(--bs-on-accent) calc(var(--h) * 100%), var(--bs-muted)); }
.pd-days-cap { margin-top: 4px !important; font: 8px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .06em; text-transform: uppercase; color: var(--bs-muted); }
.pd-sticky .pd-paper { padding: 17px 12px 13px; border-radius: 2px; color: var(--bs-on-accent); box-shadow: none;
  background: linear-gradient(135deg, transparent 78%, color-mix(in srgb, var(--pd-shade) 8%, transparent)), var(--pd-sticky); }
.pd-sticky .pd-paper::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 12px; background: color-mix(in srgb, #000 4%, transparent); }
.pd-sticky .pd-kicker { color: color-mix(in srgb, var(--bs-on-accent) 70%, transparent); }
.pd-sticky__value { margin-top: 5px !important; font-size: 22px; font-weight: 600; line-height: 1; letter-spacing: -.02em; }
@container (max-width: 520px) { .pd-view { aspect-ratio: 4 / 3; } }
`;

const Seal = ({ n }: { n: number }) => <span className="pd-seal">{Array.from({ length: n }, (_, k) => <i key={k} />)}</span>;

export function ReplyDesk({ story, position, onStepChange, playLabel = 'Play', pauseLabel = 'Pause' }: {
  story: DeskStory; position?: number; onStepChange?: (step: number) => void; playLabel?: string; pauseLabel?: string;
}) {
  const id = useId();
  const { ticket, sources, reply, gate } = story;
  const claims = reply.parts.filter(part => typeof part !== 'string');
  const sourceWindows = windows(sources.length, .5, 1), claimWindows = windows(claims.length, 1.42, 1.86);
  const win: Record<string, [number, number]> = {};
  sources.forEach((_, k) => { win[`src-${k + 1}`] = sourceWindows[k]!; });
  claims.forEach((claim, k) => { win[`claim-${claim.cite}`] = claimWindows[k]!; });
  const scale = Math.ceil(Math.max(gate.amount, gate.limit) * 1.15 / 10) * 10;
  const money = (n: number, digits = 2) => `${gate.currency}${n.toFixed(digits)}`;
  const read = (p: number) => {
    if (p < sourceWindows[0]![0]) return `${ticket.id} · from ${ticket.from}`;
    if (p < claimWindows[0]![0] - .1) return `sources read ${sourceWindows.filter(w => p >= w[1]).length} of ${sources.length}`;
    if (p < 2.05) return `claims cited ${claimWindows.filter(w => p >= w[1]).length} of ${claims.length}`;
    const g = Math.max(0, Math.min(1, (p - 2.12) * 2.4));
    return g < 1 ? `refund ${money(gate.amount * g)} · limit ${money(gate.limit)}` : `${money(gate.amount)} over ${money(gate.limit, 0)} limit · held`;
  };

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [links, setLinks] = useState<{ key: string; d: string; ring: Pt; dot: Pt; a: number }[]>([]);
  const view = useRef<HTMLDivElement>(null), desk = useRef<HTMLDivElement>(null), pen = useRef<HTMLDivElement>(null), shade = useRef<HTMLDivElement>(null), readout = useRef<HTMLOutputElement>(null);
  const geo = useRef({ fit: .685, cams: WIDE, strokes: [] as Stroke[] });

  const paint = (p: number) => {
    const g = geo.current;
    if (!desk.current || !pen.current || !shade.current) return;
    desk.current.style.setProperty('--p', p.toFixed(4));
    desk.current.style.transform = deskTransform(cameraAt(g.cams, p), g.fit);
    const pose = penAt(p, REST, g.strokes, PEN_UP, PEN_DOWN);
    pen.current.style.transform = `translate3d(${pose.at[0]}px, ${pose.at[1]}px, ${1.5 + pose.lift}px) rotateZ(${pose.turn}deg) rotateY(${-pose.rise}deg)`;
    shade.current.style.transform = `translate3d(${pose.at[0] + pose.lift * .25}px, ${pose.at[1] + pose.lift * .5}px, .5px) rotateZ(${pose.turn}deg) scaleX(${Math.cos(pose.rise * Math.PI / 180)})`;
    shade.current.style.filter = `blur(${1.2 + pose.lift * .14}px)`;
    shade.current.style.opacity = String(1 - pose.lift / 110);
    if (readout.current) readout.current.textContent = read(p);
  };
  const scrub = useScrub({ steps: story.steps.length, paint, position, onStepChange });

  // Measure every resting sheet and highlighted line once with all motion switched off, then draw from those numbers.
  useLayoutEffect(() => {
    const root = desk.current, frame = view.current;
    if (!root || !frame) return;
    const measure = () => {
      root.classList.add('pd-measure');
      const origin = root.getBoundingClientRect();
      const sheets: Record<string, { x: number; y: number; w: number; h: number; r: number; px: number; py: number }> = {};
      root.querySelectorAll<HTMLElement>('[data-sheet]').forEach(el => {
        const box = el.getBoundingClientRect(), paper = el.querySelector('.pd-paper')!.getBoundingClientRect();
        sheets[el.dataset.sheet!] = { x: box.left - origin.left, y: box.top - origin.top, w: box.width, h: box.height, r: Number(el.dataset.turn), px: paper.left - box.left, py: paper.top - box.top };
      });
      const found: Stroke[] = [];
      root.querySelectorAll<HTMLElement>('[data-stroke]').forEach(el => {
        const key = el.dataset.stroke!, home = el.closest<HTMLElement>('[data-sheet]')!, sheet = sheets[home.dataset.sheet!]!, slot = win[key];
        if (!slot) return;
        const box = home.getBoundingClientRect();
        const rects = [...el.getClientRects()].filter(r => r.width > 1).map(r => ({ x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }));
        const frags = splitWindow(rects, slot[0], slot[1]);
        found.push({ key, sheet: home.dataset.sheet!, frags: frags.map(f => ({ ...f, x: f.x - sheet.px, y: f.y - sheet.py })),
          path: frags.map(f => [onDesk(sheet, [f.x, f.y + f.h / 2]), onDesk(sheet, [f.x + f.w, f.y + f.h / 2])] as [Pt, Pt]) });
      });
      root.classList.remove('pd-measure');
      found.sort((a, b) => a.frags[0]!.a - b.frags[0]!.a);
      const answer = sheets.reply!, floor: Record<string, number> = {};
      setLinks(found.filter(s => s.key.startsWith('claim-')).flatMap(claim => {
        const source = found.find(s => s.key === `src-${claim.key.slice(6)}`), sheet = source && sheets[source.sheet];
        if (!source || !sheet) return [];
        // Each ring sits level with the claim's longest line; rings on one edge keep 14px apart.
        const left = sheet.x + sheet.w / 2 < answer.x + answer.w / 2, end = claim.frags.at(-1)!;
        const line = claim.frags.reduce((a, b) => (b.w > a.w ? b : a)), side = left ? 'left' : 'right';
        const y = Math.max(line.y + answer.py + line.h / 2, (floor[side] ?? -Infinity) + 14);
        floor[side] = y;
        const row = left ? source.frags.reduce((a, b) => (b.x + b.w > a.x + a.w ? b : a)) : source.frags.reduce((a, b) => (b.x < a.x ? b : a));
        const ring = onDesk(answer, [left ? 0 : answer.w, y]);
        const dot = onDesk(sheet, [left ? row.x + sheet.px + row.w + 5 : row.x + sheet.px - 5, row.y + sheet.py + row.h / 2]);
        const bend = (dot[0] - ring[0]) * .5;
        return [{ key: claim.key, ring, dot, a: end.b, d: `M${ring[0]} ${ring[1]}C${ring[0] + bend} ${ring[1]} ${dot[0] - bend} ${dot[1]} ${dot[0]} ${dot[1]}` }];
      }));
      setStrokes(found);
      geo.current.strokes = found;
      paint(scrub.now());
    };
    const fit = () => {
      const g = geo.current;
      g.fit = frame.clientWidth / DESK.w;
      g.cams = frame.clientWidth < 520 ? NARROW : WIDE;
      frame.style.perspective = `${1500 * g.fit}px`;
      paint(scrub.now());
    };
    measure();
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [story]);

  const marks = (sheet: string): Frag[] => strokes.filter(s => s.sheet === sheet).flatMap(s => s.frags);
  const span = (key: string) => ({ '--a': win[key]?.[0] ?? 9, '--b': win[key]?.[1] ?? 10 }) as CSSProperties;
  const rest = penAt(0, REST, [], PEN_UP, PEN_DOWN);

  return <figure className="bs-figure pd">
    <style>{kitCss + css}</style>
    <div className="bs-figure__card">
      <p className="bs-figure__head"><span>{story.fig}</span><span>{story.title}</span></p>
      <div ref={view} className="bs-figure__stage pd-view" id={`${id}-stage`} role="tabpanel" aria-label={story.alt} {...scrub.stage}>
        <div ref={desk} className="pd-desk" aria-hidden="true" style={{ transform: deskTransform(WIDE[0]!, .685) }}>
          <div className="pd-pad"><i /><i /><i /><i /></div>
          <Sheet name="sticky" at={STICKY} className="pd-sticky"><p className="pd-kicker">{gate.limitLabel}</p><p className="pd-sticky__value pd-mono">{money(gate.limit, 0)}</p></Sheet>
          {sources.slice(0, SOURCES.length).map((source, k) => {
            const n = k + 1, key = `src-${n}`;
            const top = <p className="pd-kicker pd-src__top"><Seal n={n} /><span>{source.kind}</span></p>;
            if (source.form === 'receipt') return <Sheet key={key} name={key} at={SOURCES[k]!} className="pd-src pd-receipt" marks={marks(key)} after={<Clip />}>
              {top}
              <h4>{source.title}</h4>
              {source.rows.map(row => <p key={row.text} className={`pd-line${row.cited ? ' pd-hl' : ''}`} data-stroke={row.cited ? key : undefined} style={row.cited ? span(key) : undefined}>
                <span>{row.text}</span><i /><span>{row.value}</span>
              </p>)}
              <span className="pd-barcode" style={{ background: barcode(n * 31) }} />
            </Sheet>;
            return <Sheet key={key} name={key} at={SOURCES[k]!} className={`pd-src pd-${source.form}`} marks={marks(key)}>
              {source.form === 'page' && <i className="pd-fold" />}
              {top}
              <h4>{source.title}</h4>
              <Greek seed={n * 17} lines={2} />
              {source.rows.map(row => <p key={row.text} className={row.cited ? 'pd-hl' : undefined} style={row.cited ? span(key) : undefined}>
                <span data-stroke={row.cited ? key : undefined}>{row.text}</span>
              </p>)}
              {source.days && <>
                <div className="pd-days" style={{ ...span(key), '--a': win[key]?.[1] ?? 9, '--n': source.days.of } as CSSProperties}>
                  {Array.from({ length: source.days.of }, (_, d) => <span key={d} data-on={d + 1 >= source.days!.from && d + 1 <= source.days!.to || undefined}>{d + 1}</span>)}
                </div>
                <p className="pd-days-cap">{source.days.label}</p>
              </>}
            </Sheet>;
          })}
          <Sheet name="reply" at={REPLY} className="pd-reply" marks={marks('reply')}>
            <div className="pd-reply__head">
              <span className="pd-avatar">{ticket.from[0]}</span>
              <span className="pd-who"><b>{ticket.from}</b><small className="pd-mono">Re: {ticket.id}</small></span>
              <span className="pd-status pd-mono"><span>{reply.draft}</span><span>{reply.held}</span></span>
            </div>
            <p className="pd-quote">{ticket.text}</p>
            <p className="pd-body">{reply.parts.map((part, k) => {
              const style = { '--wa': 1.06 + k * (.36 / Math.max(1, reply.parts.length - 1)) } as CSSProperties;
              return typeof part === 'string'
                ? <span key={k} className="pd-word" style={style}>{part} </span>
                : <span key={k} className="pd-word" style={style}><span className="pd-hl" data-stroke={`claim-${part.cite}`} style={span(`claim-${part.cite}`)}>{part.text}</span><sup>{part.cite}</sup> </span>;
            })}</p>
            <div className="pd-gate" style={{ '--amount': gate.amount / scale, '--limit': gate.limit / scale } as CSSProperties}>
              <div className="pd-gauge">
                <span className="pd-gauge__track" /><span className="pd-gauge__fill" /><span className="pd-gauge__over" />
                <span className="pd-gauge__limit pd-mono">Limit {money(gate.limit, 0)}</span>
                <span className="pd-gauge__value pd-mono">{money(gate.amount)}</span>
              </div>
              <div className="pd-gate__row"><span className="pd-gate__text">{gate.text}</span><span className="pd-send">{gate.action}</span></div>
            </div>
          </Sheet>
          <Sheet name="ticket" at={TICKET} className="pd-ticket">
            <span className="pd-stub pd-mono">{ticket.id}</span>
            <div className="pd-ticket__main">
              <p className="pd-kicker"><span>{ticket.label}</span><span>{ticket.from}</span></p>
              <p className="pd-ticket__text">{ticket.text}</p>
              <Greek seed={5} lines={1} words={4} />
            </div>
          </Sheet>
          <svg className="pd-links">
            {links.map(link => <g key={link.key} style={{ '--a': link.a } as CSSProperties}>
              <path d={link.d} pathLength={1} />
              <circle className="pd-ring" cx={link.ring[0]} cy={link.ring[1]} r={3.6} />
              <circle className="pd-dot" cx={link.dot[0]} cy={link.dot[1]} r={2.6} />
            </g>)}
          </svg>
          <div ref={shade} className="pd-pen-shadow" style={{ transform: `translate3d(${rest.at[0]}px, ${rest.at[1]}px, .5px) rotateZ(${rest.turn}deg)` }} />
          <div ref={pen} className="pd-pen" style={{ transform: `translate3d(${rest.at[0]}px, ${rest.at[1]}px, 1.5px) rotateZ(${rest.turn}deg)` }}><Pen id={id.replace(/:/g, '')} /></div>
        </div>
      </div>
      <div className="pd-foot">
        <button type="button" className="bs-figure__play" hidden={!scrub.ready} onClick={scrub.play}>
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d={scrub.playing ? 'M2.5 1.5H5v9H2.5zM7 1.5h2.5v9H7z' : 'M3 1.5v9l7.5-4.5z'} /></svg>{scrub.playing ? pauseLabel : playLabel}
        </button>
        <output ref={readout} className="pd-readout" aria-live="off">{read(0)}</output>
      </div>
    </div>
    <div className="bs-figure__steps" role="tablist" aria-label={story.title} aria-orientation="vertical" onKeyDown={scrub.onKeyDown}>
      {story.steps.map((step, index) => <button key={step.label} ref={tab => { scrub.tabs.current[index] = tab; }} type="button" role="tab" aria-controls={`${id}-stage`}
        aria-selected={index === scrub.selected} tabIndex={index === scrub.selected ? 0 : -1} onClick={() => scrub.choose(index)}>
        <b>{index + 1}</b><span>{step.label}</span><small>{step.readout}</small>
      </button>)}
    </div>
    <ul className="bs-figure__legend">{story.legend.map(key => <li key={key.label}><i data-tone={key.tone} />{key.label}</li>)}</ul>
    <figcaption>{story.caption}</figcaption>
  </figure>;
}
