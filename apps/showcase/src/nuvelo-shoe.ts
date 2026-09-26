/**
 * The Nuvelo Drift: one shoe floating on a transparent canvas above the clouds.
 * The model is the Khronos "Materials Variants Shoe" (Shopify, CC BY 4.0), cleared of maker marks and recoloured
 * by source-3d/clean-shoe.py.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { at } from './paths';

export function startShoe(host: HTMLElement, options: { reduced: boolean; onReady?: () => void }) {
  // A fresh canvas per start, so a remount never shares a WebGL context with the renderer it replaces.
  const canvas = document.createElement('canvas');
  host.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 0.35, 6);
  camera.lookAt(0, 0, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.1;
  // Daylight from above left, blue from the sky and pink bounced up from the clouds.
  const sun = new THREE.DirectionalLight(0xfff6ee, 2.2);
  sun.position.set(-3, 5, 4);
  scene.add(sun, new THREE.HemisphereLight(0xbfe2ff, 0xf7a8cc, 1.1));

  const float = new THREE.Group(), turn = new THREE.Group();
  float.add(turn);
  scene.add(float);

  let ready = false, stopped = false;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(at('models/shoe.glb'), gltf => {
    if (stopped) return;
    const model = gltf.scene;
    // Centre the shoe and make it 2.3 units long.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
    model.position.sub(centre);
    const holder = new THREE.Group();
    holder.add(model);
    holder.scale.setScalar(2.3 / Math.max(size.x, size.z));
    turn.add(holder);
    ready = true;
    render();
    options.onReady?.();
  });

  // Side on, toe down to the left and heel up to the right, like a shoe mid-stride.
  const pose = { yaw: Math.PI + 0.3, pitch: -0.2, roll: -0.3 };
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (event: PointerEvent) => { look.tx = event.clientX / innerWidth - 0.5; look.ty = event.clientY / innerHeight - 0.5; };
  addEventListener('pointermove', onPointer);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole shoe in frame on tall screens.
    camera.zoom = Math.min(1, (w / h) / 0.8);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(() => { resize(); render(); });
  observer.observe(canvas);
  resize();

  let playing = !options.reduced, clock = 0, last = performance.now(), frame = 0;
  function render() {
    float.position.y = 0.12 * Math.sin(clock * 0.9) + 0.1;
    turn.rotation.set(pose.pitch + look.y * 0.12, pose.yaw + 0.1 * Math.sin(clock * 0.5) + look.x * 0.4, pose.roll + 0.04 * Math.sin(clock * 0.7), 'YXZ');
    renderer.render(scene, camera);
  }
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (playing && ready) {
      clock += dt;
      look.x += (look.tx - look.x) * 0.05;
      look.y += (look.ty - look.y) * 0.05;
      render();
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      removeEventListener('pointermove', onPointer);
      renderer.dispose();
      canvas.remove();
    },
    setPlaying(value: boolean) { playing = value; },
  };
}
