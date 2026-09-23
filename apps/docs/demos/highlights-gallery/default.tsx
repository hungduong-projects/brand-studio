import { HighlightsGallery } from '@brand-studio/ui';
import { camera } from '@/demos/assets';

const slide = (name: string, alt: string) => {
  const image = camera(name, alt);
  return <img src={image.src} alt={image.alt} width={1600} height={900} style={{ objectFit: 'contain', padding: '18% 8% 3%', boxSizing: 'border-box' }} />;
};

export default function HighlightsGalleryDemo() {
  return (
    <HighlightsGallery
      title="Get the highlights."
      items={[
        { media: slide('three', 'The camera from the front left, black paint worn to brass.'), caption: <><strong>Worn to brass.</strong> The paint gives way where your hands go.</> },
        { media: slide('top', 'The top plate from above, with the shutter dial.'), caption: <><strong>Every control on top.</strong> Nothing hides in a menu.</> },
        { media: slide('apart', 'The camera taken apart into body, lens barrel and glass.'), caption: <><strong>Comes apart for service.</strong> The lens leaves in one turn.</> },
      ]}
    />
  );
}
