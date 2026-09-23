/**
 * The Still Edition stage: one pinned canvas behind the plates.
 * Each scene is a painting with a camera (zoom toward its porcelain) and its own light.
 * Moving between paintings, the frame breaks into cobalt and white porcelain shards that rebuild the next one.
 */
export interface Scene {
  src: string;
  /** Image-space fractions: where the frame sits at zoom 1, and the porcelain the camera moves toward. */
  position: [number, number];
  focus: [number, number];
  /** Camera zoom at the start and end of the chapter's scroll. */
  zoom: [number, number];
  light: 'gold' | 'dapple' | 'flicker' | 'none';
  /** The side the text sits on, darkened for contrast. */
  shade: 'left' | 'right' | 'bottom';
}

type RGB = [number, number, number];
const GROUND: RGB = [22, 23, 26];
const COBALT: RGB = [35, 75, 194];
const PLASTER: RGB = [231, 230, 225];
const OPENING_MS = 2400;

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (v: number) => v * v * (3 - 2 * v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Camera { position: [number, number]; focus: [number, number]; zoom: number }

function place(img: HTMLImageElement, w: number, h: number, cam: Camera) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const base = Math.max(w / iw, h / ih), s = base * cam.zoom;
  // Screen centre in image space at zoom 1 (object-position), eased toward the focus as the camera closes in.
  const cx1 = (w / 2 - (w - iw * base) * cam.position[0]) / base;
  const cy1 = (h / 2 - (h - ih * base) * cam.position[1]) / base;
  const k = clamp((cam.zoom - 1) / 0.8);
  const cx = lerp(cx1, cam.focus[0] * iw, k), cy = lerp(cy1, cam.focus[1] * ih, k);
  const dx = clamp(w / 2 - cx * s, w - iw * s, 0), dy = clamp(h / 2 - cy * s, h - ih * s, 0);
  return { s, dx, dy, fx: dx + cam.focus[0] * iw * s, fy: dy + cam.focus[1] * ih * s };
}

function shade(ctx: CanvasRenderingContext2D, w: number, h: number, side: Scene['shade'], alpha: number) {
  if (alpha <= 0) return;
  const narrow = w < 768;
  const g = narrow || side === 'bottom' ? ctx.createLinearGradient(0, h, 0, h * 0.35)
    : side === 'left' ? ctx.createLinearGradient(0, 0, w * 0.62, 0) : ctx.createLinearGradient(w, 0, w * 0.38, 0);
  g.addColorStop(0, `rgb(22 23 26 / ${0.92 * alpha})`);
  g.addColorStop(0.55, `rgb(22 23 26 / ${0.6 * alpha})`);
  g.addColorStop(1, 'rgb(22 23 26 / 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const top = ctx.createLinearGradient(0, 0, 0, h * 0.3);
  top.addColorStop(0, `rgb(22 23 26 / ${0.55 * alpha})`);
  top.addColorStop(1, 'rgb(22 23 26 / 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h);
}

function light(ctx: CanvasRenderingContext2D, w: number, h: number, kind: Scene['light'], time: number, fx: number, fy: number, alpha: number) {
  if (kind === 'none' || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (kind === 'gold') {
    // A slow band of gold light crosses the painting every seven seconds.
    const p = clamp(((time / 7000) % 1) / 0.6);
    const x = lerp(-0.4, 1.4, smooth(p)) * w;
    const g = ctx.createLinearGradient(x - w * 0.18, 0, x + w * 0.18, h * 0.4);
    g.addColorStop(0, 'rgb(255 214 140 / 0)'); g.addColorStop(0.5, 'rgb(255 214 140 / .26)'); g.addColorStop(1, 'rgb(255 214 140 / 0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  } else if (kind === 'dapple') {
    // Leaf shade drifting over the picnic.
    ctx.globalCompositeOperation = 'soft-light';
    for (let i = 0; i < 4; i++) {
      const x = w * (0.2 + 0.2 * i + 0.05 * Math.sin(time / 2600 + i * 1.7));
      const y = h * (0.35 + 0.15 * Math.sin(time / 3400 + i * 2.3));
      const r = Math.max(w, h) * (0.16 + 0.03 * Math.sin(time / 1900 + i));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgb(255 244 210 / .5)'); g.addColorStop(1, 'rgb(255 244 210 / 0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  } else {
    // Candle-like flicker on the bowl.
    const f = 0.75 + 0.12 * Math.sin(time / 170) + 0.08 * Math.sin(time / 97 + 1.3) + 0.05 * Math.sin(time / 53);
    const r = Math.max(w, h) * 0.5;
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
    g.addColorStop(0, `rgb(255 196 120 / ${0.5 * f})`); g.addColorStop(1, 'rgb(255 196 120 / 0)');
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

export function startStage(canvas: HTMLCanvasElement, sections: HTMLElement[], scenes: Scene[], options: { paused: () => boolean; reduced: boolean }) {
  const ctx = canvas.getContext('2d');
  const sample = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!ctx || !sample) return () => {};

  const images = new Map<string, HTMLImageElement>();
  let ready = false;
  Promise.all([...new Set(scenes.map(s => s.src))].map(src => {
    const img = new Image();
    img.src = src;
    images.set(src, img);
    return img.decode();
  })).then(() => { ready = true; opening = performance.now(); }, () => {});

  let w = 0, h = 0, raf = 0, time = 0, last = performance.now(), opening = 0;
  let seeds = new Float32Array(0);
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);

  const camera = (scene: Scene, q: number): Camera => {
    const drift = options.reduced ? 1 : 1 + 0.018 * Math.sin(time / 5200);
    return { position: scene.position, focus: scene.focus, zoom: (options.reduced ? scene.zoom[0] : lerp(scene.zoom[0], scene.zoom[1], smooth(q))) * drift };
  };

  const paint = (c: CanvasRenderingContext2D, cw: number, ch: number, scene: Scene, cam: Camera, withLight: boolean, alpha = 1) => {
    const img = images.get(scene.src)!;
    const p = place(img, cw, ch, cam);
    c.globalAlpha = alpha;
    c.drawImage(img, p.dx, p.dy, img.naturalWidth * p.s, img.naturalHeight * p.s);
    c.globalAlpha = 1;
    if (withLight) light(c, cw, ch, scene.light, options.reduced ? 0 : time, p.fx, p.fy, alpha);
    shade(c, cw, ch, scene.shade, alpha);
  };

  /** Colours of a scene on the shard grid. */
  const grid = (scene: Scene, cam: Camera, cols: number, rows: number) => {
    sample.canvas.width = cols; sample.canvas.height = rows;
    sample.fillStyle = 'rgb(22 23 26)'; sample.fillRect(0, 0, cols, rows);
    paint(sample, cols, rows, scene, cam, false);
    return sample.getImageData(0, 0, cols, rows).data;
  };

  /** t: 0 = scene A whole, 0.5 = shards in flight, 1 = scene B whole. A null means shards gather from nothing. */
  const shatter = (t: number, a: { scene: Scene; cam: Camera } | null, b: { scene: Scene; cam: Camera }) => {
    const step = w < 768 ? 12 : 14;
    const cols = Math.ceil(w / step), rows = Math.ceil(h / step), n = cols * rows;
    if (seeds.length < n * 3) { seeds = new Float32Array(n * 3); for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random(); }
    const colB = grid(b.scene, b.cam, cols, rows);
    const colA = a ? grid(a.scene, a.cam, cols, rows) : colB;

    ctx.fillStyle = 'rgb(22 23 26)'; ctx.fillRect(0, 0, w, h);
    if (a) paint(ctx, w, h, a.scene, a.cam, true, 1 - smooth(clamp(t / 0.16)));
    for (let i = 0; i < n; i++) {
      const x = i % cols, y = (i / cols) | 0;
      const r1 = seeds[i * 3], r2 = seeds[i * 3 + 1], r3 = seeds[i * 3 + 2];
      // A wave runs left to right, so the break reads as a sweep, not a flicker.
      const delay = (x / cols) * 0.6 + r1 * 0.25;
      const u = clamp((t - delay * 0.45) / 0.55);
      const lift = Math.sin(Math.PI * u), mix = smooth(u);
      if (!a && u === 0) continue;
      const porcelain = r2 < 0.55 ? COBALT : PLASTER;
      const k = i * 4, glaze = lift * 0.75;
      const rr = lerp(lerp(colA[k], colB[k], mix), porcelain[0], glaze);
      const gg = lerp(lerp(colA[k + 1], colB[k + 1], mix), porcelain[1], glaze);
      const bb = lerp(lerp(colA[k + 2], colB[k + 2], mix), porcelain[2], glaze);
      const px = x * step + lift * ((r2 - 0.5) * w * 0.3 + Math.sin(y * 0.35 + r3 * 6) * step * 4);
      const py = y * step - lift * (h * 0.14 + r3 * h * 0.3);
      const size = step * (1 - lift * 0.6) + 0.6;
      ctx.globalAlpha = a ? 1 - lift * 0.25 : mix;
      ctx.fillStyle = `rgb(${rr | 0} ${gg | 0} ${bb | 0})`;
      if (lift > 0.05) {
        // In flight, shards turn edge-on and glint.
        ctx.save(); ctx.translate(px + size / 2, py + size / 2); ctx.rotate(lift * (r1 - 0.5) * 3);
        ctx.fillRect(-size / 2, -size / 2, size, size * (0.55 + r3 * 0.45)); ctx.restore();
      } else ctx.fillRect(px, py, size, size);
    }
    ctx.globalAlpha = 1;
    paint(ctx, w, h, b.scene, b.cam, true, smooth(clamp((t - 0.8) / 0.2)));
  };

  const draw = () => {
    ctx.fillStyle = 'rgb(22 23 26)'; ctx.fillRect(0, 0, w, h);
    if (!ready) return;
    const rects = sections.map(s => s.getBoundingClientRect());
    if (rects[rects.length - 1].bottom < 0) return;
    let j = 0;
    rects.forEach((r, i) => { if (r.top <= 0) j = i; });
    const q = clamp(-rects[j].top / Math.max(1, rects[j].height - h));
    const next = rects[j + 1];
    const tr = next ? clamp(1 - next.top / h) : 0;
    const k = Math.min(j + 1, scenes.length - 1);

    const open = options.reduced ? 1 : clamp((performance.now() - opening) / OPENING_MS);
    if (open < 1) {
      // Opening: shards gather into the cup close-up, then the camera pulls back to the whole painting.
      const gather = smooth(clamp(open / 0.55)), pull = smooth(clamp((open - 0.35) / 0.65));
      const cam = { ...camera(scenes[0], q), zoom: lerp(2.6, camera(scenes[0], q).zoom, pull) };
      if (gather < 1) shatter(lerp(0.5, 1, gather), null, { scene: scenes[0], cam });
      else paint(ctx, w, h, scenes[0], cam, true);
      return;
    }

    if (tr <= 0 || k === j) { paint(ctx, w, h, scenes[j], camera(scenes[j], q), true); return; }
    const from = { scene: scenes[j], cam: camera(scenes[j], 1) }, to = { scene: scenes[k], cam: camera(scenes[k], 0) };
    if (options.reduced) { paint(ctx, w, h, (tr < 0.5 ? from : to).scene, (tr < 0.5 ? from : to).cam, true); return; }
    if (from.scene.src === to.scene.src) {
      // Same painting: the transition is a camera move toward the porcelain.
      const e = smooth(tr);
      const cam: Camera = {
        position: [lerp(from.cam.position[0], to.cam.position[0], e), lerp(from.cam.position[1], to.cam.position[1], e)],
        focus: [lerp(from.cam.focus[0], to.cam.focus[0], e), lerp(from.cam.focus[1], to.cam.focus[1], e)],
        zoom: lerp(from.cam.zoom, to.cam.zoom, e),
      };
      paint(ctx, w, h, { ...to.scene, shade: e < 0.5 ? from.scene.shade : to.scene.shade }, cam, true);
      return;
    }
    shatter(tr, from, to);
  };

  const loop = (now: number) => {
    if (!options.paused()) time += now - last;
    last = now;
    draw();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
}
