'use client';

import { AgentThinking, BrandTheme, Button } from '@brand-studio/ui';
import { brands, brandKeys } from '@/lib/brands';
import { useDemoBrand } from './demo-brand';

/** The same card rendered in every demo brand. The picked brand sits in front; the others fan out behind it and bring their brand forward on click. */
export function HeroSpecimens() {
  const { brand, mode, set } = useDemoBrand();
  const behind = brandKeys.filter((key) => key !== brand);
  return <div className="specimens" aria-label="One card in three brands">
    {brandKeys.map((key) => {
      const slot = key === brand ? 'front' : behind.indexOf(key) === 0 ? 'left' : 'right';
      return <BrandTheme key={key} palette={brands[key].palette} mode={mode} className="specimen" data-slot={slot} style={{ viewTransitionName: `specimen-${key}` }}>
        <div className="specimen__content" inert={slot !== 'front'}>
          <p className="specimen__tag">{brands[key].label} · fictional brand</p>
          <AgentThinking size={20} label="Checking your order" />
          <p className="specimen__title">Your order ships Friday.</p>
          <p className="specimen__body">Two bags are in stock. The third arrives Thursday, so everything leaves together.</p>
          <div className="specimen__actions"><Button>Confirm</Button><Button tone="secondary">Change</Button></div>
        </div>
        {slot !== 'front' && <button type="button" className="specimen__pick" onClick={() => set({ brand: key })}><span className="sr-only">Show the {brands[key].label} card</span></button>}
      </BrandTheme>;
    })}
  </div>;
}
