"use client";

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ElementType, FormEvent, PointerEvent, ReactNode } from 'react';
import { Button } from './core.js';
import { Alert } from './app.js';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True only while a wait is worth showing: from `delay` ms after `loading` turns on, and then for at least `minDuration` ms, so an indicator never flashes. */
export function useDelayedLoading(loading: boolean, { delay = 400, minDuration = 600 }: { delay?: number; minDuration?: number } = {}) {
  const [shown, setShown] = useState(false);
  const since = useRef(0);
  useEffect(() => {
    if (loading && !shown) {
      const timer = setTimeout(() => { since.current = Date.now(); setShown(true); }, delay);
      return () => clearTimeout(timer);
    }
    if (!loading && shown) {
      const timer = setTimeout(() => setShown(false), Math.max(0, minDuration - (Date.now() - since.current)));
      return () => clearTimeout(timer);
    }
  }, [loading, shown, delay, minDuration]);
  return shown;
}

/** Holds a region while its content loads. A quick answer shows nothing; a slower one shows a spinner after `delay`, a note after `slowAfter`, and `onTimeout` runs after `timeout` so the app can stop and show `error` with a retry. */
export function LoadingGate({ loading, error, onRetry, onCancel, onTimeout, fallback, children, label = 'Loading', delay = 400, minDuration = 600, slowAfter = 8000, timeout = 20000, slowMessage = 'This is taking longer than usual.', errorHint = 'Check your connection, then try again.', retryLabel = 'Try again', cancelLabel = 'Cancel', className = '' }: {
  loading: boolean; error?: ReactNode; onRetry?: () => void; onCancel?: () => void; onTimeout?: () => void; fallback?: ReactNode; children?: ReactNode; label?: string;
  delay?: number; minDuration?: number; slowAfter?: number; timeout?: number; slowMessage?: ReactNode; errorHint?: ReactNode; retryLabel?: string; cancelLabel?: string; className?: string;
}) {
  const shown = useDelayedLoading(loading && !error, { delay, minDuration });
  const [slow, setSlow] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  const expire = useRef(onTimeout);
  expire.current = onTimeout;
  useEffect(() => {
    setSlow(false);
    if (!loading || error) return;
    const timers = [setTimeout(() => setSlow(true), slowAfter), setTimeout(() => expire.current?.(), timeout)];
    return () => timers.forEach(clearTimeout);
  }, [loading, error, slowAfter, timeout]);
  // Retry and Cancel vanish with the state they belong to; keep focus in the region instead of dropping it on the page.
  useEffect(() => {
    if (refocus.current && root.current && !root.current.contains(document.activeElement)) root.current.focus();
    refocus.current = false;
  });
  const act = (handler: () => void) => () => { refocus.current = true; handler(); };
  const state = error ? 'error' : loading || shown ? 'waiting' : 'ready';
  return <div ref={root} tabIndex={-1} className={`bs-gate ${className}`} data-state={state}>
    <div role="status" className="bs-gate__status">
      {state === 'waiting' && shown && !fallback && <span className="bs-spinner"><span className="bs-spinner__ring" aria-hidden="true" style={{ width: 20, height: 20 }} /><span className="bs-spinner__label">{label}</span></span>}
      {state === 'waiting' && slow && <span className="bs-gate__slow">{slowMessage}</span>}
    </div>
    {state === 'waiting' && slow && onCancel && <Button tone="secondary" onClick={act(onCancel)}>{cancelLabel}</Button>}
    <div className="bs-gate__body" aria-busy={state === 'waiting' || undefined}>
      {state === 'error'
        ? <Alert tone="critical" title={error} action={onRetry && <Button tone="secondary" onClick={act(onRetry)}>{retryLabel}</Button>}>{errorHint}</Alert>
        : state === 'waiting' ? shown && fallback : children}
    </div>
  </div>;
}

/** A bar for a job of known length. It never moves backwards, says it is finishing instead of sitting at 99%, and can list the job's steps and offer Cancel. */
export function ProgressBar({ value, label, status, steps = [], step = 0, onCancel, action, cancelLabel = 'Cancel', finishingLabel = 'Finishing up', doneLabel = 'Done', className = '' }: {
  value: number; label: ReactNode; status?: ReactNode; steps?: string[]; step?: number; onCancel?: () => void; action?: ReactNode; cancelLabel?: string; finishingLabel?: string; doneLabel?: string; className?: string;
}) {
  const id = useId();
  const highest = useRef(0);
  const clamped = Math.max(0, Math.min(100, value));
  // A value of 0 starts a new job; anything lower than what was shown before is held.
  highest.current = clamped === 0 ? 0 : Math.max(highest.current, clamped);
  const shown = highest.current, percent = Math.floor(shown), done = shown >= 100;
  const meta = done ? doneLabel : percent >= 99 ? finishingLabel : `${percent}%`;
  const current = Math.min(Math.max(step, 0), steps.length - 1);
  return <div className={`bs-progress ${className}`} data-done={done || undefined}>
    <p className="bs-progress__label" id={`${id}-label`}>{label}</p>
    <p className="bs-progress__status" role="status">{status}</p>
    <div className="bs-progress__track" role="progressbar" aria-labelledby={`${id}-label`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={meta === `${percent}%` ? undefined : meta}>
      <span className="bs-progress__fill" style={{ width: `${shown}%` }} />
    </div>
    <p className="bs-progress__meta">
      {steps.length > 0 && <span>{done ? `${steps.length} of ${steps.length} steps` : `Step ${current + 1} of ${steps.length}`}</span>}
      <span>{meta}</span>
    </p>
    {steps.length > 0 && <ol className="bs-progress__steps">
      {steps.map((name, index) => {
        const state = done || index < current ? 'done' : index === current ? 'active' : 'pending';
        return <li key={name} data-state={state}><span className="bs-progress__dot" aria-hidden="true" />{name}{state === 'done' && <span className="bs-sr-only"> (done)</span>}</li>;
      })}
    </ol>}
    {(action || (onCancel && !done)) && <div className="bs-progress__actions">{action}{onCancel && !done && <Button tone="secondary" onClick={onCancel}>{cancelLabel}</Button>}</div>}
  </div>;
}

/** A thin bar across the top while the next page loads. It waits `delay` ms so quick page changes show nothing, creeps toward the end without claiming to finish, then fills and fades. */
export function RouteProgress({ active, label = 'Loading page', delay = 250, contained = false, className = '' }: { active: boolean; label?: string; delay?: number; contained?: boolean; className?: string }) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!active) return;
    let trickle = 0;
    const show = window.setTimeout(() => {
      setPhase('running');
      setProgress(8);
      // Each step closes part of the gap to 85%, so the bar slows down and never claims to be done.
      trickle = window.setInterval(() => setProgress(value => value + (85 - value) * .12), 220);
    }, delay);
    return () => { clearTimeout(show); clearInterval(trickle); setPhase(value => value === 'running' ? 'done' : value); };
  }, [active, delay]);
  useEffect(() => {
    if (phase !== 'done') return;
    setProgress(100);
    const hide = window.setTimeout(() => { setPhase('idle'); setProgress(0); }, 550);
    return () => clearTimeout(hide);
  }, [phase]);
  return <>
    <div className={`bs-route ${contained ? 'bs-route--contained' : ''} ${className}`} data-phase={phase} aria-hidden="true">
      <span className="bs-route__fill" style={{ '--bs-route-p': progress / 100 } as CSSProperties} />
    </div>
    <span className="bs-sr-only" role="status">{phase === 'running' ? label : ''}</span>
  </>;
}

export interface NotFoundLink { href: string; title: string; description?: string }

/** Drops slashes from the end, and from the start too when `both` is set. A loop, because a trailing-slash regex runs in quadratic time on a long run of slashes. */
function trimSlashes(value: string, both = false) {
  let start = 0, end = value.length;
  while (both && start < end && value[start] === '/') start++;
  while (end > start && value[end - 1] === '/') end--;
  return value.slice(start, end);
}

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j]!;
      row[j] = Math.min(above + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = above;
    }
  }
  return row[b.length]!;
}

/** The known page closest to `path`, scored segment by segment so one typo in a long address counts as one edit. Nothing when no page is close. */
function closestPage(path: string, pages: string[]) {
  const clean = (value: string) => trimSlashes(value.toLowerCase()) || '/';
  const target = clean(path), parts = target.split('/');
  const limit = Math.max(1, Math.min(3, Math.floor(target.length / 4)));
  let best: string | undefined, bestScore = Infinity;
  for (const page of pages) {
    const other = clean(page).split('/');
    if (other.length !== parts.length || page === path) continue;
    const score = parts.reduce((sum, part, index) => sum + editDistance(part, other[index]!), 0);
    if (score < bestScore) { best = page; bestScore = score; }
  }
  return bestScore <= limit ? best : undefined;
}

/** The address that was asked for: `path` when given, otherwise the browser's, read after hydration. */
function useMissingPath(path?: string) {
  const [where, setWhere] = useState(path);
  useEffect(() => { setWhere(path ?? window.location.pathname); }, [path]);
  return where;
}

/** A page-not-found page in plain words: what happened, the closest real page when the address looks like a typo, a search box, and a few places to go next. */
export function NotFound({ title = 'Page not found', description = 'Check the address for a typo. If you followed a link here, the page may have moved.', path, pages = [], links = [], search, searchLabel = 'Search', guessLabel = 'Did you mean', art, action, as: Heading = 'h1', className = '' }: {
  title?: ReactNode; description?: ReactNode; path?: string; pages?: string[]; links?: NotFoundLink[]; search?: string; searchLabel?: string; guessLabel?: string; art?: ReactNode; action?: ReactNode; as?: ElementType; className?: string;
}) {
  const id = useId();
  const where = useMissingPath(path);
  const guess = where ? closestPage(where, pages) : undefined;
  const words = where ? where.split(/[/\-_.]+/).filter(Boolean).join(' ') : '';
  return <div className={`bs-notfound ${className}`}>
    {art && <div className="bs-notfound__art">{art}</div>}
    {where && <p className="bs-notfound__path"><code>{where}</code></p>}
    <Heading className="bs-notfound__title">{title}</Heading>
    {description && <p className="bs-notfound__description">{description}</p>}
    {guess && <p className="bs-notfound__guess">{guessLabel} <a href={guess}>{guess}</a>?</p>}
    {search && <form className="bs-notfound__search" role="search" action={search} method="get">
      <label htmlFor={`${id}-q`} className="bs-sr-only">{searchLabel}</label>
      <input id={`${id}-q`} key={words} name="q" type="search" defaultValue={words} placeholder={searchLabel} />
      <Button type="submit" tone="secondary">{searchLabel}</Button>
    </form>}
    {links.length > 0 && <ul className="bs-notfound__links">
      {links.map(link => <li key={link.href}><a href={link.href}><span className="bs-notfound__link-title">{link.title}</span>{link.description && <span className="bs-notfound__link-text">{link.description}</span>}</a></li>)}
    </ul>}
    {action && <div className="bs-notfound__action">{action}</div>}
  </div>;
}

/** Text that tears into offset accent slices every few seconds, like a lost signal. Screen readers hear it once; reduced motion holds one still tear. */
export function GlitchText({ text, as: Tag = 'span', className = '' }: { text: string; as?: ElementType; className?: string }) {
  return <Tag className={`bs-glitch ${className}`}>
    {text}
    <span className="bs-glitch__slice" aria-hidden="true">{text}</span>
    <span className="bs-glitch__slice" aria-hidden="true">{text}</span>
  </Tag>;
}

interface Offset { x: number; y: number; r: number }

/** Letters knocked out of place that people can drag about, and that spring back when `tidy` is on. Screen readers hear the plain text; reduced motion shows it tidy. */
export function ScatterText({ text, tidy = false, spread = 1, as: Tag = 'span', className = '' }: { text: string; tidy?: boolean; spread?: number; as?: ElementType; className?: string }) {
  const count = [...text.replace(/\s/g, '')].length;
  const [offsets, setOffsets] = useState<Offset[] | null>(null);
  useEffect(() => {
    if (tidy || reducedMotion()) { setOffsets(null); return; }
    const random = (size: number) => (Math.random() * 2 - 1) * size;
    // Small enough that the words stay readable and no letter lands on the line below.
    const frame = requestAnimationFrame(() => setOffsets(Array.from({ length: count }, () => ({ x: random(.22 * spread), y: random(.2 * spread), r: random(20 * spread) }))));
    return () => cancelAnimationFrame(frame);
  }, [count, tidy, spread]);
  const drag = (event: PointerEvent<HTMLSpanElement>, index: number) => {
    const letter = event.currentTarget, em = parseFloat(getComputedStyle(letter).fontSize) || 16;
    const start = { x: event.clientX, y: event.clientY }, base = offsets?.[index] ?? { x: 0, y: 0, r: 0 };
    letter.setPointerCapture(event.pointerId);
    letter.dataset.dragging = 'true';
    const move = (next: globalThis.PointerEvent) => setOffsets(current => {
      const list = current ? [...current] : Array.from({ length: count }, () => ({ x: 0, y: 0, r: 0 }));
      list[index] = { ...base, x: base.x + (next.clientX - start.x) / em, y: base.y + (next.clientY - start.y) / em };
      return list;
    });
    const end = () => { delete letter.dataset.dragging; letter.removeEventListener('pointermove', move); letter.removeEventListener('pointerup', end); letter.removeEventListener('pointercancel', end); };
    letter.addEventListener('pointermove', move);
    letter.addEventListener('pointerup', end);
    letter.addEventListener('pointercancel', end);
  };
  let index = -1;
  return <Tag className={`bs-scatter ${className}`}>
    <span className="bs-sr-only">{text}</span>
    <span aria-hidden="true">{text.split(/\s+/).map((word, w) => <Fragment key={w}>
      {w > 0 && ' '}
      <span className="bs-scatter__word">{[...word].map(letter => {
        const at = ++index, offset = offsets?.[at];
        return <span key={at} className="bs-scatter__letter" onPointerDown={event => drag(event, at)}
          style={offset ? { '--bs-scatter-x': `${offset.x.toFixed(3)}em`, '--bs-scatter-y': `${offset.y.toFixed(3)}em`, '--bs-scatter-r': `${offset.r.toFixed(0)}deg` } as CSSProperties : undefined}>{letter}</span>;
      })}</span>
    </Fragment>)}</span>
  </Tag>;
}

interface TerminalLine { command: string; href?: string; found: boolean }

/** A page-not-found screen drawn as a terminal. It names the missing address and the closest page, lists `links`, and answers a typed page name with a link to it, or to `search`. */
export function NotFoundTerminal({ path, links = [], pages = [], name = 'site', title = 'error: page not found', description = 'No page lives at this address.', search, inputLabel = 'Type a page name', as: Heading = 'h1', className = '' }: {
  path?: string; links?: NotFoundLink[]; pages?: string[]; name?: string; title?: string; description?: string; search?: string; inputLabel?: string; as?: ElementType; className?: string;
}) {
  const id = useId();
  const where = useMissingPath(path);
  const known = [...new Set([...links.map(link => link.href), ...pages])];
  const guess = where ? closestPage(where, known) : undefined;
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const answer = (command: string): TerminalLine => {
    const key = trimSlashes(command.toLowerCase(), true);
    const last = (href: string) => trimSlashes(href.toLowerCase()).split('/').pop() ?? '';
    const word = key.split('/').pop() ?? '';
    // Short words allow one typo and longer ones two, so "ab" never lands on "api".
    const hit = known.find(href => last(href) === word || href.toLowerCase() === `/${key}`)
      ?? links.find(link => link.title.toLowerCase() === key)?.href
      ?? known.find(href => last(href) && editDistance(last(href), word) <= (word.length < 5 ? 1 : 2));
    if (hit) return { command, href: hit, found: true };
    return { command, href: search ? `${search}${search.includes('?') ? '&' : '?'}q=${encodeURIComponent(command)}` : undefined, found: false };
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem('command') as HTMLInputElement;
    const command = input.value.trim();
    if (!command) return;
    setHistory(lines => [...lines, answer(command)]);
    input.value = '';
  };
  return <div className={`bs-terminal ${className}`}>
    <div className="bs-terminal__bar" aria-hidden="true"><i /><i /><i /><span>{name}</span></div>
    <div className="bs-terminal__body">
      <span className="bs-terminal__line"><span className="bs-terminal__dim">$</span> open {where}</span>
      <Heading className="bs-terminal__line bs-terminal__title">{title}</Heading>
      <span className="bs-terminal__line bs-terminal__dim">{description}</span>
      {guess && <span className="bs-terminal__line">closest match: <a href={guess}>{guess}</a></span>}
      {links.length > 0 && <>
        <span className="bs-terminal__line bs-terminal__dim"># try</span>
        {links.map(link => <span key={link.href} className="bs-terminal__line"><a href={link.href}>{link.href}</a> <span className="bs-terminal__dim">· {link.title}</span></span>)}
      </>}
      <div role="log" aria-live="polite">
        {history.map((line, index) => <Fragment key={index}>
          <span className="bs-terminal__line"><span className="bs-terminal__dim">$</span> {line.command}</span>
          <span className="bs-terminal__line">
            {line.found ? <><span className="bs-terminal__ok">found</span> <a href={line.href}>{line.href}</a></>
              : line.href ? <><span className="bs-terminal__dim">search for</span> <a href={line.href}>&ldquo;{line.command}&rdquo;</a></>
              : <span className="bs-terminal__dim">no page called &ldquo;{line.command}&rdquo;</span>}
          </span>
        </Fragment>)}
      </div>
    </div>
    <form className="bs-terminal__prompt" role="search" onSubmit={submit}>
      <span aria-hidden="true">$</span>
      <label htmlFor={`${id}-command`} className="bs-sr-only">{inputLabel}</label>
      <input id={`${id}-command`} name="command" autoComplete="off" spellCheck={false} placeholder="page name" />
    </form>
  </div>;
}

// 3 by 5 pixel digits; each "1" becomes a brick.
const digits: Record<string, string[]> = { 4: ['101', '101', '111', '001', '001'], 0: ['111', '101', '101', '101', '111'] };

/** A small brick game for a page-not-found screen. The bricks spell 404; the paddle follows the pointer or the arrow keys; Space or a tap launches the ball. It takes its colours from the brand and never starts by itself. */
export function NotFoundBreakout({ label = 'Brick game. Press Space to launch, and the left and right arrows to move.', className = '' }: { label?: string; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const statusId = useId();
  const [status, setStatus] = useState('Click, tap or press Space to play.');
  const controls = useRef({ launch: () => {}, aim: (_x: number) => {}, key: (_key: string, _down: boolean) => {} });
  useEffect(() => {
    const element = canvas.current, context = element?.getContext('2d');
    if (!element || !context) return;
    const W = 500, H = 300;
    const scale = Math.min(devicePixelRatio || 1, 2);
    element.width = W * scale; element.height = H * scale;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    type Brick = { x: number; y: number; alive: boolean };
    let bricks: Brick[] = [], playing = false, won = false, last = 0, frame = 0;
    const keys: Record<string, boolean> = {};
    const paddle = { x: W / 2 - 40, w: 80, h: 10, y: H - 24 };
    const ball = { x: W / 2, y: H - 34, r: 6, vx: 0, vy: 0 };
    const size = 20, gap = 3;
    const reset = () => {
      bricks = [];
      const digitWidth = 3 * size + 2 * gap, digitGap = 22;
      let left = (W - (3 * digitWidth + 2 * digitGap)) / 2;
      for (const digit of '404') {
        digits[digit]!.forEach((row, r) => [...row].forEach((bit, c) => { if (bit === '1') bricks.push({ x: left + c * (size + gap), y: 34 + r * (size + gap), alive: true }); }));
        left += digitWidth + digitGap;
      }
      won = false;
    };
    const draw = () => {
      const css = getComputedStyle(element);
      context.clearRect(0, 0, W, H);
      context.fillStyle = css.getPropertyValue('--bs-ink').trim() || css.color;
      for (const brick of bricks) if (brick.alive) { context.beginPath(); context.roundRect(brick.x, brick.y, size, size, 4); context.fill(); }
      context.fillStyle = css.getPropertyValue('--bs-accent').trim() || css.color;
      context.beginPath(); context.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 5); context.fill();
      context.beginPath(); context.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); context.fill();
    };
    const left = () => bricks.filter(brick => brick.alive).length;
    const step = (now: number) => {
      if (!playing) return;
      const dt = Math.min(.032, (now - last) / 1000);
      last = now;
      if (keys.ArrowLeft) paddle.x -= 360 * dt;
      if (keys.ArrowRight) paddle.x += 360 * dt;
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < ball.r || ball.x > W - ball.r) { ball.vx *= -1; ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x)); }
      if (ball.y < ball.r) { ball.vy *= -1; ball.y = ball.r; }
      if (ball.vy > 0 && ball.y + ball.r >= paddle.y && ball.y < paddle.y + paddle.h && ball.x > paddle.x - ball.r && ball.x < paddle.x + paddle.w + ball.r) {
        // Where the ball meets the paddle sets its angle, and each return is a little faster.
        const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2), speed = Math.min(420, Math.hypot(ball.vx, ball.vy) * 1.03);
        ball.vx = speed * hit * .8; ball.vy = -Math.sqrt(speed * speed - ball.vx * ball.vx);
      }
      for (const brick of bricks) {
        if (!brick.alive || ball.x + ball.r < brick.x || ball.x - ball.r > brick.x + size || ball.y + ball.r < brick.y || ball.y - ball.r > brick.y + size) continue;
        brick.alive = false;
        const overlapX = Math.min(ball.x + ball.r - brick.x, brick.x + size - (ball.x - ball.r)), overlapY = Math.min(ball.y + ball.r - brick.y, brick.y + size - (ball.y - ball.r));
        if (overlapX < overlapY) ball.vx *= -1; else ball.vy *= -1;
        const remaining = left();
        setStatus(remaining ? `${remaining} bricks left` : 'Cleared. The page is still missing, but you won.');
        if (!remaining) { won = true; playing = false; }
        break;
      }
      if (ball.y > H + ball.r) { playing = false; setStatus('Missed. Press Space or tap to try again.'); ball.x = paddle.x + paddle.w / 2; ball.y = H - 34; }
      draw();
      if (playing) frame = requestAnimationFrame(step);
    };
    controls.current.launch = () => {
      if (playing) return;
      if (won) reset();
      playing = true;
      const angle = -Math.PI / 2 + (Math.random() - .5) * .8;
      ball.x = paddle.x + paddle.w / 2; ball.y = H - 34;
      ball.vx = Math.cos(angle) * 260; ball.vy = Math.sin(angle) * 260;
      setStatus(`${left()} bricks left`);
      last = performance.now();
      frame = requestAnimationFrame(step);
    };
    controls.current.aim = (x) => {
      paddle.x = Math.max(0, Math.min(W - paddle.w, x * W - paddle.w / 2));
      if (!playing) { ball.x = paddle.x + paddle.w / 2; draw(); }
    };
    controls.current.key = (key, down) => { keys[key] = down; };
    const pause = () => { if (document.hidden && playing) { playing = false; cancelAnimationFrame(frame); setStatus('Paused. Press Space to carry on.'); } };
    // The theme can change under the game; redraw in the new colours.
    const theme = new MutationObserver(draw), system = window.matchMedia('(prefers-color-scheme: dark)');
    theme.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-bs-theme'] });
    system.addEventListener('change', draw);
    document.addEventListener('visibilitychange', pause);
    reset();
    draw();
    return () => { playing = false; cancelAnimationFrame(frame); theme.disconnect(); system.removeEventListener('change', draw); document.removeEventListener('visibilitychange', pause); };
  }, []);
  return <div className={`bs-breakout ${className}`}>
    <canvas ref={canvas} className="bs-breakout__canvas" tabIndex={0} role="application" aria-label={label} aria-describedby={statusId}
      onPointerDown={event => { event.currentTarget.focus(); controls.current.launch(); }}
      onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); controls.current.aim((event.clientX - box.left) / box.width); }}
      onKeyDown={event => {
        if (event.key === ' ') { event.preventDefault(); controls.current.launch(); }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); controls.current.key(event.key, true); }
      }}
      onKeyUp={event => controls.current.key(event.key, false)} />
    <p className="bs-breakout__status" id={statusId} role="status">{status}</p>
  </div>;
}
