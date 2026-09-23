"use client";

import { useId, useState } from 'react';
import type { ReactNode } from 'react';

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
