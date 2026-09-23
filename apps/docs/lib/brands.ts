import type { BrandPalette } from '@brand-studio/ui';
import still from '../../../plugins/brand-studio/skills/brand-design/assets/still.brand.json';
import deskhand from '../../showcase/src/deskhand.brand.json';
import hollis from '../brand/hollis.brand.json';

export const brands = {
  still: { label: 'Still', palette: still.tokens as BrandPalette },
  deskhand: { label: 'Deskhand', palette: deskhand.tokens as BrandPalette },
  hollis: { label: 'Hollis', palette: hollis.tokens as BrandPalette },
} as const;

export type BrandKey = keyof typeof brands;
export const brandKeys = Object.keys(brands) as BrandKey[];
