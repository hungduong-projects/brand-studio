import type { ImageAsset, StoryChapter } from '@brand-studio/ui';

export const cup: ImageAsset = { src: '/images/cup.webp', srcSet: '/images/cup-768.webp 768w, /images/cup.webp 1536w', alt: 'A cobalt ceramic cup of coffee on a brushed steel counter in morning light.', width: 1536, height: 1024, focalPoint: '70% 50%' };
export const beans: ImageAsset = { src: '/images/beans.webp', srcSet: '/images/beans-768.webp 768w, /images/beans.webp 1536w', alt: 'Roasted coffee beans on the steel counter, with the same cobalt cup behind them.', width: 1536, height: 1024 };
export const pour: ImageAsset = { src: '/images/pour.webp', srcSet: '/images/pour-768.webp 768w, /images/pour.webp 1536w', alt: 'A slender stream of coffee pours into the cobalt cup.', width: 1536, height: 1024, focalPoint: '70% 50%' };

export const chapters: StoryChapter[] = [
  { id: 'beans', label: 'Plate I · The bean', title: 'Start with the bean.', body: 'Small differences become the whole cup. Texture, aroma, and the moment a familiar ritual begins.', asset: beans },
  { id: 'pour', label: 'Plate II · The pour', title: 'Give it a moment.', body: 'The first pour. The slow bloom. A little attention changes an everyday drink into something worth pausing for.', asset: pour },
  { id: 'cup', label: 'Plate III · The cup', title: 'Make room for the first sip.', body: 'A warm cup. A clear counter. A moment that belongs to you, before the day asks for anything else.', asset: cup },
];

/** Renders of the fictional Halden camera, from a CC0 model. See public/images/halden/PROVENANCE.md. */
export const camera = (name: string, alt: string) => ({ src: `/images/halden/${name}.webp`, alt });

/** Square Halden renders as full image assets, for galleries. */
export const cameraViews: ImageAsset[] = [
  ['three', 'The Halden R camera from three quarters, lens forward.'],
  ['front', 'The Halden R from the front, its lens centred.'],
  ['side', 'The Halden R in profile, showing the grip.'],
  ['back', 'The back of the Halden R, with its screen and dials.'],
  ['top', 'The Halden R from above, showing the shutter dial.'],
  ['apart', 'The Halden R taken apart into its body, lens and battery.'],
].map(([name, alt]) => ({ src: `/images/halden/${name}-square.webp`, alt, width: 800, height: 800 }));

/** Wide Halden renders, for layouts that mix shapes. */
export const cameraWides: ImageAsset[] = [
  ['front', 'The Halden R from the front, its lens centred.'],
  ['side', 'The Halden R in profile, showing the grip.'],
  ['three', 'The Halden R from three quarters, lens forward.'],
].map(([name, alt]) => ({ src: `/images/halden/${name}.webp`, alt, width: 1600, height: 900 }));
