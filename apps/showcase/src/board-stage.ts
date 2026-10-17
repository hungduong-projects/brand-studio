/**
 * The Turnbook board in three.js, for chess or xiangqi. It draws the board, glides pieces from point to point,
 * lights the lesson's marks in violet, and shows the next move as a violet arc before it happens.
 * The page owns the rules; the stage only reports which point was tapped.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { boardShape, chessPiece, COLOURS, makeBoard, refreshFaces, XQ_FONT, xiangqiPiece } from './board-models';
import type { BaseMove } from './board-game';

export interface Marks { rings?: number[]; dots?: number[]; captures?: number[]; crosses?: number[]; tints?: number[]; last?: number[]; check?: number | null; cursor?: number | null; lifted?: number | null }
export interface BoardTag { el: HTMLElement; sq: number; shift?: [number, number] }
export interface BoardOptions { kind: 'chess' | 'xiangqi'; reduced: boolean; accent: string; onPick: (sq: number) => void; onFrame?: () => void;
  /** CSS pixels at the top of the canvas that overlaid buttons cover; the board frames below them. */
  clear?: () => number }

const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function startBoard(host: HTMLElement, options: BoardOptions) {
  const { kind } = options, shape = boardShape(kind), files = shape.files, chess = kind === 'chess';
  const canvas = document.createElement('canvas');
  host.append(canvas);
  let dirty = true, frame = 0, stopped = false;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(-4, 12, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 3;
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0xd9d4c8, 0.35));

  const board = makeBoard(kind, shape, renderer);
  scene.add(board.group);
  // A soft shadow under the board, drawn once on a small canvas.
  const glow = Object.assign(document.createElement('canvas'), { width: 128, height: 128 });
  const gg = glow.getContext('2d')!, grad = gg.createRadialGradient(64, 64, 10, 64, 64, 62);
  grad.addColorStop(0, 'rgba(23,22,26,0.32)'); grad.addColorStop(1, 'rgba(23,22,26,0)');
  gg.fillStyle = grad; gg.fillRect(0, 0, 128, 128);
  const under = new THREE.Mesh(new THREE.PlaneGeometry(shape.width * 1.5, shape.depth * 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glow), transparent: true, depthWrite: false }));
  under.rotation.x = -Math.PI / 2;
  under.position.y = -0.6;
  scene.add(under);

  const pos = (sq: number) => shape.at(sq % files, Math.floor(sq / files));
  const height = chess ? 1.05 : 0.22;

  // ---- Fonts: the board's numbers and the xiangqi characters (declared in board.css) repaint once their fonts arrive ----
  const fonts = Promise.all([document.fonts.load('600 20px "Geist Mono"'), chess ? null : document.fonts.load(`700 20px "${XQ_FONT}"`, '帥')])
    .catch(() => {}).then(() => { board.redraw(); if (!chess) refreshFaces(); dirty = true; });

  // ---- Pieces ----
  const make = (code: string) => { const g = chess ? chessPiece(code) : xiangqiPiece(code); g.userData.code = code; return g; };
  let meshes = new Map<number, THREE.Group>();
  const placeAt = (g: THREE.Group, sq: number) => { g.position.copy(pos(sq)); g.userData.sq = sq; };

  // ---- Tweens ----
  type Tween = { start: number; duration: number; step: (p: number) => void; done: () => void };
  const tweens: Tween[] = [];
  const tween = (duration: number, step: (p: number) => void) => new Promise<void>(done => {
    if (duration <= 0 || options.reduced) { step(1); dirty = true; done(); return; }
    tweens.push({ start: performance.now(), duration, step, done });
  });
  let chain = Promise.resolve();
  const queue = (job: () => Promise<void>) => (chain = chain.then(job));

  /** Shows a new position. Pieces that can stay put do; others glide to the nearest new square of their kind, leave, or drop in. */
  function setPosition(next: string[], animate = true) {
    return queue(async () => {
      const old = new Map(meshes), now = new Map<number, THREE.Group>();
      const glide: { g: THREE.Group; a: THREE.Vector3; b: THREE.Vector3 }[] = [], drop: THREE.Group[] = [];
      next.forEach((code, sq) => { if (code && old.get(sq)?.userData.code === code) { now.set(sq, old.get(sq)!); old.delete(sq); } });
      next.forEach((code, sq) => {
        if (!code || now.has(sq)) return;
        let best: number | undefined;
        for (const [o, g] of old) if (g.userData.code === code && (best === undefined || pos(o).distanceTo(pos(sq)) < pos(best).distanceTo(pos(sq)))) best = o;
        if (best !== undefined) { const g = old.get(best)!; old.delete(best); glide.push({ g, a: g.position.clone(), b: pos(sq) }); g.userData.sq = sq; now.set(sq, g); }
        else { const g = make(code); placeAt(g, sq); scene.add(g); drop.push(g); now.set(sq, g); }
      });
      const leave = [...old.values()];
      meshes = now;
      for (const g of now.values()) g.position.y = 0;
      await tween(animate ? 560 : 0, p => {
        const e = ease(p);
        for (const { g, a, b } of glide) { g.position.lerpVectors(a, b, e); g.position.y = Math.sin(Math.PI * p) * 0.35; }
        for (const g of drop) { g.position.y = (1 - easeOut(p)) * 1.6; g.scale.setScalar(0.001 + 0.999 * easeOut(p)); }
        for (const g of leave) { g.position.y = easeOut(p) * 1.2; g.scale.setScalar(Math.max(0.001, 1 - easeOut(p))); }
      });
      for (const g of leave) scene.remove(g);
      for (const [sq, g] of meshes) { placeAt(g, sq); g.scale.setScalar(1); }
      dirty = true;
    });
  }

  /** Plays one move: the piece lifts and glides (a knight or horse hops), a captured piece leaves, a castling rook follows. */
  function move(m: BaseMove, opts: { duration?: number } = {}) {
    return queue(async () => {
      const g = meshes.get(m.from);
      if (!g) return;
      const victimSq = m.take ?? (m.captured ? m.to : undefined), victim = victimSq === undefined ? undefined : meshes.get(victimSq);
      const rook = m.rook ? meshes.get(m.rook[0]) : undefined;
      meshes.delete(m.from);
      if (victimSq !== undefined) meshes.delete(victimSq);
      if (m.rook && rook) { meshes.delete(m.rook[0]); meshes.set(m.rook[1], rook); rook.userData.sq = m.rook[1]; }
      meshes.set(m.to, g);
      g.userData.sq = m.to;
      const a = pos(m.from), b = pos(m.to), hop = 'nh'.includes(m.piece.toLowerCase());
      const ra = m.rook ? pos(m.rook[0]) : null, rb = m.rook ? pos(m.rook[1]) : null;
      const duration = opts.duration ?? Math.min(620, 300 + a.distanceTo(b) * 45);
      await tween(duration, p => {
        const e = ease(p);
        g.position.lerpVectors(a, b, e);
        g.position.y = Math.sin(Math.PI * p) * (hop ? 0.75 : 0.22);
        if (rook && ra && rb) { rook.position.lerpVectors(ra, rb, e); rook.position.y = Math.sin(Math.PI * p) * 0.4; }
        if (victim) { const q = Math.max(0, (p - 0.6) / 0.4); victim.position.y = easeOut(q) * 0.9; victim.scale.setScalar(Math.max(0.001, 1 - easeOut(q))); }
      });
      if (victim) scene.remove(victim);
      placeAt(g, m.to);
      if (m.promo) {
        scene.remove(g);
        const q = make(m.promo);
        placeAt(q, m.to);
        scene.add(q);
        meshes.set(m.to, q);
        await tween(260, p => q.scale.setScalar(0.6 + 0.4 * easeOut(p)));
      }
      dirty = true;
    });
  }

  // ---- Marks ----
  const accent = new THREE.Color(options.accent);
  const flat = (color: THREE.ColorRepresentation, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false, toneMapped: false });
  const violet = flat(accent), violetSoft = flat(accent, 0.24), inkSoft = flat(COLOURS.frame, chess ? 0.12 : 0.3), inkMark = flat(COLOURS.frame, 0.8), red = flat(COLOURS.check), redSoft = flat(COLOURS.check, 0.28);
  const ringGeo = (r: number, t: number) => new THREE.RingGeometry(r - t, r + t, 48).rotateX(-Math.PI / 2);
  const cell = chess ? new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) : new THREE.CircleGeometry(0.44, 40).rotateX(-Math.PI / 2);
  const geos = {
    ring: ringGeo(0.45, 0.028), capture: ringGeo(0.47, 0.04), dot: new THREE.CircleGeometry(0.13, 32).rotateX(-Math.PI / 2),
    glow: new THREE.CircleGeometry(0.48, 40).rotateX(-Math.PI / 2), bar: new THREE.BoxGeometry(0.42, 0.012, 0.06),
    edge: new THREE.BoxGeometry(0.98, 0.012, 0.045),
  };
  const marks = new THREE.Group();
  scene.add(marks);
  let lifted: number | null = null;
  function setMarks(m: Marks) {
    marks.clear();
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, sq: number, y: number, ry = 0) => { const o = new THREE.Mesh(geo, mat); o.position.copy(pos(sq)).setY(y); o.rotation.y = ry; o.renderOrder = 2; marks.add(o); };
    for (const sq of m.last ?? []) add(chess ? cell : geos.ring, inkSoft, sq, 0.003);
    for (const sq of m.tints ?? []) add(cell, violetSoft, sq, 0.004);
    if (m.check != null) { add(geos.glow, redSoft, m.check, 0.005); add(geos.capture, red, m.check, 0.008); }
    for (const sq of m.rings ?? []) add(geos.ring, violet, sq, 0.009);
    for (const sq of m.captures ?? []) add(geos.capture, violet, sq, 0.009);
    for (const sq of m.dots ?? []) add(geos.dot, violet, sq, 0.01);
    // A cross on an occupied point sits on the piece's top, where it can be seen.
    for (const sq of m.crosses ?? []) { const y = meshes.has(sq) ? height + 0.02 : 0.01; add(geos.bar, inkMark, sq, y, Math.PI / 4); add(geos.bar, inkMark, sq, y, -Math.PI / 4); }
    if (m.cursor != null) for (let i = 0; i < 4; i++) {
      const o = new THREE.Mesh(geos.edge, violet), side = i < 2 ? 1 : -1;
      o.position.copy(pos(m.cursor)).add(i % 2 ? new THREE.Vector3(side * 0.47, 0.012, 0) : new THREE.Vector3(0, 0.012, side * 0.47));
      o.rotation.y = i % 2 ? Math.PI / 2 : 0;
      marks.add(o);
    }
    // A selected piece rises a little off the board.
    if (lifted !== m.lifted) {
      const was = lifted === null ? undefined : meshes.get(lifted), now = m.lifted == null ? undefined : meshes.get(m.lifted);
      lifted = m.lifted ?? null;
      void tween(140, p => { if (was) was.position.y = 0.14 * (1 - p); if (now) now.position.y = 0.14 * p; });
    }
    dirty = true;
  }

  // ---- The next move: a violet arc from above the piece down to its target ----
  let arrow: THREE.Group | null = null;
  function setArrow(from: number | null, to?: number) {
    if (arrow) { scene.remove(arrow); arrow.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); arrow = null; }
    if (from !== null && to !== undefined) {
      const a = pos(from), b = pos(to), d = a.distanceTo(b);
      const start = new THREE.Vector3(a.x, height + 0.15, a.z), end = new THREE.Vector3(b.x, chess ? 0.55 : 0.4, b.z);
      const mid = start.clone().lerp(end, 0.5).setY(height + 0.55 + d * 0.12);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      arrow = new THREE.Group();
      arrow.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.05, 10, false), violet));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 20), violet);
      tip.position.copy(curve.getPoint(1));
      tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangent(1));
      arrow.add(tip);
      scene.add(arrow);
    }
    dirty = true;
  }

  // ---- Camera ----
  // A tall, narrow canvas (a phone) looks down more steeply, so the far side of the board stays large enough to tap.
  // Straight down suits xiangqi's flat discs; chess keeps a little tilt so each piece's shape still shows.
  const TOP = chess ? 1.36 : 1.54, homePitch = () => canvas.clientWidth < canvas.clientHeight * 0.9 ? 1.22 : chess ? 0.92 : 1.0;
  const view = { yaw: 0, pitch: homePitch(), tyaw: 0, tpitch: homePitch() };
  const target = new THREE.Vector3(0, 0, chess ? 0.15 : 0.1);
  const corners = [-1, 1].flatMap(sx => [-1, 1].flatMap(sz => [0, height].map(y => new THREE.Vector3(sx * shape.width / 2, y, sz * shape.depth / 2))));
  let band = 0;
  function placeCamera() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    camera.aspect = w / h;
    const dir = new THREE.Vector3(Math.cos(view.pitch) * Math.sin(view.yaw), Math.sin(view.pitch), Math.cos(view.pitch) * Math.cos(view.yaw));
    const forward = dir.clone().negate(), right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, forward);
    const full = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanX = full * camera.aspect, tanY = full * (h - band) / h;
    // The nearest distance at which every corner of the board, pieces included, fits the frame.
    let dist = 0;
    for (const c of corners) {
      const rel = c.clone().sub(target), depth = rel.dot(dir);
      dist = Math.max(dist, depth + Math.abs(rel.dot(right)) / tanX, depth + Math.abs(rel.dot(up)) / tanY);
    }
    camera.position.copy(target).addScaledVector(dir, dist * 1.03);
    camera.lookAt(target);
    // Moves the picture down by half the covered band, so the board sits centred in the open part.
    if (band) camera.setViewOffset(w, h, 0, -band / 2, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  const resize = () => {
    band = Math.min(canvas.clientHeight * 0.25, Math.max(0, options.clear?.() ?? 0));
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    dirty = true;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // ---- Tags ----
  let tags: BoardTag[] = [];
  const v = new THREE.Vector3();
  function placeTags() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const t of tags) {
      v.copy(pos(t.sq));
      if (t.shift) { v.x += t.shift[0]; v.z += t.shift[1]; }
      // A word about a piece sits over the piece's top; board.css lifts it clear.
      v.y = !t.shift && meshes.has(t.sq) ? height + 0.08 : 0.05;
      v.project(camera);
      t.el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px)`;
    }
  }

  // ---- Pointer: a tap picks a point, a drag looks around ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  let press: null | { x: number; y: number; id: number; moved: boolean } = null;
  function pick(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // A tall piece covers the squares behind it, so a hit on a piece counts as its own square.
    const onPiece = ray.intersectObjects([...meshes.values()], true)[0];
    if (onPiece) { let o: THREE.Object3D | null = onPiece.object; while (o && o.userData.sq === undefined) o = o.parent; if (o) return o.userData.sq as number; }
    if (!ray.ray.intersectPlane(plane, hit)) return -1;
    const f = chess ? Math.floor(hit.x + 4) : Math.round(hit.x + 4), rk = chess ? Math.floor(4 - hit.z) : Math.round(4.5 - hit.z);
    if (f < 0 || f >= files || rk < 0 || rk >= shape.ranks) return -1;
    if (!chess && pos(rk * files + f).distanceTo(hit.setY(0)) > 0.5) return -1;
    return rk * files + f;
  }
  canvas.addEventListener('pointerdown', e => { press = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    if (!press.moved && Math.hypot(dx, dy) < 8) return;
    press.moved = true;
    view.tyaw -= dx * 0.008;
    view.tpitch = THREE.MathUtils.clamp(view.tpitch + dy * 0.006, 0.4, TOP);
    press.x = e.clientX; press.y = e.clientY;
  });
  const release = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return;
    const tap = !press.moved;
    press = null;
    if (tap && e.type === 'pointerup') { const sq = pick(e); if (sq >= 0) options.onPick(sq); }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // ---- Loop ----
  const tick = (now: number) => {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i], p = Math.min(1, (now - t.start) / t.duration);
      t.step(p);
      if (p >= 1) { tweens.splice(i, 1); t.done(); }
      dirty = true;
    }
    const k = options.reduced ? 1 : 0.16;
    if (Math.abs(view.tyaw - view.yaw) > 1e-4 || Math.abs(view.tpitch - view.pitch) > 1e-4) {
      view.yaw += (view.tyaw - view.yaw) * k; view.pitch += (view.tpitch - view.pitch) * k; dirty = true;
    }
    if (dirty) {
      placeCamera();
      renderer.render(scene, camera);
      placeTags();
      options.onFrame?.();
      dirty = false;
    }
    if (!stopped) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    fonts,
    setPosition,
    move,
    setMarks,
    setArrow,
    /** Waits for the moves and position changes already queued. */
    settle: () => chain,
    setTags(list: BoardTag[]) { tags = list; dirty = true; },
    /** Where a point on the board lands on the canvas, in CSS pixels. */
    project(sq: number) { const q = pos(sq).project(camera); return { x: (q.x + 1) / 2 * canvas.clientWidth, y: (1 - q.y) / 2 * canvas.clientHeight }; },
    home() { view.tyaw = Math.round(view.tyaw / (Math.PI * 2)) * Math.PI * 2; view.tpitch = homePitch(); dirty = true; },
    top() { view.tyaw = Math.round(view.tyaw / (Math.PI * 2)) * Math.PI * 2; view.tpitch = TOP; dirty = true; },
    look(dyaw: number, dpitch: number) { view.tyaw += dyaw; view.tpitch = THREE.MathUtils.clamp(view.tpitch + dpitch, 0.4, TOP); dirty = true; },
    stop() {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      pmrem.dispose();
      canvas.remove();
    },
  };
}

export type BoardStage = ReturnType<typeof startBoard>;
