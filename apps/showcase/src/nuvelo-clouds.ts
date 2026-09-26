/** Clouds painted on a 2D canvas from soft round puffs: white ones in the sky, a pink bank below the shoe. */

type Tone = { shadow: string; body: string; light: string };
const WHITE: Tone = { shadow: 'rgba(150,178,214,.55)', body: 'rgba(250,252,255,.95)', light: 'rgba(255,255,255,1)' };
const PINK: Tone = { shadow: 'rgba(196,120,178,.7)', body: 'rgba(244,174,210,.97)', light: 'rgba(255,232,244,1)' };

/** A fixed sequence, so the clouds land in the same place on every visit. */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

function puff(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, tone: Tone) {
  const layer = (dx: number, dy: number, radius: number, color: string) => {
    const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, radius);
    g.addColorStop(0, color);
    g.addColorStop(0.55, color.replace(/[\d.]+\)$/, m => `${parseFloat(m) * 0.7})`));
    g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  layer(0, r * 0.28, r * 1.05, tone.shadow);
  layer(0, 0, r, tone.body);
  layer(-r * 0.22, -r * 0.3, r * 0.62, tone.light);
}

/** A cumulus: a flat base and a heap of puffs that shrink toward the edges. */
function cumulus(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, random: () => number) {
  const count = Math.round(8 + width / 18);
  for (let i = 0; i < count; i++) {
    const t = random() * 2 - 1;
    const r = width * (0.12 + 0.14 * (1 - t * t)) * (0.7 + random() * 0.5);
    puff(ctx, x + t * width * 0.42, y - r * 0.35 - random() * width * 0.12 * (1 - t * t), r, WHITE);
  }
}

function fit(canvas: HTMLCanvasElement) {
  const scale = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(canvas.clientWidth * scale);
  canvas.height = Math.round(canvas.clientHeight * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return { ctx, w: canvas.clientWidth, h: canvas.clientHeight };
}

export function paintSky(canvas: HTMLCanvasElement) {
  const { ctx, w, h } = fit(canvas);
  const random = seeded(7);
  const u = Math.max(w, 600);
  ctx.filter = 'blur(.6px)';
  cumulus(ctx, w * 0.9, h * 0.13, u * 0.26, random);
  cumulus(ctx, w * 0.09, h * 0.24, u * 0.13, random);
  cumulus(ctx, w * 0.35, h * 0.14, u * 0.12, random);
  cumulus(ctx, w * 0.2, h * 0.52, u * 0.12, random);
  cumulus(ctx, w * 0.05, h * 0.66, u * 0.14, random);
  cumulus(ctx, w * 0.24, h * 0.72, u * 0.16, random);
  cumulus(ctx, w * 0.9, h * 0.6, u * 0.16, random);
  cumulus(ctx, w * 0.74, h * 0.52, u * 0.09, random);
}

/** The pink bank: rows of puffs, small and hazy at the back, large and bright at the front. */
export function paintBank(canvas: HTMLCanvasElement) {
  const { ctx, w, h } = fit(canvas);
  const random = seeded(11);
  const rows = 5;
  for (let row = 0; row < rows; row++) {
    const depth = row / (rows - 1);
    const y = h * (0.68 + depth * 0.32);
    const r = Math.max(w, h * 1.1) * (0.06 + depth * 0.06);
    ctx.filter = `blur(${(1 - depth) * 1.5}px)`;
    for (let x = -r * random(); x < w + r; x += r * (0.7 + random() * 0.9)) {
      // The bank rises toward both edges and dips under the shoe.
      const lift = Math.pow(Math.abs(x / w - 0.5) * 2, 2) * h * 0.1;
      const size = r * (0.6 + random() * 0.8);
      const base = y - lift + (random() - 0.5) * r * 0.6;
      // Each heap is a big puff with smaller ones on its shoulders.
      puff(ctx, x, base, size, PINK);
      puff(ctx, x - size * 0.6, base + size * 0.15, size * 0.6, PINK);
      puff(ctx, x + size * 0.55, base + size * 0.2, size * 0.55, PINK);
    }
  }
}
