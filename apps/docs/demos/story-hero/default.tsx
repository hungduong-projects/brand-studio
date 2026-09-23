import { ActionLink, StoryHero } from '@brand-studio/ui';
import { cup } from '@/demos/assets';

export default function StoryHeroDemo() {
  return (
    <StoryHero
      eyebrow="Still Coffee"
      title="Make room for the first sip."
      description="Still is a fictional coffee brand from the Brand Studio showcase."
      asset={cup}
      action={<ActionLink href="#menu">See the menu</ActionLink>}
    />
  );
}
