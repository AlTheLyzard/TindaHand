import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, Text, View, type ViewInstance } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { PosIcon } from '@/components/pos/pos-icon';
import { Button } from '@/components/ui/button';
import tokens from '@/constants/design-tokens.json';
import { useMotionReduced } from '@/state/motion';
import type { QuickAddRecord } from '@/types/quick-add';
import { formatPesos } from '@/utils/dashboard';

/** Owned by the modal host so closing stops the loop even during retained exit content. */
export function useSuccessPulse(visible: boolean) {
  const reduced = useMotionReduced();
  const pulse = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(pulse);
    pulse.set(0);
    if (visible && !reduced) pulse.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(pulse);
  }, [pulse, reduced, visible]);
  return useAnimatedStyle(() => ({ opacity: 0.25 + pulse.get() * 0.15, transform: [{ scale: 1 + pulse.get() * 0.22 }] }));
}

export function QuickAddSuccess({ record, onClose, pulseStyle }: {
  record: QuickAddRecord; onClose: () => void; pulseStyle: ReturnType<typeof useSuccessPulse>;
}) {
  const done = useRef<ViewInstance>(null);
  useEffect(() => {
    if (!done.current) return;
    if (Platform.OS === 'web') done.current.focus();
    else AccessibilityInfo.sendAccessibilityEvent(done.current, 'focus');
  }, []);
  const expense = record.kind === 'expense';
  return <View testID="quick-add-success" accessibilityViewIsModal onAccessibilityEscape={onClose}
    style={{ width: '100%', maxWidth: 340, alignSelf: 'center', gap: 16, padding: 24, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surfaceCard, boxShadow: '0 3px 6px #00000040' }}>
    <View accessible={false} style={{ width: 88, height: 88, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.pill, backgroundColor: '#E7F3E8' }}>
        <Animated.View testID="quick-add-success-pulse" style={[{ position: 'absolute', width: 72, height: 72, borderRadius: tokens.radius.pill, backgroundColor: '#B4D7B8', borderWidth: 1, borderColor: '#286B2C' }, pulseStyle]} />
        <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.pill, backgroundColor: '#B4D7B8' }}><PosIcon name="checkCircle" size={48} color="#286B2C" /></View>
      </View>
    </View>
    <Text accessibilityRole="header" style={{ textAlign: 'center', fontFamily: 'Poppins_600SemiBold', fontSize: 24, lineHeight: 36, color: '#102342' }}>
      {expense ? 'Expense Recorded' : record.kind === 'storeDebt' ? 'Store Debt Saved' : 'Debt Saved'}
    </Text>
    <Text accessibilityRole="alert" style={{ textAlign: 'center', fontFamily: 'Poppins_400Regular', fontSize: 16, lineHeight: 24, color: tokens.color.textSecondary }}>
      <Text style={{ color: tokens.color.textPrimary }}>{formatPesos(record.amountCentavos)}</Text>{expense ? ' recorded for ' : ' saved for '}{record.name}.
    </Text>
    <Button ref={done} onPress={onClose}>Done</Button>
  </View>;
}
