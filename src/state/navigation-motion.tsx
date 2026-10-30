import { useMotionReduced } from '@/state/motion';
import { motion } from '@/constants/motion';
import { usePathname } from 'expo-router';
import { createContext, useContext, useLayoutEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useWindowDimensions } from 'react-native';
import { ReduceMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import tokens from '@/constants/design-tokens.json';

export const navigationItems = [
  { icon: 'home', label: 'navigation.dashboard', route: '/owner-dashboard' },
  { icon: 'cart', label: 'navigation.pos', route: '/owner-pos' },
  { icon: 'inventory', label: 'navigation.inventory', route: '/owner-inventory' },
  { icon: 'menu', label: 'navigation.menu', route: '/owner-menu' },
] as const;

type NavigationMotion = {
  pathname: string;
  selectedIndex: number;
  selection: SharedValue<number[]>;
  reduced: boolean;
  height: number;
  measurements: Record<string, number>;
  setMeasurements: Dispatch<SetStateAction<Record<string, number>>>;
  setMenuSelection: Dispatch<SetStateAction<{ hostId: string; pathname: string } | null>>;
};
const NavigationMotionContext = createContext<NavigationMotion | null>(null);
const NavigationHeightContext = createContext(tokens.navigation.height);

/** Keep one transition alive across screens, including interrupted taps and back navigation. */
export function NavigationMotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuSelection, setMenuSelection] = useState<{ hostId: string; pathname: string } | null>(null);
  const routeIndex = navigationItems.findIndex(({ route }) => pathname === route || pathname.startsWith(`${route}/`));
  const selectedIndex = menuSelection?.pathname === pathname ? navigationItems.findIndex(item => item.icon === 'menu') : routeIndex;
  const selection = useSharedValue(navigationItems.map((_, index) => Number(index === selectedIndex)));
  const reduced = useMotionReduced();
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const { fontScale } = useWindowDimensions();
  const height = Math.max(tokens.navigation.height, Math.ceil(tokens.navigation.labelLineHeight * fontScale) + tokens.spacing.two * 2);


  useLayoutEffect(() => {
    const target = navigationItems.map((_, index) => Number(index === selectedIndex));
    // Start the first destination fully selected; retarget subsequent moves from their current frame.
    selection.set(selectedIndex < 0 || selection.get().every(value => value === 0) || reduced
      ? target
      : withTiming(target, {
        duration: motion.state,
        easing: motion.ease,
        // The live system preference above also handles enabling/disabling Reduce Motion mid-session.
        reduceMotion: ReduceMotion.Never,
      }));
  }, [reduced, selectedIndex, selection]);

  const value = useMemo(() => ({ pathname, selectedIndex, selection, reduced, height, measurements, setMeasurements, setMenuSelection }), [pathname, selectedIndex, selection, reduced, height, measurements]);
  return <NavigationHeightContext.Provider value={height}>
    <NavigationMotionContext.Provider value={value}>{children}</NavigationMotionContext.Provider>
  </NavigationHeightContext.Provider>;
}

/** Screen/FAB clearance only changes with text size, not on every tab switch or measurement. */
export function useNavigationHeight() {
  return useContext(NavigationHeightContext);
}

export function useNavigationMotion() {
  const motion = useContext(NavigationMotionContext);
  if (!motion) throw new Error('Navigation must be rendered inside NavigationMotionProvider.');
  return motion;
}
