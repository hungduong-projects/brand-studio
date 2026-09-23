/**
 * Hollis One: fictional over-ear headphones built from three.js primitives.
 * The hero scrubs the model with scroll (turn, then explode the cups into shell, driver and cushion);
 * the turntable clip spins the same model on a loop.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type Part = 'shell' | 'driver' | 'cushion' | 'band';

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const ease = (v: number) => { const t = clamp(v); return t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
const range = (p: number, a: number, b: number) => ease((p - a) / (b - a));

interface Model {
  root: THREE.Group;
  /** 0 = assembled, 1 = cups apart. */
  explode(e: number): void;
  /** A world-space point on each part, for placing its label. */
  anchor(part: Part): THREE.Vector3;
}

function buildModel(accent: string): Model {
  const metal = new THREE.MeshPhysicalMaterial({ color: '#c9c6c0', metalness: 1, roughness: .32, clearcoat: .4, side: THREE.DoubleSide });
  const steel = new THREE.MeshPhysicalMaterial({ color: '#8d8f93', metalness: 1, roughness: .22 });
  const fabric = new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: .95 });
  const mesh = new THREE.MeshStandardMaterial({ color: '#141416', metalness: .6, roughness: .55 });
  const ring = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: .35, roughness: .4 });

  const root = new THREE.Group();

  // Headband: a thin steel arc and a wider fabric canopy just inside it.
  const arc = (k: number) => new THREE.CatmullRomCurve3([
    [-1.27, .35], [-1.2, 1.02], [-.72, 1.58], [0, 1.76], [.72, 1.58], [1.2, 1.02], [1.27, .35],
  ].map(([x, y]) => new THREE.Vector3(x * k, .35 + (y - .35) * k, 0)));
  const band = new THREE.Group();
  band.add(new THREE.Mesh(new THREE.TubeGeometry(arc(1), 96, .035, 12), steel));
  const canopy = new THREE.Mesh(new THREE.TubeGeometry(arc(.94), 96, .06, 16), fabric);
  canopy.scale.z = 2.6;
  band.add(canopy);
  root.add(band);

  // Shell profile, lathed around its axis: flat face outside, rounded rim, open inside.
  const profile = [[0, .34], [.42, .34], [.56, .31], [.62, .22], [.63, .08], [.6, 0]].map(([r, y]) => new THREE.Vector2(r, y));
  const shellGeo = new THREE.LatheGeometry(profile, 96);
  shellGeo.rotateZ(-Math.PI / 2);

  const cups: { shell: THREE.Group; driver: THREE.Group; cushion: THREE.Mesh }[] = [];
  for (const side of [1, -1]) {
    const cup = new THREE.Group();
    cup.position.set(1.1 * side, -.42, 0);
    cup.scale.x = side;

    const shell = new THREE.Group();
    const body = new THREE.Mesh(shellGeo, metal);
    body.position.x = .02;
    shell.add(body);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .32, 12), steel);
    stem.position.set(.17, .7, 0);
    shell.add(stem);

    const driver = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .04, 96), mesh);
    plate.rotation.z = Math.PI / 2;
    driver.add(plate);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.3, .12, 64, 1, true), mesh);
    cone.rotation.z = Math.PI / 2;
    cone.position.x = -.06;
    driver.add(cone);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(.44, .018, 12, 96), ring);
    trim.rotation.y = Math.PI / 2;
    trim.position.x = -.025;
    driver.add(trim);

    const cushion = new THREE.Mesh(new THREE.TorusGeometry(.43, .15, 32, 96), fabric);
    cushion.rotation.y = Math.PI / 2;
    cushion.scale.z = 1.25;
    cushion.position.x = -.15;

    cup.add(shell, driver, cushion);
    root.add(cup);
    cups.push({ shell, driver, cushion });
  }

  return {
    root,
    explode(e) {
      for (const { shell, driver, cushion } of cups) {
        shell.position.x = .72 * e;
        driver.position.x = -.12 * e;
        cushion.position.x = -.15 - .72 * e;
      }
      band.position.y = .55 * e;
    },
    anchor(part) {
      const [right] = cups;
      if (part === 'band') return band.localToWorld(new THREE.Vector3(0, 1.76, 0));
      if (part === 'shell') return right.shell.localToWorld(new THREE.Vector3(.34, .45, 0));
      if (part === 'driver') return right.driver.localToWorld(new THREE.Vector3(0, -.5, 0));
      return right.cushion.localToWorld(new THREE.Vector3(0, .58, 0));
    },
  };
}

function setup(canvas: HTMLCanvasElement, accent: string) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  const model = buildModel(accent);
  scene.add(model.root);

  const resize = (width: number) => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep `width` world units in frame on narrow screens.
    camera.position.set(0, .3, Math.max(7.5, width / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * camera.aspect)));
    camera.lookAt(0, .25, 0);
    camera.updateProjectionMatrix();
  };
  const dispose = () => {
    scene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
    scene.environment?.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
  return { renderer, scene, camera, model, resize, dispose };
}

/** Pinned hero: scroll progress through `section` drives the model; labels follow their parts. */
export function startHeroStage(canvas: HTMLCanvasElement, section: HTMLElement, labels: { el: HTMLElement; part: Part }[], accent: string, still: boolean) {
  const { renderer, scene, camera, model, resize, dispose } = setup(canvas, accent);
  const v = new THREE.Vector3();

  const draw = () => {
    const rect = section.getBoundingClientRect();
    const p = still ? .8 : clamp(-rect.top / Math.max(1, rect.height - innerHeight));
    const turn = range(p, 0, .4), e = range(p, .35, .75);
    model.root.rotation.set(.28 * (1 - turn), .95 * (1 - turn) + .32 * e, 0);
    model.root.scale.setScalar(.82 + .18 * turn);
    model.root.position.y = -.75 * (1 - turn);
    model.explode(e);
    section.style.setProperty('--p', p.toFixed(3));
    section.style.setProperty('--e', e.toFixed(3));
    renderer.render(scene, camera);
    model.root.updateMatrixWorld();
    for (const { el, part } of labels) {
      v.copy(model.anchor(part)).project(camera);
      el.style.transform = `translate(${((v.x + 1) / 2 * canvas.clientWidth).toFixed(1)}px, ${((1 - v.y) / 2 * canvas.clientHeight).toFixed(1)}px)`;
    }
  };

  let frame = 0;
  const request = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
  const onResize = () => { resize(5.4); request(); };
  onResize();
  addEventListener('resize', onResize);
  if (!still) addEventListener('scroll', request, { passive: true });
  return () => {
    cancelAnimationFrame(frame);
    removeEventListener('resize', onResize);
    removeEventListener('scroll', request);
    dispose();
  };
}

/** The same model on a turntable, for the clip grid. `draw(t)` renders time `t` in seconds. */
export function createTurntable(canvas: HTMLCanvasElement, accent: string) {
  const { renderer, scene, camera, model, resize, dispose } = setup(canvas, accent);
  model.root.rotation.x = .18;
  return {
    resize: () => resize(3.4),
    draw(t: number) {
      model.root.rotation.y = t / 12 * Math.PI * 2;
      model.root.position.y = Math.sin(t * 1.2) * .04;
      renderer.render(scene, camera);
    },
    dispose,
  };
}
