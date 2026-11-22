import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, Text, View, type ViewInstance } from 'react-native';
import { SuccessHalo } from './success-halo';
import { Button } from './button';
import tokens from '@/constants/design-tokens.json';
import { usePresentationVisible } from '@/state/presentation';
import { formatPesos } from '@/utils/dashboard';

/** Shared with the implemented Quick Add confirmation, including its replay key. */
export function SuccessContent({ title, amountCentavos, value, message, eventKey, onClose, visible, testID }: {
  title: string; amountCentavos?: number; value?: string; message: string; eventKey: string;
  onClose: () => void; visible: boolean; testID: string;
}) {
  const done = useRef<ViewInstance>(null);
  const presented = usePresentationVisible();
  useEffect(() => {
    if (!done.current || !visible || !presented) return;
    if (Platform.OS === 'web') done.current.focus();
    else AccessibilityInfo.sendAccessibilityEvent(done.current, 'focus');
  }, [presented, visible]);
  return <View testID={testID} accessibilityViewIsModal onAccessibilityEscape={onClose}
    style={{ width: '100%', maxWidth: 340, alignSelf: 'center', gap: 16, padding: 24, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surfaceCard }}>
    <SuccessHalo visible={visible} eventKey={eventKey} />
    <Text accessibilityRole="header" style={{ textAlign: 'center', fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.h2Section.fontSize, lineHeight: 36, color: tokens.color.textPrimary }}>{title}</Text>
    <View accessible accessibilityRole="alert" style={{ gap: 4 }}>
      {(value !== undefined || amountCentavos !== undefined) && <Text testID={`${testID}-amount`} style={{ textAlign: 'center', fontFamily: tokens.typography.weights.bold, fontSize: tokens.typography.titleAccent.fontSize, lineHeight: 33, color: tokens.color.textPrimary }}>{value ?? formatPesos(amountCentavos!)}</Text>}
      <Text style={{ textAlign: 'center', fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microFinancialRate.fontSize, lineHeight: 22, color: tokens.color.textSecondary }}>{message}</Text>
    </View>
    <Button ref={done} onPress={onClose}>Done</Button>
  </View>;
}
