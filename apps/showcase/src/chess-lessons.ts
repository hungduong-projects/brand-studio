/** The Turnbook chess lesson: seven stages from the empty board to mate puzzles. White plays from the bottom. */
import * as C from './chess-logic.ts';
import type { Game, Stage } from './board-game';

export const chess: Game<C.Position, C.Move> = {
  key: 'chess', files: 8, ranks: 8, noMoveLoses: false, sides: { w: 'White', b: 'Black' },
  parse: C.parse, board: p => p.board, turn: p => p.turn, withTurn: (p, side) => ({ ...p, turn: side, ep: -1 }),
  legal: C.legal, play: C.play, inCheck: C.inCheck, status: C.status, find: C.find, uci: C.uci,
  notation: C.san, words: C.words, pointOf: C.square, nameOf: C.nameOf, sideOf: C.sideOf,
  pieceName: piece => C.NAMES[piece.toLowerCase()],
};

export const CHESS_STAGES: Stage[] = [
  {
    key: 'board', title: 'The board', goal: 'Set up the pieces and learn the square names.',
    steps: [
      { kind: 'look', fen: C.START, marks: [{ at: 'h1', kind: 'tint' }, { at: 'a8', kind: 'tint' }], tags: [{ at: 'h1', text: 'Light square' }],
        text: 'Chess is played on 8 by 8 squares. Turn the board so each player has a light square in the right-hand corner. White moves first, then the players take turns.' },
      { kind: 'look', fen: C.START, marks: [{ at: 'e4', kind: 'tint' }, { at: 'd1', kind: 'ring' }, { at: 'd8', kind: 'ring' }], tags: [{ at: 'e4', text: 'e4' }],
        text: 'Files run up the board from a to h and ranks run across from 1 to 8, so each square has a name, such as e4. Each queen starts on her own colour: white on d1, black on d8.' },
    ],
  },
  {
    key: 'sliders', title: 'Rook, bishop and queen', goal: 'Slide along lines and capture.',
    steps: [
      { kind: 'move', fen: '8/3p4/8/8/3R4/8/8/8 w - - 0 1', show: 'd4', answer: 'd4d7',
        text: 'The rook slides any number of squares along its file or rank. The dots show every square it can reach. Capture the pawn on d7.',
        hint: 'Slide the rook straight up the d-file.', done: 'The rook took the pawn and now stands on its square.' },
      { kind: 'move', fen: '8/8/6n1/8/8/3B4/8/8 w - - 0 1', show: 'd3', answer: 'd3g6',
        text: 'The bishop slides diagonally, so it stays on squares of one colour all game. Capture the knight.',
        hint: 'Follow the diagonal up and to the right.', done: 'The bishop took the knight on g6, a light square like d3.' },
      { kind: 'look', fen: '8/8/3P4/8/3R1n2/8/8/8 w - - 0 1', show: 'd4',
        text: 'Sliding pieces cannot jump. The rook stops below its own pawn on d6, and it can capture the knight on f4 but cannot pass it.' },
      { kind: 'move', fen: '8/2p5/6r1/8/8/8/2Q5/8 w - - 0 1', show: 'c2', answer: 'c2g6',
        text: 'The queen moves like a rook and a bishop together, in any of eight directions. Capture the rook.',
        hint: 'The rook stands on one of the queen’s diagonals.', done: 'The queen took the rook along the diagonal.' },
    ],
  },
  {
    key: 'jumpers', title: 'Knight and king', goal: 'Jump with the knight and step with the king.',
    steps: [
      { kind: 'move', fen: '8/8/4b3/2PPP3/2PNP3/2PPP3/8/8 w - - 0 1', show: 'd4', answer: 'd4e6',
        text: 'The knight jumps in an L: two squares one way, then one square to the side. It is the only piece that jumps over others. Capture the bishop.',
        hint: 'Two squares up, then one to the right.', done: 'The knight jumped the pawns and took the bishop.' },
      { kind: 'move', fen: '8/8/8/6p1/5r2/4K3/3n4/8 w - - 0 1', show: 'e3', answer: 'e3d2',
        text: 'The king steps one square in any direction, but never onto a square an enemy piece attacks. Capture the piece that nothing defends.',
        hint: 'The pawn on g5 defends the rook. Look at the knight.', done: 'The king took the knight. The pawn on g5 defends the rook, so the king could not take it.' },
    ],
  },
  {
    key: 'pawns', title: 'Pawns', goal: 'Push, capture and promote.',
    steps: [
      { kind: 'move', fen: C.START, show: 'e2', answer: 'e2e4',
        text: 'A pawn moves straight forward one square. From its starting square it may move two. Push the e-pawn two squares.',
        hint: 'Move the pawn in front of the king to e4.', done: 'The pawn moved from e2 to e4.' },
      { kind: 'move', fen: '8/8/8/3np3/4P3/8/8/8 w - - 0 1', show: 'e4', answer: 'e4d5',
        text: 'A pawn captures one square diagonally forward, never straight ahead, so the pawn on e5 blocks this one. Capture the knight.',
        hint: 'Capture diagonally to the left.', done: 'The pawn took the knight on d5.' },
      { kind: 'move', fen: '8/1P6/8/8/8/8/8/8 w - - 0 1', show: 'b7', answer: 'b7b8q',
        text: 'A pawn that reaches the last rank becomes a queen, rook, bishop or knight. Push this pawn to b8 and choose a queen.',
        hint: 'Push the pawn one square, then pick the queen.', done: 'The pawn became a queen.' },
    ],
  },
  {
    key: 'check', title: 'Check and mate', goal: 'Get out of check, and see how a game ends.',
    steps: [
      { kind: 'move', fen: '7k/8/4r3/2N5/2B5/8/8/4K3 w - - 0 1', answer: 'c5e6', accept: 'any', explain: 'escape',
        text: 'Your king is in check from the rook. A check must end at once: move the king, block the line, or capture the attacker. Get out of check.',
        hint: 'The knight can capture the rook.', done: 'Your king is safe.' },
      { kind: 'look', fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', demo: ['e1e8'],
        text: 'Checkmate is a check with no way out, and it wins the game. Black’s own pawns box in the king, so the rook mates on e8. Press Show me.' },
      { kind: 'look', fen: 'k7/8/1Q6/8/8/8/8/7K b - - 0 1', marks: [{ at: 'a8', kind: 'ring' }, { at: 'a7', kind: 'cross' }, { at: 'b7', kind: 'cross' }, { at: 'b8', kind: 'cross' }],
        text: 'Stalemate: the player to move is not in check but has no legal move, and the game is a draw. Black is to move, and the queen guards every square next to the king.' },
    ],
  },
  {
    key: 'special', title: 'Castling and en passant', goal: 'Make the two moves that break the usual patterns.',
    steps: [
      { kind: 'move', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', show: 'e1', answer: 'e1g1',
        text: 'Castling moves the king two squares toward a rook, and the rook jumps to the king’s other side. Neither may have moved, and the king may not castle out of, through or into check. Castle on the king’s side.',
        hint: 'Move the king two squares to the right, to g1.', done: 'The king went to g1 and the rook to f1.' },
      { kind: 'move', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', show: 'e5', answer: 'e5d6',
        text: 'Black’s pawn has just moved two squares, from d7 to d5, past your pawn. On this move only, your pawn can take it en passant, as if it had moved one square.',
        hint: 'Move your pawn diagonally to d6.', done: 'Your pawn moved to d6 and took the pawn on d5.' },
    ],
  },
  {
    key: 'puzzles', title: 'Mate puzzles', goal: 'Find checkmate in each position.',
    steps: [
      { kind: 'mate', n: 1, fen: 'k7/8/1K6/8/8/8/8/6Q1 w - - 0 1', line: ['g1g8'],
        text: 'Queen and king: your king guards the squares in front of Black’s king. Checkmate in one move.', hint: 'Check along the back rank.' },
      { kind: 'mate', n: 1, fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', line: ['g5f7'],
        text: 'Black’s king is hemmed in by its own rook and pawns. Checkmate in one move.', hint: 'Only the knight can give check here.' },
      { kind: 'mate', n: 1, fen: '6k1/1R6/8/8/8/8/R7/6K1 w - - 0 1', line: ['a2a8'],
        text: 'Two rooks: one already guards the seventh rank. Checkmate in one move.', hint: 'Bring the other rook to the eighth rank.' },
      { kind: 'mate', n: 2, fen: '6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1', line: ['b1b7', 'g8h8', 'a2a8'],
        text: 'Two rooks again, one move further away. Take the seventh rank from the king first, then mate. Checkmate in two moves.', hint: 'Put a rook on the seventh rank.' },
      { kind: 'mate', n: 2, fen: '7k/8/5K2/8/8/8/8/1Q6 w - - 0 1', line: ['f6g6', 'h8g8', 'b1b8'],
        text: 'Queen and king against a lone king. Close in without leaving Black stalemated, then mate. Checkmate in two moves.', hint: 'Bring your king to g6.' },
    ],
  },
];
