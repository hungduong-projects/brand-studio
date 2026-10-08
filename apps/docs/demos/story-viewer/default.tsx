'use client';

import { StoryViewer } from '@brand-studio/ui';
import { beans, cup, pour } from '@/demos/assets';

export default function StoryViewerDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 320 }}>
      <StoryViewer label="Still Coffee stories" author={{ name: 'Still Coffee' }} time="5h" slides={[
        { id: 'beans', asset: beans, title: 'Huila, rested nine days', text: 'Roasted on Tuesday. Ready to brew from today.' },
        { id: 'pour', asset: pour, title: '15 g, 250 ml, three minutes', text: 'Pour in three stages. If it tastes sour, grind a little finer.' },
        { id: 'cup', asset: cup, title: 'Tasting on Saturday', text: 'Six coffees from one farm at 10:00. Four seats left.' },
      ]} />
    </div>
  );
}
