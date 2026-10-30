import { MotionRegion, MotionContent } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Text, View, type DimensionValue } from 'react-native';

import { PosIcon } from '@/components/pos/pos-icon';
import { Button } from '@/components/ui/button';
import tokens from '@/constants/design-tokens.json';

export type PreviewState = 'ready' | 'loading' | 'empty' | 'search' | 'filtered';
const labels: Record<PreviewState, string> = { ready: 'Live demo', loading: 'Loading', empty: 'No data', search: 'No search results', filtered: 'No filter results' };
const basicStates: readonly PreviewState[] = ['ready', 'loading', 'empty'];
export const listPreviewStates: readonly PreviewState[] = [...basicStates, 'search', 'filtered'];

/** Local display overrides only. Never modifies the session, fixtures, or order. */
export function useContentPreview(states: readonly PreviewState[] = basicStates) {
  const [selected, setSelected] = useState<PreviewState>('ready');
  const [open, setOpen] = useState(false);
  const mode = __DEV__ ? selected : 'ready';
  return { mode, loading: mode === 'loading', empty: mode === 'empty', reset: () => setSelected('ready'),
    control: __DEV__ ? <View className="my-2 rounded-control border border-[#B0C8E3] bg-white px-3">
      <Pressable accessibilityRole="button" accessibilityLabel="Preview content state" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} className="min-h-12 justify-center"><Text className="font-poppins text-[10px] text-text-secondary">Development state preview · {labels[mode]} {open ? '−' : '+'}</Text></Pressable>
      {open && <View className="flex-row flex-wrap gap-x-3">{states.map(state => <Pressable key={state} accessibilityRole="button" accessibilityState={{ selected: mode === state }} onPress={() => { setSelected(state); setOpen(false); }} className="min-h-12 justify-center">
        <Text className={`font-poppins text-[11px] ${mode === state ? 'font-poppins-bold text-action' : 'text-text-secondary'}`}>{labels[state]}</Text>
      </Pressable>)}</View>}
    </View> : null };
}

export function EmptyState({ title, description, icon = 'inventory', action, onAction }: {
  title: string; description: string; icon?: ComponentProps<typeof PosIcon>['name']; action?: string; onAction?: () => void;
}) {
  return <MotionRegion className="gap-3 rounded-card bg-white p-5">
    <View accessible={false} className="h-10 w-10 items-center justify-center rounded-pill bg-[#D9E7F4]"><PosIcon name={icon} color="#245399" /></View>
    <Text accessibilityRole="header" className="font-poppins-bold text-[18px] text-brand">{title}</Text>
    <Text accessibilityLiveRegion="polite" className="font-poppins text-[14px] leading-[21px] text-text-secondary">{description}</Text>
    {action && onAction && <Button onPress={onAction}>{action}</Button>}
  </MotionRegion>;
}

/** One pulse for the entire region, hidden decorative bars, one accessible loading label.
 * Starts static until the OS preference resolves; reacts to changes while mounted. */
export function Skeleton({ children, label = 'Loading content' }: { children: ReactNode; label?: string }) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    let changed = false;
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; setReduceMotion(value); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active && !changed) setReduceMotion(value); }).catch(() => {});
    return () => { active = false; listener.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) { opacity.setValue(1); return; }
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.65, duration: 850, useNativeDriver: true, isInteraction: false }),
      Animated.timing(opacity, { toValue: 1, duration: 850, useNativeDriver: true, isInteraction: false }),
    ]));
    pulse.start();
    return () => { pulse.stop(); opacity.setValue(1); };
  }, [opacity, reduceMotion]);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} aria-busy accessibilityState={{ busy: true }} accessibilityLiveRegion="polite">
    <Animated.View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ opacity }}>{children}</Animated.View>
  </View>;
}

export function SkeletonBar({ width = '100%', height = 18, color = tokens.color.surfaceSubtle }: { width?: DimensionValue; height?: number; color?: string }) {
  return <View style={{ width, height, borderRadius: tokens.radius.control, backgroundColor: color }} />;
}

/** Retains exact live geometry (including text scaling) for an individual value or row.
 * Values and actions are hidden and inert; bars occupy that same measured surface. */
export function LoadingSlot({ loading, children }: { loading: boolean; children: ReactNode }) {
  return <MotionContent changeKey={loading}>
    <View pointerEvents={loading ? 'none' : 'auto'} aria-hidden={loading} accessibilityElementsHidden={loading}
      importantForAccessibility={loading ? 'no-hide-descendants' : 'auto'} style={{ opacity: loading ? 0 : 1 }}>{children}</View>
    {loading && <View pointerEvents="none" style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}><SkeletonBar height={14} width="80%" color="#B0C8E3" /></View>}
  </MotionContent>;
}
