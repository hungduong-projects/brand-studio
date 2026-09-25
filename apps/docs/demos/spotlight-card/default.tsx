import { Button, SpotlightCard } from '@brand-studio/ui';

const plans = [
  { name: 'Taster', price: '£9', detail: 'One 250 g bag a month' },
  { name: 'Regular', price: '£16', detail: 'Two bags, one of them a new lot' },
  { name: 'Roaster', price: '£28', detail: 'Three bags and a tasting note' },
];

export default function SpotlightCardDemo() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, width: '100%', maxWidth: 720 }}>
      {plans.map(plan => (
        <SpotlightCard key={plan.name} style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{plan.name}</h3>
          <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 600 }}>{plan.price}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--bs-muted)' }}> / month</span></p>
          <p style={{ margin: '0 0 20px', color: 'var(--bs-muted)', fontSize: 14 }}>{plan.detail}</p>
          <Button tone="secondary" style={{ width: '100%' }}>Choose {plan.name}</Button>
        </SpotlightCard>
      ))}
    </div>
  );
}
