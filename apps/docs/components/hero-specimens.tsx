'use client';

import { AgentThinking, BrandTheme, Button } from '@brand-studio/ui';
import { brands, brandKeys } from '@/lib/brands';
import { useDemoBrand } from './demo-brand';

/** The same card rendered in every demo brand. The picked brand sits in front; the others fan out behind it. */
export function HeroSpecimens() {
  const { brand, mode } = useDemoBrand();
  const behind = brandKeys.filter((key) => key !== brand);
  return <div className="specimens" aria-label="One card in three brands">
    {brandKeys.map((key) => {
      const slot = key === brand ? 'front' : behind.indexOf(key) === 0 ? 'left' : 'right';
      return <BrandTheme key={key} palette={brands[key].palette} mode={mode} className="specimen" data-slot={slot} inert={slot !== 'front'}>
        <p className="specimen__tag">{brands[key].label} · fictional brand</p>
        <AgentThinking size={20} label="Checking your order" />
        <p className="specimen__title">Your order ships Friday.</p>
        <p className="specimen__body">Two bags are in stock. The third arrives Thursday, so everything leaves together.</p>
        <div className="specimen__actions"><Button>Confirm</Button><Button tone="secondary">Change</Button></div>
      </BrandTheme>;
    })}
  </div>;
}
