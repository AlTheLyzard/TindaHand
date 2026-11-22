import { ButtonSurface } from '@/components/ui/button';
import type { ReactNode } from 'react';
import { Image, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import tokens from '@/constants/design-tokens.json';

export function DashboardCircle({ children, size = tokens.size.badge, backgroundColor = tokens.color.softBlue, borderColor }: {
  children?: ReactNode; size?: number; backgroundColor?: string; borderColor?: string;
}) {
  return <View style={{ width: size, height: size, flexShrink: 0, borderRadius: tokens.radius.pill,
    alignItems: 'center', justifyContent: 'center', backgroundColor,
    borderColor, borderWidth: borderColor ? 1.5 : 0 }}>{children}</View>;
}

export const dashboardIcons = {
  bottle: require('@/assets/images/dashboard/bottle.png'),
};

export function DashboardIcon({ source, size = 32 }: { source: ImageSourcePropType; size?: number }) {
  return <Image source={source} style={{ width: size, height: size }} resizeMode="contain" accessible={false} />;
}

export function DashboardAction({ label, onPress, children, selected = false, tab = false, interactionBackgroundColor }: {
  label: string; onPress: () => void; children: ReactNode; selected?: boolean; tab?: boolean;
  interactionBackgroundColor?: string;
}) {
  return <ButtonSurface variant="text" accessibilityRole={tab ? 'tab' : 'button'} accessibilityLabel={label} accessibilityState={{ selected }} aria-selected={tab ? selected : undefined}
    onPress={onPress} interactionBackgroundColor={interactionBackgroundColor} style={{ minWidth: tokens.size.touchTarget, minHeight: tokens.size.touchTarget }}
    className="items-center justify-center rounded-pill focus:outline focus:outline-2 focus:outline-action">
    {children}
  </ButtonSurface>;
}

export function DashboardCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const { fontScale } = useWindowDimensions();
  return <View className="rounded-card bg-white px-5 pb-5 pt-5" style={{ borderWidth: 1, borderColor: tokens.color.borderOutline }}>
    <View className="mb-4 flex-row items-center justify-between gap-2">
      <Text accessibilityRole="header" className="flex-shrink type-h2-section text-text-primary">{title}</Text>
      {/* Center the full touch target on the title line without increasing its top inset. */}
      {action && <View style={{ height: tokens.typography.h2Section.lineHeight * fontScale, flexShrink: 0, justifyContent: 'center' }}>{action}</View>}
    </View>
    {children}
  </View>;
}
