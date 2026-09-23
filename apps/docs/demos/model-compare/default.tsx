import { ActionLink, ModelCompare } from '@brand-studio/ui';
import { camera } from '@/demos/assets';

const picture = (name: string, alt: string) => {
  const image = camera(name, alt);
  return <img src={image.src} alt={image.alt} width={800} height={800} />;
};
const buy = <ActionLink href="#buy" shape="pill">Buy</ActionLink>;

export default function ModelCompareDemo() {
  return (
    <ModelCompare
      title="Which kit is right for you?"
      models={[
        { name: 'Body only', media: picture('front-square', 'The camera body.'), summary: 'Bring your own lens.', price: '$1,080', action: buy },
        { name: '50 mm kit', media: picture('three-square', 'The camera with a 50 mm lens.'), badge: 'Most chosen', summary: 'Body, 50 mm lens and strap.', price: '$1,480', current: true },
        { name: '35 mm kit', media: picture('side-square', 'The camera with a lens, from the side.'), summary: 'Body, 35 mm lens and strap.', price: '$1,420', action: buy },
      ]}
      rows={[
        { label: 'Lens', values: [null, '50 mm ƒ/1.4', '35 mm ƒ/2'] },
        { label: 'Strap', values: [null, 'Leather, 110 cm', 'Leather, 110 cm'] },
        { label: 'Weight', values: ['590 g', '820 g', '760 g'] },
      ]}
    />
  );
}
