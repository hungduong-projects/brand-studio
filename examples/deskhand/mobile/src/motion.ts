import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** The system Reduce Motion setting. `null` until known, so nothing animates before the answer arrives. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReduced(value); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { live = false; sub.remove(); };
  }, []);
  return reduced;
}
