"use client";

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { fit2d, useVisibleLoop } from './canvas.js';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';
const voiceLabels: Record<VoiceState, string> = { idle: 'Ready', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking' };

type Point = [number, number, number];
const TAU = Math.PI * 2;
// Points spread evenly over a sphere (Fibonacci lattice), cached by count.
const lattices = new Map<number, Point[]>();
function lattice(count: number) {
  let points = lattices.get(count);
  if (!points) {
    points = Array.from({ length: count }, (_, i) => {
      const y = 1 - (i + .5) / count * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996;
      return [Math.cos(a) * r, y, Math.sin(a) * r] as Point;
    });
    lattices.set(count, points);
  }
  return points;
}
function normalise([x, y, z]: Point): Point { const length = Math.hypot(x, y, z); return [x / length, y / length, z / length]; }
// Seven orbit planes with normals from the lattice, so they spread evenly; neighbours turn opposite ways.
const orbits = lattice(7).map(([x, y, z], i) => {
  const u = normalise(Math.abs(y) < .9 ? [-z, 0, x] : [0, z, -y]), v: Point = [y * u[2] - z * u[1], z * u[0] - x * u[2], x * u[1] - y * u[0]];
  return { u, v, speed: (.11 + i * .02) * (i % 2 ? -1 : 1) };
});
// Outlines for the morph shape, each walked clockwise from the top so every dot keeps its place between shapes.
type Outline = (s: number) => [number, number];
function polygon(sides: number, size: number, drop: number, spin: number, s: number): [number, number] {
  const corner = (k: number): [number, number] => { const a = Math.PI / 2 + spin - k / sides * TAU; return [Math.cos(a) * size, Math.sin(a) * size - drop]; };
  const along = s % 1 * sides, edge = Math.floor(along), f = along - edge, [ax, ay] = corner(edge), [bx, by] = corner(edge + 1);
  return [ax + (bx - ax) * f, ay + (by - ay) * f];
}
const outlines: Outline[] = [
  s => { const a = Math.PI / 2 - s * TAU; return [Math.cos(a) * .92, Math.sin(a) * .92]; },
  s => polygon(3, 1.08, .14, 0, s),
  // The square's first corner sits top left, so starting an eighth of the way round puts its first dot at the top.
  s => polygon(4, 1.12, 0, Math.PI / 4, s + .125),
];

export type VoiceOrbShape = 'network' | 'meridians' | 'ribbon' | 'morph';

/** Draws one frame of the orb: ink dots on a sphere, with depth shown only by dot size and opacity. */
function drawOrb(context: CanvasRenderingContext2D, size: number, state: VoiceState, t: number, level: number, ink: string, shape?: VoiceOrbShape) {
  // Below 64 px the orb draws fewer dots, and dots stop shrinking with the orb, so it stays crisp.
  const radius = size * .4, centre = size / 2, small = size < 64, unit = Math.max(size / 120, .65);
  let cosY = 1, sinY = 0, cosP = 1, sinP = 0;
  const view = (yaw: number, pitch: number) => { cosY = Math.cos(yaw); sinY = Math.sin(yaw); cosP = Math.cos(pitch); sinP = Math.sin(pitch); };
  const turn = ([x, y, z]: Point): Point => {
    const x1 = x * cosY + z * sinY, z1 = -x * sinY + z * cosY;
    return [x1, y * cosP - z1 * sinP, y * sinP + z1 * cosP];
  };
  // Depth runs from 0 at the back to 1 at the front; the back shrinks and fades.
  const dot = ([x, y, z]: Point, r: number, alpha: number) => {
    const depth = (z + 1) / 2;
    context.globalAlpha = Math.min(1, alpha * (.35 + .65 * depth));
    context.beginPath(); context.arc(centre + x * radius, centre - y * radius, r * unit * (.6 + .4 * depth), 0, TAU); context.fill();
  };
  context.clearRect(0, 0, size, size);
  context.fillStyle = ink; context.strokeStyle = ink;
  // A chosen shape replaces the state's own look; idle runs it at half speed and the voice level swells its dots.
  const swell = 1 + .6 * level;
  if (shape && state === 'idle') t /= 2;
  if (shape === 'network') {
    // Dots on a sphere joined to their near neighbours; each node pulses in turn.
    view(t * .2, .3);
    const nodes = lattice(small ? 16 : 40).map(turn), reach = small ? .95 : .62;
    context.lineWidth = .6 * unit;
    nodes.forEach((a, i) => nodes.slice(i + 1).forEach(b => {
      if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > reach) return;
      context.globalAlpha = .12 + .38 * ((a[2] + b[2]) / 2 + 1) / 2;
      context.beginPath(); context.moveTo(centre + a[0] * radius, centre - a[1] * radius); context.lineTo(centre + b[0] * radius, centre - b[1] * radius); context.stroke();
    }));
    nodes.forEach((node, i) => { const pulse = Math.max(0, Math.sin(t * 1.6 - i * .9)) ** 4; dot(node, (1 + .9 * (i * 5 % 7) / 6 + 1.6 * pulse) * swell, 1); });
  } else if (shape === 'meridians') {
    // Vertical lines of dots round a sphere; the dots slide up and down their lines in a slow weave.
    view(t * .35, .22);
    const lines = small ? 6 : 9, rows = small ? 7 : 11;
    for (let m = 0; m < lines; m++) for (let j = 0; j < rows; j++) {
      const lon = m / lines * TAU, lat = ((j + .5) / rows - .5) * 2.9 + .08 * Math.sin(t * 1.8 + m * 1.1);
      dot(turn([Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)]), 1.8 * swell, 1);
    }
  } else if (shape === 'ribbon') {
    // A wide band of short strokes wrapped round a sphere; it rolls and twists slowly.
    view(t * .3, .55);
    const cols = small ? 32 : 60, rows = small ? 3 : 7, at = (a: number, lat: number) => turn([Math.cos(lat) * Math.cos(a), Math.sin(lat), Math.cos(lat) * Math.sin(a)]);
    context.lineCap = 'round';
    for (let k = 0; k < cols; k++) for (let j = 0; j < rows; j++) {
      const a = k / cols * TAU, lat = (j / (rows - 1) - .5) * .7 + .22 * Math.sin(2 * a + t * .8), top = at(a, lat + .05), low = at(a, lat - .05);
      const depth = (top[2] + 1) / 2;
      context.globalAlpha = .12 + .88 * depth * depth; context.lineWidth = unit * (.5 + 1.1 * depth) * swell;
      context.beginPath(); context.moveTo(centre + top[0] * radius, centre - top[1] * radius); context.lineTo(centre + low[0] * radius, centre - low[1] * radius); context.stroke();
    }
  } else if (shape === 'morph') {
    // A ring of dots that holds a circle, then re-forms into a triangle and a square, easing between them.
    const count = small ? 24 : 36, hold = 1.4, move = .9, step = t % ((hold + move) * 3) / (hold + move), index = Math.floor(step);
    const from = outlines[index % 3]!, to = outlines[(index + 1) % 3]!, f = Math.max(0, (step % 1 * (hold + move) - hold) / move);
    const ease = f < .5 ? 4 * f ** 3 : 1 - (2 - 2 * f) ** 3 / 2;
    context.globalAlpha = 1;
    for (let i = 0; i < count; i++) {
      const [px, py] = from(i / count), [qx, qy] = to(i / count);
      context.beginPath(); context.arc(centre + (px + (qx - px) * ease) * radius, centre - (py + (qy - py) * ease) * radius, 1.5 * unit * swell, 0, TAU); context.fill();
    }
  } else if (state === 'thinking') {
    // Dots of mixed sizes run round tilted orbits; the orbits show as faint dotted paths.
    view(t * .12, .35);
    orbits.forEach(({ u, v, speed }, i) => {
      const at = (a: number) => { const c = Math.cos(a), s = Math.sin(a); return turn([u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s]); };
      if (!small) for (let j = 0; j < 48; j++) dot(at(j / 48 * TAU), .5, .3);
      const count = small ? 2 : 5;
      for (let k = 0; k < count; k++) dot(at(k / count * TAU + i * 1.3 + t * speed * TAU), 1.1 + 1.4 * ((i * 3 + k * 5) % 7) / 6, 1);
    });
  } else if (state === 'listening') {
    // Rows of dots round a sphere; a wave runs up through the rows and grows with the voice.
    view(t * .25, .3);
    const rows = small ? 5 : 9, lift = .03 + .1 * level, swell = .3 + .9 * level;
    for (let row = 0; row < rows; row++) {
      const lat = (row / (rows - 1) - .5) * 2.4, count = Math.round((small ? 12 : 26) * Math.cos(lat));
      const wave = Math.sin(lat * 2.4 - t * 3.4), push = Math.max(0, wave), r = 1 + lift * wave, ring = Math.cos(lat) * r;
      for (let j = 0; j < count; j++) {
        const a = j / count * TAU + row * .35;
        dot(turn([ring * Math.cos(a), Math.sin(lat) * r, ring * Math.sin(a)]), 1.5 * (1 + swell * push), .8 + .2 * push);
      }
    }
  } else if (state === 'speaking') {
    // A lattice sphere; rings of larger, darker dots spread from its face towards the rim, stronger as the voice rises.
    view(t * .2, .3);
    const strength = .4 + .6 * level;
    for (const point of lattice(small ? 60 : 200)) {
      const [x, y, z] = turn(point), away = Math.acos(Math.max(-1, Math.min(1, z)));
      const wave = Math.max(0, Math.sin(away * 4 - t * 5)) ** 2 * strength, grow = 1 + .06 * wave;
      dot([x * grow, y * grow, z], 1.2 + 1.5 * wave, .65 + .35 * wave);
    }
  } else {
    // At rest: a ring of short dashes, nearly face on, that breathes and slowly bends out of round.
    view(Math.sin(t * .35) * .3, .35);
    const breathe = 1 + .035 * Math.sin(t * TAU / 4.2), count = small ? 24 : 52;
    context.lineCap = 'round';
    for (let j = 0; j < count; j++) {
      const a = j / count * TAU, bend = breathe * (1 + .05 * Math.sin(2 * a + t * .9) + .035 * Math.sin(3 * a - t * 1.3));
      const inner = turn([Math.cos(a) * bend * .87, Math.sin(a) * bend * .87, 0]), outer = turn([Math.cos(a) * bend, Math.sin(a) * bend, 0]);
      const depth = (outer[2] + 1) / 2;
      context.globalAlpha = .35 + .65 * depth;
      context.lineWidth = unit * (1.1 + 1.5 * depth);
      context.beginPath(); context.moveTo(centre + inner[0] * radius, centre - inner[1] * radius); context.lineTo(centre + outer[0] * radius, centre - outer[1] * radius); context.stroke();
    }
  }
  context.globalAlpha = 1;
}

/**
 * The face of a voice agent: a sphere of ink dots. A wave runs through it with `level` (0 to 1, from the microphone) while
 * listening, dots orbit while thinking, ripples spread with the agent's voice while speaking and a ring breathes at rest.
 * `shape` swaps in another look for every state: a network, meridians, a ribbon or a ring that morphs between shapes.
 * The state is announced in words. It pauses off screen, and under reduced motion it holds still but follows the level.
 */
export function VoiceOrb({ state = 'idle', level = 0, size = 120, shape, label, className = '' }: { state?: VoiceState; level?: number; size?: number; shape?: VoiceOrbShape; label?: string; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ state, shape, level: 0, heard: 0 });
  live.current.state = state;
  live.current.shape = shape;
  live.current.level = Math.max(0, Math.min(1, level));
  const wake = useVisibleLoop(canvas, time => {
    const surface = canvas.current, fitted = surface && fit2d(surface);
    if (!surface || !fitted) return false;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches, now = live.current;
    // Ease towards the level so a jumpy microphone still reads as a smooth swell.
    now.heard += (now.level - now.heard) * (still ? 1 : .25);
    drawOrb(fitted.context, fitted.width, now.state, still ? .6 : time / 1000, now.heard, getComputedStyle(surface).color, now.shape);
    return !still;
  });
  useEffect(() => wake.current(), [state, shape, level, wake]);
  return <div role="status" className={`bs-orb ${className}`} data-state={state} style={{ '--bs-orb-size': `${size}px` } as CSSProperties}>
    <canvas ref={canvas} className="bs-orb__canvas" aria-hidden="true" />
    {label ? <span className="bs-orb__label">{label}</span> : <span className="bs-sr-only">{voiceLabels[state]}</span>}
  </div>;
}

/**
 * A microphone button. While on, five bars follow your voice and `onLevel` reports the loudness so a VoiceOrb can follow it too.
 * It only captures sound; pass what you hear to your own speech recognition. If the browser blocks the microphone, it says so.
 */
export function DictationButton({ listening, onListeningChange, onLevel, mode = 'toggle', label, blockedLabel = 'Microphone blocked', className = '' }: {
  listening?: boolean; onListeningChange?: (listening: boolean) => void; onLevel?: (level: number) => void;
  mode?: 'toggle' | 'hold'; label?: string; blockedLabel?: string; className?: string;
}) {
  const [own, setOwn] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const on = listening ?? own;
  const bars = useRef<HTMLSpanElement>(null);
  const callbacks = useRef({ onListeningChange, onLevel, controlled: listening !== undefined });
  callbacks.current = { onListeningChange, onLevel, controlled: listening !== undefined };
  const set = (next: boolean) => { if (!callbacks.current.controlled) setOwn(next); callbacks.current.onListeningChange?.(next); };
  const setRef = useRef(set);
  setRef.current = set;

  useEffect(() => {
    if (!on) return;
    let cancelled = false, frame = 0;
    let stream: MediaStream | undefined, audio: AudioContext | undefined;
    const paint = (levels: number[]) => levels.forEach((value, index) => bars.current?.style.setProperty(`--l${index}`, value.toFixed(3)));
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        if (!cancelled) { setBlocked(true); setRef.current(false); }
        return;
      }
      if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
      setBlocked(false);
      audio = new AudioContext();
      const analyser = audio.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = .75;
      audio.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        // Speech sits in the lower bins; five bands across them drive the bars.
        const levels = [0, 1, 2, 3, 4].map(band => {
          let sum = 0;
          for (let bin = 2 + band * 6; bin < 8 + band * 6; bin++) sum += data[bin];
          return Math.min(1, sum / 6 / 200);
        });
        paint(levels);
        callbacks.current.onLevel?.(levels.reduce((total, value) => total + value, 0) / levels.length);
        frame = requestAnimationFrame(tick);
      };
      tick();
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach(track => track.stop());
      audio?.close();
      paint([0, 0, 0, 0, 0]);
      callbacks.current.onLevel?.(0);
    };
  }, [on]);

  const hold = mode === 'hold';
  const press = hold ? {
    onPointerDown: () => set(true), onPointerUp: () => set(false), onPointerCancel: () => set(false), onPointerLeave: () => { if (on) set(false); },
    onKeyDown: (event: KeyboardEvent) => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); set(true); } },
    onKeyUp: (event: KeyboardEvent) => { if (event.key === ' ' || event.key === 'Enter') set(false); },
  } : { onClick: () => set(!on) };
  return <span className={`bs-dictate ${className}`} data-on={on || undefined}>
    <button type="button" className="bs-dictate__button" aria-pressed={on} aria-label={label ?? (hold ? 'Hold to talk' : 'Dictate')} {...press}>
      <svg className="bs-dictate__mic" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M8 1.75a2 2 0 0 1 2 2v3.5a2 2 0 0 1-4 0v-3.5a2 2 0 0 1 2-2zM4 7.25a4 4 0 0 0 8 0M8 11.25v3" />
      </svg>
      <span ref={bars} className="bs-dictate__bars" aria-hidden="true">{[0, 1, 2, 3, 4].map(index => <i key={index} style={{ '--n': index } as CSSProperties} />)}</span>
    </button>
    <span className="bs-dictate__note" role="status">{blocked ? blockedLabel : ''}</span>
  </span>;
}

/**
 * Words as they are spoken. Settled words take full ink as they land; the guess still being worked out stays faded
 * after them. Screen readers hear each settled phrase once, never the guesses.
 */
export function LiveTranscript({ text, interim = '', listening = false, placeholder = 'Start speaking', label = 'Transcript', className = '' }: {
  text: string; interim?: string; listening?: boolean; placeholder?: string; label?: string; className?: string;
}) {
  const words = text.split(/(\s+)/).filter(Boolean);
  const empty = !text.trim() && !interim.trim();
  return <section className={`bs-transcript ${className}`} aria-label={label} data-listening={listening || undefined}>
    <p className="bs-sr-only" aria-live="polite">{words.map((word, index) => <span key={index}>{word}</span>)}</p>
    <p className="bs-transcript__text" aria-hidden="true">
      {empty ? <span className="bs-transcript__placeholder">{placeholder}</span>
        : words.map((word, index) => word.trim() ? <span key={index} className="bs-transcript__word">{word}</span> : word)}
      {interim && <span className="bs-transcript__interim">{text && !/\s$/.test(text) ? ' ' : ''}{interim}</span>}
      {listening && <span className="bs-transcript__caret" />}
    </p>
  </section>;
}
