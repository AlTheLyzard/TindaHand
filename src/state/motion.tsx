import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

const ReducedMotionContext = createContext(true);

/** A single live subscription, shared by navigation, overlays, and controls. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const initial = useReducedMotion();
  const [reduced, setReduced] = useState(initial);
  useEffect(() => {
    let live = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      if (live) setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (live && !changed) setReduced(value);
    }).catch(() => { if (live && !changed) setReduced(true); });
    return () => { live = false; subscription.remove(); };
  }, []);
  return <ReducedMotionContext.Provider value={reduced}>{children}</ReducedMotionContext.Provider>;
}

export function useMotionReduced() {
  return useContext(ReducedMotionContext);
}
