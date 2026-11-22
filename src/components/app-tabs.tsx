import { useTranslation } from '@/i18n/use-translation';
import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import tokens from '@/constants/design-tokens.json';
import { PosIcon } from '@/components/pos/pos-icon';

export default function AppTabs() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('navigation.home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={{
          default: <PosIcon name="home" color={tokens.color.textSecondary} size={24} />,
          selected: <PosIcon name="home" color={tokens.color.accentBase} size={24} />,
        }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>{t('navigation.explore')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={{
          default: <PosIcon name="scan" color={tokens.color.textSecondary} size={24} />,
          selected: <PosIcon name="scan" color={tokens.color.accentBase} size={24} />,
        }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
