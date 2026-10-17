/**
 * A 3x3 cube and a layer-by-layer solver that teaches. No DOM, so the tests run it in Node.
 *
 * Space: x right, y up, z toward the viewer (three.js axes). Each of the 26 visible pieces keeps its home position and
 * one rotation from the 24 rotations of a cube; every turn left-multiplies the rotations of the pieces in its layer.
 * Notation: R L U D F B turn one face clockwise as seen from that face, ' turns back, 2 turns twice; M E S turn the
 * middle layers like L, D and F; x y z turn the whole cube like R, U and F.
 */

export type Vec = [number, number, number];
export type Colour = 'white' | 'yellow' | 'green' | 'blue' | 'red' | 'orange';

// ---- Rotations --------------------------------------------------------------------------------------------------

type Mat = number[];
const mmul = (a: Mat, b: Mat): Mat => [0, 1, 2].flatMap(r => [0, 1, 2].map(c => a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]));
const turn90: Mat[] = [
  [1, 0, 0, 0, 0, -1, 0, 1, 0], // +90 degrees about x
  [0, 0, 1, 0, 1, 0, -1, 0, 0], // about y
  [0, -1, 0, 1, 0, 0, 0, 0, 1], // about z
];

/** The 24 rotations of a cube; index 0 is no rotation. */
export const ROTATIONS: Mat[] = (() => {
  const out: Mat[] = [[1, 0, 0, 0, 1, 0, 0, 0, 1]], seen = new Set([out[0].join()]);
  for (let i = 0; i < out.length; i++) for (const g of turn90) {
    const m = mmul(g, out[i]);
    if (!seen.has(m.join())) { seen.add(m.join()); out.push(m); }
  }
  return out;
})();
const indexOf = new Map(ROTATIONS.map((m, i) => [m.join(), i]));
const MUL = ROTATIONS.map(a => ROTATIONS.map(b => indexOf.get(mmul(a, b).join())!));
/** QUARTER[axis][q]: the rotation index for q quarter turns about an axis, counter-clockwise looking down the axis. */
const QUARTER = turn90.map(g => { let m = ROTATIONS[0]; return [0, 1, 2, 3].map(() => { const i = indexOf.get(m.join())!; m = mmul(g, m); return i; }); });

export const rotate = (r: number, v: Vec): Vec => {
  const m = ROTATIONS[r];
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
};
const same = (a: Vec, b: Vec) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

// ---- Pieces -----------------------------------------------------------------------------------------------------

/** Faces in home position, with their outward normals and colours. */
export const FACES = { U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1] } as const satisfies Record<string, Vec>;
export const FACE_COLOUR: Record<keyof typeof FACES, Colour> = { U: 'white', D: 'yellow', F: 'green', B: 'blue', R: 'red', L: 'orange' };
const faceOf = (n: Vec) => (Object.keys(FACES) as (keyof typeof FACES)[]).find(f => same(FACES[f] as Vec, n))!;

export interface Piece { home: Vec; kind: 'centre' | 'edge' | 'corner'; stickers: { normal: Vec; colour: Colour }[] }

export const PIECES: Piece[] = [];
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
  const home: Vec = [x, y, z], n = Math.abs(x) + Math.abs(y) + Math.abs(z);
  if (!n) continue;
  const stickers = ([[x, 0, 0], [0, y, 0], [0, 0, z]] as Vec[]).filter(v => v.some(Boolean)).map(normal => ({ normal, colour: FACE_COLOUR[faceOf(normal)] }));
  PIECES.push({ home, kind: n === 1 ? 'centre' : n === 2 ? 'edge' : 'corner', stickers });
}
const CENTRES = PIECES.flatMap((p, i) => p.kind === 'centre' ? [i] : []);
const pieceWith = (...colours: Colour[]) => PIECES.findIndex(p => p.kind !== 'centre' && p.stickers.length === colours.length && colours.every(c => p.stickers.some(s => s.colour === c)));

// ---- Moves ------------------------------------------------------------------------------------------------------

export interface Move { name: string; axis: 0 | 1 | 2; layers: number[]; q: number }
const BASE: Record<string, [0 | 1 | 2, number[], number]> = {
  R: [0, [1], -1], L: [0, [-1], 1], U: [1, [1], -1], D: [1, [-1], 1], F: [2, [1], -1], B: [2, [-1], 1],
  M: [0, [0], 1], E: [1, [0], 1], S: [2, [0], -1],
  x: [0, [-1, 0, 1], -1], y: [1, [-1, 0, 1], -1], z: [2, [-1, 0, 1], -1],
};
/** Every move by name, such as R, R' and R2. */
export const MOVES: Record<string, Move> = {};
for (const [face, [axis, layers, sign]] of Object.entries(BASE)) for (const [suffix, turns] of [['', 1], ["'", -1], ['2', 2]] as const) {
  const name = face + suffix;
  MOVES[name] = { name, axis, layers, q: (((sign * turns) % 4) + 4) % 4 };
}
export const FACE_MOVES = Object.keys(MOVES).filter(m => 'RLUDFB'.includes(m[0]));
/** The turn in radians about the move's axis, counter-clockwise looking down the axis. */
export const angleOf = (name: string) => BASE[name[0]][2] * (name.endsWith('2') ? 2 : name.endsWith("'") ? -1 : 1) * Math.PI / 2;
/** The move that turns `layer` on `axis` by a quarter turn in direction `sign` (+1 counter-clockwise down the axis). */
export function moveFor(axis: number, layer: number, sign: number) {
  return Object.values(MOVES).find(m => m.axis === axis && m.layers.length === 1 && m.layers[0] === layer && !m.name.endsWith('2') && Math.sign(angleOf(m.name)) === sign)!.name;
}
export const inverse = (name: string) => name.endsWith('2') ? name : name.endsWith("'") ? name[0] : name + "'";
export const parse = (alg: string) => alg.trim().split(/\s+/).filter(Boolean).map(m => { if (!MOVES[m]) throw new Error(`unknown move ${m}`); return m; });

// Per piece, per rotation, per move: the rotation after the move. Makes search cheap.
const MOVE_NAMES = Object.keys(MOVES), MOVE_ID = new Map(MOVE_NAMES.map((m, i) => [m, i]));
const NEXT = PIECES.map(p => {
  const t = new Uint8Array(24 * MOVE_NAMES.length);
  for (let r = 0; r < 24; r++) {
    const at = rotate(r, p.home);
    MOVE_NAMES.forEach((name, m) => { const mv = MOVES[name]; t[r * MOVE_NAMES.length + m] = mv.layers.includes(at[mv.axis]) ? MUL[QUARTER[mv.axis][mv.q]][r] : r; });
  }
  return t;
});

// ---- State ------------------------------------------------------------------------------------------------------

/** One rotation index per piece. */
export type State = Uint8Array;
export const solved = (): State => new Uint8Array(PIECES.length);
export function apply(state: State, moves: string | string[]): State {
  const out = state.slice();
  for (const name of typeof moves === 'string' ? parse(moves) : moves) {
    const m = MOVE_ID.get(name);
    if (m === undefined) throw new Error(`unknown move ${name}`);
    for (let i = 0; i < out.length; i++) out[i] = NEXT[i][out[i] * MOVE_NAMES.length + m];
  }
  return out;
}
export const position = (state: State, piece: number) => rotate(state[piece], PIECES[piece].home);

/** How the whole cube is held: the rotation that takes each centre from home to where it is now. */
export function holding(state: State) {
  return ROTATIONS.findIndex((_, r) => CENTRES.every(c => same(rotate(r, PIECES[c].home), position(state, c))));
}
/** The colour of the centre that faces a direction. */
export const centreAt = (state: State, n: Vec) => PIECES[CENTRES.find(c => same(position(state, c), n))!].stickers[0].colour;
/** Where a colour's centre faces. */
export const facing = (state: State, colour: Colour) => position(state, CENTRES.find(c => PIECES[c].stickers[0].colour === colour)!);

/** A piece is solved when every sticker matches the centre it faces, so it turns with the cube held any way. */
export const isSolved = (state: State, piece: number) => PIECES[piece].kind === 'centre' || state[piece] === holding(state);
export const allSolved = (state: State) => { const h = holding(state); return PIECES.every((p, i) => p.kind === 'centre' || state[i] === h); };

/** The colour on each sticker facing a direction, for drawing a flat map or a check. */
export function stickerColour(state: State, at: Vec, normal: Vec) {
  const i = PIECES.findIndex((_, p) => same(position(state, p), at));
  const s = PIECES[i].stickers.find(s => same(rotate(state[i], s.normal), normal));
  return s?.colour;
}

/** A random sequence of face turns that never turns one face twice in a row or both faces of one axis back to back. */
export function scramble(length = 20, random = Math.random) {
  const out: string[] = [];
  while (out.length < length) {
    const name = FACE_MOVES[Math.floor(random() * FACE_MOVES.length)], last = out.at(-1), before = out.at(-2);
    if (last && last[0] === name[0]) continue;
    if (last && before && MOVES[last].axis === MOVES[name].axis && MOVES[before].axis === MOVES[name].axis) continue;
    out.push(name);
  }
  return out;
}

/** Joins turns of one layer that sit side by side: U U becomes U2, and R R' disappears. */
export function tidy(moves: string[]) {
  const out: string[] = [];
  const quarters = (m: string) => m.endsWith('2') ? 2 : m.endsWith("'") ? 3 : 1;
  for (const m of moves) {
    const last = out.at(-1);
    if (last && last[0] === m[0]) {
      out.pop();
      const q = (quarters(last) + quarters(m)) % 4;
      if (q) out.push(m[0] + ['', '', '2', "'"][q]);
    } else out.push(m);
  }
  return out;
}

// ---- Teaching solver --------------------------------------------------------------------------------------------

/** `setup` counts the turns before the first round of `alg`, so a view can show the set-up apart from the algorithm. */
export interface Step { text: string; moves: string[]; pieces: number[]; alg?: string; setup?: number }
export interface Stage { key: string; title: string; goal: string; steps: Step[] }

export const ALGS = {
  corner: "R U R' U'",
  right: "U R U' R' U' F' U F",
  left: "U' L' U L U F U' F'",
  cross: "F R U R' U' F'",
  edges: "R U R' U R U2 R' U",
  place: "U R U' L' U R' U' L",
  twist: "R' D' R D",
};

export const STAGES = [
  { key: 'cross', title: 'White cross', goal: 'Make a white plus on top whose edges match the centres beside them.' },
  { key: 'corners', title: 'White corners', goal: 'Turn white to the bottom and fill its four corners. The first layer is done.' },
  { key: 'middle', title: 'Middle layer', goal: 'Slot the four middle edges between the centres they match.' },
  { key: 'yellow-cross', title: 'Yellow cross', goal: 'Flip the yellow edges up until a yellow plus shows on top.' },
  { key: 'yellow-edges', title: 'Yellow edges', goal: 'Swap the yellow edges until each one matches the centre below it.' },
  { key: 'place-corners', title: 'Yellow corners in place', goal: 'Move each yellow corner to its spot, whichever way it faces.' },
  { key: 'twist-corners', title: 'Yellow corners turned up', goal: 'Twist each yellow corner until yellow faces up. The cube is solved.' },
] as const;

const repeat = (alg: string, k: number) => Array.from({ length: k }, () => parse(alg)).flat();
const power = (face: string, k: number) => k % 4 ? [face + ['', '', '2', "'"][k % 4]] : [];
const name = (piece: number) => {
  const order: Colour[] = ['white', 'yellow', 'red', 'orange', 'green', 'blue'];
  const cs = PIECES[piece].stickers.map(s => s.colour).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return cs.length === 2 ? `${cs[0]} and ${cs[1]}` : `${cs[0]}, ${cs[1]} and ${cs[2]}`;
};
const onTop = (state: State, piece: number) => position(state, piece)[1] === 1;
const stickerFacing = (state: State, piece: number, colour: Colour) => rotate(state[piece], PIECES[piece].stickers.find(s => s.colour === colour)!.normal);

/** Shortest pick from candidate move lists: the first that makes `goal` true and keeps every `keep` piece solved. */
function pick(state: State, candidates: string[][], goal: (s: State) => boolean, keep: number[]) {
  let best: string[] | null = null;
  for (const moves of candidates) {
    if (best && moves.length >= best.length) continue;
    const s = apply(state, moves);
    if (goal(s) && keep.every(p => isSolved(s, p))) best = moves;
  }
  return best;
}

/** Breadth-first search over the pieces that matter: fewest face turns that solve `target` and keep `keep`. */
function search(state: State, pieces: number[], maxDepth = 9) {
  const h = holding(state), k = pieces.length, size = 24 ** k, M = MOVE_NAMES.length;
  const encode = (rs: number[]) => rs.reduce((a, r) => a * 24 + r, 0);
  const decode = (code: number) => { const rs = new Array<number>(k); for (let i = k - 1; i >= 0; i--) { rs[i] = code % 24; code = Math.floor(code / 24); } return rs; };
  const goal = encode(pieces.map(() => h)), start = encode(pieces.map(p => state[p]));
  const from = new Int32Array(size).fill(-1), via = new Int8Array(size);
  const faceIds = FACE_MOVES.map(m => MOVE_ID.get(m)!);
  let frontier = [start];
  from[start] = start;
  for (let depth = 0; depth <= maxDepth && from[goal] < 0; depth++) {
    const next: number[] = [];
    for (const code of frontier) {
      const rs = decode(code);
      faceIds.forEach((m, j) => {
        const to = encode(rs.map((r, i) => NEXT[pieces[i]][r * M + m]));
        if (from[to] < 0) { from[to] = code; via[to] = j; next.push(to); }
      });
    }
    frontier = next;
  }
  if (from[goal] < 0) return null;
  const moves: string[] = [];
  for (let c = goal; c !== start; c = from[c]) moves.unshift(FACE_MOVES[via[c]]);
  return moves;
}

/** Builds the lesson: seven stages of steps that take this state to solved. Each step names the pieces it moves. */
export function teach(start: State): Stage[] {
  let state = start;
  const stages: Stage[] = STAGES.map(s => ({ ...s, steps: [] }));
  const add = (stage: number, step: Step) => {
    if (step.alg) { const a = parse(step.alg); step.setup = step.moves.findIndex((_, i) => step.moves.slice(i, i + a.length).join(' ') === a.join(' ')); }
    state = apply(state, step.moves);
    stages[stage].steps.push(step);
  };
  const fail = (what: string): never => { throw new Error(`teach: no ${what} found`); };

  // Hold the cube with white on top and green in front, so the notation matches the pictures.
  const rotations = ['', 'x', "x'", 'x2', 'z', "z'"].flatMap(a => ['', 'y', "y'", 'y2'].map(b => [a, b].filter(Boolean)));
  const hold = rotations.find(r => { const s = apply(state, r); return centreAt(s, [0, 1, 0]) === 'white' && centreAt(s, [0, 0, 1]) === 'green'; })!;
  if (hold.length) add(0, { text: 'Hold the cube with white on top and green in front.', moves: hold, pieces: [] });

  // 1. White cross, one edge at a time, by the fewest turns that keep the edges already placed.
  const whiteEdges = (['green', 'red', 'blue', 'orange'] as Colour[]).map(c => pieceWith('white', c));
  const placed: number[] = [];
  for (const edge of whiteEdges.slice().sort((a, b) => Number(isSolved(state, b)) - Number(isSolved(state, a)))) {
    const moves = isSolved(state, edge) ? [] : search(state, [...placed, edge]) ?? fail('cross move');
    const other = PIECES[edge].stickers.find(s => s.colour !== 'white')!.colour;
    if (moves.length) add(0, { text: `Bring the ${name(edge)} edge to the top, white side up, over the ${other} centre.`, moves, pieces: [edge] });
    placed.push(edge);
  }

  // 2. Turn the cube over, then drop each white corner in from above with R U R' U'.
  add(1, { text: 'Turn the cube over: white goes to the bottom, green stays in front.', moves: ['z2'], pieces: whiteEdges });
  const keep = [...whiteEdges];
  const ys = [0, 1, 2, 3].map(a => power('y', a)), us = [0, 1, 2, 3].map(b => power('U', b));
  const whiteCorners = PIECES.flatMap((p, i) => p.kind === 'corner' && p.stickers.some(s => s.colour === 'white') ? [i] : []);
  while (whiteCorners.some(c => !keep.includes(c))) {
    let best: { corner: number; moves: string[]; pop: boolean } | null = null;
    for (const corner of whiteCorners.filter(c => !keep.includes(c))) {
      if (isSolved(state, corner)) { best = { corner, moves: [], pop: false }; break; }
      if (onTop(state, corner)) {
        const moves = pick(state, ys.flatMap(y => us.flatMap(u => [1, 2, 3, 4, 5].map(k => [...y, ...u, ...repeat(ALGS.corner, k)]))), s => isSolved(s, corner), keep);
        if (moves && (!best || best.pop || moves.length < best.moves.length)) best = { corner, moves, pop: false };
      } else if (!best) {
        const moves = pick(state, ys.map(y => [...y, ...repeat(ALGS.corner, 1)]), s => onTop(s, corner), keep);
        if (moves) best = { corner, moves, pop: true };
      }
    }
    if (!best) throw new Error('teach: no corner insert found');
    if (best.pop) add(1, { text: `The ${name(best.corner)} corner sits in the wrong bottom spot. Turn its spot to the front right and do R U R' U' once to lift it out.`, moves: best.moves, pieces: [best.corner], alg: ALGS.corner });
    else {
      if (best.moves.length) add(1, { text: `Turn the cube so the ${name(best.corner)} corner's spot is at the front right, turn the top until the corner sits above it, then repeat R U R' U' until it drops in.`, moves: best.moves, pieces: [best.corner], alg: ALGS.corner });
      keep.push(best.corner);
    }
  }

  // 3. Middle edges from the top layer, with the right or left algorithm.
  const middleEdges = PIECES.flatMap((p, i) => p.kind === 'edge' && p.stickers.every(s => s.colour !== 'white' && s.colour !== 'yellow') ? [i] : []);
  while (middleEdges.some(e => !keep.includes(e))) {
    let best: { edge: number; moves: string[]; side?: 'right' | 'left' } | null = null;
    for (const edge of middleEdges.filter(e => !keep.includes(e))) {
      if (isSolved(state, edge)) { best = { edge, moves: [] }; break; }
      if (!onTop(state, edge)) continue;
      for (const side of ['right', 'left'] as const) {
        const moves = pick(state, ys.flatMap(y => us.map(u => [...y, ...u, ...parse(ALGS[side])])), s => isSolved(s, edge), keep);
        if (moves && (!best || moves.length < best.moves.length)) best = { edge, moves, side };
      }
    }
    if (best) {
      if (best.moves.length) add(2, { text: `Turn the cube and the top until the ${name(best.edge)} edge's front colour matches the front centre, then slot it ${best.side === 'right' ? 'right' : 'left'}.`, moves: best.moves, pieces: [best.edge], alg: ALGS[best.side!] });
      keep.push(best.edge);
      continue;
    }
    // Every loose middle edge is stuck in the wrong slot: lift one out to the top with the right algorithm.
    const stuck = middleEdges.find(e => !keep.includes(e) && !onTop(state, e))!;
    const moves = pick(state, ys.map(y => [...y, ...parse(ALGS.right)]), s => onTop(s, stuck), keep) ?? fail('middle edge lift');
    add(2, { text: `The ${name(stuck)} edge sits in the wrong slot or the wrong way round. Turn it to the front right and use the right-hand algorithm to lift it out.`, moves, pieces: [stuck], alg: ALGS.right });
  }

  // Macro search: up to `depth` rounds of a set-up then the algorithm, shortest first.
  const rounds = (setups: string[][], alg: string, depth: number, finish: string[][] = [[]]) => {
    const out: string[][] = [[]];
    let layer: string[][] = [[]];
    for (let d = 0; d < depth; d++) { layer = layer.flatMap(l => setups.map(s => [...l, ...s, ...parse(alg)])); out.push(...layer); }
    return out.flatMap(o => finish.map(f => [...o, ...f]));
  };
  const yellowEdges = PIECES.flatMap((p, i) => p.kind === 'edge' && p.stickers.some(s => s.colour === 'yellow') ? [i] : []);
  const yellowCorners = PIECES.flatMap((p, i) => p.kind === 'corner' && p.stickers.some(s => s.colour === 'yellow') ? [i] : []);
  const yellowUp = (s: State, p: number) => same(stickerFacing(s, p, 'yellow'), facing(s, 'yellow'));
  const steps = (stage: number, moves: string[], alg: string, text: (before: State) => string, pieces: number[]) => {
    // Split a macro answer into one step per algorithm, so the lesson shows each round on its own.
    const algMoves = parse(alg);
    let buffer: string[] = [];
    for (let i = 0; i < moves.length; i++) {
      if (moves.slice(i, i + algMoves.length).join(' ') === algMoves.join(' ')) {
        add(stage, { text: text(apply(state, buffer)), moves: [...buffer, ...algMoves], pieces, alg });
        buffer = []; i += algMoves.length - 1;
      } else buffer.push(moves[i]);
    }
    if (buffer.length) add(stage, { text: 'Turn the top layer until its edges match the centres below.', moves: buffer, pieces });
  };

  // 4. Yellow cross.
  const crossMoves = pick(state, rounds(us, ALGS.cross, 3), s => yellowEdges.every(e => yellowUp(s, e)), keep) ?? fail('yellow cross');
  steps(3, crossMoves, ALGS.cross, before => yellowEdges.some(e => yellowUp(before, e))
    ? 'Turn the top until the yellow edges up make a line from left to right or an L at the back left, then do F R U R\' U\' F\'.'
    : 'No yellow edge faces up yet. Do F R U R\' U\' F\' from any grip.', yellowEdges);

  // 5. Yellow edges matched to their centres.
  const edgeMoves = pick(state, rounds(us, ALGS.edges, 3, us), s => yellowEdges.every(e => isSolved(s, e)), keep) ?? fail('yellow edges');
  steps(4, edgeMoves, ALGS.edges, () => 'Turn the top so the two edges to swap sit at the front and left, then do R U R\' U R U2 R\' U.', yellowEdges);
  keep.push(...yellowEdges);

  // 6. Yellow corners into their spots.
  const home = (s: State, c: number) => same(position(s, c), rotate(holding(s), PIECES[c].home));
  const placeMoves = pick(state, rounds(ys, ALGS.place, 3), s => yellowCorners.every(c => home(s, c)), keep) ?? fail('corner placement');
  steps(5, placeMoves, ALGS.place, () => 'Turn the whole cube so a corner already in its spot sits at the front right (if none is, start anywhere), then do U R U\' L\' U R\' U\' L.', yellowCorners);

  // 7. Twist each corner at the front right with R' D' R D, turning only the top between corners.
  const ufr = (s: State) => yellowCorners.find(c => same(position(s, c), [1, 1, 1]))!;
  while (!yellowCorners.every(c => yellowUp(state, c))) {
    const corner = ufr(state);
    if (yellowUp(state, corner)) {
      const turn = us.find(u => u.length && !yellowUp(apply(state, u), ufr(apply(state, u))))!;
      add(6, { text: 'Turn only the top to bring a corner that still needs twisting to the front right.', moves: turn, pieces: yellowCorners });
      continue;
    }
    const k = [2, 4].find(k => yellowUp(apply(state, repeat(ALGS.twist, k)), corner)) ?? fail('corner twist');
    add(6, { text: `Repeat R' D' R D until the ${name(corner)} corner shows yellow on top. The lower layers look mixed until the last corner, then they come back.`, moves: repeat(ALGS.twist, k), pieces: [corner], alg: ALGS.twist });
  }
  const last = us.find(u => allSolved(apply(state, u))) ?? fail('final turn');
  if (last.length) add(6, { text: 'Turn the top layer to line it up. Solved.', moves: last, pieces: yellowCorners });
  if (!allSolved(state)) fail('solved cube');
  return stages;
}
