/**
 * What the Turnbook board lessons share between chess and xiangqi: the shape of a lesson, the game adapter the page
 * calls, and a small mate search that checks puzzles and picks the computer's defence.
 */
export type Side = 'w' | 'b';
export type Status = 'play' | 'check' | 'mate' | 'stalemate';
/** `take` is set when the captured piece stands off the target square (en passant); `rook` moves with a castling king. */
export interface BaseMove { from: number; to: number; piece: string; captured?: string; take?: number; rook?: [number, number]; promo?: string }

export interface Game<P = unknown, M extends BaseMove = BaseMove> {
  key: 'chess' | 'xiangqi';
  files: number;
  ranks: number;
  /** In xiangqi a player with no legal move loses; in chess that is stalemate, a draw. */
  noMoveLoses: boolean;
  sides: Record<Side, string>;
  parse(fen: string): P;
  board(p: P): string[];
  turn(p: P): Side;
  withTurn(p: P, side: Side): P;
  legal(p: P): M[];
  play(p: P, m: M): P;
  inCheck(p: P): boolean;
  status(p: P): Status;
  find(p: P, uci: string): M | undefined;
  uci(m: M): string;
  notation(p: P, m: M): string;
  words(p: P, m: M): string;
  pointOf(name: string): number;
  nameOf(sq: number): string;
  sideOf(piece: string): Side;
  pieceName(piece: string): string;
}

/** A lesson mark on one point: a ring around a piece, a dot on a target, a cross where a move is blocked, or a tint. */
export interface Mark { at: string; kind: 'ring' | 'dot' | 'cross' | 'tint' }
/** A word on the board. `shift` nudges it in board units, x toward the right and z toward the near side. */
export interface Tag { at: string; text: string; shift?: [number, number] }
interface Shared { text: string; fen: string; show?: string; marks?: Mark[]; tags?: Tag[] }
/** Look: read the board, try the pieces, and watch `demo` with Show me. */
export interface Look extends Shared { kind: 'look'; demo?: string[] }
/** Move: make one move that `accept` allows ('any' takes every legal move). `answer` is what Show me plays. */
export interface Task extends Shared { kind: 'move'; answer: string; accept?: string[] | 'any'; hint: string; done: string; explain?: 'escape' }
/** Mate: force checkmate in `n` moves; the computer defends. `line` is one solution, defences included. */
export interface Puzzle extends Shared { kind: 'mate'; n: number; line: string[]; hint: string }
export type Step = Look | Task | Puzzle;
export interface Stage { key: string; title: string; goal: string; steps: Step[] }

type Rules<P, M extends BaseMove> = Pick<Game<P, M>, 'legal' | 'play' | 'inCheck' | 'noMoveLoses'>;

/** With the defender to move: true when every defence loses to mate within `n` more attacker moves, counting the one just made. */
function lost<P, M extends BaseMove>(r: Rules<P, M>, q: P, n: number): boolean {
  const replies = r.legal(q);
  if (!replies.length) return r.noMoveLoses || r.inCheck(q);
  if (n <= 1) return false;
  return replies.every(d => { const s = r.play(q, d); return r.legal(s).some(m => lost(r, r.play(s, m), n - 1)); });
}

/** Whether this move, just played from `p`, still forces mate within `n` moves in all. */
export const keepsMate = <P, M extends BaseMove>(r: Rules<P, M>, p: P, m: M, n: number) => lost(r, r.play(p, m), n);

/** Moves that force mate within `n` moves of the side to move. */
export const mating = <P, M extends BaseMove>(r: Rules<P, M>, p: P, n: number) => r.legal(p).filter(m => keepsMate(r, p, m, n));

/** The fewest moves to a forced mate, up to `max`; 0 when there is none. */
export function mateDistance<P, M extends BaseMove>(r: Rules<P, M>, p: P, max: number) {
  for (let n = 1; n <= max; n++) if (r.legal(p).some(m => keepsMate(r, p, m, n))) return n;
  return 0;
}

/** The defence that holds out longest: after it, the attacker needs the most moves to mate. Ties go to a king move, which reads as a defence. */
export function defend<P, M extends BaseMove>(r: Rules<P, M>, q: P, max: number): M | undefined {
  let best: M | undefined, score = -1;
  const replies = r.legal(q), king = (m: M) => m.piece.toLowerCase() === 'k';
  for (const d of [...replies.filter(king), ...replies.filter(m => !king(m))]) {
    const k = mateDistance(r, r.play(q, d), max) || max + 1;
    if (k > score) { score = k; best = d; }
  }
  return best;
}
