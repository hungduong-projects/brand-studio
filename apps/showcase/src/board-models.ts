/**
 * Boards and pieces for the Turnbook chess and xiangqi lessons, drawn in code: turned chess pieces with an extruded
 * knight head, xiangqi discs carrying their characters, and board tops painted on a canvas. No model files.
 * One board unit is one square, or the gap between two xiangqi points.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLYPHS } from './xiangqi-logic';

/** Board and piece colours. The frame matches the cube's plastic, so the three lessons read as one set. */
export const COLOURS = {
  frame: '#1b1a20', frameText: '#cfcac0',
  light: '#f1ece2', dark: '#c3b7a3',
  paper: '#ecdfc4', line: '#3b342e',
  ivory: '#e9dfca', ink: '#26242b',
  red: '#b8262e', black: '#1f1d24', check: '#d12b3b',
};

export const XQ_FONT = 'Turnbook Xiangqi';

export interface BoardShape { files: number; ranks: number; width: number; depth: number; /** Centre of point (f, r) on the board top. */ at: (f: number, r: number) => THREE.Vector3 }

export function boardShape(kind: 'chess' | 'xiangqi'): BoardShape {
  if (kind === 'chess') return { files: 8, ranks: 8, width: 9.2, depth: 9.2, at: (f, r) => new THREE.Vector3(f - 3.5, 0, 3.5 - r) };
  return { files: 9, ranks: 10, width: 9.7, depth: 11, at: (f, r) => new THREE.Vector3(f - 4, 0, 4.5 - r) };
}

// ---- Board ----

const PX = 220; // canvas pixels per board unit

function boardCanvas(kind: 'chess' | 'xiangqi', shape: BoardShape) {
  const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(shape.width * PX), height: Math.round(shape.depth * PX) });
  const g = canvas.getContext('2d')!;
  // Board units to canvas pixels, origin at the board centre, z toward the bottom edge.
  const X = (x: number) => (x + shape.width / 2) * PX, Y = (z: number) => (z + shape.depth / 2) * PX;
  g.fillStyle = COLOURS.frame;
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = COLOURS.frameText;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (kind === 'chess') {
    for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
      const c = shape.at(f, r);
      g.fillStyle = (f + r) % 2 === 0 ? COLOURS.dark : COLOURS.light;
      g.fillRect(X(c.x - 0.5), Y(c.z - 0.5), PX + 1, PX + 1);
    }
    g.fillStyle = COLOURS.frameText;
    g.font = `600 ${PX * 0.24}px "Geist Mono", ui-monospace, monospace`;
    for (let i = 0; i < 8; i++) {
      g.fillText('abcdefgh'[i], X(i - 3.5), Y(4.3));
      g.fillText(String(i + 1), X(-4.3), Y(3.5 - i));
    }
    return canvas;
  }
  // Xiangqi: ink lines on paper, broken by the river in the middle, with an X across each palace.
  const pad = 0.42;
  g.fillStyle = COLOURS.paper;
  g.fillRect(X(-4 - pad), Y(-4.5 - pad), (8 + pad * 2) * PX, (9 + pad * 2) * PX);
  g.strokeStyle = COLOURS.line;
  g.lineCap = 'square';
  const line = (a: THREE.Vector3, b: THREE.Vector3, w = 3) => { g.lineWidth = w; g.beginPath(); g.moveTo(X(a.x), Y(a.z)); g.lineTo(X(b.x), Y(b.z)); g.stroke(); };
  for (let r = 0; r < 10; r++) line(shape.at(0, r), shape.at(8, r));
  for (let f = 0; f < 9; f++) {
    if (f === 0 || f === 8) line(shape.at(f, 0), shape.at(f, 9));
    else { line(shape.at(f, 0), shape.at(f, 4)); line(shape.at(f, 5), shape.at(f, 9)); }
  }
  line(shape.at(3, 0), shape.at(5, 2)); line(shape.at(5, 0), shape.at(3, 2));
  line(shape.at(3, 7), shape.at(5, 9)); line(shape.at(5, 7), shape.at(3, 9));
  g.lineWidth = 7;
  g.strokeRect(X(-4 - 0.12), Y(-4.5 - 0.12), (8.24) * PX, (9.24) * PX);
  // Small corner marks on the points where the cannons and soldiers start.
  const marks: [number, number][] = [[1, 2], [7, 2], [1, 7], [7, 7], ...[0, 2, 4, 6, 8].flatMap(f => [[f, 3], [f, 6]] as [number, number][])];
  for (const [f, r] of marks) {
    const c = shape.at(f, r), o = 0.09, l = 0.17;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      if ((f === 0 && sx < 0) || (f === 8 && sx > 0)) continue;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(X(c.x + sx * (o + l)), Y(c.z + sz * o));
      g.lineTo(X(c.x + sx * o), Y(c.z + sz * o));
      g.lineTo(X(c.x + sx * o), Y(c.z + sz * (o + l)));
      g.stroke();
    }
  }
  g.fillStyle = COLOURS.line;
  g.globalAlpha = 0.72;
  g.font = `700 ${PX * 0.5}px "${XQ_FONT}", "Songti TC", "PingFang TC", serif`;
  g.fillText('楚 河', X(-2), Y(0));
  g.fillText('漢 界', X(2), Y(0));
  g.globalAlpha = 1;
  // File numbers from each player's right: Black's along the top, Red's along the bottom.
  g.fillStyle = COLOURS.frameText;
  g.font = `600 ${PX * 0.22}px "Geist Mono", ui-monospace, monospace`;
  for (let f = 0; f < 9; f++) {
    g.fillText(String(f + 1), X(f - 4), Y(-4.5 - 0.62));
    g.fillText(String(9 - f), X(f - 4), Y(4.5 + 0.62));
  }
  return canvas;
}

export function makeBoard(kind: 'chess' | 'xiangqi', shape: BoardShape, renderer: THREE.WebGLRenderer) {
  const group = new THREE.Group();
  const thick = 0.42;
  const slab = new THREE.Mesh(new RoundedBoxGeometry(shape.width, thick, shape.depth, 4, 0.1), new THREE.MeshStandardMaterial({ color: COLOURS.frame, roughness: 0.5 }));
  slab.position.y = -thick / 2;
  slab.receiveShadow = true;
  group.add(slab);
  const texture = new THREE.CanvasTexture(boardCanvas(kind, shape));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const top = new THREE.Mesh(new THREE.PlaneGeometry(shape.width - 0.02, shape.depth - 0.02), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.62 }));
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.001;
  top.receiveShadow = true;
  group.add(top);
  return { group, top, redraw: () => { texture.image = boardCanvas(kind, shape); texture.needsUpdate = true; } };
}

// ---- Chess pieces ----

type Profile = [number, number][];
const BASE: Profile = [[0, 0], [0.33, 0], [0.345, 0.025], [0.335, 0.065], [0.3, 0.085], [0.29, 0.115], [0.25, 0.135]];
const arc = (cy: number, r: number, from: number, to: number, n = 10): Profile =>
  Array.from({ length: n + 1 }, (_, i) => { const a = from + (to - from) * i / n; return [Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number]; });

const lathe = (profile: Profile) => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(Math.max(0, x), y)), 40);

function horseHead() {
  // A horse head in profile, facing -x, standing on y = 0.
  const s = new THREE.Shape();
  s.moveTo(0.2, 0);
  s.bezierCurveTo(0.24, 0.16, 0.2, 0.34, 0.12, 0.5);
  s.bezierCurveTo(0.08, 0.6, 0.06, 0.64, 0.02, 0.72);
  s.lineTo(-0.03, 0.62);
  s.bezierCurveTo(-0.1, 0.6, -0.2, 0.52, -0.28, 0.4);
  s.bezierCurveTo(-0.32, 0.34, -0.3, 0.3, -0.25, 0.29);
  s.bezierCurveTo(-0.18, 0.3, -0.12, 0.33, -0.08, 0.31);
  s.bezierCurveTo(-0.12, 0.22, -0.2, 0.12, -0.21, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 4, curveSegments: 16 });
  g.translate(0, 0, -0.09);
  return g;
}

/** Geometries for one chess piece type, merged into a group by `chessPiece`. */
function chessParts(type: string): THREE.BufferGeometry[] {
  switch (type) {
    case 'p': return [lathe([...BASE, [0.18, 0.2], [0.13, 0.33], [0.12, 0.37], [0.18, 0.395], [0.18, 0.415], [0.1, 0.44], ...arc(0.55, 0.135, -1.2, Math.PI / 2)])];
    case 'r': {
      const parts: THREE.BufferGeometry[] = [lathe([...BASE, [0.22, 0.17], [0.19, 0.48], [0.25, 0.53], [0.26, 0.56], [0.25, 0.7], [0.17, 0.7], [0.16, 0.64], [0, 0.64]])];
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, b = new THREE.BoxGeometry(0.1, 0.09, 0.09);
        b.rotateY(-a); b.translate(Math.cos(a) * 0.21, 0.74, Math.sin(a) * 0.21);
        parts.push(b);
      }
      return parts;
    }
    case 'n': {
      const head = horseHead();
      head.translate(0, 0.17, 0);
      return [lathe([...BASE, [0.24, 0.16], [0.24, 0.18], [0, 0.18]]), head];
    }
    case 'b': {
      const ball = new THREE.SphereGeometry(0.045, 16, 12);
      ball.translate(0, 0.95, 0);
      return [lathe([...BASE, [0.2, 0.17], [0.12, 0.5], [0.2, 0.545], [0.2, 0.565], [0.12, 0.6], [0.13, 0.63], [0.155, 0.71], [0.14, 0.79], [0.09, 0.87], [0, 0.915]]), ball];
    }
    case 'q': {
      const parts: THREE.BufferGeometry[] = [lathe([...BASE, [0.22, 0.17], [0.12, 0.6], [0.2, 0.645], [0.2, 0.665], [0.13, 0.7], [0.2, 0.86], [0.17, 0.885], [0.1, 0.86], [0.08, 0.9], [0.04, 0.95], [0, 0.96]])];
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, s = new THREE.SphereGeometry(0.035, 12, 8); s.translate(Math.cos(a) * 0.19, 0.89, Math.sin(a) * 0.19); parts.push(s); }
      const top = new THREE.SphereGeometry(0.05, 16, 12); top.translate(0, 1.0, 0); parts.push(top);
      return parts;
    }
    default: {
      const up = new THREE.BoxGeometry(0.06, 0.22, 0.06), across = new THREE.BoxGeometry(0.17, 0.06, 0.06);
      up.translate(0, 1.07, 0); across.translate(0, 1.09, 0);
      return [lathe([...BASE, [0.23, 0.17], [0.13, 0.64], [0.21, 0.69], [0.21, 0.71], [0.14, 0.75], [0.2, 0.9], [0.13, 0.95], [0, 0.965]]), up, across];
    }
  }
}

const cache = new Map<string, THREE.BufferGeometry[]>();
const physical = (color: string, roughness: number) => new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 0.55, clearcoatRoughness: 0.35 });
let ivory: THREE.Material | undefined, ink: THREE.Material | undefined;

export function chessPiece(piece: string) {
  const type = piece.toLowerCase(), white = piece !== type;
  if (!cache.has(type)) cache.set(type, chessParts(type));
  ivory ??= physical(COLOURS.ivory, 0.36);
  ink ??= physical(COLOURS.ink, 0.3);
  const group = new THREE.Group();
  for (const g of cache.get(type)!) {
    const m = new THREE.Mesh(g, white ? ivory : ink);
    m.castShadow = true;
    group.add(m);
  }
  // Knights show their profile from White's side: White's face left like the printed symbol, Black's face right.
  if (type === 'n') group.rotation.y = white ? -0.35 : Math.PI + 0.35;
  return group;
}

// ---- Xiangqi pieces ----

const DISC: Profile = [[0, 0], [0.37, 0], [0.405, 0.015], [0.425, 0.05], [0.425, 0.15], [0.405, 0.185], [0.37, 0.2], [0, 0.2]];
let disc: THREE.BufferGeometry | undefined, face: THREE.BufferGeometry | undefined, wood: THREE.Material | undefined;
const faces = new Map<string, THREE.Material>();

function faceTexture(piece: string) {
  const size = 256, c = Object.assign(document.createElement('canvas'), { width: size, height: size }), g = c.getContext('2d')!;
  const red = piece === piece.toUpperCase(), colour = red ? COLOURS.red : COLOURS.black;
  g.fillStyle = COLOURS.ivory;
  g.fillRect(0, 0, size, size);
  g.strokeStyle = colour;
  g.lineWidth = 7;
  g.beginPath(); g.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2); g.stroke();
  g.fillStyle = colour;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${size * 0.56}px "${XQ_FONT}", "Kaiti TC", "PingFang TC", serif`;
  g.fillText(GLYPHS[piece.toLowerCase()][red ? 0 : 1], size / 2, size / 2 + size * 0.02);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function xiangqiPiece(piece: string) {
  disc ??= lathe(DISC);
  face ??= new THREE.CircleGeometry(0.37, 48).rotateX(-Math.PI / 2).translate(0, 0.2005, 0);
  wood ??= physical(COLOURS.ivory, 0.42);
  if (!faces.has(piece)) faces.set(piece, new THREE.MeshPhysicalMaterial({ map: faceTexture(piece), roughness: 0.45, clearcoat: 0.4 }));
  const group = new THREE.Group();
  const body = new THREE.Mesh(disc, wood);
  body.castShadow = true;
  group.add(body, new THREE.Mesh(face, faces.get(piece)!));
  return group;
}

/** Repaints the xiangqi faces once the character font has loaded. */
export function refreshFaces() {
  for (const [piece, m] of faces) { const mat = m as THREE.MeshPhysicalMaterial; mat.map?.dispose(); mat.map = faceTexture(piece); mat.needsUpdate = true; }
}
