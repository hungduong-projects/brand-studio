import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../apps/showcase/src/chess-logic.ts';
import * as X from '../apps/showcase/src/xiangqi-logic.ts';
import { defend, mateDistance } from '../apps/showcase/src/board-game.ts';
import { chess, CHESS_STAGES } from '../apps/showcase/src/chess-lessons.ts';
import { xiangqi, XIANGQI_STAGES } from '../apps/showcase/src/xiangqi-lessons.ts';

const counts = (L, fen, depth) => Array.from({ length: depth }, (_, i) => L.perft(L.parse(fen), i + 1));

// Published move counts: https://www.chessprogramming.org/Perft_Results
test('chess move counts match the published perft results', () => {
  assert.deepEqual(counts(C, C.START, 4), [20, 400, 8902, 197281]);
  assert.deepEqual(counts(C, 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -', 3), [48, 2039, 97862]);
  assert.deepEqual(counts(C, '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4), [14, 191, 2812, 43238]);
  assert.deepEqual(counts(C, 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 3), [6, 264, 9467]);
  assert.deepEqual(counts(C, 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3), [44, 1486, 62379]);
});

// Published move counts: https://www.chessprogramming.org/Chinese_Chess_Perft_Results
test('xiangqi move counts match the published perft results', () => {
  assert.deepEqual(counts(X, X.START, 3), [44, 1920, 79666]);
  const table = [
    ['r1ea1a3/4kh3/2h1e4/pHp1p1p1p/4c4/6P2/P1P2R2P/1CcC5/9/2EAKAE2 w - - 0 1', [38, 1128, 43929]],
    ['1ceak4/9/h2a5/2p1p3p/5cp2/2h2H3/6PCP/3AE4/2C6/3A1K1H1 w - - 0 1', [7, 281, 8620]],
    ['5a3/3k5/3aR4/9/5r3/5h3/9/3A1A3/5K3/2EC2E2 w - - 0 1', [25, 424, 9850]],
    ['CRH1k1e2/3ca4/4ea3/9/2hr5/9/9/4E4/4A4/4KA3 w - - 0 1', [28, 516, 14808]],
    ['R1H1k1e2/9/3aea3/9/2hr5/2E6/9/4E4/4A4/4KA3 w - - 0 1', [21, 364, 7626]],
    ['C1hHk4/9/9/9/9/9/h1pp5/E3C4/9/3A1K3 w - - 0 1', [28, 222, 6241]],
    ['4ka3/4a4/9/9/4H4/p8/9/4C3c/7h1/2EK5 w - - 0 1', [23, 345, 8124]],
    ['2e1ka3/9/e3H4/4h4/9/9/9/4C4/2p6/2EK5 w - - 0 1', [21, 195, 3883]],
    ['1C2ka3/9/C1Hae1h2/p3p3p/6p2/9/P3P3P/3AE4/3p2c2/c1EAK4 w - - 0 1', [30, 830, 22787]],
    ['ChH1k1e2/c3a4/4ea3/9/2hr5/9/9/4C4/4A4/4KA3 w - - 0 1', [19, 583, 11714]],
  ];
  for (const [fen, want] of table) assert.deepEqual(counts(X, fen, 3), want, fen);
});

test('moves are named the way players write them', () => {
  const kiwi = C.parse('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -');
  const sans = C.legal(kiwi).map(m => C.san(kiwi, m));
  for (const s of ['O-O', 'O-O-O', 'Bxa6', 'gxh3', 'Qxf6', 'dxe6', 'Nxf7']) assert.ok(sans.includes(s), s);
  const p = C.parse('7k/8/5K2/8/8/8/8/1Q6 w - - 0 1');
  assert.equal(C.san(p, C.find(p, 'b1b8')), 'Qb8+');
  assert.equal(C.words(p, C.find(p, 'f6g6')), 'King to g6');
  // A lesson board without kings has no stalemate to report.
  const r = C.parse('8/3p4/8/8/3R4/8/8/8 w - - 0 1');
  assert.equal(C.words(r, C.find(r, 'd4d7')), 'Rook takes the pawn on d7');
  // The opening the Wikipedia article writes as C2=5 H8+7.
  const x = X.parse(X.START);
  assert.equal(X.notation(x, X.find(x, 'h2e2')), 'C2=5');
  const y = X.play(x, X.find(x, 'h2e2'));
  assert.equal(X.notation(y, X.find(y, 'h9g7')), 'H8+7');
  assert.equal(X.words(x, X.find(x, 'h2e2')), 'Cannon slides from file 2 to file 5');
});

test('xiangqi blocks a hobbled horse, an elephant with a filled eye, and facing generals', () => {
  const targets = (fen, from) => { const p = X.parse(fen); return X.legal(p).filter(m => X.nameOf(m.from) === from).map(m => X.nameOf(m.to)).sort(); };
  assert.deepEqual(targets('9/9/9/9/9/5c3/2r1P4/4H4/9/9 w', 'e2'), ['c1', 'c3', 'd0', 'f0', 'g1', 'g3']);
  assert.deepEqual(targets('9/9/9/9/9/2r3h2/3P5/4E4/9/9 w', 'e2'), ['c0', 'g0', 'g4']);
  assert.deepEqual(targets('4k4/9/9/9/9/4C4/9/9/9/4K4 w', 'e4'), ['e1', 'e2', 'e3', 'e5', 'e6', 'e7', 'e8']);
  // A player with no legal move loses in xiangqi, in check or not; in chess it is stalemate, a draw.
  assert.equal(X.status(X.parse('3k5/R8/9/9/9/9/9/9/9/4K4 b')), 'stalemate');
  assert.equal(xiangqi.noMoveLoses, true);
  assert.equal(chess.noMoveLoses, false);
});

/** Plays lesson moves with whichever side owns the piece, as the page does for demos. */
function replay(game, p, moves) {
  for (const u of moves) {
    const piece = game.board(p)[game.pointOf(u.slice(0, 2))];
    assert.ok(piece, `${u}: no piece`);
    const q = game.withTurn(p, game.sideOf(piece)), m = game.find(q, u);
    assert.ok(m, `${u} is not legal`);
    p = game.play(q, m);
  }
  return p;
}

for (const [game, stages] of [[chess, CHESS_STAGES], [xiangqi, XIANGQI_STAGES]]) {
  test(`every ${game.key} lesson step starts legal and its answer works`, () => {
    assert.equal(stages.length, 7);
    const names = new Set(Array.from({ length: game.files * game.ranks }, (_, i) => game.nameOf(i)));
    for (const [s, stage] of stages.entries()) for (const [k, step] of stage.steps.entries()) {
      const where = `${game.key} stage ${s + 1} step ${k + 1}`;
      const p = game.parse(step.fen);
      assert.ok(step.text.length <= 240, `${where}: text is ${step.text.length} characters`);
      // The side that just moved may not be left in check.
      assert.equal(game.inCheck(game.withTurn(p, game.turn(p) === 'w' ? 'b' : 'w')), false, `${where}: side not to move is in check`);
      for (const at of [step.show, ...(step.marks ?? []).map(m => m.at), ...(step.tags ?? []).map(t => t.at)].filter(Boolean)) assert.ok(names.has(at), `${where}: no point ${at}`);
      if (step.show) assert.ok(game.board(p)[game.pointOf(step.show)], `${where}: nothing on ${step.show}`);
      if (step.kind === 'look' && step.demo) replay(game, p, step.demo);
      if (step.kind === 'move') {
        assert.ok(game.find(p, step.answer), `${where}: answer ${step.answer} is not legal`);
        if (Array.isArray(step.accept)) for (const u of step.accept) assert.ok(game.find(p, u), `${where}: ${u} is not legal`);
        if (step.explain === 'escape') assert.ok(game.inCheck(p), `${where}: not in check`);
      }
      if (step.kind === 'mate') {
        assert.equal(mateDistance(game, p, step.n), step.n, `${where}: not a mate in ${step.n}`);
        let q = p;
        for (const u of step.line) { const m = game.find(q, u); assert.ok(m, `${where}: ${u} is not legal`); q = game.play(q, m); }
        assert.equal(game.status(q), 'mate', `${where}: the line does not end in mate`);
      }
    }
  });
}

test('the computer defends with its king when every defence loses as fast', () => {
  const p = C.parse('6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1'), q = C.play(p, C.find(p, 'b1b7'));
  assert.equal(defend(chess, q, 1).piece, 'k');
});
