import test from 'node:test';
import assert from 'node:assert/strict';
import { ALGS, allSolved, apply, inverse, isSolved, PIECES, scramble, solved, stickerColour, teach, tidy } from '../apps/showcase/src/cube-logic.ts';

// A seeded random, so a failing scramble can be replayed.
const seeded = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

test('each face turned four times comes back', () => {
  for (const face of ['R', 'L', 'U', 'D', 'F', 'B', 'x', 'y', 'z']) assert.ok(allSolved(apply(solved(), [face, face, face, face])), face);
  assert.ok(allSolved(apply(solved(), repeat(ALGS.corner, 6))), "(R U R' U') six times");
});

test('turns go the way the notation says', () => {
  // R lifts the front's right column onto the top.
  assert.equal(stickerColour(apply(solved(), 'R'), [1, 1, 0], [0, 1, 0]), 'green');
  // U brings the right side's top row to the front.
  assert.equal(stickerColour(apply(solved(), 'U'), [0, 1, 1], [0, 0, 1]), 'red');
  // F moves the top's front row onto the right side.
  assert.equal(stickerColour(apply(solved(), 'F'), [1, 0, 1], [1, 0, 0]), 'white');
  // y turns the whole cube like U: red comes to the front.
  assert.equal(stickerColour(apply(solved(), 'y'), [0, 0, 1], [0, 0, 1]), 'red');
  // Red, white and blue meet clockwise at a corner on the standard cube.
  const corner = PIECES.find(p => p.kind === 'corner' && ['red', 'white', 'blue'].every(c => p.stickers.some(s => s.colour === c)));
  assert.deepEqual(corner.home, [1, 1, -1]);
});

test('the checkerboard pattern puts the opposite colour beside each centre', () => {
  const s = apply(solved(), 'R2 L2 U2 D2 F2 B2');
  assert.equal(stickerColour(s, [0, 1, 1], [0, 1, 0]), 'yellow');
  assert.equal(stickerColour(s, [0, 1, 0], [0, 1, 0]), 'white');
});

test('an undo is the inverse turn, and tidy joins turns of one layer', () => {
  const moves = scramble(25, seeded(7));
  assert.ok(allSolved(apply(apply(solved(), moves), moves.slice().reverse().map(inverse))));
  assert.deepEqual(tidy(['U', 'U', 'R', "R'", 'F', 'F2']), ['U2', "F'"]);
});

test('scrambles never repeat a face back to back', () => {
  const moves = scramble(200, seeded(3));
  for (let i = 1; i < moves.length; i++) assert.notEqual(moves[i][0], moves[i - 1][0]);
});

test('the lesson solves 300 scrambles, and each stage reaches its own goal', () => {
  const random = seeded(2026);
  let longest = 0;
  for (let n = 0; n < 300; n++) {
    const start = apply(solved(), scramble(25, random));
    const stages = teach(start);
    assert.equal(stages.length, 7);
    let state = start, total = 0;
    for (const [i, stage] of stages.entries()) {
      for (const step of stage.steps) { state = apply(state, step.moves); total += step.moves.length; assert.ok(step.text.length < 220, step.text); }
      // After the first two stages, the white layer is whole; after the third, the first two layers.
      const white = PIECES.flatMap((p, k) => p.kind !== 'centre' && p.stickers.some(s => s.colour === 'white') ? [k] : []);
      const middle = PIECES.flatMap((p, k) => p.kind === 'edge' && p.stickers.every(s => s.colour !== 'white' && s.colour !== 'yellow') ? [k] : []);
      if (i === 0) assert.ok(white.filter(k => PIECES[k].kind === 'edge').every(k => isSolved(state, k)), `scramble ${n}: cross`);
      if (i === 1) assert.ok(white.every(k => isSolved(state, k)), `scramble ${n}: first layer`);
      if (i === 2) assert.ok([...white, ...middle].every(k => isSolved(state, k)), `scramble ${n}: two layers`);
    }
    assert.ok(allSolved(state), `scramble ${n} not solved`);
    longest = Math.max(longest, total);
  }
  assert.ok(longest < 260, `longest lesson ${longest} turns`);
});

test('the lesson starts from any grip and from a solved cube', () => {
  const held = apply(solved(), "R U F' x y' z2 D B");
  const stages = teach(held);
  assert.match(stages[0].steps[0].text, /Hold the cube/);
  assert.ok(allSolved(stages.flatMap(s => s.steps).reduce((s, step) => apply(s, step.moves), held)));
  // A solved cube only needs turning over and back, which the lesson shows as the stage 2 grip.
  const fromSolved = teach(solved()).flatMap(s => s.steps).flatMap(s => s.moves);
  assert.deepEqual(fromSolved, ['z2']);
});

function repeat(alg, k) { return Array.from({ length: k }, () => alg.split(' ')).flat(); }
