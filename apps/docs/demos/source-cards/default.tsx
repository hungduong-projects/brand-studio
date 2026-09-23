import { SourceCards } from '@brand-studio/ui';

export default function SourceCardsDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 680, display: 'grid', gap: 16 }}>
      <p style={{ margin: 0 }}>The Huila lot scored 86 at cupping [1] and costs 9% more than last season [2]. Two cafés have asked for it again [3].</p>
      <SourceCards sources={[
        { id: 'cupping', source: 'Tasting notes', title: 'Cupping, 12 March', excerpt: 'Huila washed: red apple, panela, long finish. Score 86.' },
        { id: 'prices', source: 'Supplier prices', title: 'Colombia price list, spring', excerpt: 'Finca La Esperanza, 70 kg bag: up 9% on autumn.' },
        { id: 'orders', source: 'Open orders', title: 'Standing orders', excerpt: 'North Street Café and Loom both ask for the Huila in their next delivery.' },
      ]} />
    </div>
  );
}
