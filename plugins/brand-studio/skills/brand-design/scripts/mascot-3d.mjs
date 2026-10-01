// Soft-3D clay renders of a mascot rig for mascot.mjs --3d. The first slot is the body and takes the depth; later slots sit
// on its front face in slot order. three.js comes from the working directory and is served to Chromium on a private origin.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const ORIGIN = 'https://three.local';

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><script type="importmap">{"imports":{"three":"/build/three.module.js","three/addons/":"/examples/jsm/"}}</script></head><body style="margin:0;background:transparent"><script type="module">
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);
window.render = (svg, slots, size) => {
  renderer.setSize(size, size);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-260, 420, 520);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 1.5;
  Object.assign(key.shadow.camera, { left: -500, right: 500, top: 500, bottom: -500, near: 1, far: 2400 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7);
  fill.position.set(480, 60, 300);
  scene.add(fill);

  const figure = new THREE.Group();
  const counts = new Map();
  let bodyFront = 0;
  for (const p of new SVGLoader().parse(svg).paths) {
    const colour = p.userData.style.fill;
    if (!colour || colour === 'none') continue;
    const slot = p.userData.node.closest('[data-slot]')?.getAttribute('data-slot');
    const index = Math.max(0, slots.indexOf(slot));
    const order = (counts.get(index) ?? -1) + 1;
    counts.set(index, order);
    const body = index === 0;
    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color().setStyle(colour, THREE.SRGBColorSpace), roughness: 0.75, metalness: 0, side: THREE.DoubleSide });
    const z = body ? order * 4 : bodyFront - 2 + (index - 1) * 2 + order;
    if (body) bodyFront = Math.max(bodyFront, z + 46);
    for (const shape of SVGLoader.createShapes(p)) {
      const geometry = new THREE.ExtrudeGeometry(shape, body
        ? { depth: 36, bevelEnabled: true, bevelThickness: 10, bevelSize: 6, bevelSegments: 8, curveSegments: 32 }
        : { depth: 4, bevelEnabled: true, bevelThickness: 3, bevelSize: 1.5, bevelSegments: 4, curveSegments: 24 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = z;
      mesh.castShadow = mesh.receiveShadow = true;
      figure.add(mesh);
    }
  }
  // SVG y points down: flip, then centre the figure on the origin.
  figure.scale.y = -1;
  figure.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(figure);
  const centre = box.getCenter(new THREE.Vector3()), extent = box.getSize(new THREE.Vector3());
  figure.position.sub(centre);
  const pivot = new THREE.Group();
  pivot.add(figure);
  pivot.rotation.set(0.12, -0.38, 0);
  scene.add(pivot);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: 0.14 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -extent.y / 2 - 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const radius = extent.length() / 2;
  const camera = new THREE.PerspectiveCamera(26, 1, 10, 6000);
  camera.position.set(0, radius * 0.15, (radius / Math.sin(THREE.MathUtils.degToRad(13))) * 1.05);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.traverse(o => o.geometry?.dispose());
  return url;
};
window.ready = true;
</script></body></html>`;

/** Write <out>/<id>.png, size px with a transparent background, for each assembled state. */
export async function render3d(browser, states, slots, out, size = 1024) {
  let three;
  // three's exports map hides package.json; its require entry is build/three.cjs, two levels below the package root.
  try { three = path.dirname(path.dirname(createRequire(path.join(process.cwd(), 'index.js')).resolve('three'))); }
  catch { throw new Error('Install three to use --3d: npm install --no-save three'); }
  mkdirSync(out, { recursive: true });
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.route(`${ORIGIN}/**`, route => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: PAGE });
    const file = path.join(three, path.normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, ''));
    if (!file.startsWith(three + path.sep) || !existsSync(file)) return route.fulfill({ status: 404 });
    return route.fulfill({ contentType: 'text/javascript', body: readFileSync(file) });
  });
  page.on('pageerror', error => console.error(`3d page: ${error.message}`));
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
  for (const s of states) {
    const url = await page.evaluate(({ svg, slots, size }) => window.render(svg, slots, size), { svg: s.svg, slots, size });
    writeFileSync(path.join(out, `${s.id}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await page.close();
}
