import { Image } from 'expo-image';
import { Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
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

/** One measured underline shares the icon/label clock, including interrupted transitions. */
export function BottomNavigation({ role, bottomInset, selectedIndex, selection, centers, menuOpen = false, onPress }: {
  role: AccountRole; bottomInset: number; selectedIndex: number; selection: SharedValue<number[]>;
  centers: SharedValue<Record<AccountRole, number[]>>;
  menuOpen?: boolean; onPress: (icon: NavigationIcon) => void;
}) {
  const { fontScale } = useWindowDimensions();
  const items = bottomNavigationItems.filter(item => role === 'owner' || item.icon !== 'home');
  // Large text keeps the same touch slots and full accessible labels. Give the label
  // the icon's space, wrap to two lines, and fit within the fixed navigation area.
  const largeText = fontScale > 1.25;
  const indicatorStyle = useAnimatedStyle(() => {
    let position = 0;
    let visible = 0;
    let measured = true;
    items.forEach(item => {
      const index = bottomNavigationItems.findIndex(value => value.icon === item.icon);
      const center = centers.value[role][index];
      if (center < 0) measured = false;
      const weight = selection.value[index];
      position += center * weight;
      visible += weight;
    });
    return {
      transform: [{ translateX: position - tokens.navigation.indicatorWidth / 2 }],
      opacity: measured ? visible : 0,
    };
  });
  return <View testID="dashboard-navigation"
    accessibilityLabel="Main navigation" style={[styles.surface, { paddingBottom: bottomInset }]}>
    <View style={styles.items}>
      {items.map(({ icon, label }) => <NavigationItem key={icon} icon={icon} label={label}
        index={bottomNavigationItems.findIndex(item => item.icon === icon)} selectedIndex={selectedIndex}
        selection={selection} menuOpen={menuOpen} largeText={largeText}
        onLayout={({ nativeEvent: { layout } }) => {
          const index = bottomNavigationItems.findIndex(item => item.icon === icon);
          const measuredCenter = layout.x + layout.width / 2;
          // Layout events arrive together on native. Merge on the UI runtime so
          // queued writes cannot overwrite another item's measurement.
          centers.modify(previous => {
            'worklet';
            return { ...previous,
              [role]: previous[role].map((center, slot) => slot === index ? measuredCenter : center),
            };
          });
        }} onPress={() => onPress(icon)} />)}
      <Animated.View testID="navigation-active-indicator" pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
    </View>
    <View pointerEvents="none" style={styles.border} />
  </View>;
}

function NavigationItem({ icon, label, index, selectedIndex, selection, menuOpen, largeText, onPress, onLayout }: {
  icon: NavigationIcon; label: string; index: number; selectedIndex: number; selection: SharedValue<number[]>;
  menuOpen: boolean; largeText: boolean; onPress: () => void; onLayout: (event: LayoutChangeEvent) => void;
}) {
  const inactiveIcon = useAnimatedStyle(() => ({ opacity: 1 - selection.value[index] }));
  const activeIcon = useAnimatedStyle(() => ({ opacity: selection.value[index] }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(selection.value[index], [0, 1], [tokens.color.textSecondary, tokens.color.accentBase]),
  }));
  return <Pressable accessibilityRole="tab" accessibilityLabel={label}
    accessibilityHint={icon === 'menu' ? 'Opens More Tools' : undefined}
    accessibilityState={icon === 'menu' ? { selected: index === selectedIndex, expanded: menuOpen } : { selected: index === selectedIndex }}
    aria-selected={index === selectedIndex} onLayout={onLayout} onPress={onPress}
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
  // Keep the traveling underline inside the fixed bar during layout changes.
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
