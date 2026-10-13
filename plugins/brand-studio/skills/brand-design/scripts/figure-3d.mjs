// Lit 3D renders of an explainer figure for figure.mjs --3d. Each part is its plan outline raised to its height, seen by
// a camera that matches the flat drawing, so a render lines up with figure.svg. three.js comes from the working directory
// and is served to Chromium on a private origin.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const ORIGIN = 'https://three.local';

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><script type="importmap">{"imports":{"three":"/build/three.module.js","three/addons/":"/examples/jsm/"}}</script></head><body style="margin:0"><script type="module">
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const colour = value => new THREE.Color().setStyle(value, THREE.SRGBColorSpace);
window.render = ({ solids, shadow, ground, box, azimuth, width }) => {
  const height = Math.round(width * box[3] / box[2]), a = azimuth * Math.PI / 180, e = Math.PI / 6;
  renderer.setSize(width, height);
  const scene = new THREE.Scene();
  scene.background = colour(ground);
  // The parts list has x and y on the ground and z up; three.js has y up. Swapping y and z also mirrors the scene, which
  // puts x to the right and y to the left as the flat drawing has them.
  const world = new THREE.Group();
  world.matrixAutoUpdate = false;
  world.matrix.set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  scene.add(world);
  for (const solid of solids) {
    const part = new THREE.Group();
    part.position.set(...solid.offset);
    const xs = solid.plan.map(p => p[0]), ys = solid.plan.map(p => p[1]);
    const bevel = Math.min(0.6, solid.height / 4, (Math.max(...xs) - Math.min(...xs)) / 4, (Math.max(...ys) - Math.min(...ys)) / 4);
    const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(solid.plan.map(([x, y]) => new THREE.Vector2(x, y))), { depth: solid.height - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3 });
    const fill = colour(solid.fill);
    // The offset keeps a mark drawn on a face in front of that face.
    const body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: fill, roughness: 0.85, metalness: 0, emissive: fill, emissiveIntensity: solid.lit ? 0.2 : 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    body.position.z = solid.base + bevel;
    body.castShadow = body.receiveShadow = true;
    part.add(body);
    for (const mark of solid.marks) {
      if (mark.paint === 'dot') {
        const centre = mark.points.reduce((sum, p) => sum.map((v, i) => v + p[i] / mark.points.length), [0, 0, 0]);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 20), new THREE.MeshStandardMaterial({ color: colour(solid.line), roughness: 0.6 }));
        head.rotation.x = Math.PI / 2;
        head.position.set(centre[0], centre[1], centre[2] + 0.15);
        part.add(head);
        continue;
      }
      // A line's quads face the camera whatever the scene's mirror does to winding, so they draw both sides.
      const points = mark.closed ? [...mark.points, mark.points[0]] : mark.points;
      part.add(new Line2(new LineGeometry().setPositions(points.flat()), new LineMaterial({ color: colour(solid.line), linewidth: 0.7 * width / box[2], resolution: new THREE.Vector2(width, height), side: THREE.DoubleSide })));
    }
    world.add(part);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ color: colour(shadow.fill), opacity: Math.min(1, shadow.opacity * 2) }));
  // Just under the ground, so it never shares a plane with the base of a part.
  floor.position.z = -0.05;
  floor.receiveShadow = true;
  world.add(floor);

  // The flat drawing's camera: 30 degrees above the ground, one world unit per drawing unit, framed on the same box.
  const right = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)), toward = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  const up = new THREE.Vector3().crossVectors(toward, right);
  const centre = right.clone().multiplyScalar(box[0] + box[2] / 2).addScaledVector(up, -(box[1] + box[3] / 2));
  const camera = new THREE.OrthographicCamera(-box[2] / 2, box[2] / 2, box[3] / 2, -box[3] / 2, 1, 4000);
  camera.position.copy(centre).addScaledVector(toward, 1500);
  camera.lookAt(centre);
  // Mostly even light, so a top keeps close to the palette's colour, with a key from the upper left as the flat shading
  // has it: left sides a little darker, right sides darker still.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb0b0b0, 1.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.25), reach = Math.max(box[2], box[3]);
  key.position.copy(centre).addScaledVector(right, -0.55 * 900).addScaledVector(new THREE.Vector3(0, 1, 0), 900).addScaledVector(toward, 0.3 * 900);
  key.target.position.copy(centre);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.3;
  Object.assign(key.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 3000 });
  key.shadow.camera.updateProjectionMatrix();
  scene.add(key, key.target);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  return url;
};
window.ready = true;
</script></body></html>`;

/** The folder of the three package that the working directory resolves. */
export function findThree() {
  // three's exports map hides package.json; its require entry is build/three.cjs, two levels below the package root.
  try { return path.dirname(path.dirname(createRequire(path.join(process.cwd(), 'index.js')).resolve('three'))); }
  catch { throw new Error('Install three to use --3d: npm install --no-save three'); }
}

/** Write <out>/<name>.png, width px wide, for each view { name, solids, shadow, ground }: the solids of
 * figureSolids, the colour and strength of the cast shadow and the colour behind the object. frame is the flat
 * drawing's { box, azimuth }. */
export async function render3d(browser, three, views, frame, out, width = 2000) {
  mkdirSync(out, { recursive: true });
  const page = await browser.newPage({ viewport: { width, height: width } });
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
  for (const view of views) {
    const url = await page.evaluate(scene => window.render(scene), { solids: view.solids, shadow: view.shadow, ground: view.ground, ...frame, width });
    writeFileSync(path.join(out, `${view.name}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await page.close();
}
