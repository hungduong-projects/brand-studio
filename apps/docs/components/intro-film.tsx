'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

/** The silent intro film. It plays on its own unless the reader asks for reduced motion, and a button pauses it. */
export function IntroFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: no-preference)').matches) video.current?.play().catch(() => { /* Autoplay refused: the poster and the play button stay. */ });
  }, []);

  const toggle = () => { const element = video.current; if (element) element.paused ? element.play() : element.pause(); };

  return <figure className="film">
    <div className="film__frame">
      <video ref={video} src="/videos/brand-studio-intro.mp4" poster="/videos/brand-studio-intro.jpg" width={1920} height={1080}
        muted loop playsInline preload="metadata" aria-describedby="film-caption"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <button type="button" className="film__toggle" onClick={toggle} aria-label={playing ? 'Pause the intro video' : 'Play the intro video'}>
        {playing ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}
      </button>
    </div>
    <figcaption id="film-caption">One card, no brand yet. A brand contract sets its colour, type and corners. One switch re-skins them all. 24 seconds, no sound.</figcaption>
  </figure>;
}
