import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import tokens from '@/constants/design-tokens.json';
import type { AccountRole } from '@/types/auth';

export const bottomNavigationItems = [
  { icon: 'home', label: 'Home' },
  { icon: 'cart', label: 'POS' },
  { icon: 'inventory', label: 'Inventory' },
  { icon: 'menu', label: 'More' },
] as const;
export type NavigationIcon = typeof bottomNavigationItems[number]['icon'];

const icons = {
  home: { normal: require('@/assets/images/navigation/home.svg'), active: require('@/assets/images/navigation/home-active.svg') },
  cart: { normal: require('@/assets/images/navigation/cart.svg'), active: require('@/assets/images/navigation/cart-active.svg') },
  inventory: { normal: require('@/assets/images/navigation/inventory.svg'), active: require('@/assets/images/navigation/inventory-active.svg') },
  menu: { normal: require('@/assets/images/navigation/menu.svg'), active: require('@/assets/images/navigation/menu-active.svg') },
};

/** Fixed geometry shared by route chrome and its decorative copy in More Tools. */
export function BottomNavigation({ role, bottomInset, selectedIndex, selection, menuOpen = false, decorative = false, onPress }: {
  role: AccountRole; bottomInset: number; selectedIndex: number; selection: SharedValue<number[]>;
  menuOpen?: boolean; decorative?: boolean; onPress: (icon: NavigationIcon) => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const [barWidth, setBarWidth] = useState(width);
  const [pressedIcon, setPressedIcon] = useState<NavigationIcon | null>(null);
  const items = bottomNavigationItems.filter(item => role === 'owner' || item.icon !== 'home');
  const slotWidth = barWidth / items.length;
  // Large text keeps the same touch slots and full accessible labels. Give the label
  // the icon's space, wrap to two lines, and fit within the fixed navigation area.
  const largeText = fontScale > 1.25;
  const indicatorStyle = useAnimatedStyle(() => {
    let position = 0;
    let visible = 0;
    items.forEach((item, index) => {
      const weight = selection.value[bottomNavigationItems.findIndex(value => value.icon === item.icon)];
      position += index * weight;
      visible += weight;
    });
    return {
      transform: [{ translateX: slotWidth * (position + 0.5) - tokens.navigation.indicatorWidth / 2 }],
      opacity: visible * (pressedIcon === bottomNavigationItems[selectedIndex]?.icon ? 0.65 : 1),
    };
  });
  return <View testID={decorative ? 'dashboard-navigation-drawer' : 'dashboard-navigation'}
    accessibilityLabel="Main navigation" style={[styles.surface, { paddingBottom: bottomInset }]}
    onLayout={({ nativeEvent }) => setBarWidth(nativeEvent.layout.width)}>
    <View style={styles.items}>
      {items.map(({ icon, label }) => <NavigationItem key={icon} icon={icon} label={label}
        index={bottomNavigationItems.findIndex(item => item.icon === icon)} selectedIndex={selectedIndex}
        selection={selection} menuOpen={menuOpen} largeText={largeText} decorative={decorative}
        onPress={() => onPress(icon)} onPressedChange={pressed => setPressedIcon(pressed ? icon : null)} />)}
      <Animated.View testID="navigation-active-indicator" pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
    </View>
    <View pointerEvents="none" style={styles.border} />
  </View>;
}

function NavigationItem({ icon, label, index, selectedIndex, selection, menuOpen, largeText, decorative, onPress, onPressedChange }: {
  icon: NavigationIcon; label: string; index: number; selectedIndex: number; selection: SharedValue<number[]>;
  menuOpen: boolean; largeText: boolean; decorative: boolean; onPress: () => void; onPressedChange: (pressed: boolean) => void;
}) {
  const inactiveIcon = useAnimatedStyle(() => ({ opacity: 1 - selection.value[index] }));
  const activeIcon = useAnimatedStyle(() => ({ opacity: selection.value[index] }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(selection.value[index], [0, 1], [tokens.color.textSecondary, tokens.color.accentBase]),
  }));
  return <Pressable accessibilityRole="tab" accessibilityLabel={label}
    accessibilityHint={icon === 'menu' ? 'Opens More Tools' : undefined}
    accessibilityState={icon === 'menu' ? { selected: index === selectedIndex, expanded: menuOpen } : { selected: index === selectedIndex }}
    aria-selected={index === selectedIndex} disabled={decorative} accessible={!decorative} focusable={!decorative}
    onPress={onPress} onPressIn={() => onPressedChange(true)} onPressOut={() => onPressedChange(false)}
    className="focus:outline focus:outline-2 focus:outline-action" style={styles.slot}>
    {({ pressed }) => <View pointerEvents="none" accessible={false} accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants" aria-hidden style={[styles.contents, { opacity: pressed ? 0.65 : 1 }]}>
      {!largeText && <View testID={`navigation-icon-${icon}`} style={styles.icon}>
        <Animated.View style={[styles.iconLayer, inactiveIcon]}><Image source={icons[icon].normal} tintColor={tokens.color.textSecondary} style={styles.icon} contentFit="contain" accessible={false} /></Animated.View>
        <Animated.View style={[styles.iconLayer, activeIcon]}><Image source={icons[icon].active} tintColor={tokens.color.accentBase} style={styles.icon} contentFit="contain" accessible={false} /></Animated.View>
      </View>}
      <Animated.Text testID={`navigation-label-${icon}`} numberOfLines={largeText ? 2 : 1}
        adjustsFontSizeToFit={largeText} minimumFontScale={0.5}
        style={[styles.label, largeText && styles.largeLabel, labelStyle]}>{label}</Animated.Text>
    </View>}
  </Pressable>;
}

const styles = StyleSheet.create({
  surface: { backgroundColor: tokens.color.navigationSurface },
  // Overlay the border so it does not add to the 56-unit height.
  border: { position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: tokens.color.borderOutline },
  // Retained stack screens may keep a previous indicator position after resizing.
  // Clip the decorative indicator to its fixed bar, including during transitions.
  items: { height: tokens.navigation.height, flexDirection: 'row', overflow: 'hidden' },
  slot: { flex: 1, minWidth: 0, height: tokens.navigation.height, justifyContent: 'flex-start', paddingTop: 5 },
  contents: { alignItems: 'center', gap: tokens.navigation.iconLabelGap },
  icon: { width: tokens.size.navigationIcon, height: tokens.size.navigationIcon },
  iconLayer: { position: 'absolute', top: 0, left: 0 },
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: tokens.navigation.labelFontSize,
    lineHeight: tokens.navigation.labelLineHeight, textAlign: 'center', includeFontPadding: false, width: '100%' },
  largeLabel: { paddingHorizontal: 2, height: 44, textAlignVertical: 'center' },
  indicator: { position: 'absolute', left: 0, bottom: tokens.navigation.indicatorBottom,
    width: tokens.navigation.indicatorWidth, height: tokens.navigation.indicatorHeight,
    borderRadius: tokens.navigation.indicatorHeight / 2, backgroundColor: tokens.color.accentBase },
});
