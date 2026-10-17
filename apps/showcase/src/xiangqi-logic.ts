/**
 * Xiangqi rules for the Turnbook lesson: legal moves, the palace and river limits, blocked horses and elephants,
 * the cannon's screen, the rule that generals may not face each other, check and mate.
 * Points count from Red's back rank: file a-i left to right, rank 0-9 bottom to top, so point = rank * 9 + file.
 * Red pieces are upper case and Black lower case, as in xiangqi FEN: K general, A advisor, E elephant, H horse,
 * R chariot, C cannon, P soldier. FEN from other tools may write the elephant as B and the horse as N.
 */
export type Side = 'w' | 'b';
export interface Position { board: string[]; turn: Side }
export interface Move { from: number; to: number; piece: string; captured?: string }

export const START = 'rheakaehr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RHEAKAEHR w - - 0 1';
export const NAMES: Record<string, string> = { k: 'general', a: 'advisor', e: 'elephant', h: 'horse', r: 'chariot', c: 'cannon', p: 'soldier' };
/** The characters on each piece: Red, then Black. */
export const GLYPHS: Record<string, [string, string]> = { k: ['帥', '將'], a: ['仕', '士'], e: ['相', '象'], h: ['傌', '馬'], r: ['俥', '車'], c: ['炮', '砲'], p: ['兵', '卒'] };

export const point = (name: string) => name.charCodeAt(0) - 97 + Number(name.slice(1)) * 9;
export const nameOf = (sq: number) => 'abcdefghi'[sq % 9] + Math.floor(sq / 9);
export const sideOf = (piece: string): Side => piece === piece.toUpperCase() ? 'w' : 'b';
const other = (s: Side): Side => s === 'w' ? 'b' : 'w';
const at = (f: number, r: number) => f >= 0 && f < 9 && r >= 0 && r < 10 ? r * 9 + f : -1;
const palace = (sq: number, side: Side) => { const f = sq % 9, r = Math.floor(sq / 9); return f >= 3 && f <= 5 && (side === 'w' ? r <= 2 : r >= 7); };
const home = (sq: number, side: Side) => side === 'w' ? sq < 45 : sq >= 45;

const LINES = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAGONALS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

export function parse(fen: string): Position {
  const [rows, turn = 'w'] = fen.trim().split(/\s+/);
  const board = Array<string>(90).fill('');
  rows.split('/').forEach((row, i) => {
    let f = 0;
    for (const ch of row) if (/\d/.test(ch)) f += Number(ch); else board[(9 - i) * 9 + f++] = ({ b: 'e', B: 'E', n: 'h', N: 'H' } as Record<string, string>)[ch] ?? ch;
  });
  return { board, turn: turn === 'b' ? 'b' : 'w' };
}

export function toFen(p: Position) {
  const rows = [];
  for (let r = 9; r >= 0; r--) {
    let row = '', gap = 0;
    for (let f = 0; f < 9; f++) { const piece = p.board[r * 9 + f]; if (!piece) gap++; else { row += (gap || '') + piece; gap = 0; } }
    rows.push(row + (gap || ''));
  }
  return `${rows.join('/')} ${p.turn} - - 0 1`;
}

/**
 * Whether side `by` attacks point `sq`. A general counts as attacking along an open file, which is how the rule
 * that the generals may not face each other is enforced.
 */
export function attacked(board: string[], sq: number, by: Side) {
  const f = sq % 9, r = Math.floor(sq / 9);
  const is = (s: number, type: string) => s >= 0 && board[s] !== '' && board[s] === (by === 'w' ? type.toUpperCase() : type);
  for (const [df, dr] of LINES) {
    let screens = 0;
    for (let k = 1; ; k++) {
      const s = at(f + df * k, r + dr * k);
      if (s < 0) break;
      if (!board[s]) continue;
      if (screens === 0 && (is(s, 'r') || (is(s, 'k') && df === 0))) return true;
      if (screens === 1 && is(s, 'c')) return true;
      if (++screens > 1) break;
    }
  }
  // A horse that would land here: two points one way and one to the side, with its leg point empty.
  for (const [df, dr] of LINES) for (const side of [-1, 1]) {
    const pf = df === 0 ? side : 0, pr = dr === 0 ? side : 0;
    if (is(at(f - 2 * df - pf, r - 2 * dr - pr), 'h') && !board[at(f - df - pf, r - dr - pr)]) return true;
  }
  // A soldier attacks the point ahead of it, and the points beside it once it has crossed the river.
  const back = by === 'w' ? -1 : 1, crossed = by === 'w' ? r >= 5 : r <= 4;
  if (is(at(f, r + back), 'p') || (crossed && (is(at(f - 1, r), 'p') || is(at(f + 1, r), 'p')))) return true;
  if (LINES.some(([df, dr]) => { const s = at(f + df, r + dr); return is(s, 'k') && palace(sq, by); })) return true;
  if (DIAGONALS.some(([df, dr]) => { const s = at(f + df, r + dr); return is(s, 'a') && palace(sq, by); })) return true;
  return DIAGONALS.some(([df, dr]) => is(at(f + 2 * df, r + 2 * dr), 'e') && !board[at(f + df, r + dr)] && home(sq, by));
}

function pseudo(p: Position): Move[] {
  const out: Move[] = [], { board, turn } = p;
  const mine = (x: string) => x !== '' && sideOf(x) === turn, theirs = (x: string) => x !== '' && sideOf(x) !== turn;
  for (let sq = 0; sq < 90; sq++) {
    const piece = board[sq];
    if (!mine(piece)) continue;
    const f = sq % 9, r = Math.floor(sq / 9), type = piece.toLowerCase();
    const add = (to: number) => { if (to >= 0 && !mine(board[to])) out.push({ from: sq, to, piece, ...(board[to] ? { captured: board[to] } : {}) }); };
    if (type === 'k') for (const [df, dr] of LINES) { const s = at(f + df, r + dr); if (s >= 0 && palace(s, turn)) add(s); }
    else if (type === 'a') for (const [df, dr] of DIAGONALS) { const s = at(f + df, r + dr); if (s >= 0 && palace(s, turn)) add(s); }
    else if (type === 'e') for (const [df, dr] of DIAGONALS) {
      // Two points diagonally, on its own side of the river, with the eye point between empty.
      const s = at(f + 2 * df, r + 2 * dr);
      if (s >= 0 && home(s, turn) && !board[at(f + df, r + dr)]) add(s);
    }
    else if (type === 'h') for (const [df, dr] of LINES) {
      const leg = at(f + df, r + dr);
      if (leg < 0 || board[leg]) continue;
      for (const side of [-1, 1]) add(at(f + 2 * df + (df === 0 ? side : 0), r + 2 * dr + (dr === 0 ? side : 0)));
    }
    else if (type === 'r' || type === 'c') for (const [df, dr] of LINES) {
      let screen = false;
      for (let k = 1; ; k++) {
        const s = at(f + df * k, r + dr * k);
        if (s < 0) break;
        if (!screen) {
          if (!board[s]) add(s);
          else if (type === 'r') { add(s); break; }
          else screen = true;
        } else if (board[s]) { if (theirs(board[s])) add(s); break; }
      }
    }
    else if (type === 'p') {
      add(at(f, r + (turn === 'w' ? 1 : -1)));
      if (!home(sq, turn)) { add(at(f - 1, r)); add(at(f + 1, r)); }
    }
  }
  return out.filter(m => m.to >= 0);
}

export function play(p: Position, m: Move): Position {
  const board = p.board.slice();
  board[m.from] = '';
  board[m.to] = m.piece;
  return { board, turn: other(p.turn) };
}

const generalOf = (p: Position, side: Side) => p.board.indexOf(side === 'w' ? 'K' : 'k');

export function inCheck(p: Position) {
  const k = generalOf(p, p.turn);
  return k >= 0 && attacked(p.board, k, other(p.turn));
}

export function legal(p: Position): Move[] {
  return pseudo(p).filter(m => {
    const q = play(p, m), k = generalOf(q, p.turn);
    return k < 0 || !attacked(q.board, k, q.turn);
  });
}

/** In xiangqi a player with no legal move loses, in check or not. */
export type Status = 'play' | 'check' | 'mate' | 'stalemate';
export function status(p: Position): Status {
  // A lesson diagram without this side's general is no game: nothing to mate or stalemate.
  if (generalOf(p, p.turn) < 0) return 'play';
  const moves = legal(p).length > 0, check = inCheck(p);
  return moves ? check ? 'check' : 'play' : check ? 'mate' : 'stalemate';
}

/** Finds a legal move from points such as 'h2e2'. */
export function find(p: Position, uci: string) {
  const [, a, b] = uci.match(/^([a-i]\d)([a-i]\d)$/) ?? [];
  if (!a) return undefined;
  const from = point(a), to = point(b);
  return legal(p).find(m => m.from === from && m.to === to);
}
export const uci = (m: Move) => nameOf(m.from) + nameOf(m.to);

const LETTERS: Record<string, string> = { k: 'G', a: 'A', e: 'E', h: 'H', r: 'R', c: 'C', p: 'S' };

/**
 * Notation that counts files from the mover's right, 1 to 9: piece, file, then + forward, - back or = sideways,
 * then the new file, or for a straight move along the file the number of points. The opening C2=5 slides a cannon to
 * the middle file. When two like pieces share a file, + marks the one further forward and - the one behind.
 */
export function notation(p: Position, m: Move) {
  const side = sideOf(m.piece), type = m.piece.toLowerCase();
  const fileNo = (sq: number) => side === 'w' ? 9 - (sq % 9) : (sq % 9) + 1;
  const rankOf = (sq: number) => Math.floor(sq / 9) * (side === 'w' ? 1 : -1);
  const rise = rankOf(m.to) - rankOf(m.from);
  const op = rise > 0 ? '+' : rise < 0 ? '-' : '=';
  const diagonal = 'aeh'.includes(type);
  const arg = op === '=' || diagonal ? fileNo(m.to) : Math.abs(rise);
  const twins = p.board.flatMap((x, s) => x === m.piece && s !== m.from && s % 9 === m.from % 9 ? [s] : []);
  const head = twins.length === 1 ? (rankOf(m.from) > rankOf(twins[0]) ? '+' : '-') + LETTERS[type] : LETTERS[type] + fileNo(m.from);
  return head + op + arg;
}

/** The move in plain words with the files of the notation, such as "Cannon slides from file 2 to file 5". */
export function words(p: Position, m: Move) {
  const side = sideOf(m.piece), type = m.piece.toLowerCase(), name = NAMES[type];
  const fileNo = (sq: number) => side === 'w' ? 9 - (sq % 9) : (sq % 9) + 1;
  const rise = (Math.floor(m.to / 9) - Math.floor(m.from / 9)) * (side === 'w' ? 1 : -1), way = rise > 0 ? 'forward' : 'back';
  const Name = name[0].toUpperCase() + name.slice(1);
  let s = rise === 0 ? `${Name} slides from file ${fileNo(m.from)} to file ${fileNo(m.to)}`
    : 'aeh'.includes(type) ? `${Name} moves ${way} from file ${fileNo(m.from)} to file ${fileNo(m.to)}`
    : `${Name} on file ${fileNo(m.from)} moves ${way} ${Math.abs(rise)} point${Math.abs(rise) > 1 ? 's' : ''}`;
  if (m.captured) s += `, taking the ${NAMES[m.captured.toLowerCase()]}`;
  const after = status(play(p, m));
  if (after === 'mate') s += ', checkmate';
  else if (after === 'check') s += ', check';
  else if (after === 'stalemate') s += `; ${sideOf(m.piece) === 'w' ? 'Black' : 'Red'} has no legal move and loses`;
  return s;
}

export function perft(p: Position, depth: number): number {
  const moves = legal(p);
  if (depth <= 1) return depth === 1 ? moves.length : 1;
  let n = 0;
  for (const m of moves) n += perft(play(p, m), depth - 1);
  return n;
}
