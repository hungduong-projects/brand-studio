import { ScrollPath } from '@brand-studio/ui';

export default function ScrollPathDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 560, padding: '48px 24px' }}>
      <ScrollPath label="From farm to your door" steps={[
        { title: 'Picked', body: <p>Ripe cherries only, picked by hand in Huila.</p> },
        { title: 'Washed and dried', body: <p>Fermented overnight, then dried on raised beds for three weeks.</p> },
        { title: 'Shipped green', body: <p>Sealed in grain bags and shipped to London by sea.</p> },
        { title: 'Roasted on Monday', body: <p>Small batches, each profile tasted before it ships.</p> },
        { title: 'At your door by Friday', body: <p>Four days from roaster to cup.</p> },
      ]} />
    </div>
  );
}
