import type { PropRow } from '@/lib/props';

export function PropsTable({ entries }: { entries: PropRow[] }) {
  return <div className="props" role="region" aria-label="Props" tabIndex={0}>
    <table>
      <thead><tr><th scope="col">Prop</th><th scope="col">Type</th><th scope="col">Default</th></tr></thead>
      <tbody>{entries.map((entry) => <tr key={entry.name}>
        <th scope="row"><code>{entry.required ? entry.name : `${entry.name}?`}</code></th>
        <td><code>{entry.type}</code></td>
        <td>{entry.defaultValue ? <code>{entry.defaultValue}</code> : <span aria-label="None">–</span>}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
