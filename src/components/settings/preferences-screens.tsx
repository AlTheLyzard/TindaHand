import tokens from '@/constants/design-tokens.json';
import { router, type Href } from 'expo-router';
import { Text, View } from 'react-native';
import { EmptyState } from '@/components/ui/content-state';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PosIcon } from '@/components/pos/pos-icon';
import { SettingsFrame, settingsRoot } from './settings-frame';
import { SettingsCard, SettingsDescription, SettingsRow, SettingsSection } from './settings-ui';
import { SettingsIcon } from './settings-icon';
import { Button } from '@/components/ui/button';
import { useAuthFlow } from '@/state/auth-flow';
import { useTranslation } from '@/i18n/use-translation';

export function SettingsLandingScreen() {
  return <SettingsFrame title="Settings" parent="/owner-dashboard">
    <View className="mb-3"><SettingsDescription>Make TindaHand work for your store</SettingsDescription></View>
    <SettingsSection>PREFERENCES</SettingsSection>
    <SettingsRow title="Language" description="English" icon="language" onPress={() => router.navigate(`${settingsRoot}/language`)} />
    <View className="h-1" /><SettingsSection>SECURITY</SettingsSection>
    <SettingsRow title="Security & Access" description="Change PIN" icon="security" onPress={() => router.navigate(`${settingsRoot}/security`)} />
    <SettingsRow title="Kahera Management" description="Add and manage your store's cashiers." icon="manageOperators" onPress={() => router.navigate(`${settingsRoot}/users`)} />
    <View className="h-1" /><SettingsSection>STORE TOOLS</SettingsSection>
    <SettingsRow title="Data Management" description="Data synchronization and device storage." icon="data" onPress={() => router.navigate(`${settingsRoot}/data`)} />
    <View className="h-1" /><SettingsSection>HELP & SUPPORT</SettingsSection>
    <SettingsRow title="App Guide & Tutorial" description="Learn how to use TindaHand" icon="help" onPress={() => router.navigate(`${settingsRoot}/guide`)} />
    <SettingsRow title="Replay App Walkthrough" description="View the introduction again" icon="replay" onPress={() => router.navigate(`${settingsRoot}/replay`)} />
  </SettingsFrame>;
}
export function LanguageScreen({ parent }: { parent?: Href } = {}) {
  const { locale } = useTranslation();
  const englishActive = locale === 'en';
  return <SettingsFrame title="Language" parent={parent}>
    <SettingsDescription>Your app language</SettingsDescription>
    <SettingsSection>PREFERENCES</SettingsSection>
    <View className="rounded-control border bg-white px-4 py-1" style={{ borderColor: tokens.color.borderOutline }}>
      <View accessibilityRole="radio" accessibilityState={{ checked: englishActive }} accessibilityLabel={`English${englishActive ? ', current language' : ''}`} className="min-h-12 flex-row items-center justify-between gap-3 py-1">
        <Text className="type-list-financial leading-6 text-text-primary">English</Text>
        <View className="h-10 w-10 items-center justify-center">{englishActive ? <PosIcon name="check" size={22} color={tokens.color.black} active /> : null}</View>
      </View>
      <View className="border-t border-outline" />
      <Pressable disabled accessibilityRole="radio" accessibilityState={{ disabled: true, checked: false }} accessibilityLabel="Tagalog, unavailable until the Filipino language pack is approved" className="min-h-12 flex-row items-center justify-between gap-3 py-1">
        <Text className="type-list-financial leading-6 text-text-primary">Tagalog</Text>
        <View className="h-10 w-10" />
      </Pressable>
    </View>
    <View className="mt-6 gap-2 rounded-control border bg-accent-soft p-4" style={{ borderColor: tokens.color.brightBlue }}>
      <Text className="type-button-cta leading-[21px] text-brand">English is currently available</Text>
      <Text className="type-micro-financial-rate leading-[22px] text-text-secondary">Tagalog will be available when its translation is ready.</Text>
    </View>
  </SettingsFrame>;
}
export function HelpScreen() {
  return <SettingsFrame title="Help & FAQs"><EmptyState title="Help content unavailable" description="Approved help guides and FAQs have not been provided yet. Please check back when this content is available." icon="alert" /></SettingsFrame>;
}
export function SecurityScreen() {
  const { owner } = useAuthFlow();
  if (!owner) return null;
  return <SettingsFrame title="Security & Access">
    <SettingsDescription>Manage the PINs used to access your TindaHand account and cashier account.</SettingsDescription>
    <SettingsCard>
      <View className="gap-5">
        <View>
          <View className="mb-5 flex-row items-center gap-4">
            <View className="h-12 w-12 items-center justify-center rounded-control bg-canvas"><SettingsIcon name="profile" size={28} /></View>
            <View className="flex-1 gap-1"><Text className="type-button-cta leading-[21px] text-text-primary">My PIN</Text><Text className="type-micro-financial-rate leading-[21px] text-text-secondary">Your personal May-Ari access PIN.</Text></View>
          </View>
          <Button onPress={() => router.navigate(`${settingsRoot}/change-pin`)}>Change my PIN</Button>
        </View>
        <View className="border-t border-outline" />
        <View>
          <View className="mb-5 flex-row items-center gap-4">
            <View className="h-12 w-12 items-center justify-center rounded-control bg-canvas"><SettingsIcon name="manageOperators" size={28} /></View>
            <View className="flex-1 gap-1"><Text className="type-button-cta leading-[21px] text-text-primary">Kahera&apos;s PIN</Text><Text className="type-micro-financial-rate leading-[21px] text-text-secondary">Manage your cashier&apos;s access PIN.</Text></View>
          </View>
          <Button onPress={() => router.navigate(`${settingsRoot}/cashier-pins`)}>Change Kahera PIN</Button>
        </View>
      </View>
    </SettingsCard>
  </SettingsFrame>;
}
