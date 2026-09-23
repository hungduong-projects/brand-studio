import { TopicMap } from '@brand-studio/ui';

export default function TopicMapDemo() {
  return (
    <div style={{ width: '100%', padding: '32px clamp(16px, 5vw, 48px)' }}>
      <TopicMap
        label="What the roastery teaches"
        topics={[
          { id: 'origin', label: 'Origin', weight: 3, links: ['farm', 'process', 'altitude'], detail: 'Where the coffee grows sets most of how it tastes. We buy from four farms we visit every year.' },
          { id: 'roast', label: 'Roast', weight: 3, links: ['light', 'dark', 'rest'], detail: 'Light roasts keep the fruit; dark roasts trade it for body and chocolate.' },
          { id: 'brew', label: 'Brew', weight: 2, links: ['grind', 'ratio', 'water'], detail: 'Grind, ratio and water: change one at a time.' },
          { id: 'farm', label: 'The farm', links: ['process'], detail: 'Finca La Esperanza, Huila. Twelve hectares above 1,700 metres.' },
          { id: 'process', label: 'Washed or natural', weight: 2, detail: 'Washed coffee tastes clean and bright; natural coffee tastes of ripe fruit.' },
          { id: 'altitude', label: 'Altitude', detail: 'Higher farms grow denser beans that roast more evenly.' },
          { id: 'light', label: 'Light roast', detail: 'Stopped just after first crack, about ten minutes in.' },
          { id: 'dark', label: 'Dark roast', detail: 'Taken past second crack. Oils show on the surface.' },
          { id: 'rest', label: 'Resting', links: ['brew'], detail: 'Beans need five to ten days after roasting before they brew well.' },
          { id: 'grind', label: 'Grind size', detail: 'Finer for espresso, coarser for a pour-over or French press.' },
          { id: 'ratio', label: '1 to 16', weight: 2, detail: 'Sixteen grams of water for every gram of coffee is a good start.' },
          { id: 'water', label: 'Water', detail: 'Filtered, just off the boil, around 94°C.' },
        ]}
      />
    </div>
  );
}
