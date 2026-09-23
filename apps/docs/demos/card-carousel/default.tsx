import { ActionLink, CardCarousel } from '@brand-studio/ui';
import { camera } from '@/demos/assets';

const picture = (name: string, alt: string) => {
  const image = camera(name, alt);
  return <img src={image.src} alt={image.alt} width={800} height={800} />;
};

export default function CardCarouselDemo() {
  return (
    <CardCarousel
      title="Keep it running."
      action={<ActionLink href="#service" tone="secondary" shape="pill">All guides</ActionLink>}
      cards={[
        { eyebrow: 'Guide', title: 'Loading film without looking.', body: 'Three steps you learn once.', media: picture('back-square', 'The back of the camera.'), href: '#film' },
        { eyebrow: 'Guide', title: 'Sunny 16 in one page.', body: 'Set exposure with no meter.', media: picture('top-square', 'The shutter dial on the top plate.'), href: '#sunny' },
        { eyebrow: 'Service', title: 'Every part has a price.', body: 'Order a single screw or a new shutter.', media: picture('apart-square', 'The camera taken apart.'), href: '#parts' },
        { eyebrow: 'Service', title: 'Clean, lube, adjust.', body: 'Send it in every ten years.', media: picture('side-square', 'The camera from the side.'), href: '#service' },
      ]}
    />
  );
}
