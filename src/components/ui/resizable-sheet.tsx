import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture, type PanGestureActiveEvent } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionPressable } from './motion-pressable';
import { IconButton } from './button';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';
import { useMotionReduced } from '@/state/motion';
import { releaseSheet, sheetHeights, type SheetPosition } from '@/utils/sheet';

/** One scroll body and a pinned footer. Only the generous handle owns resize gestures. */
export function ResizableSheet({ title, subtitle, children, footer, onClose, disabled = false, testID = 'quick-add', onCompactChange, alwaysShowSubtitle = false }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode | ((compact: boolean) => ReactNode);
  onClose: () => void; disabled?: boolean; testID?: string; onCompactChange?: (compact: boolean) => void;
  alwaysShowSubtitle?: boolean;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useMotionReduced();
  const [available, setAvailable] = useState(Math.max(1, window.height - insets.top - 8));
  const [headerHeight, setHeaderHeight] = useState(112);
  const [footerHeight, setFooterHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [position, setPosition] = useState<SheetPosition>('content');
  const short = available < 420;
  const heights = useMemo(() => sheetHeights(available, contentHeight, headerHeight + footerHeight), [available, contentHeight, headerHeight, footerHeight]);
  const height = useSharedValue(available);
  const dragging = useSharedValue(false);
  const startHeight = useSharedValue(available);
  const startY = useSharedValue(0);
  const pointerY = useSharedValue(0);
  const velocity = useSharedValue(0);
  const selected = useSharedValue<SheetPosition>('content');
  // In very limited keyboard/text-scaling space, scroll the actions with the fields.
  const scrollFooter = available < headerHeight + footerHeight + 80;
  useEffect(() => { onCompactChange?.(short); }, [onCompactChange, short]);
  useAnimatedReaction(() => heights, (next, previous) => {
    if (previous && next.compact === previous.compact && next.content === previous.content && next.expanded === previous.expanded) return;
    cancelAnimation(height);
    if (dragging.get()) {
      height.set(Math.min(next.expanded, height.get()));
      // Keyboard/layout changes cannot reset an in-flight gesture's origin.
      startHeight.set(height.get());
      startY.set(pointerY.get());
    } else height.set(reduced ? next[selected.get()] : withTiming(next[selected.get()], { duration: 210 }));
  }, [heights, reduced]);
  const followPointer = (absoluteY: number) => {
    'worklet';
    pointerY.set(absoluteY);
    // Absolute coordinates remain stable while the handle itself moves.
    height.set(Math.max(Math.min(80, heights.expanded), Math.min(heights.expanded, startHeight.get() - (absoluteY - startY.get()))));
  };
  const trackPan = (event: PanGestureActiveEvent) => {
    'worklet';
    velocity.set(event.velocityY / 1000);
    followPointer(event.absoluteY);
  };
  const pan = usePanGesture({
    enabled: !disabled, minDistance: 0, maxPointers: 1,
    onBegin: event => {
      cancelAnimation(height);
      dragging.set(true);
      velocity.set(0);
      startHeight.set(height.get());
      startY.set(event.absoluteY); pointerY.set(event.absoluteY);
    },
    onActivate: trackPan,
    onUpdate: trackPan,
    onFinalize: event => {
      dragging.set(false);
      const target = event.canceled || disabled ? selected.get() : releaseSheet(height.get(), velocity.get(), heights);
      const next = target === 'dismiss' ? selected.get() : target;
      selected.set(next);
      height.set(reduced ? heights[next] : withTiming(heights[next], { duration: 210 }));
      if (target === 'dismiss') scheduleOnRN(onClose);
      else scheduleOnRN(setPosition, next);
    },
  });
  const surface = useAnimatedStyle(() => ({ height: height.get() }));
  const footerView = <View testID={`${testID}-footer`} onLayout={event => setFooterHeight(event.nativeEvent.layout.height)} style={{ flexShrink: 0 }}>
    {typeof footer === 'function' ? footer(short) : footer}
  </View>;
  return <View style={{ flex: 1, minHeight: 0, paddingTop: 8, justifyContent: 'flex-end' }} onLayout={event => setAvailable(Math.max(1, event.nativeEvent.layout.height - 8))}>
    <MotionPressable accessible={false} focusable={false} tabIndex={-1} disabled={disabled} onPress={onClose} style={StyleSheet.absoluteFill} />
    <Animated.View testID={`${testID}-card`} accessibilityViewIsModal onAccessibilityEscape={onClose}
      style={[{ width: '100%', maxWidth: 460, maxHeight: '100%', minHeight: 0, alignSelf: 'center', overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: tokens.spacing.three, backgroundColor: tokens.color.navigationSurface, boxShadow: '0 -4px 20px rgba(16,35,66,0.12)' }, surface]}>
      <View testID={`${testID}-header`} onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)} style={{ flexShrink: 0, paddingBottom: 4 }}>
        <GestureDetector gesture={pan} touchAction="none"><Animated.View testID={`${testID}-handle`} accessible accessibilityRole="adjustable" accessibilityLabel={`Resize ${title} sheet`}
          accessibilityHint="Drag up to expand, down to compact, or farther down to close."
          accessibilityState={{ disabled }} accessibilityValue={{ min: Math.round(heights.compact), max: Math.round(heights.expanded), now: Math.round(heights[position]) }}
          accessibilityActions={[{ name: 'increment', label: 'Expand sheet' }, { name: 'decrement', label: 'Compact sheet' }, { name: 'escape', label: 'Close sheet' }]}
          onAccessibilityAction={event => {
            if (disabled) return;
            if (event.nativeEvent.actionName === 'escape') onClose();
            else {
              const next = event.nativeEvent.actionName === 'increment' ? 'expanded' : 'compact';
              selected.set(next); setPosition(next);
              height.set(reduced ? heights[next] : withTiming(heights[next], { duration: 210 }));
            }
          }} style={{ height: 48, width: 112, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}>
          <View pointerEvents="none" style={{ width: 36, height: 4, borderRadius: tokens.radius.pill, backgroundColor: '#DDE2E8' }} />
        </Animated.View></GestureDetector>
        <View style={{ paddingRight: 40 }}>
          <Text accessibilityRole="header" style={{ fontFamily: 'Poppins_700Bold', fontSize: 22, lineHeight: 33, color: tokens.color.textPrimary }}>{title}</Text>
          <IconButton accessibilityLabel={testID === 'quick-add' ? 'Close Quick Add' : `Close ${title}`} disabled={disabled} onPress={onClose}
            style={{ position: 'absolute', right: -8, top: -8 }} icon={({ color }) => <PosIcon name="close" size={24} color={color} />} />
        </View>
        {!!subtitle && (alwaysShowSubtitle || !short) && <Text className="mt-1 font-poppins text-[12px] leading-[18px] text-text-secondary">{subtitle}</Text>}
      </View>
      <ScrollView testID={`${testID}-body`} style={{ flex: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}>
        <View onLayout={event => setContentHeight(event.nativeEvent.layout.height + 16)}>{children}</View>
        {scrollFooter && footerView}
      </ScrollView>
      {!scrollFooter && footerView}
    </Animated.View>
  </View>;
}
