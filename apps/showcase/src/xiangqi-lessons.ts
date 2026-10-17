/** The Turnbook xiangqi lesson: seven stages from the board to mate puzzles. Red plays from the bottom. */
import * as X from './xiangqi-logic.ts';
import type { Game, Stage } from './board-game';

export const xiangqi: Game<X.Position, X.Move> = {
  key: 'xiangqi', files: 9, ranks: 10, noMoveLoses: true, sides: { w: 'Red', b: 'Black' },
  parse: X.parse, board: p => p.board, turn: p => p.turn, withTurn: (p, side) => ({ ...p, turn: side }),
  legal: X.legal, play: X.play, inCheck: X.inCheck, status: X.status, find: X.find, uci: X.uci,
  notation: X.notation, words: X.words, pointOf: X.point, nameOf: X.nameOf, sideOf: X.sideOf,
  pieceName: piece => X.NAMES[piece.toLowerCase()],
};

const PALACES = ['d0', 'e0', 'f0', 'd1', 'e1', 'f1', 'd2', 'e2', 'f2', 'd7', 'e7', 'f7', 'd8', 'e8', 'f8', 'd9', 'e9', 'f9'];

export const XIANGQI_STAGES: Stage[] = [
  {
    key: 'board', title: 'The board', goal: 'Learn the points, the river and the palaces.',
    steps: [
      { kind: 'look', fen: X.START,
        text: 'Xiangqi pieces stand on the points where lines cross. The board is 9 lines wide and 10 lines long, and each side has 16 pieces. Red moves first.' },
      { kind: 'look', fen: X.START, marks: PALACES.map(at => ({ at, kind: 'tint' as const })),
        tags: [{ at: 'e4', text: 'River', shift: [0, -0.5] }, { at: 'e1', text: 'Palace' }, { at: 'e8', text: 'Palace' }],
        text: 'The river splits the board in two. Each side has a palace, the 3 by 3 box crossed by an X, and the general and its two advisors never leave it.' },
    ],
  },
  {
    key: 'chariot', title: 'Chariot and cannon', goal: 'Slide the chariot, and capture with the cannon by jumping.',
    steps: [
      { kind: 'move', fen: '9/2h6/9/9/9/9/2R6/9/9/9 w', show: 'c3', answer: 'c3c8',
        text: 'The chariot moves like a rook in chess: any distance along a line, without jumping. Capture the horse.',
        hint: 'Slide straight up the line.', done: 'The chariot took the horse.' },
      { kind: 'move', fen: '9/4r4/9/9/4p4/9/9/9/2h1C4/9 w', show: 'e1', answer: 'e1e8', tags: [{ at: 'e5', text: 'Screen' }],
        text: 'The cannon moves like a chariot, but it captures only by jumping exactly one piece, called the screen. Capture the chariot.',
        hint: 'Jump over the soldier.', done: 'The cannon jumped the soldier and took the chariot. It cannot take the horse beside it: nothing stands between them as a screen.' },
    ],
  },
  {
    key: 'horse', title: 'Horse', goal: 'Move the horse, and see what blocks it.',
    steps: [
      { kind: 'move', fen: '9/9/9/9/4c4/9/3H5/9/9/9 w', show: 'd3', answer: 'd3e5',
        text: 'The horse moves one point along a line, then one point diagonally outward. Capture the cannon.',
        hint: 'One point up, then one diagonally to the right.', done: 'The horse took the cannon.' },
      { kind: 'move', fen: '9/9/9/9/9/5c3/2r1P4/4H4/9/9 w', show: 'e2', answer: 'e2c3',
        marks: [{ at: 'd4', kind: 'cross' }, { at: 'f4', kind: 'cross' }], tags: [{ at: 'e3', text: 'Leg' }],
        text: 'A piece on the first point of a horse move blocks that move. This is called hobbling the horse’s leg. The soldier blocks two moves here. Capture the chariot.',
        hint: 'Go left first: that point is empty.', done: 'The horse took the chariot. It could not reach the cannon, because the soldier stands on its leg.' },
    ],
  },
  {
    key: 'guards', title: 'Elephant, advisor and general', goal: 'Learn the three pieces that guard the general.',
    steps: [
      { kind: 'move', fen: '9/9/9/9/9/2r3h2/3P5/4E4/9/9 w', show: 'e2', answer: 'e2g4',
        marks: [{ at: 'c4', kind: 'cross' }], tags: [{ at: 'd3', text: 'Eye' }],
        text: 'The elephant moves exactly two points diagonally and never crosses the river. A piece on the point between, the elephant’s eye, blocks it. Capture the horse.',
        hint: 'Two points up and to the right.', done: 'The elephant took the horse. The soldier on its eye blocks the way to the chariot.' },
      { kind: 'move', fen: '5k3/9/9/9/9/9/9/3p5/4A4/3K5 w', show: 'e1', answer: 'e1d2',
        text: 'The advisor steps one point diagonally and never leaves the palace. Capture the soldier.',
        hint: 'One point diagonally up and to the left.', done: 'The advisor took the soldier.' },
      { kind: 'move', fen: '9/9/9/9/9/9/9/4h4/4K4/9 w', show: 'e1', answer: 'e1e2',
        text: 'The general steps one point along a line and never leaves the palace. Capture the horse.',
        hint: 'One point straight up.', done: 'The general took the horse.' },
      { kind: 'look', fen: '4k4/9/9/9/9/4C4/9/9/9/4K4 w', show: 'e4', marks: [{ at: 'd4', kind: 'cross' }, { at: 'f4', kind: 'cross' }],
        text: 'The two generals may never face each other on a line with nothing between them. The cannon is the only piece between, so it cannot leave this line. Tap it to see.' },
    ],
  },
  {
    key: 'soldier', title: 'Soldier', goal: 'Push forward, and sideways once across the river.',
    steps: [
      { kind: 'move', fen: '9/9/9/9/9/9/4P4/9/9/9 w', show: 'e3', answer: 'e3e4',
        text: 'A soldier steps one point forward. It cannot step sideways until it has crossed the river. Move it forward.',
        hint: 'One point straight up.', done: 'The soldier now stands at the river bank.' },
      { kind: 'move', fen: '9/9/4r4/9/3hP4/9/9/9/9/9 w', show: 'e5', answer: 'e5d5',
        text: 'Across the river a soldier may also step sideways, but it can never move back. Capture the horse.',
        hint: 'Step sideways to the left.', done: 'The soldier took the horse beside it.' },
    ],
  },
  {
    key: 'check', title: 'Check and mate', goal: 'Get out of check, and see how a game is won.',
    steps: [
      { kind: 'move', fen: '4k4/9/9/4r4/9/3H5/9/1C7/9/4K4 w', answer: 'd4e6', accept: 'any', explain: 'escape',
        text: 'Your general is in check from the chariot. A check must end at once: move the general, block the line, or capture the attacker. Get out of check.',
        hint: 'The horse can capture the chariot.', done: 'Your general is safe.' },
      { kind: 'look', fen: '4k4/9/4H4/9/9/9/9/C8/9/3K5 w', demo: ['a2e2'],
        text: 'Checkmate wins the game. The horse guards both points beside the black general. Slide the cannon behind the horse and the horse becomes its screen. Press Show me.' },
      { kind: 'look', fen: '3k5/R8/9/9/9/9/9/9/9/4K4 b', marks: [{ at: 'd9', kind: 'ring' }, { at: 'd8', kind: 'cross' }, { at: 'e9', kind: 'cross' }],
        text: 'Unlike chess, a player with no legal move loses, even when not in check. Black is to move: the chariot guards the point below, and the point beside would face the red general.' },
    ],
  },
  {
    key: 'puzzles', title: 'Mate puzzles', goal: 'Find checkmate in each position.',
    steps: [
      { kind: 'mate', n: 1, fen: '9/3k5/9/p8/9/9/7R1/9/9/4K4 w', line: ['h3d3'],
        text: 'Your general holds the open middle line, so the black general cannot step onto it. Checkmate in one move.', hint: 'Check up the black general’s line with the chariot.' },
      { kind: 'mate', n: 1, fen: '3aka3/9/9/9/4C4/9/9/C8/9/3K5 w', line: ['a2e2'],
        text: 'Two cannons on one line: the front cannon is the screen for the one behind. Checkmate in one move.', hint: 'Bring the second cannon to the middle line.' },
      { kind: 'mate', n: 1, fen: '3ak4/4a4/9/7H1/4P4/9/9/5R3/9/3K5 w', line: ['h6g8'],
        text: 'The chariot guards the general’s only free point. Find the horse move that gives check. Checkmate in one move.', hint: 'The horse checks from beside the palace.' },
      { kind: 'mate', n: 2, fen: '4k4/9/9/9/9/9/9/9/R7R/3K5 w', line: ['a1a8', 'e9f9', 'i1i9'],
        text: 'Two chariots against a lone general. Cut off one line first, then mate on the other. Checkmate in two moves.', hint: 'Move a chariot to the line one below the black general.' },
    ],
  },
];
