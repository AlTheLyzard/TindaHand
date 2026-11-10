import { Text, View } from 'react-native';
import { useTranslation } from '@/i18n/use-translation';

export function RegistrationProgress({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  return (
    <View className="items-center pt-4">
      <Text className="font-poppins-bold text-[22px] leading-[32px] text-brand">TindaHand</Text>
      <View accessible accessibilityLabel={t('auth.progress', { step })} className="mt-3 flex-row items-center">
        {[1, 2, 3].map((item) => (
          <View key={item} className="flex-row items-center">
            {item > 1 && <View className="mx-1 h-px w-10 bg-[#AFC8E8]" />}
            <View className={`min-h-5 min-w-6 items-center justify-center rounded-full border border-action px-1 ${item <= step ? 'bg-action' : 'bg-white'}`}>
              <Text className={`font-poppins-bold text-[12px] leading-[18px] ${item <= step ? 'text-white' : 'text-action'}`}>{item}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
