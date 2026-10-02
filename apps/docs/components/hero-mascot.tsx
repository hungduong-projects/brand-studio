'use client';

import { useState } from 'react';

/** Keeps the approved raster intact; motion is applied to the whole character. */
export function HeroMascot() {
  const [greeting, setGreeting] = useState(false);
  return <div className="hero-mascot">
    <button type="button" className="hero-mascot__button" aria-label="Greet the Brand Studio mascot"
      data-greeting={greeting || undefined} onClick={() => setGreeting(true)}
      onAnimationEnd={() => setGreeting(false)}>
      <img className="hero-mascot__image" src="/images/mascot/brand-studio.webp" alt="" width={640} height={640} fetchPriority="high" draggable={false} />
    </button>
  </div>;
}
