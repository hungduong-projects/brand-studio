'use client';

import { useState } from 'react';
import { Button, Chart, Switch } from '@brand-studio/ui';

const week = { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], hot: [42, 38, 45, 51, 58, 74, 61], iced: [12, 15, 14, 22, 31, 48, 39] };
const month = {
  labels: Array.from({ length: 30 }, (_, day) => day < 17 ? `${14 + day} Sep` : `${day - 16} Oct`),
  hot: [44, 39, 41, 47, 55, 71, 60, 43, 40, 46, 49, 57, 76, 63, 45, 41, 44, 52, 59, 78, 66, 42, 38, 45, 51, 58, 74, 61, 47, 43],
  iced: [28, 26, 25, 27, 34, 52, 44, 24, 22, 23, 25, 30, 47, 40, 20, 18, 19, 22, 27, 41, 35, 14, 15, 14, 22, 31, 48, 39, 16, 13],
};
const cups = (value: number) => `${value} cups`;

export default function ChartDemo() {
  const [long, setLong] = useState(false);
  const [iced, setIced] = useState(false);
  const data = long ? month : week;
  const series = [{ name: 'Hot', values: data.hot }, ...(iced ? [{ name: 'Iced', values: data.iced }] : [])];
  return (
    <div style={{ width: '100%', maxWidth: 620, display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div role="group" aria-label="Period" style={{ display: 'flex', gap: 8 }}>
          <Button tone={long ? 'secondary' : 'primary'} aria-pressed={!long} onClick={() => setLong(false)}>This week</Button>
          <Button tone={long ? 'primary' : 'secondary'} aria-pressed={long} onClick={() => setLong(true)}>30 days</Button>
        </div>
        <Switch label="Compare iced" checked={iced} onCheckedChange={setIced} />
      </div>
      <Chart
        title="Cups sold"
        kind={long ? 'area' : 'bar'}
        labels={data.labels}
        series={series}
        lit={iced || long ? 'Hot' : 'Sat'}
        note={long ? 'Saturdays peak every week. Iced drinks fade as October cools.' : iced ? 'Iced drinks sell most at the weekend.' : 'Saturday was the busiest day: 74 cups.'}
        format={cups}
      />
    </div>
  );
}
