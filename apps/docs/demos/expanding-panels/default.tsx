import { ExpandingPanels } from '@brand-studio/ui';
import { beans, cup, pour } from '@/demos/assets';

export default function ExpandingPanelsDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 880 }}>
      <ExpandingPanels label="How we make a cup" panels={[
        { id: 'bean', title: 'The bean', asset: beans, body: <p>Washed lots from four farms, bought green and roasted every Monday.</p> },
        { id: 'pour', title: 'The pour', asset: pour, body: <p>Ninety-four degrees, a thirty-second bloom and a slow spiral.</p> },
        { id: 'cup', title: 'The cup', asset: cup, body: <p>Stone fruit, brown sugar and a long, clean finish.</p> },
      ]} />
    </div>
  );
}
