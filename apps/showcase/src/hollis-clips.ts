/**
 * Short looping "videos" for the Hollis page, drawn on a 2D canvas instead of shipped as files.
 * Each clip draws the frame at time `t` (seconds); the ClipCanvas component owns the clock.
 */
export interface Clip { resize(): void; draw(t: number): void; dispose(): void }
interface Ink { ink: string; muted: string; accent: string; line: string }
type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, c: Ink) => void;

const TAU = Math.PI * 2;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };

function paint(painter: Painter) {
  return (canvas: HTMLCanvasElement): Clip => {
    const ctx = canvas.getContext('2d')!;
    const css = getComputedStyle(canvas);
    const c: Ink = { ink: css.getPropertyValue('--bs-ink'), muted: css.getPropertyValue('--bs-muted'), accent: css.getPropertyValue('--bs-accent'), line: css.getPropertyValue('--bs-line') };
    let w = 0, h = 0;
    return {
      resize() {
        const dpr = Math.min(devicePixelRatio, 2);
        w = canvas.clientWidth; h = canvas.clientHeight;
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      },
      draw(t) { ctx.clearRect(0, 0, w, h); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; painter(ctx, w, h, t, c); },
      dispose() {},
    };
  };
}

function wave(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, f: (x: number) => number) {
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 2) ctx.lineTo(x, y + f(x));
  ctx.stroke();
}

/** Noise cancelling: outside noise, the inverse wave, and their sum flattening to silence. */
export const noiseClip = paint((ctx, w, h, t, c) => {
  const cycle = t % 7, cancel = smooth(cycle / 2.5) * (1 - smooth((cycle - 6.2) / .8));
  const amp = h * .09, x0 = w * .1, x1 = w * .9;
  const noise = (x: number) => amp * (Math.sin(x * .031 + t * 3) * .6 + Math.sin(x * .073 - t * 5) * .3 + Math.sin(x * .011 + t) * .4);
  ctx.lineWidth = 2;
  ctx.strokeStyle = c.muted; wave(ctx, x0, x1, h * .24, noise);
  ctx.strokeStyle = c.accent; ctx.globalAlpha = .25 + .75 * cancel; wave(ctx, x0, x1, h * .5, x => -noise(x) * cancel); ctx.globalAlpha = 1;
  ctx.lineWidth = 3;
  ctx.strokeStyle = c.ink; wave(ctx, x0, x1, h * .76, x => noise(x) * (1 - cancel));
});

/** Head tracking, seen from above: the head turns, the three sound sources stay where they are in the room. */
export const spatialClip = paint((ctx, w, h, t, c) => {
  const cx = w / 2, cy = h * .56, r = Math.min(w, h) * .11, turn = Math.sin(t * .9) * .7;
  [-2.3, -Math.PI / 2, -.84].forEach((a, i) => {
    const sx = cx + Math.cos(a) * r * 3.2, sy = cy + Math.sin(a) * r * 3.2;
    for (let k = 0; k < 3; k++) {
      const phase = (t * .6 + k / 3 + i * .2) % 1;
      ctx.strokeStyle = c.accent; ctx.globalAlpha = 1 - phase; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, 6 + phase * r * 1.4, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.fillStyle = c.accent;
    ctx.beginPath(); ctx.arc(sx, sy, 6, 0, TAU); ctx.fill();
  });
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(turn);
  ctx.fillStyle = c.ink;
  ctx.beginPath(); ctx.ellipse(0, 0, r * .86, r, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-r * .2, -r * .96); ctx.lineTo(0, -r * 1.22); ctx.lineTo(r * .2, -r * .96); ctx.fill();
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(s * r * .86 - r * .18, -r * .38, r * .36, r * .76, r * .14); ctx.fillStyle = c.muted; ctx.fill(); }
  ctx.restore();
});

/** Fast charge: a ring fills while minutes on the cable turn into hours of playback. */
export const chargeClip = paint((ctx, w, h, t, c) => {
  const cycle = t % 6, k = smooth(cycle / 4) * (1 - smooth((cycle - 5.4) / .6));
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * .3;
  ctx.lineWidth = r * .14;
  ctx.strokeStyle = c.line; ctx.globalAlpha = .4; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.strokeStyle = c.accent; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
  ctx.fillStyle = c.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${r * .5}px "Geist Variable", system-ui`; ctx.fillText(`${(3 * k).toFixed(1)} h`, cx, cy - r * .08);
  ctx.fillStyle = c.muted; ctx.font = `500 ${r * .15}px "Geist Variable", system-ui`; ctx.fillText(`after ${Math.round(5 * k)} min`, cx, cy + r * .34);
});

/** The dial: turning it raises the volume bars. */
export const dialClip = paint((ctx, w, h, t, c) => {
  const level = .5 + .45 * Math.sin(t * .8), cx = w * .34, cy = h / 2, r = Math.min(w, h) * .24;
  ctx.fillStyle = c.muted; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(level * TAU * .75);
  ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.globalAlpha = .5;
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .82, Math.sin(a) * r * .82); ctx.lineTo(Math.cos(a) * r * .95, Math.sin(a) * r * .95); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(0, -r * .6, r * .08, 0, TAU); ctx.fill();
  ctx.restore();
  const bars = 8, bw = w * .035, x0 = w * .62;
  for (let i = 0; i < bars; i++) {
    const on = i / bars < level, bh = h * (.12 + i * .045);
    ctx.fillStyle = on ? c.accent : c.line; ctx.globalAlpha = on ? 1 : .35;
    ctx.beginPath(); ctx.roundRect(x0 + i * bw * 1.5, cy + h * .2 - bh, bw, bh, bw / 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
});

/** Folding: both cups turn flat, then back, like a card turning in the hand. */
export const foldClip = paint((ctx, w, h, t, c) => {
  const cycle = t % 5, k = smooth(cycle / 1.6) * (1 - smooth((cycle - 3) / 1.6));
  const r = Math.min(w, h) * .2, cy = h * .58;
  ctx.strokeStyle = c.ink; ctx.lineWidth = r * .09; ctx.globalAlpha = .6;
  ctx.beginPath(); ctx.ellipse(w / 2, cy - r * .2, w * .22, r * 1.9, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); ctx.globalAlpha = 1;
  for (const s of [-1, 1]) {
    const x = w / 2 + s * w * .22, sx = Math.max(.14, Math.abs(Math.cos(k * Math.PI / 2)));
    ctx.fillStyle = c.muted; ctx.beginPath(); ctx.ellipse(x, cy + r * .2, r * .72, r, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c.ink; ctx.beginPath(); ctx.ellipse(x + s * r * .1 * (1 - sx), cy + r * .2, r * .72 * (1 - k * .6), r, 0, 0, TAU); ctx.globalAlpha = .9; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = c.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, cy + r * .2, r * .5 * (1 - k * .75), r * .7, 0, 0, TAU); ctx.stroke();
  }
});

/** Voice pickup: four microphone dots aim a beam at the mouth while room noise fades. */
export const micsClip = paint((ctx, w, h, t, c) => {
  const mouthX = w * .22, mouthY = h * .5, cupX = w * .72;
  for (let i = 0; i < 40; i++) {
    const x = (Math.sin(i * 91.7) * .5 + .5) * w, y = (Math.sin(i * 47.3) * .5 + .5) * h;
    ctx.fillStyle = c.line; ctx.globalAlpha = .15 + .2 * (Math.sin(t * 2 + i) * .5 + .5);
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const mics = [-.24, -.08, .08, .24].map(d => [cupX, mouthY + d * h] as const);
  ctx.strokeStyle = c.accent; ctx.lineWidth = 2;
  mics.forEach(([x, y], i) => {
    const phase = (t * .8 + i * .07) % 1;
    ctx.globalAlpha = .25; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(mouthX, mouthY); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(x + (mouthX - x) * phase, y + (mouthY - y) * phase, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
  });
  ctx.strokeStyle = c.ink; ctx.lineWidth = 3;
  wave(ctx, mouthX - w * .12, mouthX + w * .12, mouthY, x => Math.sin(x * .12 + t * 9) * h * .08 * (Math.sin(t * 2.3) * .4 + .6) * Math.sin((x - mouthX + w * .12) / (w * .24) * Math.PI));
});
