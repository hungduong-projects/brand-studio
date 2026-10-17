/**
 * The Turnbook cube in three.js: 26 rounded pieces that turn layer by layer, a violet arc around the layer that turns
 * next, and a take-apart view that pulls the pieces off the core. Drawn in code; no model files.
 * The stage keeps the cube's state. Every finished turn calls `onMove`, whether a drag, a key or the lesson made it.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MOVES, PIECES, ROTATIONS, angleOf, apply, moveFor, position, solved, type Colour, type State } from './cube-logic';

/** Sticker colours of the standard scheme: white opposite yellow, green opposite blue, red opposite orange. */
export const STICKER: Record<Colour, string> = { white: '#f4f2ec', yellow: '#ffd23a', green: '#0c9450', blue: '#1f5fd1', red: '#d12b3b', orange: '#ff7a1a' };
const PLASTIC = '#1b1a20', DIMMED = new THREE.Color('#2a2930');

export interface Label { el: HTMLElement; at?: [number, number, number]; piece?: number; offset?: [number, number, number]; facing?: [number, number, number] }
export interface StageOptions { reduced: boolean; accent: string; onMove: (move: string, state: State, source: 'drag' | 'other') => void; onFrame?: () => void }

const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

function roundedSquare(size: number, r: number) {
  const s = size / 2, shape = new THREE.Shape();
  shape.moveTo(-s + r, -s);
  shape.lineTo(s - r, -s); shape.quadraticCurveTo(s, -s, s, -s + r);
  shape.lineTo(s, s - r); shape.quadraticCurveTo(s, s, s - r, s);
  shape.lineTo(-s + r, s); shape.quadraticCurveTo(-s, s, -s, s - r);
  shape.lineTo(-s, -s + r); shape.quadraticCurveTo(-s, -s, -s + r, -s);
  return new THREE.ShapeGeometry(shape, 6);
}

/** An arc of `span` radians at `radius` in the XZ plane, centred on +z, with an arrowhead at the end `dir` points to. */
function arcArrow(radius: number, span: number, dir: number, material: THREE.Material) {
  const group = new THREE.Group();
  const head = 0.26, from = -span / 2, to = span / 2 - head / radius;
  const curve = new THREE.CatmullRomCurve3(Array.from({ length: 24 }, (_, i) => { const t = from + (to - from) * i / 23; return new THREE.Vector3(Math.sin(t) * radius, 0, Math.cos(t) * radius); }));
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.045, 10, false), material));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.13, head + 0.04, 18), material);
  const end = span / 2 - head / radius / 2;
  tip.position.set(Math.sin(end) * radius, 0, Math.cos(end) * radius);
  // The cone points along +y; turn it to the arc's tangent at its end.
  tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(end), 0, -Math.sin(end)));
  group.add(tip);
  if (dir < 0) group.scale.x = -1;
  return group;
}

/** A rounded square loop in the XZ plane that wraps a layer of the cube just above its stickers. */
function layerLoop() {
  const h = 1.53, r = 0.12, pts: THREE.Vector3[] = [];
  const corners: [number, number, number][] = [[h - r, h - r, 0], [-(h - r), h - r, Math.PI / 2], [-(h - r), -(h - r), Math.PI], [h - r, -(h - r), Math.PI * 1.5]];
  for (const [cx, cz, a0] of corners) for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r)); }
  return new THREE.CatmullRomCurve3(pts, true);
}

export function startCube(host: HTMLElement, options: StageOptions) {
  const canvas = document.createElement('canvas');
  host.append(canvas);
  // Draw only when something changed: a turn, the view or the labels.
  let dirty = true, frame = 0, stopped = false;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(3, 6, 5);
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0xd9d4c8, 0.5));

  const root = new THREE.Group();
  scene.add(root);

  // A soft contact shadow under the cube, drawn once on a small canvas.
  const shadowCanvas = Object.assign(document.createElement('canvas'), { width: 128, height: 128 });
  const sg = shadowCanvas.getContext('2d')!, grad = sg.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(23,22,26,0.42)'); grad.addColorStop(1, 'rgba(23,22,26,0)');
  sg.fillStyle = grad; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -2.35;
  scene.add(shadow);

  // ---- Pieces ----
  const body = new RoundedBoxGeometry(0.96, 0.96, 0.96, 3, 0.07);
  const plastic = new THREE.MeshStandardMaterial({ color: PLASTIC, roughness: 0.55 });
  const sticker = roundedSquare(0.8, 0.11);
  const foot = new THREE.CylinderGeometry(0.15, 0.2, 0.55, 16);
  const pieces = PIECES.map((p, i) => {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(body, plastic);
    mesh.userData.piece = i;
    g.add(mesh);
    const stickers = p.stickers.map(s => {
      const m = new THREE.Mesh(sticker, new THREE.MeshStandardMaterial({ color: STICKER[s.colour], roughness: 0.32, polygonOffset: true, polygonOffsetFactor: -1 }));
      const n = new THREE.Vector3(...s.normal);
      m.position.copy(n).multiplyScalar(0.481);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      m.userData.piece = i;
      m.userData.base = new THREE.Color(STICKER[s.colour]);
      g.add(m);
      return m;
    });
    // The hidden tab that reaches in under the centres and holds the piece on: shown only when the cube comes apart.
    const home = new THREE.Vector3(...p.home);
    const tab = new THREE.Mesh(p.kind === 'centre' ? new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12) : foot, plastic);
    tab.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), home.clone().normalize());
    tab.position.copy(home).normalize().multiplyScalar(-0.62);
    tab.visible = false;
    g.add(tab);
    root.add(g);
    return { g, stickers, tab };
  });

  // The core: three crossed axes, a hub and a spring on each arm.
  const core = new THREE.Group();
  const grey = new THREE.MeshStandardMaterial({ color: '#8d8a94', roughness: 0.4, metalness: 0.3 });
  core.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), plastic));
  AXES.forEach((a, i) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.5, 14), plastic);
    if (i === 0) arm.rotation.z = Math.PI / 2;
    if (i === 2) arm.rotation.x = Math.PI / 2;
    core.add(arm);
    for (const side of [-1, 1]) {
      const helix = new THREE.CatmullRomCurve3(Array.from({ length: 90 }, (_, k) => {
        const t = k / 89, ang = t * Math.PI * 2 * 6;
        return new THREE.Vector3(Math.cos(ang) * 0.17, 0.62 + t * 0.5, Math.sin(ang) * 0.17);
      }));
      const spring = new THREE.Mesh(new THREE.TubeGeometry(helix, 200, 0.022, 6, false), grey);
      spring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().multiplyScalar(side));
      core.add(spring);
    }
  });
  core.visible = false;
  root.add(core);

  // ---- State and drawing ----
  let state = solved(), spread = 0, focus: Set<number> | null = null;
  const m4 = new THREE.Matrix4();
  function snap() {
    PIECES.forEach((p, i) => {
      const { g } = pieces[i], m = ROTATIONS[state[i]], at = position(state, i);
      g.position.set(at[0], at[1], at[2]).multiplyScalar(1 + spread * 1.05);
      m4.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
      g.quaternion.setFromRotationMatrix(m4);
    });
    const apart = spread > 0.02;
    shadow.position.y = -2.35 - spread * 1.1;
    shadow.scale.setScalar(1 + spread * 0.7);
    core.visible = apart;
    core.scale.setScalar(Math.max(0.001, spread));
    pieces.forEach(p => { p.tab.visible = apart; });
    dirty = true;
  }
  function paintFocus() {
    pieces.forEach((p, i) => p.stickers.forEach(s => {
      const m = s.material as THREE.MeshStandardMaterial;
      m.color.copy(s.userData.base);
      if (focus && !focus.has(i)) m.color.lerp(DIMMED, 0.84);
    }));
    dirty = true;
  }

  // ---- Camera ----
  const HOME = { yaw: 0.62, pitch: 0.5 };
  const view = { yaw: HOME.yaw, pitch: HOME.pitch, tyaw: HOME.yaw, tpitch: HOME.pitch, fit: 1 };
  function placeCamera() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    camera.aspect = w / h;
    const r = 3.05 + spread * 2;
    const half = Math.min(THREE.MathUtils.degToRad(camera.fov / 2), Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    const dist = r / Math.sin(half) * 1.02;
    camera.position.set(Math.cos(view.pitch) * Math.sin(view.yaw), Math.sin(view.pitch), Math.cos(view.pitch) * Math.cos(view.yaw)).multiplyScalar(dist);
    camera.lookAt(0, -0.05, 0);
    camera.updateProjectionMatrix();
  }
  const resize = () => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    dirty = true;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // ---- Tweens ----
  type Tween = { start: number; duration: number; step: (p: number) => void; done: () => void };
  const tweens: Tween[] = [];
  const tween = (duration: number, step: (p: number) => void) => new Promise<void>(done => {
    if (duration <= 0 || options.reduced) { step(1); dirty = true; done(); return; }
    tweens.push({ start: performance.now(), duration, step, done });
  });

  // ---- Turns ----
  let chain = Promise.resolve(), busy = 0;
  function turn(move: string, opts: { duration?: number; source?: 'drag' | 'other' } = {}) {
    busy++;
    chain = chain.then(async () => {
      const mv = MOVES[move], angle = angleOf(move);
      const whole = mv.layers.length === 3;
      const duration = opts.duration ?? (whole ? 520 : Math.abs(angle) > 2 ? 420 : 280);
      const pivot = new THREE.Group();
      root.add(pivot);
      const moving = PIECES.flatMap((_, i) => mv.layers.includes(position(state, i)[mv.axis]) ? [pieces[i].g] : []);
      if (whole) pivot.attach(core);
      moving.forEach(g => pivot.attach(g));
      await tween(duration, p => { pivot.setRotationFromAxisAngle(AXES[mv.axis], angle * (whole ? ease(p) : easeOut(p))); });
      moving.forEach(g => root.attach(g));
      if (whole) { root.attach(core); core.rotation.set(0, 0, 0); core.position.set(0, 0, 0); }
      root.remove(pivot);
      state = apply(state, [move]);
      snap();
      busy--;
      options.onMove(move, state, opts.source ?? 'other');
    });
    return chain;
  }

  // ---- Arrow on the layer that turns next ----
  const arrowMat = new THREE.MeshBasicMaterial({ color: options.accent, toneMapped: false });
  let arrows: { outer: THREE.Group; inner: THREE.Group }[] = [];
  function setArrow(move: string | null) {
    arrows.forEach(a => { root.remove(a.outer); a.outer.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); });
    arrows = [];
    if (move) {
      const mv = MOVES[move], dir = Math.sign(angleOf(move)), half = move.endsWith('2'), whole = mv.layers.length === 3;
      const outer = new THREE.Group(), inner = new THREE.Group();
      outer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), AXES[mv.axis]);
      outer.position.copy(AXES[mv.axis]).multiplyScalar(whole ? 0 : mv.layers[0]);
      inner.add(arcArrow(whole ? 2.75 : 2.3, half ? 1.9 : 1.25, dir, arrowMat));
      outer.add(inner);
      // A thin line around the layer, just off the stickers, so the arc reads as that layer's.
      if (!whole) outer.add(new THREE.Mesh(new THREE.TubeGeometry(layerLoop(), 96, 0.022, 6, true), arrowMat));
      root.add(outer);
      arrows.push({ outer, inner });
    }
    dirty = true;
  }
  const local = new THREE.Vector3();
  function aimArrows() {
    for (const a of arrows) {
      a.outer.updateMatrixWorld();
      local.copy(camera.position);
      a.outer.worldToLocal(local);
      a.inner.rotation.y = Math.atan2(local.x, local.z);
    }
  }

  // ---- Labels ----
  let labels: Label[] = [];
  const v = new THREE.Vector3(), n = new THREE.Vector3(), toCam = new THREE.Vector3();
  function placeLabels() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const l of labels) {
      if (l.piece !== undefined) pieces[l.piece].g.getWorldPosition(v);
      else v.set(...(l.at ?? [0, 0, 0]));
      if (l.offset) v.add(n.set(...l.offset));
      let hidden = false;
      if (l.facing) { n.set(...l.facing); toCam.copy(camera.position).sub(v).normalize(); hidden = n.dot(toCam) < 0.2; }
      v.project(camera);
      l.el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px)`;
      l.el.toggleAttribute('data-hidden', hidden);
    }
  }

  // ---- Pointer: drag a piece to turn its layer, drag the background to look around ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag: null | { x: number; y: number; id: number; piece?: number; normal?: THREE.Vector3; point?: THREE.Vector3; done?: boolean } = null;
  const toScreen = (p: THREE.Vector3) => { const q = p.clone().project(camera); return new THREE.Vector2((q.x + 1) / 2 * canvas.clientWidth, (1 - q.y) / 2 * canvas.clientHeight); };
  function onDown(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = spread < 0.02 ? ray.intersectObjects(pieces.flatMap(p => [p.g.children[0], ...p.stickers]), false)[0] : undefined;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    if (hit && hit.face) {
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      const k = [0, 1, 2].reduce((a, b) => Math.abs(normal.getComponent(b)) > Math.abs(normal.getComponent(a)) ? b : a, 0);
      drag.normal = AXES[k].clone().multiplyScalar(Math.sign(normal.getComponent(k)));
      drag.piece = hit.object.userData.piece;
      drag.point = hit.point.clone();
    }
    canvas.setPointerCapture(e.pointerId);
  }
  function onMove(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.id || drag.done) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.piece === undefined) {
      view.tyaw -= dx * 0.009;
      view.tpitch = THREE.MathUtils.clamp(view.tpitch + dy * 0.007, -1.1, 1.2);
      drag.x = e.clientX; drag.y = e.clientY;
      return;
    }
    if (Math.hypot(dx, dy) < 10) return;
    if (busy > 1) return;
    // Pick the direction along the face that the drag follows best, then turn the layer that moves that way.
    const d2 = new THREE.Vector2(dx, dy).normalize(), base = toScreen(drag.point!);
    let best = { score: 0, dir: new THREE.Vector3() };
    for (const a of AXES) {
      if (Math.abs(a.dot(drag.normal!)) > 0.5) continue;
      const s = toScreen(drag.point!.clone().addScaledVector(a, 0.5)).sub(base);
      if (s.length() < 1e-3) continue;
      const score = d2.dot(s.normalize());
      if (Math.abs(score) > Math.abs(best.score)) best = { score, dir: a.clone().multiplyScalar(Math.sign(score)) };
    }
    if (Math.abs(best.score) < 0.35) return;
    const w = new THREE.Vector3().crossVectors(drag.normal!, best.dir);
    const axis = [0, 1, 2].find(k => Math.abs(w.getComponent(k)) > 0.5)!;
    const layer = position(state, drag.piece)[axis];
    drag.done = true;
    void turn(moveFor(axis, layer, Math.sign(w.getComponent(axis))), { source: 'drag' });
  }
  function onUp(e: PointerEvent) { if (drag && e.pointerId === drag.id) drag = null; }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  // ---- Loop ----
  const tick = (now: number) => {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i], p = Math.min(1, (now - t.start) / t.duration);
      t.step(p);
      if (p >= 1) { tweens.splice(i, 1); t.done(); }
      dirty = true;
    }
    const k = options.reduced ? 1 : 0.18;
    if (Math.abs(view.tyaw - view.yaw) > 1e-4 || Math.abs(view.tpitch - view.pitch) > 1e-4) {
      view.yaw += (view.tyaw - view.yaw) * k; view.pitch += (view.tpitch - view.pitch) * k; dirty = true;
    }
    if (dirty) {
      placeCamera();
      aimArrows();
      renderer.render(scene, camera);
      placeLabels();
      options.onFrame?.();
      dirty = false;
    }
    if (!stopped) frame = requestAnimationFrame(tick);
  };
  snap();
  frame = requestAnimationFrame(tick);

  return {
    get state() { return state; },
    get busy() { return busy > 0; },
    turn,
    /** Where a point in cube space lands on the canvas, in CSS pixels. */
    project(x: number, y: number, z: number) { const q = new THREE.Vector3(x, y, z).project(camera); return { x: (q.x + 1) / 2 * canvas.clientWidth, y: (1 - q.y) / 2 * canvas.clientHeight }; },
    /** Waits for the turns already queued. */
    settle: () => chain,
    setState(next: State) { state = next.slice(); snap(); },
    setFocus(list: number[] | null) { focus = list && list.length ? new Set(list) : null; paintFocus(); },
    setArrow,
    setLabels(list: Label[]) { labels = list; dirty = true; },
    /** Pulls the pieces off the core (1) or puts them back (0). */
    apart(to: 0 | 1, duration = 900) {
      const from = spread;
      return tween(duration, p => { spread = from + (to - from) * ease(p); snap(); });
    },
    /** Looks at the cube from the lesson's angle: front, right and top in view. */
    home() { view.tyaw = HOME.yaw + Math.round((view.tyaw - HOME.yaw) / (Math.PI * 2)) * Math.PI * 2; view.tpitch = HOME.pitch; dirty = true; },
    look(dyaw: number, dpitch: number) { view.tyaw += dyaw; view.tpitch = THREE.MathUtils.clamp(view.tpitch + dpitch, -1.1, 1.2); dirty = true; },
    /** One slow turn of the view around the cube. */
    spin() { const from = view.tyaw; return tween(1800, p => { view.yaw = view.tyaw = from + Math.PI * 2 * ease(p); }); },
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

export type CubeStage = ReturnType<typeof startCube>;
