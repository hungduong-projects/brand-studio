import { ActionLink, StoryHero } from '@brand-studio/ui';
import { pour } from '@/demos/assets';

export default function StoryHeroOverlay() {
  return (
    <StoryHero
      variant="overlay"
      title="Give it a moment."
      description="The copy sits on a scrim, so it stays readable before the image loads."
      asset={pour}
      action={<ActionLink href="#visit" tone="inverse">Plan a visit</ActionLink>}
    />
  );
}
