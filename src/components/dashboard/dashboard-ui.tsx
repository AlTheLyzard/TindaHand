import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import type { ReactNode } from 'react';
import { Image, Text, View, type ImageSourcePropType } from 'react-native';
import tokens from '@/constants/design-tokens.json';

export function DashboardCircle({ children, size = tokens.size.badge, backgroundColor = '#D1E2F8', borderColor }: {
  children: ReactNode; size?: number; backgroundColor?: string; borderColor?: string;
}) {
  return <View style={{ width: size, height: size, flexShrink: 0, borderRadius: tokens.radius.pill,
    alignItems: 'center', justifyContent: 'center', backgroundColor,
    borderColor, borderWidth: borderColor ? 1.5 : 0 }}>{children}</View>;
}

export const dashboardIcons = {
  settings: require('@/assets/images/dashboard/settings.png'),
  money: require('@/assets/images/dashboard/money.png'),
  home: require('@/assets/images/dashboard/home.png'),
  cart: require('@/assets/images/dashboard/cart.png'),
  inventory: require('@/assets/images/dashboard/inventory.png'),
  menu: require('@/assets/images/menu/menu.png'),
  bottle: require('@/assets/images/dashboard/bottle.png'),
  payment: require('@/assets/images/dashboard/payment-symbol.png'),
};

export function DashboardIcon({ source, size = 32 }: { source: ImageSourcePropType; size?: number }) {
  return <Image source={source} style={{ width: size, height: size }} resizeMode="contain" accessible={false} />;
}

export function DashboardAction({ label, onPress, children, selected = false, tab = false }: {
  label: string; onPress: () => void; children: ReactNode; selected?: boolean; tab?: boolean;
}) {
  return <Pressable accessibilityRole={tab ? 'tab' : 'button'} accessibilityLabel={label} accessibilityState={{ selected }} aria-selected={tab ? selected : undefined}
    onPress={onPress} style={{ minWidth: tokens.size.touchTarget, minHeight: tokens.size.touchTarget }}
    className="items-center justify-center rounded-pill focus:outline focus:outline-2 focus:outline-action">
    {children}
  </Pressable>;
}

export function DashboardCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <View className="rounded-card bg-white px-5 pb-5 pt-5" style={{ borderWidth: 1, borderColor: tokens.color.borderOutline }}>
    <View className="mb-4 flex-row items-center justify-between gap-2">
      <Text accessibilityRole="header" className="flex-shrink font-poppins-bold text-[18px] leading-[27px] text-[#102342]">{title}</Text>
      {action}
    </View>
    {children}
  </View>;
}
