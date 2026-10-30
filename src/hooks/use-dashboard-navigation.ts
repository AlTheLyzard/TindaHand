import { useCallback, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import tokens from '@/constants/design-tokens.json';
import { createScrollDirectionTracker } from '@/utils/scroll-direction';

export function useDashboardNavigation() {
  const [expanded, setExpanded] = useState(true);
  const currentExpanded = useRef(true);
  const tracker = useRef(createScrollDirectionTracker(tokens.navigation.scrollThreshold));
  const onScroll = useCallback(({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const direction = tracker.current(nativeEvent.contentOffset.y, nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height);
    if (direction && currentExpanded.current !== (direction === 'up')) {
      currentExpanded.current = direction === 'up';
      setExpanded(currentExpanded.current);
    }
  }, []);
  return { expanded, onScroll };
}
