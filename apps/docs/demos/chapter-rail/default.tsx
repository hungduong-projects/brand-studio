import { ChapterRail } from '@brand-studio/ui';

const chapters = [
  { id: 'rail-bean', title: 'The bean', marker: 'I', body: 'Washed coffee from one farm in Huila, roasted light on Tuesdays so it tastes of the fruit, not the fire.' },
  { id: 'rail-pour', title: 'The pour', marker: 'II', body: 'Sixteen grams to two hundred and fifty of water, poured in three slow circles over three minutes.' },
  { id: 'rail-cup', title: 'The cup', marker: 'III', body: 'Thin porcelain, warmed first, so the first sip is as bright as the last.' },
];

export default function ChapterRailDemo() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(8rem, 11rem) 1fr', gap: 32, width: '100%', padding: 32 }}>
      <div style={{ position: 'sticky', top: 96, alignSelf: 'start' }}>
        <ChapterRail placement="inline" title="Still Coffee" chapters={chapters.map(c => ({ label: c.title, href: `#${c.id}`, marker: c.marker }))} />
      </div>
      <div style={{ display: 'grid', gap: 48 }}>
        {chapters.map(c => <section key={c.id} id={c.id} style={{ minHeight: 280 }}>
          <p style={{ margin: 0, opacity: .6 }}>{c.marker}</p>
          <h3 style={{ margin: '4px 0 8px', fontSize: 28 }}>{c.title}</h3>
          <p style={{ margin: 0, maxWidth: '40ch', opacity: .8 }}>{c.body}</p>
        </section>)}
      </div>
    </div>
  );
}
