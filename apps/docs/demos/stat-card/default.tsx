import { StatCard } from '@brand-studio/ui';

export default function StatCardDemo() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, width: '100%', maxWidth: 560 }}>
      <StatCard label="Active subscribers" value="1,284" change="+6.1%" trend="up" note="74 more than last month" series={[1120, 1142, 1150, 1181, 1176, 1210, 1244, 1284]} />
      <StatCard label="Skipped deliveries" value="38" change="−12%" trend="down" note="5 fewer than last month" series={[52, 49, 47, 44, 45, 43, 40, 38]} />
    </div>
  );
}
