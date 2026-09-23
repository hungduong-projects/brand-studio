"use client";

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';
const voiceLabels: Record<VoiceState, string> = { idle: 'Ready', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking' };

/**
 * The face of a voice agent. Rings swell with `level` (0 to 1, from the microphone or the agent's voice) while listening,
 * a light circles while thinking and rings ripple out while speaking. The state is announced in words.
 */
export function VoiceOrb({ state = 'idle', level = 0, size = 120, label, className = '' }: { state?: VoiceState; level?: number; size?: number; label?: string; className?: string }) {
  return <div role="status" className={`bs-orb ${className}`} data-state={state}
    style={{ '--bs-orb-size': `${size}px`, '--level': Math.max(0, Math.min(1, level)).toFixed(3) } as CSSProperties}>
    <span className="bs-orb__body" aria-hidden="true">
      {[0, 1, 2].map(ring => <i key={ring} className="bs-orb__ring" style={{ '--n': ring } as CSSProperties} />)}
      <i className="bs-orb__core" />
    </span>
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
