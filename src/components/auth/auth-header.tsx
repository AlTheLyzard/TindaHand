import { BackButton } from '@/components/ui/back-button';
import { useTranslation } from '@/i18n/use-translation';
import { Image, Text, View, useWindowDimensions } from 'react-native';

export function AuthHeader({ onBack, backLabel, showWordmark = true, backDisabled = false }: {
  onBack: () => void;
  backLabel?: string;
  showWordmark?: boolean;
  backDisabled?: boolean;
}) {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  return (
    <View className="flex-row items-center justify-between gap-3">
      <BackButton accessibilityLabel={backLabel ?? t('common.back')} disabled={backDisabled} onPress={onBack} />
      <View className={showWordmark ? 'min-w-0 flex-shrink flex-row items-center gap-3' : 'flex-1 items-center'}>
        {showWordmark && <Image source={require('@/assets/images/brand/tindahand-mark.png')}
          style={{ width: 34, height: 34 }} resizeMode="contain" accessible={false} />
        }
        <Text className="flex-shrink type-title-accent text-brand" style={{ lineHeight: 28 * fontScale }}>TindaHand</Text>
      </View>
      {!showWordmark && <View style={{ width: 48 }} />}
    </View>
  );
}
