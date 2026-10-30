import { motion } from '@/constants/motion';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useTranslation } from '@/i18n/use-translation';
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { Keyboard, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming, type DerivedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardIcon, dashboardIcons } from '@/components/dashboard/dashboard-ui';
import tokens from '@/constants/design-tokens.json';
import type { NavigationLabelKey } from '@/i18n';
import { router, useFocusEffect } from 'expo-router';
import { OwnerMenuDrawer } from '@/components/menu/owner-menu-drawer';
import { MenuIcon } from '@/components/menu/menu-icon';
import { PosIcon } from '@/components/pos/pos-icon';
import { useAuthFlow } from '@/state/auth-flow';
import { navigationItems, useNavigationMotion } from '@/state/navigation-motion';

type NavigationIcon = typeof navigationItems[number]['icon'];
type NavigationGeometry = { itemWidths: number[]; labelWidths: number[]; indicatorLeft: number; indicatorWidth: number; visible: number };

export function DashboardNavigation({ bottomInset, expanded, onHome, onPos, onUnavailable, renderIcon, onNavigate }: {
  bottomInset: number; expanded: boolean; onHome: () => void; onPos?: () => void;
  onUnavailable: (feature: NavigationLabelKey) => void;
  renderIcon?: (icon: 'home' | 'cart' | 'inventory' | 'menu', selected: boolean) => ReactNode;
  onNavigate?: (action: () => void) => void;
}) {
  const { t } = useTranslation();
  const { owner } = useAuthFlow();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPresented, setMenuPresented] = useState(false);
  const hostId = useId();
  const { pathname, selectedIndex, selection, reduced, height, measurements, setMeasurements, setMenuSelection } = useNavigationMotion();
  const releaseMenuSelection = useCallback(() => {
    setMenuSelection(current => current?.hostId === hostId ? null : current);
  }, [hostId, setMenuSelection]);
  // A retained screen must never reopen its drawer when returning from a tool.
  useFocusEffect(useCallback(() => () => {
    setMenuOpen(false);
    setMenuPresented(false);
    releaseMenuSelection();
  }, [releaseMenuSelection]));
  const onMenuPresentationChange = useCallback((presented: boolean) => {
    setMenuPresented(presented);
    if (!presented) releaseMenuSelection();
  }, [releaseMenuSelection]);
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Measure the actual host as well as the window; absolute positioning bypasses screen padding.
  const [containerWidth, setContainerWidth] = useState(width);
  const labels = navigationItems.map(({ label }) => t(label));
  const measurementKey = (label: string) => `${fontScale}:${label}`;
  const labelWidths = labels.map(label => measurements[measurementKey(label)] ?? label.length * tokens.navigation.labelFontSize * fontScale);
  const progress = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    // Retarget the current progress on direction changes; never reset to an endpoint.
    // The scroll hook only changes `expanded` after a qualifying direction reversal.
    progress.set(reduced ? Number(expanded) : withTiming(Number(expanded), {
      duration: motion.transition, easing: motion.ease, reduceMotion: ReduceMotion.Never,
    }));
  }, [expanded, progress, reduced]);
  const available = Math.max(0, Math.min(width, containerWidth) - insets.left - insets.right - tokens.spacing.three * 2);
  const minimumWidth = navigationItems.length * tokens.size.touchTarget + Math.max(...labelWidths) + tokens.spacing.two * 2 + 2;
  // Reserve the longest label for every selection so switching routes cannot resize the bar.
  const compactWidth = Math.min(available, Math.max(minimumWidth, tokens.navigation.maxWidth - tokens.spacing.three * 2));
  const expandedWidth = Math.min(available, Math.max(minimumWidth + tokens.spacing.two, tokens.navigation.expandedMaxWidth - tokens.spacing.three * 2));
  const animatedStyle = useAnimatedStyle(() => ({
    width: compactWidth + (expandedWidth - compactWidth) * progress.value,
    transform: [{ translateY: -tokens.navigation.expandedLift * progress.value }],
  }));
  const itemHeight = Math.max(tokens.size.touchTarget, height - tokens.spacing.two * 2);
  // One geometry calculation drives every slot, label, and the single opaque indicator.
  // Sharing the width budget prevents overlap even when a transition is interrupted.
  const geometry = useDerivedValue<NavigationGeometry>(() => {
    const barWidth = compactWidth + (expandedWidth - compactWidth) * progress.value;
    const innerWidth = barWidth - tokens.spacing.one * 2 - 2;
    const budget = Math.max(0, innerWidth - tokens.size.touchTarget * navigationItems.length);
    const spaces = labelWidths.map(labelWidth => Math.min(labelWidth + tokens.spacing.two, budget));
    const weights = selection.value;
    const itemWidths = spaces.map((space, index) => tokens.size.touchTarget + space * weights[index]);
    const gap = Math.max(0, innerWidth - itemWidths.reduce((sum, itemWidth) => sum + itemWidth, 0)) / navigationItems.length;
    let left = tokens.spacing.one + gap / 2;
    let indicatorLeft = 0;
    let indicatorWidth = tokens.size.touchTarget;
    for (let index = 0; index < navigationItems.length; index++) {
      indicatorLeft += left * weights[index];
      indicatorWidth += spaces[index] * weights[index];
      left += itemWidths[index] + gap;
    }
    return {
      itemWidths,
      labelWidths: spaces.map(space => Math.max(0, space - tokens.spacing.two)),
      indicatorLeft: Math.max(tokens.spacing.one, Math.min(indicatorLeft, barWidth - indicatorWidth - tokens.spacing.one - 2)),
      indicatorWidth,
      visible: Math.min(1, weights.reduce((sum, weight) => sum + weight, 0)),
    };
  });
  const indicatorStyle = useAnimatedStyle(() => ({
    left: geometry.value.indicatorLeft, width: geometry.value.indicatorWidth, opacity: geometry.value.visible,
  }));
  const renderBar = (inDrawer = false) => <View pointerEvents={inDrawer ? 'none' : menuOpen || menuPresented ? 'none' : 'box-none'} className="absolute items-center"
    accessibilityElementsHidden={!inDrawer && (menuOpen || menuPresented)}
    importantForAccessibility={!inDrawer && (menuOpen || menuPresented) ? 'no-hide-descendants' : 'auto'}
    aria-hidden={!inDrawer && (menuOpen || menuPresented)}
    onLayout={({ nativeEvent }) => setContainerWidth(nativeEvent.layout.width)}
    style={{ left: 0, right: 0, paddingLeft: insets.left, paddingRight: insets.right, bottom: bottomInset + tokens.spacing.two,
      opacity: !inDrawer && (menuOpen || menuPresented) ? 0 : 1 }}>
    <Animated.View testID={inDrawer ? 'dashboard-navigation-drawer' : 'dashboard-navigation'} accessibilityLabel={t('navigation.main')} style={[styles.bar, { height }, animatedStyle]}>
      <Animated.View testID="navigation-active-indicator" pointerEvents="none" style={[styles.pill,
        { height: itemHeight, top: (height - itemHeight) / 2 - 1 }, indicatorStyle]} />
      <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
        style={styles.measurements}>
        <View style={{ flexDirection: 'row', width: 10000 }}>
          {labels.map(label => <Text key={measurementKey(label)} style={styles.label} numberOfLines={1}
            onLayout={({ nativeEvent }) => {
              // onLayout can round fractional glyph widths down on web/native.
              const measured = Math.ceil(nativeEvent.layout.width) + tokens.spacing.half;
              if (measured > 0) setMeasurements(previous => previous[measurementKey(label)] === measured ? previous : { ...previous, [measurementKey(label)]: measured });
            }}>{label}</Text>)}
        </View>
      </View>
      {navigationItems.map(({ icon }, index) => <NavigationItem key={icon} icon={icon} label={labels[index]} index={index}
        selected={index === selectedIndex} menuOpen={menuOpen} renderIcon={renderIcon} geometry={geometry} decorative={inDrawer}
        onPress={() => {
          if (icon === 'menu') {
            if (owner) {
              Keyboard.dismiss();
              if (!menuOpen) setMenuSelection({ hostId, pathname });
              setMenuOpen(value => !value);
            }
            else onUnavailable(navigationItems[index].label);
            return;
          }
          if (icon !== 'home' && selectedIndex === index && !menuOpen && !menuPresented) return;
          setMenuOpen(false);
          const action = () => {
            if (icon === 'home') onHome();
            else if (icon === 'cart' && onPos) onPos();
            else if (icon === 'inventory') router.navigate('/owner-inventory');
            else onUnavailable(navigationItems[index].label);
          };
          if (onNavigate) onNavigate(action); else action();
        }} />)}
    </Animated.View>
  </View>;
  return <>
    {renderBar()}
    {owner && <OwnerMenuDrawer owner={owner} visible={menuOpen} onClose={() => setMenuOpen(false)}
      navigation={renderBar(true)} onPresentationChange={onMenuPresentationChange} onNavigate={onNavigate} />}
  </>;
}

function NavigationItem({ icon, label, index, selected, menuOpen, renderIcon, geometry, decorative, onPress }: {
  icon: NavigationIcon; label: string; index: number; selected: boolean; menuOpen: boolean;
  renderIcon?: (icon: NavigationIcon, selected: boolean) => ReactNode;
  geometry: DerivedValue<NavigationGeometry>; decorative: boolean; onPress: () => void;
}) {
  const { selection, height } = useNavigationMotion();
  const itemStyle = useAnimatedStyle(() => ({ width: geometry.value.itemWidths[index] }));
  const labelStyle = useAnimatedStyle(() => ({
    width: geometry.value.labelWidths[index],
    opacity: selection.value[index] * selection.value[index],
    transform: [{ translateX: tokens.spacing.one * (1 - selection.value[index]) }],
  }));
  const inactiveIcon = useAnimatedStyle(() => ({ opacity: 1 - selection.value[index] }));
  const activeIcon = useAnimatedStyle(() => ({ opacity: selection.value[index] }));
  const iconContent = (active: boolean) => icon === 'menu'
    ? <MenuIcon name={active ? 'menuActive' : 'menu'} size={tokens.size.navigationIcon} />
    : renderIcon ? renderIcon(icon, active)
      : icon === 'home' ? <PosIcon name="home" size={tokens.size.navigationIcon} active={active}
          color={active ? tokens.color.navigationText : undefined} />
        : <DashboardIcon source={dashboardIcons[icon]} size={tokens.size.navigationIcon} />;
  return <Animated.View style={[styles.item, { height: Math.max(tokens.size.touchTarget, height - tokens.spacing.two * 2) }, itemStyle]}>
    <Pressable accessibilityRole={icon === 'menu' ? 'button' : 'tab'} accessibilityLabel={label}
      accessibilityState={icon === 'menu' ? { expanded: menuOpen, selected } : { selected }}
      aria-selected={icon === 'menu' ? undefined : selected} onPress={onPress} disabled={decorative} accessible={!decorative} focusable={!decorative}
      className="focus:outline focus:outline-2 focus:outline-action" style={styles.touchTarget}>
      <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={styles.contents}>
        <View testID={`navigation-icon-${icon}`} style={styles.icon}>
          <Animated.View style={[styles.iconLayer, inactiveIcon]}>{iconContent(false)}</Animated.View>
          <Animated.View style={[styles.iconLayer, activeIcon]}>{iconContent(true)}</Animated.View>
        </View>
        <Animated.View testID={`navigation-label-${icon}`} style={[styles.labelContainer, labelStyle]}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.label}>{label}</Text>
        </Animated.View>
      </View>
    </Pressable>
  </Animated.View>;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: tokens.spacing.one,
    borderRadius: tokens.navigation.cornerRadius, borderWidth: 1, borderColor: tokens.color.navigationBorder, backgroundColor: tokens.color.navigationSurface,
  },
  measurements: { position: 'absolute', width: '100%', overflow: 'hidden', opacity: 0 },
  item: { minWidth: tokens.size.touchTarget, minHeight: tokens.size.touchTarget, flexShrink: 0 },
  touchTarget: { flex: 1, borderRadius: tokens.radius.card, overflow: 'hidden', justifyContent: 'center' },
  pill: { position: 'absolute', borderRadius: tokens.radius.card, backgroundColor: tokens.color.navigationActive },
  contents: { flexDirection: 'row', alignItems: 'center' },
  iconLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  icon: { height: tokens.size.navigationIcon, width: tokens.size.touchTarget, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  labelContainer: { flexShrink: 0, marginRight: tokens.spacing.two },
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: tokens.navigation.labelFontSize, lineHeight: tokens.navigation.labelLineHeight, color: tokens.color.navigationText },
});
