import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@brand-studio/ui';
import '@fontsource-variable/geist';
import '@fontsource/geist-mono';
import './cube.css';
import { allSolved, inverse, position, scramble as makeScramble, STAGES, teach, type Stage, type State, type Step, type Vec } from './cube-logic';
import { startCube, type CubeStage, type Label } from './cube-stage';
import { at, SITE } from './paths';

/** Plain words for each turn: the layer, then what its front does. */
const WORDS: Record<string, [string, string, string]> = {
  R: ['Right face', 'front column goes up', 'front column goes down'],
  L: ['Left face', 'front column goes down', 'front column goes up'],
  U: ['Top face', 'front row goes left', 'front row goes right'],
  D: ['Bottom face', 'front row goes right', 'front row goes left'],
  F: ['Front face', 'turns clockwise', 'turns anticlockwise'],
  B: ['Back face', 'top row goes left', 'top row goes right'],
  M: ['Middle column', 'front goes down', 'front goes up'],
  E: ['Middle row', 'front goes right', 'front goes left'],
  S: ['Middle slice', 'turns clockwise', 'turns anticlockwise'],
  x: ['Whole cube', 'front rolls up to the top', 'top rolls down to the front'],
  y: ['Whole cube', 'right side comes to the front', 'left side comes to the front'],
  z: ['Whole cube', 'top turns to the right', 'top turns to the left'],
};
const say = (move: string) => { const w = WORDS[move[0]]; return `${w[0]}, ${move.endsWith('2') ? 'half turn' : move.endsWith("'") ? w[2] : w[1]}`; };

interface Turn { stage: number; step: number; move: string; index: number }
interface Lesson { stages: Stage[]; turns: Turn[] }
const flatten = (stages: Stage[]): Turn[] => stages.flatMap((s, stage) => s.steps.flatMap((st, step) => st.moves.map((move, index) => ({ stage, step, move, index }))));

const params = new URLSearchParams(location.search);
// ?seed=N repeats one scramble; ?pace=0 runs every turn and pause at once, for tests and stills.
const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const random = params.has('seed') ? seeded(Number(params.get('seed'))) : Math.random;
const PACE = params.get('pace') === '0' ? 0 : 1;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms * PACE));

const FACES: [string, Vec][] = [['U', [0, 1, 0]], ['D', [0, -1, 0]], ['F', [0, 0, 1]], ['B', [0, 0, -1]], ['R', [1, 0, 0]], ['L', [-1, 0, 0]]];
const PARTS = [
  { key: 'corner', text: '8 corners', slot: [1, 1, -1] as Vec, offset: [0, 0.85, 0] as Vec },
  { key: 'edge', text: '12 edges', slot: [-1, 1, 1] as Vec, offset: [0, 0.85, 0] as Vec },
  { key: 'centre', text: '6 centres', slot: [1, 0, 0] as Vec, offset: [0.95, 0, 0] as Vec },
  { key: 'core', text: 'Core and springs', at: [-1.25, -0.3, 0] as Vec },
];

/** A cube seen corner on, its top layer a quarter turned: the Turnbook mark. */
const Mark = () => <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
  <path d="M16 13.5 27 19v8.5L16 32 5 27.5V19Z" fill="currentColor" opacity=".9" />
  <path d="m16 2.5 11 5v6l-11 5-11-5v-6Z" fill="var(--bs-accent)" transform="rotate(-8 16 10)" />
</svg>;

function Keycaps({ step, index }: { step: Step; index: number }) {
  const groups: { label: string; from: number; to: number }[] = [];
  const algLength = step.alg ? step.alg.split(' ').length : 0;
  if (step.alg && step.setup !== undefined && step.setup >= 0) {
    if (step.setup) groups.push({ label: 'Set up', from: 0, to: step.setup });
    const rounds = Math.floor((step.moves.length - step.setup) / algLength);
    for (let r = 0; r < rounds; r++) groups.push({ label: rounds > 1 ? `Algorithm, ${r + 1} of ${rounds}` : 'Algorithm', from: step.setup + r * algLength, to: step.setup + (r + 1) * algLength });
    const end = step.setup + rounds * algLength;
    if (end < step.moves.length) groups.push({ label: 'Then', from: end, to: step.moves.length });
  } else groups.push({ label: step.moves.length === 1 ? 'Turn' : 'Turns', from: 0, to: step.moves.length });
  return <div className="tb-caps">{groups.map(g => <div key={g.from} className="tb-group">
    <span className="tb-group__label">{g.label}</span>
    <ol>{step.moves.slice(g.from, g.to).map((m, k) => {
      const i = g.from + k;
      return <li key={i} className="tb-cap" data-state={i < index ? 'done' : i === index ? 'now' : undefined} aria-current={i === index ? 'step' : undefined}>{m}</li>;
    })}</ol>
  </div>)}</div>;
}

export function Turnbook() {
  const host = useRef<HTMLDivElement>(null), tags = useRef<(HTMLSpanElement | null)[]>([]), partTags = useRef<(HTMLSpanElement | null)[]>([]);
  const stage = useRef<CubeStage | null>(null);
  const [reduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [ready, setReady] = useState(false);
  const [isSolved, setSolved] = useState(true);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apart, setApart] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [mixed, setMixed] = useState<string[] | null>(null);
  const [note, setNote] = useState('');
  const [live, setLive] = useState('');

  // The stage reports every finished turn; these refs let its one handler see the latest lesson.
  const lessonRef = useRef<Lesson | null>(null), cursorRef = useRef(0), playingRef = useRef(false), scrambled = useRef(false);
  const pending = useRef<('next' | 'back' | 'scramble' | 'user')[]>([]);
  const setLessonBoth = (l: Lesson | null) => { lessonRef.current = l; setLesson(l); cursorRef.current = 0; setCursor(0); };

  // Every example shares one index.html, so this page names itself.
  useEffect(() => { document.title = 'Turnbook | Solve a 3x3 cube in seven stages'; }, []);

  useEffect(() => {
    let first = true;
    const s = startCube(host.current!, {
      reduced,
      accent: getComputedStyle(host.current!).getPropertyValue('--bs-accent').trim() || '#5b3df5',
      onFrame: () => { if (first) { first = false; setReady(true); } },
      onMove: (move, state, source) => {
        const kind = source === 'drag' ? 'user' : pending.current.shift() ?? 'user';
        const done = allSolved(state);
        setSolved(done);
        host.current?.toggleAttribute('data-solved', done);
        if (kind === 'scramble') return;
        if (kind === 'next' || kind === 'back') {
          cursorRef.current += kind === 'next' ? 1 : -1;
          setCursor(cursorRef.current);
          setLive(`${move}: ${say(move)}.`);
        } else {
          setLive(`You turned ${move}: ${say(move)}.`);
          const l = lessonRef.current;
          if (l) {
            playingRef.current = false; setPlaying(false);
            // Mid-lesson, start again from the new state; after the lesson, or once solved by hand, go back to the stage list.
            if (cursorRef.current < l.turns.length && !done) {
              const stages = teach(state);
              setLessonBoth({ stages, turns: flatten(stages) });
              setNote('You turned the cube, so the lesson starts again from here.');
            } else setLessonBoth(null);
          }
        }
        if (done && scrambled.current) {
          scrambled.current = false;
          setNote('');
          setLive('Solved.');
          if (!reduced && PACE) void s.spin();
        }
      },
    });
    stage.current = s;
    // Dev builds expose the stage so drag checks can aim at a sticker.
    if (import.meta.env.DEV) Object.assign(window, { turnbook: s });
    s.setLabels(FACES.map(([, n], i) => ({ el: tags.current[i]!, at: [n[0] * 1.53, n[1] * 1.53, n[2] * 1.53], facing: n })));
    host.current!.toggleAttribute('data-solved', true);
    // The pieces gather from apart on load.
    if (!reduced && PACE) { void s.apart(1, 0); void s.apart(0, 1400); }
    return () => { s.stop(); stage.current = null; };
  }, [reduced]);

  // Light the next turn: an arc on its layer, and only the pieces this step moves keep their colour.
  useEffect(() => {
    const s = stage.current, turn = lesson?.turns[cursor];
    if (!s) return;
    s.setArrow(turn && !apart ? turn.move : null);
    s.setFocus(turn && !apart ? lesson!.stages[turn.stage].steps[turn.step].pieces : null);
  }, [lesson, cursor, apart]);

  const pause = () => { playingRef.current = false; setPlaying(false); };

  async function next(duration?: number) {
    const turn = lessonRef.current?.turns[cursorRef.current];
    if (!turn || !stage.current) return;
    setMoving(true);
    pending.current.push('next');
    await stage.current.turn(turn.move, { duration: PACE ? duration : 0 });
    setMoving(false);
  }

  async function back() {
    const turn = lessonRef.current?.turns[cursorRef.current - 1];
    if (!turn || !stage.current) return;
    pause();
    setMoving(true);
    pending.current.push('back');
    await stage.current.turn(inverse(turn.move), { duration: PACE ? undefined : 0 });
    setMoving(false);
  }

  /** Plays to the end of the stage, pausing between steps so each one can be read, then stops. */
  async function play(fast = false) {
    const l = lessonRef.current;
    if (!l || playingRef.current) return;
    playingRef.current = true; setPlaying(true);
    stage.current?.home();
    while (playingRef.current && cursorRef.current < l.turns.length) {
      const before = l.turns[cursorRef.current];
      await next(fast ? 70 : undefined);
      const after = l.turns[cursorRef.current];
      if (!after || after.stage !== before.stage) break;
      if (!fast) await wait(after.step !== before.step ? 800 : 160);
    }
    pause();
  }

  async function shuffle() {
    const s = stage.current;
    if (!s) return;
    pause();
    setLessonBoth(null);
    setNote('');
    if (apart) await toggleApart();
    const moves = makeScramble(20, random);
    setBusy(true);
    s.home();
    for (const m of moves) { pending.current.push('scramble'); void s.turn(m, { duration: PACE ? 110 : 0 }); }
    await s.settle();
    scrambled.current = true;
    setMixed(moves);
    setBusy(false);
    setLive(`Scrambled with ${moves.join(' ')}.`);
  }

  function startLesson() {
    const s = stage.current;
    if (!s || allSolved(s.state)) return;
    setNote('');
    const stages = teach(s.state);
    setLessonBoth({ stages, turns: flatten(stages) });
    s.home();
    jumpToLesson.current = true;
  }

  // On a phone the lesson starts below the cube: bring its first line up under the cube once the layout has changed.
  const jumpToLesson = useRef(false);
  useEffect(() => {
    if (!jumpToLesson.current) return;
    jumpToLesson.current = false;
    if (matchMedia('(max-width: 859px)').matches) document.getElementById('lesson')?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }, [lesson, reduced]);

  async function toggleApart() {
    const s = stage.current;
    if (!s) return;
    pause();
    const to = !apart;
    setApart(to);
    if (to) {
      // Label the pieces that stand in these spots right now, so the labels follow them out.
      s.setLabels(PARTS.map((p, i) => ({ el: partTags.current[i]!, ...(p.slot ? { piece: findPiece(s.state, p.slot), offset: p.offset } : { at: p.at }) })));
      s.home();
      await s.apart(1);
    } else {
      await s.apart(0);
      s.setLabels(FACES.map(([, n], i) => ({ el: tags.current[i]!, at: [n[0] * 1.53, n[1] * 1.53, n[2] * 1.53], facing: n })));
    }
  }

  function userTurn(move: string) {
    const s = stage.current;
    if (!s || apart || busy) return;
    pending.current.push('user');
    void s.turn(move);
  }

  function onKey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (/^[rludfbmes]$/.test(k)) { e.preventDefault(); userTurn(k.toUpperCase() + (e.shiftKey ? "'" : '')); }
    else if (/^[xyz]$/.test(k)) { e.preventDefault(); userTurn(k + (e.shiftKey ? "'" : '')); }
    else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      stage.current?.look(e.key === 'ArrowLeft' ? 0.2 : e.key === 'ArrowRight' ? -0.2 : 0, e.key === 'ArrowUp' ? -0.15 : e.key === 'ArrowDown' ? 0.15 : 0);
    } else if (e.key === 'Home') { e.preventDefault(); stage.current?.home(); }
  }

  const turn = lesson?.turns[cursor];
  const finished = lesson && cursor >= lesson.turns.length;
  const current = turn && lesson!.stages[turn.stage], step = turn && current!.steps[turn.step];
  const locked = busy || apart;

  let panel: ReactNode;
  if (apart) panel = <>
    <h2 id="lesson-title">Inside the cube</h2>
    <dl className="tb-parts">
      <div><dt>6 centres</dt><dd>One colour each. They are fixed to the core, so they spin in place and never change places.</dd></div>
      <div><dt>12 edges</dt><dd>Two colours each.</dd></div>
      <div><dt>8 corners</dt><dd>Three colours each.</dd></div>
      <div><dt>The core</dt><dd>Three crossed axes. A spring on each arm pulls its centre inward and keeps the layers snug.</dd></div>
    </dl>
    <p>Each edge and corner has a hidden tab that reaches under the pieces beside it. The tabs hold the cube together while any layer turns.</p>
    <p className="tb-fact"><strong>43,252,003,274,489,856,000</strong> arrangements are possible with face turns. Each one can be solved in 20 turns or fewer, as proved in 2010.</p>
    <div className="tb-actions"><Button onClick={() => void toggleApart()}>Put it back together</Button></div>
    <p className="tb-source">Facts from <a href="https://en.wikipedia.org/wiki/Rubik%27s_Cube">Wikipedia’s article on the cube</a>.</p>
  </>;
  else if (!lesson) panel = <>
    <h2 id="lesson-title">The seven stages</h2>
    <p className="tb-lede">{isSolved ? 'Scramble the cube, or hold your own cube white on top and green in front and copy each turn.' : 'The lesson starts from the cube as it is now.'}</p>
    <ol className="tb-stages">{STAGES.map((s, i) => <li key={s.key}><span className="tb-num">{i + 1}</span><span><b>{s.title}</b><span>{s.goal}</span></span></li>)}</ol>
    <div className="tb-actions">
      {isSolved
        ? <Button onClick={() => void shuffle()} disabled={busy}>Scramble the cube</Button>
        : <><Button onClick={startLesson} disabled={busy}>Teach me from here</Button><Button tone="secondary" onClick={() => void shuffle()} disabled={busy}>Scramble again</Button></>}
    </div>
    {mixed && !isSolved && <p className="tb-source">Scramble: <code>{mixed.join(' ')}</code></p>}
  </>;
  else if (finished) panel = <>
    <h2 id="lesson-title">Solved</h2>
    <p className="tb-lede">The lesson took {lesson.turns.length} turns across seven stages.</p>
    <ol className="tb-stages tb-stages--done">{STAGES.map((s, i) => <li key={s.key} data-state="done"><span className="tb-num">{i + 1}</span><span><b>{s.title}</b></span></li>)}</ol>
    <div className="tb-actions"><Button onClick={() => void shuffle()} disabled={busy}>Scramble again</Button></div>
  </>;
  else panel = <>
    <p className="tb-kicker">Stage {turn!.stage + 1} of 7</p>
    <h2 id="lesson-title">{current!.title}</h2>
    <ol className="tb-meter" aria-hidden="true">{STAGES.map((s, i) => <li key={s.key} data-state={i < turn!.stage ? 'done' : i === turn!.stage ? 'now' : undefined} />)}</ol>
    <p className="tb-goal">{current!.goal}</p>
    {note && <p className="tb-note" role="status">{note}</p>}
    <div className="tb-step">
      <p className="tb-step__count">Step {turn!.step + 1} of {current!.steps.length}</p>
      <p className="tb-step__text">{step!.text}</p>
      <Keycaps step={step!} index={turn!.index} />
    </div>
    {/* On a phone this dock sits at the bottom edge, so the next turn and its buttons stay in reach under the cube. */}
    <div className="tb-dock">
      <p className="tb-next"><kbd>{turn!.move}</kbd><span>{say(turn!.move)}</span></p>
      <div className="tb-controls">
        <Button tone="secondary" onClick={() => void back()} disabled={cursor === 0 || moving || playing}>Back</Button>
        <Button onClick={() => playing ? pause() : void play()}>{playing ? 'Pause' : 'Play stage'}</Button>
        <Button tone="secondary" onClick={() => void next()} disabled={moving || playing}>Next turn</Button>
      </div>
    </div>
    <button type="button" className="tb-skip" onClick={() => void play(true)} disabled={playing}>{turn!.stage < 6 ? `Skip to stage ${turn!.stage + 2}` : 'Finish the solve'}</button>
    <ol className="tb-stages tb-stages--compact">{STAGES.map((s, i) => <li key={s.key} data-state={i < turn!.stage ? 'done' : i === turn!.stage ? 'now' : undefined}><span className="tb-num">{i + 1}</span><span><b>{s.title}</b></span></li>)}</ol>
  </>;

  return <div className="tb">
    <header className="tb-bar">
      <a className="tb-mark" href="#main"><Mark /><span>Turnbook</span></a>
      <p>A lesson for the 3x3 cube</p>
      <a className="tb-home" href={SITE}>Brand Studio</a>
    </header>

    <main id="main">
      <section className="tb-hero" aria-labelledby="hero-title">
        <h1 id="hero-title">Solve a 3x3 cube in seven stages.</h1>
        <p>Scramble the cube, then copy the lesson one turn at a time. A violet arrow marks each turn on the cube before it happens.</p>
      </section>

      <div className="tb-work" data-lesson={lesson && !finished ? '' : undefined}>
        <section className="tb-stage" aria-label="Cube">
          <div ref={host} className="tb-canvas" data-ready={ready || undefined} data-apart={apart || undefined} tabIndex={0} role="application"
            aria-label="Cube. Press R, L, U, D, F or B to turn a face, with Shift to turn it back. Arrow keys look around."
            onKeyDown={onKey}>
            {FACES.map(([f], i) => <span key={f} ref={el => { tags.current[i] = el; }} className="tb-tag" aria-hidden="true" hidden={apart}>{f}</span>)}
            {PARTS.map((p, i) => <span key={p.key} ref={el => { partTags.current[i] = el; }} className="tb-part" aria-hidden="true" hidden={!apart}>{p.text}</span>)}
          </div>
          <div className="tb-tools">
            <Button tone="secondary" onClick={() => void shuffle()} disabled={locked}>Scramble</Button>
            <Button tone="secondary" onClick={() => void toggleApart()} disabled={busy} aria-pressed={apart}>{apart ? 'Put it together' : 'Take it apart'}</Button>
            <Button tone="secondary" onClick={() => stage.current?.home()}>Front view</Button>
          </div>
          <div className="tb-pad" role="group" aria-label="Turn a face">
            {['R', 'L', 'U', 'D', 'F', 'B'].map(f => { const m = f + (reverse ? "'" : ''); return <button key={f} type="button" onClick={() => userTurn(m)} disabled={locked} aria-label={`${m}: ${say(m)}`}>{m}</button>; })}
            <button type="button" className="tb-pad__back" onClick={() => setReverse(r => !r)} aria-pressed={reverse}>Turn back</button>
          </div>
          <p className="tb-hint">Drag a piece to turn its layer, or drag beside the cube to look around.</p>
        </section>

        <aside className="tb-lesson" id="lesson" aria-labelledby="lesson-title">
          {panel}
          <details className="tb-key">
            <summary>How to read the turns</summary>
            <p>Each letter names a face as you hold the cube. A letter alone turns that face clockwise as you look at it; <kbd>'</kbd> turns it back, and <kbd>2</kbd> turns it twice.</p>
            <table>
              <tbody>{['R', 'L', 'U', 'D', 'F', 'B', 'y'].map(f => <tr key={f}>
                <th scope="row"><kbd>{f}</kbd></th>
                <td>{say(f)}{f === 'y' && <span className="tb-muted"> (x and z turn the whole cube like R and F)</span>}</td>
                <td>{[f, f.length === 1 ? f + "'" : f].map(m => <Fragment key={m}><button type="button" className="tb-try" onClick={() => userTurn(m)} disabled={locked || !!lesson}>{m}</button></Fragment>)}</td>
              </tr>)}</tbody>
            </table>
          </details>
        </aside>
      </div>
    </main>

    <footer className="tb-foot">
      <p>Turnbook is a fictional lesson made for a Brand Studio showcase. The cube is drawn in code and carries no maker’s marks. The method is the layer-by-layer beginner method, with its algorithms as <a href="https://ruwix.com/the-rubiks-cube/how-to-solve-the-rubiks-cube-beginners-method/">Ruwix</a> teaches them.</p>
      <p><a href={SITE}>Brand Studio</a> · <a href={at('/')}>Editions</a> · <a href={at('camera/')}>Halden</a> · <a href={at('sneaker/')}>Nuvelo</a> · <a href={at('deskhand/')}>Deskhand</a></p>
    </footer>
    <p className="tb-sr" aria-live="polite">{live}</p>
  </div>;
}

function findPiece(state: State, slot: Vec) {
  for (let i = 0; i < 26; i++) { const p = position(state, i); if (p[0] === slot[0] && p[1] === slot[1] && p[2] === slot[2]) return i; }
  return 0;
}
