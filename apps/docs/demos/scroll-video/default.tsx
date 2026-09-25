import { ScrollVideo } from '@brand-studio/ui';

export default function ScrollVideoDemo() {
  return (
    <div style={{ width: '100%' }}>
      <ScrollVideo label="The Halden R turning, then coming apart into its parts" src="/videos/halden-turn.mp4" poster="/videos/halden-turn.jpg" length={320} steps={[
        { at: 0, text: 'One body, milled from brass.' },
        { at: .35, text: 'A grip that finds your hand.' },
        { at: .72, text: 'Seven parts. Every one replaceable.' },
      ]} />
    </div>
  );
}
