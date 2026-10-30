import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useRef } from 'react';

/** Dispatch immediately, then ignore repeat pushes until this screen is focused again. */
export function usePushOnce() {
  const leaving = useRef(false);
  useFocusEffect(useCallback(() => { leaving.current = false; }, []));
  return useCallback((href: Href) => {
    if (leaving.current) return;
    leaving.current = true;
    router.push(href);
  }, []);
}
