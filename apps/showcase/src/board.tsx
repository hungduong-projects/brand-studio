import { useEffect, useLayoutEffect, useReducer, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@brand-studio/ui';
import '@fontsource-variable/geist';
import '@fontsource/geist-mono';
import './cube.css';
import './board.css';
import { defend, keepsMate, mating, type BaseMove, type Game, type Stage, type Step } from './board-game';
import { startBoard, type BoardStage, type Marks } from './board-stage';
import { chess, CHESS_STAGES } from './chess-lessons';
import { xiangqi, XIANGQI_STAGES } from './xiangqi-lessons';
import { START as CHESS_START } from './chess-logic';
import { GLYPHS, START as XIANGQI_START } from './xiangqi-logic';
import { at, SITE } from './paths';

type Kind = 'chess' | 'xiangqi';
interface Copy { title: string; tagline: string; h1: string; lede: string; label: string; start: string; key: ReactNode; foot: ReactNode; other: { href: string; text: string } }

/** Xiangqi pieces: English name, Vietnamese name, notation letter. */
const XQ_KEY = { k: ['General', 'Tướng', 'G'], a: ['Advisor', 'Sĩ', 'A'], e: ['Elephant', 'Tượng', 'E'], h: ['Horse', 'Mã', 'H'], r: ['Chariot', 'Xe', 'R'], c: ['Cannon', 'Pháo', 'C'], p: ['Soldier', 'Tốt', 'S'] } as const;

const COPY: Record<Kind, Copy> = {
  chess: {
    title: 'Turnbook | Learn chess in seven stages',
    tagline: 'A lesson for chess',
    h1: 'Learn chess in seven stages.',
    lede: 'Chess, cờ vua in Vietnamese, has six kinds of piece. Move each one on a 3D board, learn check and the two special moves, then solve five mate puzzles.',
    label: 'Chess board',
    start: CHESS_START,
    key: <>
      <p>Moves are written in algebraic notation: the piece letter, then the square it moves to. A pawn move has no letter, <kbd>x</kbd> marks a capture, <kbd>+</kbd> check and <kbd>#</kbd> checkmate. <kbd>O-O</kbd> castles on the king’s side.</p>
      <table>
        <thead><tr><th scope="col">Piece</th><th scope="col">Letter</th><th scope="col">Moves</th></tr></thead>
        <tbody>
          <tr><th scope="row">King <span className="tb-muted">Vua</span></th><td><kbd>K</kbd></td><td>One square any way</td></tr>
          <tr><th scope="row">Queen <span className="tb-muted">Hậu</span></th><td><kbd>Q</kbd></td><td>Any distance, any of eight ways</td></tr>
          <tr><th scope="row">Rook <span className="tb-muted">Xe</span></th><td><kbd>R</kbd></td><td>Any distance along a file or rank</td></tr>
          <tr><th scope="row">Bishop <span className="tb-muted">Tượng</span></th><td><kbd>B</kbd></td><td>Any distance diagonally</td></tr>
          <tr><th scope="row">Knight <span className="tb-muted">Mã</span></th><td><kbd>N</kbd></td><td>An L, jumping over pieces</td></tr>
          <tr><th scope="row">Pawn <span className="tb-muted">Tốt</span></th><td>none</td><td>Forward one, captures diagonally</td></tr>
        </tbody>
      </table>
    </>,
    foot: <>Turnbook is a fictional lesson made for a Brand Studio showcase. The board and pieces are drawn in code. The rules follow the <a href="https://handbook.fide.com/chapter/E012023">FIDE Laws of Chess</a>.</>,
    other: { href: 'xiangqi/', text: 'Learn xiangqi next' },
  },
  xiangqi: {
    title: 'Turnbook | Learn xiangqi in seven stages',
    tagline: 'A lesson for xiangqi',
    h1: 'Learn xiangqi in seven stages.',
    lede: 'Xiangqi is Chinese chess, cờ tướng in Vietnamese. Move each of its seven pieces on a 3D board, learn the palace and the river, then solve four mate puzzles.',
    label: 'Xiangqi board',
    start: XIANGQI_START,
    key: <>
      <p>Moves are written piece, file, direction, then the new file or the number of points moved. Files count from each player’s right, 1 to 9, as on the board’s edges. <kbd>+</kbd> moves forward, <kbd>-</kbd> back and <kbd>=</kbd> sideways, so <kbd>C2=5</kbd> slides a cannon to the middle file.</p>
      <table>
        <thead><tr><th scope="col">Piece</th><th scope="col">Red, Black</th><th scope="col">Letter</th></tr></thead>
        <tbody>
          {(['k', 'a', 'e', 'h', 'r', 'c', 'p'] as const).map(p => <tr key={p}>
            <th scope="row">{XQ_KEY[p][0]} <span className="tb-muted">{XQ_KEY[p][1]}</span></th>
            <td><span className="tb-glyph" lang="zh-Hant" data-side="red">{GLYPHS[p][0]}</span> <span className="tb-glyph" lang="zh-Hant">{GLYPHS[p][1]}</span></td>
            <td><kbd>{XQ_KEY[p][2]}</kbd></td>
          </tr>)}
        </tbody>
      </table>
    </>,
    foot: <>Turnbook is a fictional lesson made for a Brand Studio showcase. The board and pieces are drawn in code, and the rules follow <a href="https://en.wikipedia.org/wiki/Xiangqi">Wikipedia’s xiangqi article</a>. The characters are set in <a href="https://github.com/lxgw/LxgwWenkaiTC">LXGW WenKai TC</a> under the SIL Open Font License.</>,
    other: { href: 'chess/', text: 'Learn chess next' },
  },
};

const GAMES: Record<Kind, { game: Game; stages: Stage[] }> = {
  chess: { game: chess as unknown as Game, stages: CHESS_STAGES },
  xiangqi: { game: xiangqi as unknown as Game, stages: XIANGQI_STAGES },
};

const params = new URLSearchParams(location.search);
// ?pace=0 runs every move and pause at once, for tests and stills.
const PACE = params.get('pace') === '0' ? 0 : 1;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms * PACE));

type Where = 'intro' | 'done' | { stage: number; step: number };
interface Played { text: string; words: string }

/** A cube seen corner on, its top layer a quarter turned: the Turnbook mark. */
const Mark = () => <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
  <path d="M16 13.5 27 19v8.5L16 32 5 27.5V19Z" fill="currentColor" opacity=".9" />
  <path d="m16 2.5 11 5v6l-11 5-11-5v-6Z" fill="var(--bs-accent)" transform="rotate(-8 16 10)" />
</svg>;

export function BoardLesson({ kind }: { kind: Kind }) {
  const { game, stages } = GAMES[kind], copy = COPY[kind];
  const host = useRef<HTMLDivElement>(null), tools = useRef<HTMLDivElement>(null), tagEls = useRef<(HTMLSpanElement | null)[]>([]);
  const stage = useRef<BoardStage | null>(null);
  const [reduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [ready, setReady] = useState(false);
  const [where, setWhere] = useState<Where>('intro');
  const pos = useRef<unknown>(game.parse(copy.start));
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [selected, setSelected] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState(false);
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'bad' | 'info' } | null>(null);
  const [played, setPlayed] = useState<Played[]>([]);
  const [busy, setBusy] = useState(false);
  const [promo, setPromo] = useState<{ moves: BaseMove[]; from: unknown } | null>(null);
  const [top, setTop] = useState(false);
  const [live, setLive] = useState('');
  const epoch = useRef(0), left = useRef(0), last = useRef<number[]>([]);

  const step: Step | null = typeof where === 'object' ? stages[where.stage].steps[where.step] : null;
  const isTask = step?.kind === 'move' || step?.kind === 'mate';
  const side = (p: unknown) => game.sides[game.turn(p)];

  // Every example shares one index.html, so this page names itself.
  useEffect(() => { document.title = copy.title; }, [copy.title]);

  useEffect(() => {
    let first = true;
    const s = startBoard(host.current!, {
      kind, reduced,
      accent: getComputedStyle(host.current!).getPropertyValue('--bs-accent').trim() || '#5b3df5',
      onFrame: () => { if (first) { first = false; setReady(true); } },
      onPick: sq => pickRef.current(sq),
      clear: () => tools.current && host.current ? tools.current.getBoundingClientRect().bottom - host.current.getBoundingClientRect().top + 4 : 0,
    });
    stage.current = s;
    if (import.meta.env.DEV) Object.assign(window, { turnbook: s });
    void s.setPosition(game.board(pos.current), !reduced && !!PACE);
    return () => { s.stop(); stage.current = null; };
  }, [kind, reduced, game]);

  /** Puts the step's position on the board and clears what the last step left behind. */
  function reset(animate = true) {
    epoch.current++;
    pos.current = game.parse(step ? step.fen : copy.start);
    left.current = step?.kind === 'mate' ? step.n : 0;
    last.current = [];
    setSelected(null); setCursor(null); setSolved(false); setNote(null); setPlayed([]); setPromo(null); setBusy(false);
    stage.current?.setArrow(null);
    void stage.current?.setPosition(game.board(pos.current), animate && !reduced && !!PACE);
    rerender();
  }
  // A layout effect, so a key pressed right after the step changes already meets the new position.
  useLayoutEffect(() => {
    setHint(false);
    reset();
    // On a phone the lesson starts below the board: bring its first line up under the board.
    if (typeof where === 'object' && matchMedia('(max-width: 859px)').matches) requestAnimationFrame(() => document.getElementById('lesson')?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }));
  }, [where]); // eslint-disable-line react-hooks/exhaustive-deps

  // Words on the board stay until the first move changes the position they describe.
  useEffect(() => {
    const tags = played.length ? [] : step?.tags ?? [];
    stage.current?.setTags(tags.map((t, i) => ({ el: tagEls.current[i]!, sq: game.pointOf(t.at), shift: t.shift })));
  }, [step, played.length, game]);

  /** Moves the side that owns the piece may make: free on a look step, the side to move otherwise. */
  const moverPos = (sq: number) => {
    const piece = game.board(pos.current)[sq];
    return step?.kind === 'look' && piece ? game.withTurn(pos.current, game.sideOf(piece)) : pos.current;
  };
  const movesFrom = (sq: number) => game.legal(moverPos(sq)).filter(m => m.from === sq);

  // Marks: the step's own marks until the first move, the selected piece's moves, a hint, check and the last move.
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    const m: Marks = { rings: [], dots: [], captures: [], crosses: [], tints: [], last: last.current, cursor, lifted: selected };
    const fresh = played.length === 0;
    if (fresh && step?.marks) for (const k of step.marks) (k.kind === 'ring' ? m.rings! : k.kind === 'cross' ? m.crosses! : k.kind === 'tint' ? m.tints! : m.dots!).push(game.pointOf(k.at));
    const shown = selected ?? (fresh && step?.show && !solved ? game.pointOf(step.show) : null);
    if (shown !== null && game.board(pos.current)[shown]) {
      m.rings!.push(shown);
      for (const mv of movesFrom(shown)) (mv.captured ? m.captures! : m.dots!).push(mv.take ?? mv.to);
    }
    const h = hint && !solved ? hintFrom() : null;
    if (h !== null) m.rings!.push(h);
    if (game.inCheck(pos.current)) m.check = game.board(pos.current).indexOf(game.turn(pos.current) === 'w' ? 'K' : 'k');
    s.setMarks(m);
  });

  /** The piece the hint points at: the task's answer, or a puzzle move that still forces mate from here. */
  function hintFrom() {
    if (!step || step.kind === 'look') return null;
    if (step.kind === 'move') return game.pointOf(step.answer.slice(0, 2));
    const planned = step.line[step.line.length - 1 - 2 * (left.current - 1)], m = planned ? game.find(pos.current, planned) : undefined;
    if (m && keepsMate(game, pos.current, m, left.current)) return m.from;
    return mating(game, pos.current, left.current)[0]?.from ?? null;
  }

  // The violet arc previews a demo's first move before Show me plays it.
  useEffect(() => {
    const u = step?.kind === 'look' && step.demo && !played.length ? step.demo[0] : null;
    stage.current?.setArrow(u ? game.pointOf(u.slice(0, 2)) : null, u ? game.pointOf(u.slice(2, 4)) : undefined);
  }, [step, played.length, game]);

  async function play(m: BaseMove, from: unknown, duration?: number) {
    const text = game.notation(from, m), words = game.words(from, m);
    pos.current = game.play(from, m);
    last.current = [m.from, m.to];
    setPlayed(x => [...x, { text, words }]);
    setLive(`${game.sides[game.sideOf(m.piece)]}: ${words}.`);
    setSelected(null);
    rerender();
    await stage.current?.move(m, { duration: PACE ? duration : 0 });
  }

  const over = (p: unknown) => { const st = game.status(p); return st === 'mate' || (st === 'stalemate' && game.noMoveLoses); };
  const ending = (p: unknown) => game.status(p) === 'mate' ? 'Checkmate.' : `${side(p)} has no legal move and loses.`;

  /** Plays the visitor's move and judges it against the step. */
  async function attempt(m: BaseMove, from: unknown) {
    const e = epoch.current;
    setBusy(true);
    if (!step || step.kind === 'look') { await play(m, from); setBusy(false); return; }
    if (step.kind === 'move') {
      const ok = step.accept === 'any' || (step.accept ?? [step.answer]).includes(game.uci(m));
      await play(m, from);
      if (e !== epoch.current) return;
      if (ok) {
        setSolved(true);
        setNote({ tone: 'good', text: step.explain === 'escape' ? escapeNote(m, from) : step.done });
        setBusy(false);
        return;
      }
      setNote({ tone: 'bad', text: 'That move is legal, but it is not the one this step asks for. The board goes back so you can try again.' });
      await wait(1300);
      if (e === epoch.current) { reset(); setNote({ tone: 'bad', text: 'Try again, or press Hint.' }); }
      return;
    }
    // A mate puzzle: the move must still force mate in the moves left.
    const good = keepsMate(game, from, m, left.current);
    await play(m, from);
    if (e !== epoch.current) return;
    if (!good) {
      const stale = game.status(pos.current) === 'stalemate';
      setNote({ tone: 'bad', text: stale ? `Stalemate: ${side(pos.current)} has no legal move but is not in check, so the game is a draw. Try again.` : `That does not force mate: ${side(pos.current)} can get away. Try again.` });
      await wait(1500);
      if (e === epoch.current) reset();
      return;
    }
    if (over(pos.current)) { setSolved(true); setNote({ tone: 'good', text: ending(pos.current) }); setBusy(false); return; }
    left.current--;
    setNote({ tone: 'info', text: `${side(pos.current)} is thinking…` });
    await wait(650);
    if (e !== epoch.current) return;
    const reply = defend(game, pos.current, left.current)!;
    const words = game.words(pos.current, reply);
    await play(reply, pos.current);
    if (e !== epoch.current) return;
    setNote({ tone: 'info', text: `${game.sides[game.sideOf(reply.piece)]} replied: ${words}. Now mate in ${left.current}.` });
    setBusy(false);
  }

  /** Says which of the three ways out of check the visitor used. */
  function escapeNote(m: BaseMove, from: unknown) {
    const kingSq = game.board(from).indexOf(game.turn(from) === 'w' ? 'K' : 'k');
    if (m.captured) return 'You captured the attacker, so the check is over.';
    if (m.from === kingSq) return `You moved the ${game.pieceName(m.piece)} out of the line of attack.`;
    return 'You blocked the line between the attacker and your king.';
  }

  /** Plays the step's answer: the demo, the task's move, or the whole puzzle line, each previewed by the arc. */
  async function showMe() {
    if (!step) return;
    if (played.length || solved) reset();
    await stage.current?.settle();
    const e = epoch.current;
    setBusy(true);
    const moves = step.kind === 'look' ? step.demo ?? [] : step.kind === 'move' ? [step.answer] : step.line;
    for (const u of moves) {
      const from = game.pointOf(u.slice(0, 2)), piece = game.board(pos.current)[from];
      const p = step.kind === 'look' ? game.withTurn(pos.current, game.sideOf(piece)) : pos.current;
      const m = game.find(p, u)!;
      stage.current?.setArrow(m.from, m.to);
      await wait(700);
      if (e !== epoch.current) return;
      stage.current?.setArrow(null);
      await play(m, p);
      if (e !== epoch.current) return;
      await wait(450);
    }
    if (step.kind !== 'look') { setSolved(true); setNote({ tone: 'good', text: step.kind === 'move' ? step.done : ending(pos.current) }); }
    setBusy(false);
  }

  function pick(sq: number) {
    if (busy || promo || (isTask && solved)) return;
    const board = game.board(pos.current), piece = board[sq];
    if (selected !== null) {
      const from = moverPos(selected), options = game.legal(from).filter(m => m.from === selected && (m.to === sq || m.take === sq));
      if (options.length > 1) { setPromo({ moves: options, from }); return; }
      if (options.length === 1) { void attempt(options[0], from); return; }
    }
    const mine = piece && (step?.kind === 'look' || game.sideOf(piece) === game.turn(pos.current));
    if (mine && sq !== selected) {
      setSelected(sq);
      const n = movesFrom(sq).length;
      setLive(`${game.sides[game.sideOf(piece)]} ${game.pieceName(piece)} on ${game.nameOf(sq)}: ${n} move${n === 1 ? '' : 's'}.`);
    } else setSelected(null);
  }
  const pickRef = useRef(pick);
  pickRef.current = pick;

  function onKey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const files = game.files, ranks = game.ranks;
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const c = cursor ?? game.pointOf('e4');
      const f = Math.min(files - 1, Math.max(0, c % files + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0)));
      const r = Math.min(ranks - 1, Math.max(0, Math.floor(c / files) + (e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0)));
      const sq = r * files + f, piece = game.board(pos.current)[sq];
      setCursor(sq);
      setLive(`${game.nameOf(sq)}: ${piece ? `${game.sides[game.sideOf(piece)]} ${game.pieceName(piece)}` : 'empty'}.`);
    } else if ((e.key === 'Enter' || e.key === ' ') && cursor !== null) { e.preventDefault(); pick(cursor); }
    else if (e.key === 'Escape') setSelected(null);
  }

  const go = (to: Where) => setWhere(to);
  const flat = stages.flatMap((s, i) => s.steps.map((_, k) => ({ stage: i, step: k })));
  const index = typeof where === 'object' ? flat.findIndex(x => x.stage === where.stage && x.step === where.step) : -1;
  const next = () => go(index + 1 < flat.length ? flat[index + 1] : 'done');
  const back = () => index > 0 && go(flat[index - 1]);

  let panel: ReactNode, dock: ReactNode = null;
  if (where === 'intro') panel = <>
    <h2 id="lesson-title">The seven stages</h2>
    <p className="tb-lede">Tap any piece on the board to see where it can move. {game.sides.w} moves first.</p>
    <ol className="tb-stages">{stages.map((s, i) => <li key={s.key}><span className="tb-num">{i + 1}</span><span><b>{s.title}</b><span>{s.goal}</span></span></li>)}</ol>
    <div className="tb-actions">
      <Button onClick={() => go({ stage: 0, step: 0 })}>Start the lesson</Button>
      <Button tone="secondary" onClick={() => go({ stage: 6, step: 0 })}>Go to the puzzles</Button>
    </div>
  </>;
  else if (where === 'done') panel = <>
    <h2 id="lesson-title">Lesson complete</h2>
    <p className="tb-lede">You reached the end of all seven stages.</p>
    <ol className="tb-stages tb-stages--done">{stages.map((s, i) => <li key={s.key} data-state="done"><span className="tb-num">{i + 1}</span><span><b>{s.title}</b></span></li>)}</ol>
    <div className="tb-actions">
      <Button onClick={() => go({ stage: 0, step: 0 })}>Start again</Button>
      <a className="tb-link" href={at(copy.other.href)}>{copy.other.text}</a>
      <a className="tb-link" href={at('cube/')}>Solve the cube</a>
    </div>
  </>;
  else {
    const current = stages[where.stage], latest = played[played.length - 1];
    // The first render after a step change still holds the last board, so read the step's own start until a move is made.
    const now = played.length ? pos.current : game.parse(step!.fen);
    const demo = step!.kind === 'look' && step!.demo && !played.length ? (() => { const u = step!.demo![0], p = game.withTurn(now, game.sideOf(game.board(now)[game.pointOf(u.slice(0, 2))])), m = game.find(p, u)!; return { text: game.notation(p, m), words: game.words(p, m) }; })() : null;
    const shown = latest ?? demo;
    const primary = step!.kind === 'look'
      ? step!.demo ? <Button onClick={() => void showMe()} disabled={busy}>{played.length ? 'Replay' : 'Show me'}</Button> : <Button tone="secondary" onClick={() => reset()} disabled={busy || !played.length}>Reset board</Button>
      : solved ? <Button tone="secondary" onClick={() => reset()} disabled={busy}>Try again</Button>
      : hint ? <Button onClick={() => void showMe()} disabled={busy}>Show me</Button>
      : <Button onClick={() => setHint(true)} disabled={busy}>Hint</Button>;
    panel = <>
      <p className="tb-kicker">Stage {where.stage + 1} of 7</p>
      <h2 id="lesson-title">{current.title}</h2>
      <ol className="tb-meter" aria-hidden="true">{stages.map((s, i) => <li key={s.key} data-state={i < where.stage ? 'done' : i === where.stage ? 'now' : undefined} />)}</ol>
      <p className="tb-goal">{current.goal}</p>
      <div className="tb-step">
        <p className="tb-step__count">Step {where.step + 1} of {current.steps.length}{step!.kind === 'mate' ? ` · mate in ${step!.n}` : ''}</p>
        <p className="tb-step__text">{step!.text}</p>
        {hint && step!.kind !== 'look' && !solved && <p className="tb-hintline">Hint: {step!.hint}</p>}
        {note && <p className="tb-note" data-tone={note.tone} role="status">{note.text}</p>}
        {played.length > 0 && <ol className="tb-moves" aria-label="Moves played">{played.map((p, i) => <li key={i} className="tb-cap" data-state={i === played.length - 1 ? 'now' : 'done'}>{p.text}</li>)}</ol>}
      </div>
    </>;
    // On a phone this dock sits at the bottom edge, so the move and its buttons stay in reach under the board.
    dock = <><div className="tb-dock">
      <p className="tb-next">
        <kbd>{shown ? shown.text : isTask && !solved ? '?' : '·'}</kbd>
        <span>{shown ? shown.words : isTask && !solved ? `Your move, ${side(now)}` : 'Tap a piece to see its moves'}</span>
      </p>
      <div className="tb-controls">
        <Button tone="secondary" onClick={back} disabled={index <= 0}>Back</Button>
        {primary}
        <Button tone={solved || step!.kind === 'look' ? 'primary' : 'secondary'} onClick={next}>{index + 1 < flat.length ? 'Next step' : 'Finish'}</Button>
      </div>
    </div>
      <ol className="tb-stages tb-stages--compact">{stages.map((s, i) => <li key={s.key} data-state={i < where.stage ? 'done' : i === where.stage ? 'now' : undefined}>
        <span className="tb-num">{i + 1}</span><button type="button" onClick={() => go({ stage: i, step: 0 })} aria-current={i === where.stage ? 'step' : undefined}>{s.title}</button>
      </li>)}</ol>
    </>;
  }

  const tags = played.length ? [] : step?.tags ?? [];
  return <div className="tb" data-game={kind}>
    <header className="tb-bar">
      <a className="tb-mark" href="#main"><Mark /><span>Turnbook</span></a>
      <p>{copy.tagline}</p>
      <a className="tb-home" href={SITE}>Brand Studio</a>
    </header>

    <main id="main">
      <section className="tb-hero" aria-labelledby="hero-title">
        <h1 id="hero-title">{copy.h1}</h1>
        <p>{copy.lede}</p>
      </section>

      <div className="tb-work" data-lesson={typeof where === 'object' ? '' : undefined}>
        <section className="tb-stage" aria-label={copy.label}>
          <div ref={host} className="tb-canvas tb-canvas--board" data-ready={ready || undefined} data-busy={busy || undefined} tabIndex={0} role="application"
            aria-label={`${copy.label}. Arrow keys move a cursor over the board; Enter picks a piece, then its target. Escape lets go.`}
            onKeyDown={onKey}>
            {tags.map((t, i) => <span key={`${where && typeof where === 'object' ? `${where.stage}.${where.step}` : ''}-${t.at}-${t.text}`} ref={el => { tagEls.current[i] = el; }} className="tb-part" aria-hidden="true">{t.text}</span>)}
            {promo && <div className="tb-promo" role="dialog" aria-label="Choose a piece">
              <p>Promote to</p>
              {promo.moves.map(m => <button key={m.promo} type="button" onClick={() => { const p = promo; setPromo(null); void attempt(m, p.from); }}>{game.pieceName(m.promo!)}</button>)}
              <button type="button" className="tb-promo__cancel" onClick={() => { setPromo(null); setSelected(null); }}>Cancel</button>
            </div>}
          </div>
          <div ref={tools} className="tb-tools">
            <Button tone="secondary" onClick={() => { const to = !top; setTop(to); if (to) stage.current?.top(); else stage.current?.home(); }} aria-pressed={top}>Top view</Button>
            <Button tone="secondary" onClick={() => { setTop(false); stage.current?.home(); }}>Front view</Button>
          </div>
          <p className="tb-hint">Tap a piece, then a violet dot. Drag the board to look around.</p>
        </section>

        <aside className="tb-lesson" id="lesson" aria-labelledby="lesson-title">
          {panel}
          {dock}
          <details className="tb-key">
            <summary>How to read the moves</summary>
            {copy.key}
          </details>
        </aside>
      </div>
    </main>

    <footer className="tb-foot">
      <p>{copy.foot}</p>
      <p><a href={SITE}>Brand Studio</a> · <a href={at('cube/')}>Cube</a> · <a href={at('chess/')}>Chess</a> · <a href={at('xiangqi/')}>Xiangqi</a></p>
    </footer>
    <p className="tb-sr" aria-live="polite">{live}</p>
  </div>;
}
