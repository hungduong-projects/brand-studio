import { useEffect, useRef } from 'react';

// Internal: not exported from the package index.
/** Runs `frame` on every animation frame while the element is on screen; `frame` returns false to stop until the next `wake`. */
export function useVisibleLoop(element: { current: Element | null }, frame: (time: number) => boolean | void) {
  const step = useRef(frame);
  step.current = frame;
  const wake = useRef(() => {});
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    let id = 0, visible = false;
    const tick = (time: number) => { id = step.current(time) === false || !visible ? 0 : requestAnimationFrame(tick); };
    wake.current = () => { if (visible && !id) id = requestAnimationFrame(tick); };
    const observer = new IntersectionObserver(([entry]) => { visible = !!entry?.isIntersecting; if (visible) wake.current(); else { cancelAnimationFrame(id); id = 0; } });
    observer.observe(target);
    return () => { observer.disconnect(); cancelAnimationFrame(id); };
  }, [element]);
  return wake;
}

/** Sizes a 2D canvas to its CSS box at up to 2x density and returns the context scaled to CSS pixels. */
export function fit2d(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const scale = Math.min(devicePixelRatio || 1, 2), width = canvas.clientWidth, height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * scale) || canvas.height !== Math.round(height * scale)) { canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale); }
  context.setTransform(scale, 0, 0, scale, 0, 0);
  return { context, width, height };
}
