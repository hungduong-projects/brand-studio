import { RecommendationCard } from '@brand-studio/ui';

export default function RecommendationCardDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 460 }}>
      <RecommendationCard options={[
        { id: 'grind-18', title: 'Grind setting 18', confidence: 0.82, reason: 'Your last three brews ran fast and tasted sour. One step finer should slow the pour to about three minutes.' },
        { id: 'grind-17', title: 'Grind setting 17', confidence: 0.54, reason: 'Two steps finer. Safer if the beans are older than they look.' },
        { id: 'temperature', title: 'Keep 19, brew at 96°C', confidence: 0.31, reason: 'Hotter water extracts more without changing the grind.' },
      ]} />
    </div>
  );
}
