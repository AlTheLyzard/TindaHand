import type { ViewInstance } from 'react-native';
import { useOverlayTransition } from '@/hooks/use-overlay-transition';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import tokens from '@/constants/design-tokens.json';
import { useNavigationHeight } from '@/state/navigation-motion';
import { useTranslation } from '@/i18n/use-translation';
import { PosIcon } from '@/components/pos/pos-icon';

const actions = ['dashboard.quick.customerDebt', 'dashboard.quick.storeDebt', 'dashboard.quick.expense'] as const;
export type QuickAddAction = (typeof actions)[number];
const actionIcons = {
  'dashboard.quick.customerDebt': 'customerDebt',
  'dashboard.quick.storeDebt': 'storeDebt',
  'dashboard.quick.expense': 'expense',
} as const;

/** Dashboard shortcuts only; transaction destinations remain owned by their features. */
export function DashboardQuickAdd({ onSelect }: { onSelect: (action: QuickAddAction) => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigationHeight = useNavigationHeight();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<{ right: number; bottom: number; width: number; maxHeight: number } | null>(null);
  const trigger = useRef<ViewInstance>(null);
  const modalHost = useRef<ViewInstance>(null);
  const menuOpen = useRef(false);
  const restoreFocus = useRef(true);
  const pendingAction = useRef<QuickAddAction | null>(null);
  const motion = useOverlayTransition(open, () => {
    if (pendingAction.current) {
      const action = pendingAction.current;
      pendingAction.current = null;
      onSelect(action);
    } else if (restoreFocus.current) trigger.current?.focus();
  });
  const backdrop = useAnimatedStyle(() => ({ opacity: motion.progress.value }));
  const surface = useAnimatedStyle(() => ({ opacity: motion.progress.value,
    transform: [{ translateY: motion.reduced ? 0 : 12 * (1 - motion.progress.value) }] }));
  const toggleStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${motion.reduced ? 45 : motion.progress.value * 45}deg` }] }));
  // Reserve the expanded navigation's highest position, even while it animates.
  const clearance = navigationHeight + tokens.spacing.two + tokens.navigation.expandedLift + tokens.spacing.three;
  const close = () => { restoreFocus.current = true; menuOpen.current = false; setOpen(false); };
  function measurePlacement() {
    modalHost.current?.measureInWindow((originX, originY, hostWidth, hostHeight) => {
      trigger.current?.measureInWindow((x, y, width, height) => {
        if (!menuOpen.current || !hostWidth || !width || !height) return;
        // Convert the actual trigger rectangle into the modal's coordinate space.
        // The modal may have a different origin because of native system bars.
        setPlacement({
          right: originX + hostWidth - x - width,
          bottom: originY + hostHeight - y - height,
          width: Math.min(460 - tokens.spacing.three * 2, x + width - originX - insets.left - tokens.spacing.three),
          maxHeight: Math.max(height, y + height - Math.max(originY, insets.top) - tokens.spacing.three),
        });
      });
    });
  }
  function expand() {
    if (menuOpen.current || motion.presented) return;
    restoreFocus.current = true;
    menuOpen.current = true;
    setPlacement(null);
    setOpen(true);
  }
  const toggle = (expanded: boolean) => <Pressable ref={expanded ? undefined : trigger}
    accessibilityRole="button" accessibilityLabel={t(expanded ? 'dashboard.quick.close' : 'dashboard.quick.open')}
    accessibilityState={{ expanded }} onPress={expanded ? close : expand}
    style={styles.trigger} className="focus:outline focus:outline-2 focus:outline-action">
    {expanded ? <Animated.View style={toggleStyle}><PosIcon name="plus" size={32} color="#FFFFFF" active /></Animated.View>
      : <PosIcon name="plus" size={32} color="#FFFFFF" active />}
  </Pressable>;

  return <>
    <View pointerEvents={motion.presented ? "none" : "box-none"} accessibilityElementsHidden={motion.presented} importantForAccessibility={motion.presented ? "no-hide-descendants" : "auto"} className="absolute w-full max-w-[460px] self-center"
      style={{ opacity: motion.presented && placement ? 0 : 1, bottom: insets.bottom + clearance, paddingHorizontal: tokens.spacing.three, alignItems: 'flex-end' }}>
      {toggle(false)}
    </View>
    <Modal visible={motion.presented} transparent animationType="none" onRequestClose={close}
      onShow={() => { measurePlacement(); motion.onShow(); }} onDismiss={motion.onDismiss}>
      <View ref={modalHost} collapsable={false} onLayout={measurePlacement} className="flex-1">
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.30)' }, backdrop]} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('dashboard.quick.dismiss')}
          onPress={close} style={StyleSheet.absoluteFill} />
        {placement && <Animated.View pointerEvents={open ? "auto" : "none"} accessibilityViewIsModal onAccessibilityEscape={close}
              style={[{ position: 'absolute', ...placement, paddingTop: tokens.spacing.three, alignItems: 'flex-end', gap: 12 }, surface]}>
              <ScrollView style={{ flexGrow: 0, flexShrink: 1, width: '100%' }}
                contentContainerStyle={{ alignItems: 'flex-end', gap: 12, paddingRight: (56 - tokens.size.touchTarget) / 2 }}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {actions.map(action => <Pressable key={action} accessibilityRole="button" accessibilityLabel={t(action)}
                  onPress={() => {
                    if (!menuOpen.current) return;
                    restoreFocus.current = false; menuOpen.current = false;
                    // Hand off after the native window dismisses, without stacking form windows.
                    pendingAction.current = action;
                    setOpen(false);
                  }}
                  className="max-w-full flex-row items-center gap-2 rounded-control focus:outline focus:outline-2 focus:outline-action"
                  style={{ minHeight: tokens.size.touchTarget }}>
                  <View className="min-w-0 flex-shrink rounded-control bg-white px-3 py-1.5"
                    style={{ minHeight: 32, justifyContent: 'center', boxShadow: '0 3px 6px rgba(16,35,66,0.18)' }}>
                    <Text className="font-poppins text-[12px] leading-[18px] text-[#102342]">{t(action)}</Text>
                  </View>
                  <View style={styles.actionButton}>
                    <PosIcon name={actionIcons[action]} size={24} color="#FFFFFF" />
                  </View>
                </Pressable>)}
              </ScrollView>
              {toggle(true)}
            </Animated.View>}
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  actionButton: {
    width: tokens.size.touchTarget, height: tokens.size.touchTarget, flexShrink: 0,
    borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2F6CC9',
    boxShadow: '0 3px 6px rgba(16,35,66,0.24)',
  },
  trigger: {
    width: 56, height: 56, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#102342', boxShadow: '0 3px 6px rgba(16,35,66,0.24)',
  },
});
