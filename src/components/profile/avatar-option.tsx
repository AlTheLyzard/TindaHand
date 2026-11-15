import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { motion } from '@/constants/motion';
import { profileAvatars } from '@/constants/profile-avatars';
import { useMotionReduced } from '@/state/motion';
import type { AvatarId } from '@/types/profile';
import { ProfileAvatar } from './profile-ui';

/** Mounted once per picker opening, inside a fixed grid cell. Selection never
 * restarts the entrance, and the full touch target is available throughout it. */
export function AvatarOption({ id, index, selected, inUse = false, onSelect }: { id: AvatarId; index: number; selected: boolean; inUse?: boolean; onSelect: () => void }) {
  const reduced = useMotionReduced();
  const entrance = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) entrance.set(1);
    else entrance.set(withDelay(index * 24, withTiming(1, { duration: motion.state, easing: motion.ease })));
    return () => cancelAnimation(entrance);
  }, [entrance, index, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: entrance.value, transform: [{ scale: 0.86 + 0.14 * entrance.value }] }));
  return <Animated.View testID={`avatar-entrance-${id}`} style={style}>
    <Pressable accessibilityRole="radio" accessibilityLabel={`${profileAvatars[id].label}${inUse ? ', In use by another account' : ''}`} accessibilityState={{ checked: selected, selected, disabled: inUse }} aria-checked={selected} aria-selected={selected} aria-disabled={inUse} disabled={inUse} className="focus:outline focus:outline-2 focus:outline-action"
      onPress={onSelect} style={{ padding: 4, borderRadius: 100, borderWidth: 3, borderColor: selected ? '#2675DB' : 'transparent' }}>
      <ProfileAvatar avatarId={id} size={66} />
    </Pressable>
    <Text accessible={false} className="text-center font-poppins-semibold text-[10px] leading-[16px] text-brand">{inUse ? 'In use' : ' '}</Text>
  </Animated.View>;
}
