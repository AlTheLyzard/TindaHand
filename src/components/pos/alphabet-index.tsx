import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { ScrollView, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useTranslation } from '@/i18n/use-translation';

export function AlphabetIndex({ letters, active, onPick, gridStart, scrollY, viewportHeight }: {
  letters: readonly string[]; active: string | null; onPick: (letter: string | null) => void;
  gridStart: SharedValue<number>; scrollY: SharedValue<number>; viewportHeight: SharedValue<number>;
}) {
  const { t } = useTranslation();
  const position = useAnimatedStyle(() => {
    const top = Math.min(viewportHeight.value, Math.max(0, gridStart.value - scrollY.value));
    return { top, height: Math.max(0, viewportHeight.value - top), opacity: gridStart.value > 0 ? 1 : 0 };
  });
  if (!letters.length) return null;
  return <Animated.View style={[{ position: 'absolute', right: 0, width: 44, overflow: 'hidden' }, position]}>
    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 4 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('pos.indexTop')} onPress={() => onPick(null)} className="min-h-11 w-11 items-center justify-center"><Text className="font-poppins-bold text-[10px] text-action">{t('pos.all')}</Text></Pressable>
      {letters.map(letter => <Pressable key={letter} accessibilityRole="button" accessibilityLabel={t('pos.jumpLetter', { letter })} accessibilityState={{ selected: active === letter }} onPress={() => onPick(letter)} className="min-h-11 w-11 items-center justify-center">
        <View className="min-h-6 min-w-6 items-center justify-center rounded-pill px-1" style={{ backgroundColor: active === letter ? '#D1E2F8' : 'transparent' }}><Text className="font-poppins-bold text-[12px] leading-[20px]" style={{ color: active === letter ? '#245399' : '#4A607A' }}>{letter}</Text></View>
      </Pressable>)}
    </ScrollView>
  </Animated.View>;
}
