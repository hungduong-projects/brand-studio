import { useEffect, useRef } from 'react';

// Internal: not exported from the package index.
/** Holds a list's entrance until it scrolls into view. Lists already on screen, and pages without JavaScript, show at once. */
export function useEntrance<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined' || element.getBoundingClientRect().top < innerHeight) return;
    element.dataset.bsWaiting = '';
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      delete element.dataset.bsWaiting;
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return ref;
}
