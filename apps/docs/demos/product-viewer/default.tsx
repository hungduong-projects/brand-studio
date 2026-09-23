import { ProductViewer } from '@brand-studio/ui';
import { camera } from '@/demos/assets';

const view = (name: string, alt: string) => {
  const image = camera(name, alt);
  return <img src={image.src} alt={image.alt} width={1600} height={900} />;
};

export default function ProductViewerDemo() {
  return (
    <ProductViewer
      title="Take a closer look."
      items={[
        { value: 'front', label: 'Front', media: view('front', 'The camera seen from the front.'), caption: 'Rangefinder windows on the left.' },
        { value: 'top', label: 'Top', media: view('top', 'The camera seen from above.'), caption: 'Shutter dial, advance lever and rewind crank.' },
        { value: 'back', label: 'Back', media: view('back', 'The back of the camera.'), caption: 'A bright finder and a film door.' },
        { value: 'side', label: 'Side', media: view('side', 'The camera from the side.'), caption: 'The lens adds 42 mm to the body.' },
      ]}
    />
  );
}
