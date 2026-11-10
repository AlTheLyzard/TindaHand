import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { EmptyState } from '@/components/ui/content-state';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PosIcon } from '@/components/pos/pos-icon';
import { SettingsFrame, settingsRoot } from './settings-frame';
import { SettingsCard, SettingsDescription, SettingsRow, SettingsSection } from './settings-ui';
import { SettingsIcon } from './settings-icon';
import { Button } from '@/components/ui/button';
import { useAuthFlow } from '@/state/auth-flow';

export function SettingsLandingScreen() {
  return <SettingsFrame title="Settings" landing parent="/owner-dashboard">
    <View className="mb-3"><SettingsDescription>Make TindaHand work for your store</SettingsDescription></View>
    <SettingsSection>PREFERENCES</SettingsSection>
    <SettingsRow title="Language" description="English" icon="language" onPress={() => router.navigate(`${settingsRoot}/language`)} />
    <View className="h-1" /><SettingsSection>SECURITY</SettingsSection>
    <SettingsRow title="Security & Access" description="Change PIN" icon="security" onPress={() => router.navigate(`${settingsRoot}/security`)} />
    <SettingsRow title="User Management" description="Add and manage your store's Operators." icon="security" onPress={() => router.navigate(`${settingsRoot}/users`)} />
    <View className="h-1" /><SettingsSection>STORE TOOLS</SettingsSection>
    <SettingsRow title="Data Management" description="Data synchronization and device storage." icon="data" onPress={() => router.navigate(`${settingsRoot}/data`)} />
    <View className="h-1" /><SettingsSection>SUPPORT</SettingsSection>
    <SettingsRow title="Help & FAQs" description="Guides for everyday store operations" icon="help" onPress={() => router.navigate(`${settingsRoot}/help`)} />
  </SettingsFrame>;
}
export function LanguageScreen() {
  return <SettingsFrame title="Language">
    <SettingsDescription>Your app display language</SettingsDescription>
    <SettingsCard>
      <View accessibilityRole="radio" accessibilityState={{ checked: true }} accessibilityLabel="English, current language" className="flex-row items-center gap-3 pb-4">
        <View className="h-9 w-9 items-center justify-center rounded-control bg-canvas"><PosIcon name="checkCircle" color="#112F6F" /></View>
        <View className="flex-1 gap-1"><Text className="font-poppins-bold text-[14px] text-[#0C1B3C]">English</Text><Text className="font-poppins text-[12px] text-text-secondary">Current language</Text></View>
      </View>
      <Pressable disabled accessibilityRole="radio" accessibilityState={{ disabled: true, checked: false }} accessibilityLabel="Tagalog, coming soon" className="min-h-12 flex-row items-center gap-3 border-t border-[#ADC9EE] pt-4">
        <View className="h-9 w-9 items-center justify-center rounded-control bg-canvas"><SettingsIcon name="lock" /></View>
        <View className="flex-1 gap-1"><Text className="font-poppins-bold text-[14px] text-[#0C1B3C]">Tagalog</Text><Text className="font-poppins text-[12px] text-text-secondary">Coming soon</Text></View>
      </Pressable>
    </SettingsCard>
    <View className="mt-4 gap-2 rounded-control bg-[#D1E1F5] p-4"><Text className="font-poppins-bold text-[12px] text-brand">English is currently available</Text><Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">Tagalog support is coming soon.</Text></View>
  </SettingsFrame>;
}
export function HelpScreen() {
  return <SettingsFrame title="Help & FAQs"><EmptyState title="Help content unavailable" description="Approved help guides and FAQs have not been provided yet. Please check back when this content is available." icon="alert" /></SettingsFrame>;
}
export function SecurityScreen() {
  const { lock } = useAuthFlow();
  return <SettingsFrame title="Security & Access">
    <SettingsDescription>Manage the PINs used to access your Owner account and your store&apos;s Operator accounts.</SettingsDescription>
    <SettingsCard>
      <View className="mb-6 mt-3 flex-row items-center gap-4">
        <View className="h-9 w-9 items-center justify-center rounded-control bg-canvas"><PosIcon name="checkCircle" color="#112F6F" /></View>
        <View className="flex-1 gap-2"><Text className="font-poppins-bold text-[14px] text-[#0C1B3C]">My PIN</Text><Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">Your personal Owner access PIN.</Text></View>
      </View>
      <Button onPress={() => router.navigate(`${settingsRoot}/change-pin`)}>Change My PIN</Button>
      <View className="my-5 border-t border-[#ADC9EE]" />
      <View className="mb-6 flex-row items-center gap-4">
        <View className="h-9 w-9 items-center justify-center rounded-control bg-canvas"><SettingsIcon name="lock" /></View>
        <View className="flex-1 gap-2"><Text className="font-poppins-bold text-[14px] text-[#0C1B3C]">Operator PIN</Text><Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">Manage your Operators&apos; access PINs.</Text></View>
      </View>
      <Button onPress={() => router.navigate(`${settingsRoot}/cashier-pins`)}>Manage Operator PINs</Button>
      <View className="h-4" />
      <Button variant="secondary" onPress={() => { void lock().then(() => { router.dismissAll(); router.replace({ pathname: '/login', params: { role: 'owner' } }); }); }}>Lock App</Button>
      <Text className="mt-3 font-poppins text-[12px] leading-[18px] text-text-secondary">Locking keeps this device session for PIN unlock. Full logout ends the session and requires your password.</Text>
    </SettingsCard>
  </SettingsFrame>;
}
