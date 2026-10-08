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

/** Draws one frame of the orb: ink dots on a sphere, with depth shown only by dot size and opacity. */
function drawOrb(context: CanvasRenderingContext2D, size: number, state: VoiceState, t: number, level: number, ink: string) {
  // Below 64 px the orb draws fewer, larger dots so it stays crisp.
  const radius = size * .4, centre = size / 2, small = size < 64, unit = small ? Math.max(size / 64, .5) : size / 120;
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
  if (state === 'thinking') {
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
 * The state is announced in words. It pauses off screen, and under reduced motion it holds still but follows the level.
 */
export function VoiceOrb({ state = 'idle', level = 0, size = 120, label, className = '' }: { state?: VoiceState; level?: number; size?: number; label?: string; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ state, level: 0, heard: 0 });
  live.current.state = state;
  live.current.level = Math.max(0, Math.min(1, level));
  const wake = useVisibleLoop(canvas, time => {
    const surface = canvas.current, fitted = surface && fit2d(surface);
    if (!surface || !fitted) return false;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches, now = live.current;
    // Ease towards the level so a jumpy microphone still reads as a smooth swell.
    now.heard += (now.level - now.heard) * (still ? 1 : .25);
    drawOrb(fitted.context, fitted.width, now.state, still ? .6 : time / 1000, now.heard, getComputedStyle(surface).color);
    return !still;
  });
  useEffect(() => wake.current(), [state, level, wake]);
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
