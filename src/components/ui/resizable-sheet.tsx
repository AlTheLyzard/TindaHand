import { KeyboardAwareScrollView as ScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { GestureDetector, usePanGesture, type PanGestureActiveEvent } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionPressable } from './motion-pressable';
import { IconButton } from './button';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';
import { motion } from '@/constants/motion';
import { useMotionReduced } from '@/state/motion';
import { usePresentationVisible } from '@/state/presentation';
import { releaseSheet, sheetHeights, type SheetPosition } from '@/utils/sheet';

/** One scroll body and a pinned footer. Only the generous handle owns resize gestures. */
export function ResizableSheet({ title, subtitle, children, footer, onClose, disabled = false, testID = 'quick-add', onCompactChange, alwaysShowSubtitle = false, fullWidth = false, compactHeight = 360 }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode | ((compact: boolean) => ReactNode);
  onClose: () => void; disabled?: boolean; testID?: string; onCompactChange?: (compact: boolean) => void;
  alwaysShowSubtitle?: boolean;
  fullWidth?: boolean;
  compactHeight?: number;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useMotionReduced();
  const presented = usePresentationVisible();
  const [available, setAvailable] = useState(Math.max(1, window.height - insets.top - 8));
  const [headerHeight, setHeaderHeight] = useState(112);
  const [footerHeight, setFooterHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [position, setPosition] = useState<SheetPosition>('content');
  const [resizing, setResizing] = useState(false);
  const body = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    body.current?.scrollTo({ y: 0, animated: false });
  }, [title]);
  const short = available < 420;
  const fixedHeight = headerHeight + (footer ? footerHeight : 0);
  const heights = useMemo(() => sheetHeights(available, contentHeight, fixedHeight, compactHeight), [available, contentHeight, fixedHeight, compactHeight]);
  const height = useSharedValue(heights.content);
  const dragging = useSharedValue(false);
  const startHeight = useSharedValue(available);
  const startY = useSharedValue(0);
  const pointerY = useSharedValue(0);
  const velocity = useSharedValue(0);
  const selected = useSharedValue<SheetPosition>('content');
  // In very limited keyboard/text-scaling space, scroll the actions with the fields.
  const scrollFooter = available < fixedHeight + 80;
  useEffect(() => { onCompactChange?.(short); }, [onCompactChange, short]);
  useAnimatedReaction(() => ({ ...heights, title, disabled, reduced, presented }), (next, previous) => {
    const changedSheet = previous && next.title !== previous.title;
    const resizedViewport = !previous || next.expanded !== previous.expanded;
    const restore = previous?.disabled && !next.disabled;
    if (changedSheet) { selected.set('content'); scheduleOnRN(setPosition, 'content'); }
    if (previous && !changedSheet && !restore && next.reduced === previous.reduced && next.compact === previous.compact && next.content === previous.content && !resizedViewport) return;
    cancelAnimation(height);
    if (dragging.get()) {
      height.set(Math.min(next.expanded, height.get()));
      // Keyboard/layout changes cannot reset an in-flight gesture's origin.
      startHeight.set(height.get());
      startY.set(pointerY.get());
    } else {
      // Measure at rest during native presentation. The modal alone owns entry;
      // keyboard avoidance alone owns viewport travel. Only content/snap changes
      // animate height, avoiding two clocks chasing the keyboard or each other.
      const target = next[selected.get()];
      height.set(next.reduced || !next.presented || resizedViewport ? target : withTiming(target, { duration: motion.transition, easing: motion.ease, reduceMotion: ReduceMotion.Never }));
    }
  }, [heights, title, disabled, reduced, presented]);
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
    enabled: !disabled && presented, minDistance: 0, maxPointers: 1,
    onBegin: event => {
      scheduleOnRN(setResizing, true);
      cancelAnimation(height);
      dragging.set(true);
      velocity.set(0);
      startHeight.set(height.get());
      startY.set(event.absoluteY); pointerY.set(event.absoluteY);
    },
    onActivate: trackPan,
    onUpdate: trackPan,
    onFinalize: event => {
      scheduleOnRN(setResizing, false);
      dragging.set(false);
      const target = event.canceled || disabled ? selected.get() : releaseSheet(height.get(), velocity.get(), heights);
      const next = target === 'dismiss' ? selected.get() : target;
      selected.set(next);
      // Hold the dragged position during the host's close/discard decision.
      // Snapping back before the exit starts causes a visible upward jump.
      if (target === 'dismiss') scheduleOnRN(onClose);
      else {
        height.set(reduced ? heights[next] : withTiming(heights[next], { duration: motion.transition, easing: motion.ease, reduceMotion: ReduceMotion.Never }));
        scheduleOnRN(setPosition, next);
      }
    },
  });
  const surface = useAnimatedStyle(() => ({ height: height.get() }));
  const footerView = <View testID={`${testID}-footer`} onLayout={event => setFooterHeight(event.nativeEvent.layout.height)} style={{ flexShrink: 0 }}>
    {typeof footer === 'function' ? footer(short) : footer}
  </View>;
  const bodyBottom = footer ? 8 : Math.max(insets.bottom, 8);
  return <View style={{ flex: 1, minHeight: 0, paddingTop: 8, justifyContent: 'flex-end' }} onLayout={event => setAvailable(Math.max(1, event.nativeEvent.layout.height - 8))}>
    <MotionPressable testID={`${testID}-backdrop`} accessible={false} focusable={false} tabIndex={-1} disabled={disabled} onPress={onClose} style={StyleSheet.absoluteFill} />
    <Animated.View testID={`${testID}-card`} accessibilityViewIsModal onAccessibilityEscape={onClose}
      style={[{ width: '100%', maxWidth: fullWidth ? undefined : 460, maxHeight: '100%', minHeight: 0, alignSelf: 'center', overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingLeft: Math.max(tokens.spacing.three, fullWidth ? insets.left : 0), paddingRight: Math.max(tokens.spacing.three, fullWidth ? insets.right : 0),
        backgroundColor: tokens.color.navigationSurface }, surface]}>
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
              height.set(reduced ? heights[next] : withTiming(heights[next], { duration: motion.transition, easing: motion.ease, reduceMotion: ReduceMotion.Never }));
            }
          }} style={{ height: 48, width: 112, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}>
          <View pointerEvents="none" style={{ width: 36, height: 4, borderRadius: tokens.radius.pill, backgroundColor: tokens.color.surfaceSubtle }} />
        </Animated.View></GestureDetector>
        <View style={{ paddingRight: 40 }}>
          <Text accessibilityRole="header" style={{ fontFamily: tokens.typography.weights.bold, fontSize: tokens.typography.titleAccent.fontSize, lineHeight: 33, color: tokens.color.textPrimary }}>{title}</Text>
          <IconButton accessibilityLabel={testID === 'quick-add' ? 'Close Quick Add' : `Close ${title}`} disabled={disabled} onPress={onClose}
            style={{ position: 'absolute', right: -8, top: -8 }} icon={({ color }) => <PosIcon name="close" size={24} color={color} />} />
        </View>
        {!!subtitle && (alwaysShowSubtitle || !short) && <Text className="mt-1 type-micro-caption leading-[18px] text-text-secondary">{subtitle}</Text>}
      </View>
      <ScrollView ref={body} scrollEnabled={!resizing} keyboardScrollEnabled={!resizing && !disabled} testID={`${testID}-body`} style={{ flex: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: bodyBottom }}>
        <View onLayout={event => setContentHeight(event.nativeEvent.layout.height + 8 + bodyBottom)}>{children}</View>
        {scrollFooter && footerView}
      </ScrollView>
      {!scrollFooter && !!footer && footerView}
    </Animated.View>
  </View>;
}
