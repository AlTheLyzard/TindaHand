import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/** Completion actions share a lock until this screen is visited again. */
export function useLeaveOnce() {
  const leaving = useRef(false);
  useFocusEffect(useCallback(() => { leaving.current = false; }, []));
  return useCallback((action: () => void) => {
    if (leaving.current) return;
    leaving.current = true;
    action();
  }, []);
}
