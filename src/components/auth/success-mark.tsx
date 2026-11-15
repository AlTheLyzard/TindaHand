import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SuccessCheck } from '@/components/ui/success-check';
import { motion } from '@/constants/motion';

/** Route adapter; modal/sheet success content uses SuccessCheck directly. */
export function SuccessMark({ small = false, animate = false, eventKey = 0 }: {
  small?: boolean; animate?: boolean; eventKey?: string | number;
}) {
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  return <SuccessCheck size={small ? 22 : 52} animate={animate && !small}
    visible={focused} eventKey={eventKey} delay={motion.transition} />;
}
