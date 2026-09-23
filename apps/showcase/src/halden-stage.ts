/**
 * The Halden stage: one camera model on a fixed canvas behind the page.
 * Each [data-shot] section names a pose; scrolling between sections moves the model between poses.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { at } from './paths';

export interface Pose {
  /** Turn around the vertical axis and tilt toward the viewer, in radians. */
  yaw: number;
  pitch: number;
  /** 0 = assembled, 1 = parts fully apart. */
  explode: number;
  /** Distance from the model; smaller is closer. */
  distance: number;
  /** Where the model sits across the screen, -1 left to 1 right. Ignored on narrow screens. */
  x: number;
  y: number;
  /** On narrow screens only: how far below the middle the model sits, as a share of screen height. Negative lifts it. */
  drop?: number;
}

export type Part = 'body' | 'barrel' | 'glass' | 'strap';

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (v: number) => v * v * (3 - 2 * v);
const mix = (a: Pose, b: Pose, t: number): Pose => ({
  yaw: a.yaw + (b.yaw - a.yaw) * t, pitch: a.pitch + (b.pitch - a.pitch) * t, explode: a.explode + (b.explode - a.explode) * t,
  distance: a.distance + (b.distance - a.distance) * t, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
  drop: (a.drop ?? 0) + ((b.drop ?? 0) - (a.drop ?? 0)) * t,
});

const PARTS: Record<string, Part> = { Camera_01_body: 'body', Camera_01_lens_body: 'barrel', Camera_01_lens: 'glass', Camera_01_strap: 'strap' };

export function startHalden(canvas: HTMLCanvasElement, sections: HTMLElement[], poses: Pose[], options: {
  reduced: boolean;
  /** Extra turn from dragging, added to the current pose. */
  spin: () => number;
  onReady?: () => void;
  /** Screen position of each part's centre, for labels. */
  onParts?: (parts: Record<Part, { x: number; y: number }>) => void;
  /** Parts to leave out, for close-up stills. */
  hide?: Part[];
  /** Solid sections and copy blocks. On narrow screens the model fades out while one overlaps the band it sits in, so it never shows cut off at an edge. */
  covers?: HTMLElement[];
}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
  const turn = new THREE.Group();
  scene.add(turn);

  // A soft rim from behind so the black body separates from the black stage.
  const rim = new THREE.DirectionalLight(0xfff1dc, 1.6);
  rim.position.set(-2, 3, -4);
  scene.add(rim);

  const pmrem = new THREE.PMREMGenerator(renderer);
  new HDRLoader().load(at('models/studio.hdr'), texture => {
    scene.environment = pmrem.fromEquirectangular(texture).texture;
    texture.dispose();
  });

  const pieces: { part: Part; object: THREE.Object3D; home: THREE.Vector3; away: THREE.Vector3 }[] = [];
  let ready = false;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(at('models/camera.glb'), gltf => {
    const model = gltf.scene;
    // Fit the camera into a box about two units wide. Centre the body and lens on the origin; the strap hangs where it falls.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()), core = new THREE.Box3();
    model.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && PARTS[(mesh.material as THREE.MeshStandardMaterial).name] !== 'strap') core.expandByObject(mesh);
    });
    const centre = (core.isEmpty() ? box : core).getCenter(new THREE.Vector3());
    const scale = 2 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    model.position.copy(centre).multiplyScalar(-scale);
    turn.add(model);
    model.updateMatrixWorld(true);

    const centres = new Map<Part, THREE.Vector3>();
    const meshes: [Part, THREE.Mesh][] = [];
    model.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      const part = PARTS[material.name];
      if (!part) return;
      material.envMapIntensity = part === 'glass' ? 1.6 : 1.1;
      mesh.visible = !options.hide?.includes(part);
      meshes.push([part, mesh]);
      centres.set(part, new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()));
    });
    // The lens comes straight out of the body along its own axis; the glass goes furthest, the strap lifts away.
    const body = centres.get('body') ?? new THREE.Vector3();
    const axis = (centres.get('barrel') ?? new THREE.Vector3(0, 0, 1)).clone().sub(body).normalize();
    const offsets: Record<Part, THREE.Vector3> = {
      body: new THREE.Vector3(),
      barrel: axis.clone().multiplyScalar(0.55),
      glass: axis.clone().multiplyScalar(1.35),
      strap: new THREE.Vector3(0, 0.75, 0).addScaledVector(axis, -0.35),
    };
    for (const [part, mesh] of meshes) {
      // Offsets are in world units; convert them into the mesh's parent space, which may be scaled and rotated.
      const from = centres.get(part)!.clone(), to = from.clone().add(offsets[part]);
      const away = mesh.parent ? mesh.parent.worldToLocal(to).sub(mesh.parent.worldToLocal(from)) : offsets[part];
      pieces.push({ part, object: mesh, home: mesh.position.clone(), away });
    }
    ready = true;
    options.onReady?.();
  });

  let w = 0, h = 0;
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  /** Pose for the current scroll: sections anchor at their middles; between two middles the pose eases from one to the next. */
  const target = (): Pose => {
    const middle = h / 2;
    const anchors = sections.map(s => { const r = s.getBoundingClientRect(); return r.top + Math.min(r.height, h * 1.5) / 2; });
    if (middle <= anchors[0]) return poses[0];
    for (let i = 0; i < anchors.length - 1; i++) {
      if (middle < anchors[i + 1]) {
        const t = clamp((middle - anchors[i]) / (anchors[i + 1] - anchors[i]));
        return options.reduced ? poses[t < 0.5 ? i : i + 1] : mix(poses[i], poses[i + 1], smooth(t));
      }
    }
    return poses[poses.length - 1];
  };

  let current = { ...poses[0] }, raf = 0, last = performance.now(), time = 0;
  const projected = new THREE.Vector3(), bounds = new THREE.Box3();
  let spin = 0;
  const loop = (now: number) => {
    const dt = Math.min(now - last, 64);
    last = now;
    if (!options.reduced) time += dt;
    const goal = target();
    const k = options.reduced ? 1 : 1 - Math.exp(-dt / 120);
    current = mix(current, goal, k);

    const narrow = w < 768;
    const drift = options.reduced ? 0 : Math.sin(time / 2400) * 0.04;
    spin += (options.spin() - spin) * (options.reduced ? 1 : 1 - Math.exp(-dt / 90));
    turn.rotation.set(current.pitch + drift * 0.3, current.yaw + spin + drift, 0);
    turn.position.set(narrow ? 0 : current.x * 1.1, narrow ? 0 : current.y, 0);
    // Narrow screens stack copy and model, so each pose says where the model sits between them.
    if (narrow) camera.setViewOffset(w, h, 0, -(current.drop ?? 0) * h, w, h);
    const spot = h * (0.5 + (current.drop ?? 0));
    canvas.toggleAttribute('data-covered', narrow && !!options.covers?.some(el => { const r = el.getBoundingClientRect(); return r.top < spot + h * 0.14 && r.bottom > spot - h * 0.14; }));
    for (const piece of pieces) {
      const e = smooth(clamp(current.explode));
      piece.object.position.copy(piece.home).addScaledVector(piece.away, e);
    }
    camera.position.set(0, 0, current.distance * (narrow ? Math.max(1.2, 0.8 / camera.aspect) : 1));
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);

    if (ready && options.onParts) {
      const out = {} as Record<Part, { x: number; y: number }>;
      for (const piece of pieces) {
        bounds.setFromObject(piece.object).getCenter(projected);
        projected.project(camera);
        out[piece.part] = { x: (projected.x + 1) / 2 * w, y: (1 - projected.y) / 2 * h };
      }
      options.onParts(out);
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    pmrem.dispose();
    renderer.dispose();
  };
}
