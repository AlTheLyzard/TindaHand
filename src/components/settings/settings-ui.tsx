import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PosIcon } from '@/components/pos/pos-icon';
import { SettingsIcon } from './settings-icon';
import type { Cashier } from '@/types/settings';
import type { OwnerIdentity } from '@/types/auth';
import tokens from '@/constants/design-tokens.json';
import { RoleIcon } from '@/components/auth/account-role-card';

export function SettingsDescription({ children }: { children: ReactNode }) {
  return <Text className="mb-5 font-poppins text-[14px] leading-[22px] text-text-secondary">{children}</Text>;
}
export function SettingsSection({ children }: { children: string }) {
  return <Text className="mb-4 mt-1 font-poppins-bold text-[12px] leading-[18px] text-text-secondary">{children}</Text>;
}
export function SettingsCard({ children }: { children: ReactNode }) {
  return <View className="rounded-control border bg-white p-4" style={{ borderColor: tokens.color.borderOutline }}>{children}</View>;
}
export function SettingsRow({ title, description, icon, onPress }: {
  title: string; description: string; icon: ComponentProps<typeof SettingsIcon>['name']; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" onPress={onPress}
    className="mb-3 min-h-[68px] flex-row items-center gap-3 rounded-control border bg-white px-4 py-3 active:bg-[#D9E7F4]" style={{ borderColor: tokens.color.borderOutline }}>
    <View className="h-9 w-9 items-center justify-center rounded-control bg-canvas"><SettingsIcon name={icon} /></View>
    <View className="min-w-0 flex-1 gap-1">
      <Text className="font-poppins-bold text-[14px] leading-[21px] text-[#0C1B3C]">{title}</Text>
      <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">{description}</Text>
    </View>
    <PosIcon name="chevronRight" color="#112F6F" size={20} />
  </Pressable>;
}
export function SettingsNotice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="my-3 font-poppins text-[12px] leading-[18px]" style={{ color: error ? '#972020' : '#1D5D21' }}>{children}</Text>;
}
export function OwnerStoreCard({ owner, compact = false }: { owner: OwnerIdentity; compact?: boolean }) {
  return <View className="mb-8 flex-row items-center gap-3 rounded-control border border-[#ADC9EE] bg-[#C6D9D2] p-5">
    <RoleIcon owner color="#1D5D21" />
    <View className="min-w-0 flex-1 gap-1">
      <Text className="font-poppins-bold text-[12px] leading-[18px] text-[#0C1B3C]">{owner.name}</Text>
      <Text className="font-poppins-bold text-[22px] leading-[33px] text-[#1D5D21]">{owner.id}</Text>
      {!compact && <Text className="font-poppins text-[11px] leading-4 text-text-secondary">Associated Owner / Store ID</Text>}
    </View>
  </View>;
}
export function CashierIdentity({ cashier }: { cashier: Cashier }) {
  return <View className="flex-row flex-wrap items-center gap-3">
    <View className="h-9 w-9 items-center justify-center rounded-control bg-canvas"><PosIcon name="profile" color="#112F6F" /></View>
    <View className="min-w-[120px] flex-1 gap-1">
      <Text className="font-poppins-bold text-[14px] leading-[21px] text-[#0C1B3C]">{cashier.name}</Text>
      <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">{cashier.id}</Text>
    </View>
    <View className="rounded-control border border-[#1D5D21] bg-[#E8F5E9] px-3 py-1">
      <Text className="font-poppins-bold text-[10px] leading-[15px] text-[#1D5D21]">{cashier.status === 'active' ? 'Active' : 'Inactive'}</Text>
    </View>
  </View>;
}
