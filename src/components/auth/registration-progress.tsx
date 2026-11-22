import { Text, View } from 'react-native';
import { useTranslation } from '@/i18n/use-translation';

export function RegistrationProgress({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  return (
    <View className="items-center pt-4">
      <View accessible accessibilityLabel={t('auth.progress', { step })} className="mt-3 flex-row items-center">
        {[1, 2, 3].map((item) => (
          <View key={item} className="flex-row items-center">
            {item > 1 && <View className="mx-1 h-px w-10 bg-outline" />}
            <View className={`min-h-9 min-w-9 items-center justify-center rounded-full border border-action ${item <= step ? 'bg-action' : 'bg-white'}`}>
              <Text className={` type-label-nav leading-[18px] ${item <= step ? 'text-white' : 'text-action'}`}>{item}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
