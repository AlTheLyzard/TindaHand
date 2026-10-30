import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useTranslation } from '@/i18n/use-translation';
import { Image, Text, View } from 'react-native';

export function AuthHeader({ onBack, backLabel, showWordmark = true }: {
  onBack: () => void;
  backLabel?: string;
  showWordmark?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Pressable accessibilityRole="button" accessibilityLabel={backLabel ?? t('common.back')} onPress={onBack}
        className="min-h-12 min-w-12 items-center justify-center rounded-full active:bg-[#D9E7F5]">
        <Text accessible={false} className="text-[26px] text-[#2675DB]">←</Text>
      </Pressable>
      <View className={showWordmark ? 'min-w-0 flex-shrink flex-row items-center gap-3' : 'flex-1 items-center'}>
        <Image source={require('@/assets/images/brand/tindahand-mark.png')}
          style={{ width: 34, height: 34 }} resizeMode="contain" accessible={false} />
        {showWordmark && <Text className="flex-shrink font-poppins-bold text-[20px] leading-7 text-brand">TindaHand</Text>}
      </View>
      {!showWordmark && <View style={{ width: 48 }} />}
    </View>
  );
}
