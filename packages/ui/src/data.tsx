"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';

export interface TableColumn<Row> {
  key: string;
  header: string;
  /** Renders the cell. Without it the cell shows `row[key]` as text. */
  cell?: (row: Row) => ReactNode;
  /** Makes the column sortable by the value it returns. */
  sortValue?: (row: Row) => string | number;
  align?: 'start' | 'end';
}

type Sort = { key: string; direction: 'ascending' | 'descending' };

/**
 * A table with a caption, sortable columns, loading rows and an empty message. It scrolls sideways inside its own
 * frame on narrow screens, and the frame takes keyboard focus so the scroll works without a mouse.
 */
export function DataTable<Row extends object>({ caption, columns, rows, rowKey, loading = false, empty = 'Nothing to show yet.', hideCaption = false, className = '' }: {
  caption: string; columns: TableColumn<Row>[]; rows: Row[]; rowKey: (row: Row) => string;
  loading?: boolean; empty?: ReactNode; hideCaption?: boolean; className?: string;
}) {
  const id = useId();
  const [sort, setSort] = useState<Sort | null>(null);
  const sortColumn = sort && columns.find(column => column.key === sort.key);
  const sorted = sortColumn?.sortValue ? [...rows].sort((a, b) => {
    const x = sortColumn.sortValue!(a), y = sortColumn.sortValue!(b);
    const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return sort!.direction === 'ascending' ? order : -order;
  }) : rows;
  const toggle = (key: string) => setSort(current => ({ key, direction: current?.key === key && current.direction === 'ascending' ? 'descending' : 'ascending' }));

  return <div className={`bs-table ${className}`} role="region" aria-labelledby={`${id}-caption`} tabIndex={0}>
    <table aria-busy={loading || undefined}>
      <caption id={`${id}-caption`} className={hideCaption ? 'bs-sr-only' : 'bs-table__caption'}>{caption}</caption>
      <thead><tr>
        {columns.map(column => <th key={column.key} scope="col" data-align={column.align} aria-sort={sort?.key === column.key ? sort.direction : undefined}>
          {column.sortValue
            ? <button type="button" className="bs-table__sort" onClick={() => toggle(column.key)}>{column.header}<span className="bs-table__arrow" aria-hidden="true" /></button>
            : column.header}
        </th>)}
      </tr></thead>
      <tbody>
        {loading
          ? Array.from({ length: 3 }, (_, index) => <tr key={index} className="bs-table__loading">{columns.map(column => <td key={column.key}><span className="bs-skeleton__line" /></td>)}</tr>)
          : sorted.length === 0
            ? <tr><td colSpan={columns.length} className="bs-table__empty">{empty}</td></tr>
            : sorted.map(row => <tr key={rowKey(row)}>
              {columns.map(column => <td key={column.key} data-align={column.align}>{column.cell ? column.cell(row) : String((row as Record<string, unknown>)[column.key] ?? '')}</td>)}
            </tr>)}
      </tbody>
    </table>
  </div>;
}

/** Points for a sparkline in a 100 × 32 box, lowest value at the bottom. */
function sparkline(series: number[]) {
  const min = Math.min(...series), span = Math.max(...series) - min || 1;
  return series.map((value, index) => `${(index / (series.length - 1) * 100).toFixed(2)},${(30 - (value - min) / span * 28).toFixed(2)}`).join(' ');
}

const trendWords = { up: 'Up', down: 'Down', flat: 'No change' } as const;

/** One number that matters, with its change and an optional sparkline. The change is written in words as well as shown by the arrow. */
export function StatCard({ label, value, change, trend = 'flat', note, series, className = '' }: {
  label: string; value: ReactNode; change?: string; trend?: 'up' | 'down' | 'flat'; note?: ReactNode; series?: number[]; className?: string;
}) {
  const points = series && series.length > 1 ? sparkline(series) : null;
  return <div className={`bs-stat ${className}`}>
    <div className="bs-stat__top">
      <p className="bs-stat__label">{label}</p>
      {change && <p className="bs-stat__change" data-trend={trend}><span className="bs-stat__arrow" aria-hidden="true" /><span className="bs-sr-only">{trendWords[trend]} </span>{change}</p>}
    </div>
    <p className="bs-stat__value">{value}</p>
    {note && <p className="bs-stat__note">{note}</p>}
    {points && <svg className="bs-stat__spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,32 ${points} 100,32`} className="bs-stat__area" />
      <polyline points={points} className="bs-stat__line" />
    </svg>}
  </div>;
}

export interface ChartSeries {
  name: string;
  /** One value per label. `null` leaves a gap. */
  values: (number | null)[];
}

const plainNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const isValue = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Axis values that cover `low` to `high` in round steps of 1, 2 or 5. */
function axis(low: number, high: number) {
  const rough = (high - low || Math.abs(high) || 1) / 4, power = 10 ** Math.floor(Math.log10(rough)), unit = rough / power;
  const step = (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power, first = Math.floor(low / step) * step, ticks = [first];
  while (ticks[ticks.length - 1] < high - step * 1e-9 || ticks.length < 2) ticks.push(Number((first + ticks.length * step).toPrecision(12)));
  return ticks;
}

/**
 * A bar, line or area chart that reads at phone width. Every value is also in a table for screen readers. Pointing, dragging
 * or the arrow keys read out one point at a time; until then the chart shows `note`, the one thing to take from it.
 */
export function Chart({ title, labels, series, kind = 'bar', lit, note, format = plainNumber.format, empty = 'Nothing to chart yet.', noValueLabel = 'No value', keysLabel = 'Use the arrow keys to read each point', hideTitle = false, className = '' }: {
  title: string; labels: string[]; series: ChartSeries[]; kind?: 'bar' | 'line' | 'area';
  /** The name of the series to draw in the accent. With one series it can name a label, and that point alone takes the accent. */
  lit?: string;
  note?: ReactNode; format?: (value: number) => string; empty?: ReactNode;
  noValueLabel?: string; keysLabel?: string; hideTitle?: boolean; className?: string;
}) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const count = labels.length, values = series.flatMap(item => item.values.slice(0, count)).filter(isValue);
  // Labels under the plot are thinned to what fits. Before the page can measure them their width is judged from their length, for a narrow phone.
  const names = labels.join('\n'), bottom = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ names: '', room: '' });
  useEffect(() => {
    const node = bottom.current, card = node?.closest('.bs-chart');
    if (!node || !card || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const range = document.createRange(), box = node.getBoundingClientRect(), edge = card.getBoundingClientRect();
      const widest = Math.max(...[...node.children].map(child => { range.selectNodeContents(child); return range.getBoundingClientRect().width; }));
      if (!box.width) return;
      // A label sits under the middle of its point, so one near either end shows only where its whole text stays on the card.
      const slot = box.width / count, inside = (index: number) => box.left + (index + .5) * slot - widest / 2 >= edge.left + 4 && box.left + (index + .5) * slot + widest / 2 <= edge.right - 4;
      let first = 0, last = count - 1;
      while (first < last && !inside(first)) first++;
      while (last > first && !inside(last)) last--;
      const room = `${Math.max(1, Math.ceil((widest + 8) / slot))} ${first} ${last}`;
      setFit(was => was.names === names && was.room === room ? was : { names, room });
    };
    const watch = new ResizeObserver(measure);
    watch.observe(node);
    return () => watch.disconnect();
  }, [count, names]);
  const [step, first, last] = fit.names === names ? fit.room.split(' ').map(Number) : [Math.max(1, Math.ceil(count * (Math.max(0, ...labels.map(label => label.length)) * .55 + .5) * .75 / 13)), 0, count - 1];
  const heading =<figcaption id={`${id}-title`} className={hideTitle ? 'bs-sr-only' : 'bs-chart__title'}>{title}</figcaption>;
  if (!count || !values.length) return <figure className={`bs-chart ${className}`} aria-labelledby={`${id}-title`}>{heading}<p className="bs-chart__empty">{empty}</p></figure>;

  // Bars and areas are measured from zero, so zero is always on their axis. A line may start anywhere.
  const zero = kind !== 'line', ticks = axis(Math.min(zero ? 0 : Infinity, ...values), Math.max(zero ? 0 : -Infinity, ...values));
  const low = ticks[0], span = ticks[ticks.length - 1] - low, base = Math.min(Math.max(0, low), low + span);
  const x = (index: number) => (index + .5) / count * 100, y = (value: number) => (1 - (value - low) / span) * 100;
  const litSeries = series.findIndex(item => item.name === lit), litLabel = series.length === 1 && lit !== undefined ? labels.indexOf(lit) : -1;
  // Tone 0 is the accent, 1 the ink and 2 the quiet one. The lit series takes the accent and the others keep their order.
  const tone = (index: number) => litLabel >= 0 ? 2 : (litSeries < 0 ? index : index === litSeries ? 0 : index < litSeries ? index + 1 : index) % 3;
  const said = (item: ChartSeries, index: number) => isValue(item.values[index]) ? format(item.values[index]) : noValueLabel;

  const point = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setActive(Math.max(0, Math.min(count - 1, Math.floor((event.clientX - box.left) / box.width * count))));
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = event.key === 'ArrowRight' ? Math.min(count - 1, (active ?? -1) + 1) : event.key === 'ArrowLeft' ? Math.max(0, (active ?? count) - 1)
      : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : event.key === 'Escape' ? null : undefined;
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
  };
  // One path per series; a missing value ends the stroke and the next value starts a new one.
  const stroke = (item: ChartSeries) => labels.map((_, index) => isValue(item.values[index]) ? `${isValue(item.values[index - 1]) && index ? 'L' : 'M'}${x(index).toFixed(2)} ${y(item.values[index]).toFixed(2)}` : '').join('');
  const fill = (item: ChartSeries) => stroke(item).split('M').filter(Boolean).map(run => { const points = run.split('L'); return `M${points[0].split(' ')[0]} ${y(base).toFixed(2)}L${run}L${points[points.length - 1].split(' ')[0]} ${y(base).toFixed(2)}Z`; }).join('');

  return <figure className={`bs-chart ${className}`} data-kind={kind} aria-labelledby={`${id}-title`}>
    <div className="bs-chart__head">
      {heading}
      {series.length > 1 && <ul className="bs-chart__legend">{series.map((item, index) => <li key={index}><span className="bs-chart__key" data-tone={tone(index)} />{item.name}</li>)}</ul>}
    </div>
    <div className="bs-chart__readout">
      <p data-off={active !== null || undefined}>{note}</p>
      <p id={`${id}-readout`} role="status">{active !== null && <><strong>{labels[active]}</strong>{series.map((item, index) => <span key={index}>{series.length > 1 && `${item.name} `}{said(item, active)}</span>)}</>}</p>
    </div>
    <div className="bs-chart__frame" style={{ '--bs-chart-count': count, '--bs-chart-series': series.length } as CSSProperties}>
      <div className="bs-chart__y" aria-hidden="true">{[...ticks].reverse().map(tick => <span key={tick}>{format(tick)}</span>)}</div>
      <div className="bs-chart__plot" role="group" tabIndex={0} aria-label={`${title}. ${keysLabel}`} aria-describedby={`${id}-readout`} data-active={active !== null || undefined}
        onPointerDown={point} onPointerMove={point} onPointerLeave={event => { if (event.pointerType === 'mouse') setActive(null); }} onKeyDown={key} onBlur={() => setActive(null)}>
        {ticks.map(tick => <span key={tick} className="bs-chart__rule" data-zero={tick === 0 || undefined} style={{ top: `${y(tick)}%` }} />)}
        {kind === 'bar'
          ? <div className="bs-chart__bars">{labels.map((_, index) => <div key={index} className="bs-chart__slot" data-on={active === index || undefined}>
            {series.map((item, at) => { const value = item.values[index]; return isValue(value) && <span key={at} className="bs-chart__bar" data-tone={index === litLabel ? 0 : tone(at)} data-down={value < 0 || undefined} style={{ top: `${y(Math.max(value, base))}%`, height: `${Math.abs(value - base) / span * 100}%` }} />; })}
          </div>)}</div>
          : <svg className="bs-chart__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {kind === 'area' && series.map((item, at) => tone(at) === 0 && <path key={at} className="bs-chart__area" d={fill(item)} />)}
            {series.map((item, at) => <path key={at} className="bs-chart__line" data-tone={tone(at)} d={stroke(item)} />)}
          </svg>}
        {kind !== 'bar' && active !== null && <span className="bs-chart__cursor" style={{ left: `${x(active)}%` }} />}
        {kind !== 'bar' && series.map((item, at) => { const index = active ?? (at === Math.max(0, litSeries) ? labels.indexOf(lit ?? '') : -1), value = item.values[index]; return isValue(value) && <span key={at} className="bs-chart__dot" data-tone={tone(at)} style={{ left: `${x(index)}%`, top: `${y(value)}%` }} />; })}
      </div>
      <div ref={bottom} className="bs-chart__x" aria-hidden="true">{labels.map((label, index) => <span key={index} data-show={(index >= first && index <= last && (index - first) % step === 0) || undefined}>{label}</span>)}</div>
    </div>
    <table className="bs-sr-only" aria-labelledby={`${id}-title`}>
      <thead><tr><td />{series.map((item, index) => <th key={index} scope="col">{item.name}</th>)}</tr></thead>
      <tbody>{labels.map((label, index) => <tr key={index}><th scope="row">{label}</th>{series.map((item, at) => <td key={at}>{said(item, index)}</td>)}</tr>)}</tbody>
    </table>
  </figure>;
}

export interface FlowNode {
  id: string; label: string;
  /** A second line under the label. */
  note?: string;
  /** Who or what does this step, such as "Agent" or "You". */
  tag?: string;
  /** A decision is drawn as a pill, a step as a box. */
  kind?: 'step' | 'decision';
}
export interface FlowEdge { from: string; to: string; label?: string }

/**
 * Places every node. A node's rank is its longest path from a start, so every link points forward except a loop back,
 * which is kept and drawn against the flow. A link that skips ranks gets an empty cell in each rank it crosses, so it
 * has a lane of its own instead of running under a node. Each rank is ordered by where its links come from.
 */
function arrange(nodes: FlowNode[], edges: FlowEdge[]) {
  const ids = new Map(nodes.map((node, index) => [node.id, index]));
  const links = edges.flatMap(edge => { const a = ids.get(edge.from), b = ids.get(edge.to); return a === undefined || b === undefined || a === b ? [] : [{ a, b, label: edge.label }]; });
  const out = nodes.map((_, index) => links.flatMap((link, at) => link.a === index ? [at] : [])), state = nodes.map(() => 0), back = new Set<number>();
  // A walk from each start marks the links that return to a node still being walked: those are the loops.
  for (let start = 0; start < nodes.length; start++) {
    if (state[start]) continue;
    const trail = [{ node: start, next: 0 }];
    state[start] = 1;
    while (trail.length) {
      const top = trail[trail.length - 1], at = out[top.node][top.next++];
      if (at === undefined) { state[top.node] = 2; trail.pop(); continue; }
      const to = links[at].b;
      if (state[to] === 1) back.add(at);
      else if (!state[to]) { state[to] = 1; trail.push({ node: to, next: 0 }); }
    }
  }
  const rank = nodes.map(() => 0);
  for (let round = 0; round < nodes.length; round++) links.forEach((link, at) => { if (!back.has(at)) rank[link.b] = Math.max(rank[link.b], rank[link.a] + 1); });

  const cells: { rank: number; node: number | null }[] = nodes.map((_, index) => ({ rank: rank[index], node: index }));
  const routes = links.map((link, at) => {
    const loop = back.has(at), low = loop ? link.b : link.a, high = loop ? link.a : link.b, path = [low];
    for (let level = rank[low] + 1; level < rank[high]; level++) path.push(cells.push({ rank: level, node: null }) - 1);
    return { path: [...path, high], loop, label: link.label, from: link.a, to: link.b };
  });
  const depth = Math.max(...cells.map(cell => cell.rank)) + 1, rows = Array.from({ length: depth }, (_, level) => cells.flatMap((cell, index) => cell.rank === level ? [index] : []));
  const place = cells.map(() => .5);
  rows.forEach(row => {
    const from = (cell: number) => { const above = routes.flatMap(route => route.path.flatMap((item, at) => at && item === cell ? [place[route.path[at - 1]]] : [])); return above.length ? above.reduce((sum, value) => sum + value, 0) / above.length : .5; };
    const pull = new Map(row.map(cell => [cell, from(cell)]));
    row.sort((a, b) => pull.get(a)! - pull.get(b)!);
    row.forEach((cell, at) => { place[cell] = (at + .5) / row.length; });
  });
  const widest = Math.max(...rows.map(row => row.length));
  // Lanes are half a node wide, so a rank with fewer nodes sits centred against a fuller one.
  const lane = cells.map(() => 1);
  rows.forEach(row => row.forEach((cell, at) => { lane[cell] = widest - row.length + at * 2 + 1; }));
  return { cells, routes, order: rows.flat(), lane, depth, lanes: widest * 2 };
}

interface FlowLine { d: string; head: string; lit: boolean; loop: boolean; label?: string; x: number; y: number }

/**
 * Steps and decisions joined by arrows. It runs top to bottom on a narrow screen and left to right when there is room.
 * Every node is in the HTML in reading order with its next steps written out; the arrows are drawn once the nodes
 * have a size. `lit` marks the path taken.
 */
export function FlowDiagram({ title, nodes, edges, lit, nextLabel = 'Next', hideTitle = false, className = '' }: {
  title: string; nodes: FlowNode[]; edges: FlowEdge[];
  /** Ids of the nodes on the path to highlight. A link is lit when both its ends are. */
  lit?: string[];
  nextLabel?: string; hideTitle?: boolean; className?: string;
}) {
  const id = useId(), shape = JSON.stringify([nodes.map(node => node.id), edges]), path = lit?.join('\n') ?? '';
  const plan = useMemo(() => arrange(nodes, edges), [shape]);
  const frame = useRef<HTMLDivElement>(null), items = useRef<(HTMLLIElement | null)[]>([]);
  const [lines, setLines] = useState<FlowLine[]>([]);

  useEffect(() => {
    const root = frame.current;
    if (!root) return;
    const draw = () => {
      const origin = root.getBoundingClientRect(), across = getComputedStyle(root).getPropertyValue('--bs-flow-across').trim() === '1', on = new Set(path ? path.split('\n') : []);
      const boxes = plan.cells.map((_, index) => { const box = items.current[index]!.getBoundingClientRect(); return { left: box.left - origin.left, right: box.right - origin.left, top: box.top - origin.top, bottom: box.bottom - origin.top, x: box.left - origin.left + box.width / 2, y: box.top - origin.top + box.height / 2 }; });
      const round = (value: number) => Math.round(value * 10) / 10;
      setLines(plan.routes.map(route => {
        // Each link leaves the end of one cell and enters the start of the next, in the direction the diagram runs.
        const ends = route.path.map((cell, at) => {
          const box = boxes[cell], beside = boxes[route.path[at ? at - 1 : 1]];
          // A loop shares its two nodes with links that run the other way, so it meets a box a quarter of the way along the side. A decision has round ends and keeps the middle.
          const apart = route.loop && (at === 0 || at === route.path.length - 1) && nodes[plan.cells[cell].node ?? -1]?.kind !== 'decision';
          const shift = !apart ? 0 : across ? (box.bottom - box.top) / 4 * (beside.y < box.y ? -1 : 1) : (box.right - box.left) / 4 * (beside.x < box.x ? -1 : 1);
          return across ? { in: [box.left, box.y + shift], out: [box.right, box.y + shift] } : { in: [box.x + shift, box.top], out: [box.x + shift, box.bottom] };
        }) as { in: [number, number]; out: [number, number] }[];
        let d = `M${ends[0].out.map(round)}`;
        for (let at = 1; at < ends.length; at++) {
          const [fx, fy] = ends[at - 1].out, [tx, ty] = ends[at].in, mx = (fx + tx) / 2, my = (fy + ty) / 2;
          d += across ? `C${round(mx)},${round(fy)} ${round(mx)},${round(ty)} ${round(tx)},${round(ty)}` : `C${round(fx)},${round(my)} ${round(tx)},${round(my)} ${round(tx)},${round(ty)}`;
          if (at < ends.length - 1) d += `L${ends[at].out.map(round)}`;
        }
        // The arrowhead sits where the link arrives. A loop arrives at the earlier node, against the flow.
        const [hx, hy] = route.loop ? ends[0].out : ends[ends.length - 1].in, back = route.loop ? -1 : 1;
        const head = across ? `M${round(hx)},${round(hy)}l${-8 * back},-4.5v9z` : `M${round(hx)},${round(hy)}l-4.5,${-8 * back}h9z`;
        // The label sits on the first stretch after the node that the link leaves.
        const hop = route.loop ? ends.length - 1 : 1, [ax, ay] = ends[hop - 1].out, [bx, by] = ends[hop].in;
        return { d, head, loop: route.loop, lit: on.has(nodes[route.from].id) && on.has(nodes[route.to].id), label: route.label, x: round((ax + bx) / 2), y: round((ay + by) / 2) };
      }));
    };
    draw();
    const watch = new ResizeObserver(draw);
    watch.observe(root);
    return () => watch.disconnect();
  }, [plan, path]);

  const on = new Set(lit);
  return <figure className={`bs-flow ${className}`} aria-labelledby={`${id}-title`}>
    <figcaption id={`${id}-title`} className={hideTitle ? 'bs-sr-only' : 'bs-flow__title'}>{title}</figcaption>
    <div className="bs-flow__frame" ref={frame} data-fit={plan.depth <= 3 ? 'short' : plan.depth <= 5 ? 'medium' : 'long'} style={{ '--bs-flow-lanes': plan.lanes, '--bs-flow-depth': plan.depth } as CSSProperties}>
      <svg className="bs-flow__links" aria-hidden="true">{lines.map((line, index) => <g key={index} data-lit={line.lit || undefined} data-loop={line.loop || undefined}><path className="bs-flow__link" d={line.d} /><path className="bs-flow__head" d={line.head} /></g>)}</svg>
      <ol className="bs-flow__nodes">{plan.order.map(index => {
        const cell = plan.cells[index], place = { '--bs-flow-rank': cell.rank + 1, '--bs-flow-lane': plan.lane[index] } as CSSProperties;
        if (cell.node === null) return <li key={index} ref={element => { items.current[index] = element; }} className="bs-flow__gap" aria-hidden="true" style={place} />;
        const node = nodes[cell.node], next = edges.filter(edge => edge.from === node.id).flatMap(edge => { const to = nodes.find(other => other.id === edge.to); return to ? [`${to.label}${edge.label ? ` (${edge.label})` : ''}`] : []; });
        return <li key={index} ref={element => { items.current[index] = element; }} className="bs-flow__node" data-kind={node.kind} data-lit={on.has(node.id) || undefined} style={place}>
          {node.tag && <span className="bs-flow__tag">{node.tag}</span>}
          <strong>{node.label}</strong>
          {node.note && <span className="bs-flow__note">{node.note}</span>}
          {next.length > 0 && <span className="bs-sr-only">{nextLabel}: {next.join(', ')}</span>}
        </li>;
      })}</ol>
      {lines.map((line, index) => line.label && <span key={index} className="bs-flow__label" data-lit={line.lit || undefined} aria-hidden="true" style={{ left: line.x, top: line.y }}>{line.label}</span>)}
    </div>
  </figure>;
}
