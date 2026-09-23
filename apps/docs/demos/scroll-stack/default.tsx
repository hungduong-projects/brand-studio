import { ScrollStack } from '@brand-studio/ui';
import { beans, cup, pour } from '@/demos/assets';

export default function ScrollStackDemo() {
  return (
    <div style={{ width: '100%' }}>
      <ScrollStack
        cards={[
          { id: 'source', title: 'We buy from twelve farms', body: 'Direct relationships, visited every harvest.', asset: beans },
          { id: 'roast', title: 'We roast on Tuesdays', body: 'Small batches, shipped within two days.', asset: pour },
          { id: 'brew', title: 'You brew it your way', body: 'Guides for every method, from moka pot to cold brew.', asset: cup },
        ]}
      />
    </div>
  );
}
