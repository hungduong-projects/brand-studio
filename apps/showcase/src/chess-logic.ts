/**
 * Chess rules for the Turnbook lesson: legal moves with castling, en passant and promotion, check, mate and
 * stalemate, FEN and short algebraic notation. Squares count from a1 = 0 along the rank to h8 = 63.
 * White pieces are upper case (PNBRQK), black lower case, as in FEN.
 */
export type Side = 'w' | 'b';
export interface Position { board: string[]; turn: Side; castle: string; ep: number; half: number; full: number }
/** `take` is the square of the captured piece, which differs from `to` only en passant. `rook` moves with the king when castling. */
export interface Move { from: number; to: number; piece: string; captured?: string; take?: number; promo?: string; rook?: [number, number]; ep?: boolean }

export const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const NAMES: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export const square = (name: string) => name.charCodeAt(0) - 97 + (Number(name[1]) - 1) * 8;
export const nameOf = (sq: number) => 'abcdefgh'[sq & 7] + ((sq >> 3) + 1);
export const sideOf = (piece: string): Side => piece === piece.toUpperCase() ? 'w' : 'b';
const other = (s: Side): Side => s === 'w' ? 'b' : 'w';
const at = (f: number, r: number) => f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : -1;

const ROOK = [[1, 0], [-1, 0], [0, 1], [0, -1]], BISHOP = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]], KING = [...ROOK, ...BISHOP];

export function parse(fen: string): Position {
  const [rows, turn = 'w', castle = '-', ep = '-', half = '0', full = '1'] = fen.trim().split(/\s+/);
  const board = Array<string>(64).fill('');
  rows.split('/').forEach((row, i) => {
    let f = 0;
    for (const ch of row) if (/\d/.test(ch)) f += Number(ch); else board[(7 - i) * 8 + f++] = ch;
  });
  return { board, turn: turn as Side, castle: castle === '-' ? '' : castle, ep: ep === '-' ? -1 : square(ep), half: Number(half), full: Number(full) };
}

export function toFen(p: Position) {
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = '', gap = 0;
    for (let f = 0; f < 8; f++) { const piece = p.board[r * 8 + f]; if (!piece) gap++; else { row += (gap || '') + piece; gap = 0; } }
    rows.push(row + (gap || ''));
  }
  return `${rows.join('/')} ${p.turn} ${p.castle || '-'} ${p.ep < 0 ? '-' : nameOf(p.ep)} ${p.half} ${p.full}`;
}

/** Whether side `by` attacks square `sq`. */
export function attacked(board: string[], sq: number, by: Side) {
  const f = sq & 7, r = sq >> 3, up = by === 'w' ? 1 : -1;
  const is = (s: number, type: string) => s >= 0 && board[s] !== '' && board[s] === (by === 'w' ? type.toUpperCase() : type);
  // A pawn attacks one square diagonally forward, so a white attacker sits one rank below.
  if (is(at(f - 1, r - up), 'p') || is(at(f + 1, r - up), 'p')) return true;
  if (KNIGHT.some(([df, dr]) => is(at(f + df, r + dr), 'n'))) return true;
  if (KING.some(([df, dr]) => is(at(f + df, r + dr), 'k'))) return true;
  const slide = (dirs: number[][], a: string) => dirs.some(([df, dr]) => {
    for (let k = 1; ; k++) {
      const s = at(f + df * k, r + dr * k);
      if (s < 0) return false;
      if (board[s]) return is(s, a) || is(s, 'q');
    }
  });
  return slide(ROOK, 'r') || slide(BISHOP, 'b');
}

/** Moves that follow each piece's pattern, before checking whether they leave the king in check. */
function pseudo(p: Position): Move[] {
  const out: Move[] = [], { board, turn } = p;
  const mine = (x: string) => x !== '' && sideOf(x) === turn, theirs = (x: string) => x !== '' && sideOf(x) !== turn;
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (!mine(piece)) continue;
    const f = sq & 7, r = sq >> 3, type = piece.toLowerCase();
    const add = (to: number, extra: Partial<Move> = {}) => out.push({ from: sq, to, piece, ...(board[to] ? { captured: board[to], take: to } : {}), ...extra });
    if (type === 'p') {
      const up = turn === 'w' ? 1 : -1, last = turn === 'w' ? 7 : 0;
      const push = (to: number) => { if (to >> 3 === last) for (const q of 'qrbn') add(to, { promo: turn === 'w' ? q.toUpperCase() : q }); else add(to); };
      const one = at(f, r + up);
      if (one >= 0 && !board[one]) {
        push(one);
        const two = at(f, r + 2 * up);
        if (r === (turn === 'w' ? 1 : 6) && !board[two]) add(two);
      }
      for (const df of [-1, 1]) {
        const s = at(f + df, r + up);
        if (s < 0) continue;
        if (theirs(board[s])) push(s);
        else if (s === p.ep) add(s, { captured: turn === 'w' ? 'p' : 'P', take: s - 8 * up, ep: true });
      }
    } else if (type === 'n' || type === 'k') {
      for (const [df, dr] of type === 'n' ? KNIGHT : KING) { const s = at(f + df, r + dr); if (s >= 0 && !mine(board[s])) add(s); }
      const home = turn === 'w' ? 0 : 56, them = other(turn), rook = turn === 'w' ? 'R' : 'r';
      if (type === 'k' && sq === home + 4) {
        // The king may not castle out of, through or into check, and the squares between must be empty.
        const safe = (...ds: number[]) => ds.every(d => !attacked(board, home + d, them));
        if (p.castle.includes(turn === 'w' ? 'K' : 'k') && board[home + 7] === rook && !board[home + 5] && !board[home + 6] && safe(4, 5, 6)) add(home + 6, { rook: [home + 7, home + 5] });
        if (p.castle.includes(turn === 'w' ? 'Q' : 'q') && board[home] === rook && !board[home + 1] && !board[home + 2] && !board[home + 3] && safe(4, 3, 2)) add(home + 2, { rook: [home, home + 3] });
      }
    } else {
      for (const [df, dr] of type === 'r' ? ROOK : type === 'b' ? BISHOP : KING) {
        for (let k = 1; ; k++) {
          const s = at(f + df * k, r + dr * k);
          if (s < 0 || mine(board[s])) break;
          add(s);
          if (board[s]) break;
        }
      }
    }
  }
  return out;
}

// A king or rook leaving its first square, or a rook captured there, loses that castling right.
const RIGHTS: Record<number, string> = { 0: 'Q', 7: 'K', 4: 'KQ', 56: 'q', 63: 'k', 60: 'kq' };

export function play(p: Position, m: Move): Position {
  const board = p.board.slice();
  if (m.take !== undefined) board[m.take] = '';
  board[m.from] = '';
  board[m.to] = m.promo ?? m.piece;
  if (m.rook) { board[m.rook[1]] = board[m.rook[0]]; board[m.rook[0]] = ''; }
  let castle = p.castle;
  for (const s of [m.from, m.to]) for (const c of RIGHTS[s] ?? '') castle = castle.replace(c, '');
  const pawn = m.piece.toLowerCase() === 'p';
  return {
    board, turn: other(p.turn), castle,
    ep: pawn && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : -1,
    half: pawn || m.captured ? 0 : p.half + 1,
    full: p.full + (p.turn === 'b' ? 1 : 0),
  };
}

const kingOf = (p: Position, side: Side) => p.board.indexOf(side === 'w' ? 'K' : 'k');

/** Lesson boards may leave a king out; with no king, nothing is ever in check. */
export function inCheck(p: Position) {
  const k = kingOf(p, p.turn);
  return k >= 0 && attacked(p.board, k, other(p.turn));
}

export function legal(p: Position): Move[] {
  return pseudo(p).filter(m => {
    const q = play(p, m), k = kingOf(q, p.turn);
    return k < 0 || !attacked(q.board, k, q.turn);
  });
}

export type Status = 'play' | 'check' | 'mate' | 'stalemate';
export function status(p: Position): Status {
  // A lesson diagram without this side's king is no game: nothing to mate or stalemate.
  if (kingOf(p, p.turn) < 0) return 'play';
  const moves = legal(p).length > 0, check = inCheck(p);
  return moves ? check ? 'check' : 'play' : check ? 'mate' : 'stalemate';
}

/** Finds a legal move from coordinates such as 'e2e4' or 'e7e8q'. */
export function find(p: Position, uci: string) {
  const from = square(uci.slice(0, 2)), to = square(uci.slice(2, 4)), promo = uci[4];
  return legal(p).find(m => m.from === from && m.to === to && (!m.promo || m.promo.toLowerCase() === (promo ?? 'q')));
}
export const uci = (m: Move) => nameOf(m.from) + nameOf(m.to) + (m.promo ? m.promo.toLowerCase() : '');

const suffix = (p: Position, m: Move) => { const s = status(play(p, m)); return s === 'mate' ? '#' : s === 'check' ? '+' : ''; };

/** Short algebraic notation, such as Nf3, exd6, e8=Q+, O-O or Rad1#. */
export function san(p: Position, m: Move) {
  if (m.rook) return (m.to > m.from ? 'O-O' : 'O-O-O') + suffix(p, m);
  const type = m.piece.toUpperCase(), x = m.captured ? 'x' : '';
  if (type === 'P') return (x ? 'abcdefgh'[m.from & 7] : '') + x + nameOf(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '') + suffix(p, m);
  // Name the starting file, rank or square only when another piece of the same kind could also go there.
  const rivals = legal(p).filter(o => o.piece === m.piece && o.to === m.to && o.from !== m.from);
  let from = '';
  if (rivals.length) {
    if (!rivals.some(o => (o.from & 7) === (m.from & 7))) from = 'abcdefgh'[m.from & 7];
    else if (!rivals.some(o => o.from >> 3 === m.from >> 3)) from = String((m.from >> 3) + 1);
    else from = nameOf(m.from);
  }
  return type + from + x + nameOf(m.to) + suffix(p, m);
}

/** The move in plain words, such as "Knight takes the pawn on e5, check". */
export function words(p: Position, m: Move) {
  const name = NAMES[m.piece.toLowerCase()], cap = name[0].toUpperCase() + name.slice(1);
  let s = m.rook
    ? `King castles on the ${m.to > m.from ? 'king' : 'queen'}’s side`
    : `${cap} ${m.captured ? `takes the ${NAMES[m.captured.toLowerCase()]} on` : 'to'} ${nameOf(m.to)}`;
  if (m.ep) s += ', en passant';
  if (m.promo) s += ` and becomes a ${NAMES[m.promo.toLowerCase()]}`;
  const after = status(play(p, m));
  return s + (after === 'mate' ? ', checkmate' : after === 'check' ? ', check' : after === 'stalemate' ? ', stalemate' : '');
}

export function perft(p: Position, depth: number): number {
  const moves = legal(p);
  if (depth <= 1) return depth === 1 ? moves.length : 1;
  let n = 0;
  for (const m of moves) n += perft(play(p, m), depth - 1);
  return n;
}
