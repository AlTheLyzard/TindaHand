import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { View } from 'react-native';

import tokens from '@/constants/design-tokens.json';

export function PosBackButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="self-start justify-center"
    style={{ minHeight: tokens.size.touchTarget, minWidth: tokens.size.touchTarget }}>
    <View accessible={false} style={{ width: 9, height: 9, marginLeft: 5, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#102342', transform: [{ rotate: '45deg' }] }} />
  </Pressable>;
}
