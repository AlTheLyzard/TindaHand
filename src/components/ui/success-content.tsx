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
    style={{ width: '100%', maxWidth: 340, alignSelf: 'center', gap: 16, padding: 24, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surfaceCard, boxShadow: '0 3px 6px #00000040' }}>
    <SuccessHalo visible={visible} eventKey={eventKey} />
    <Text accessibilityRole="header" style={{ textAlign: 'center', fontFamily: 'Poppins_600SemiBold', fontSize: 24, lineHeight: 36, color: '#102342' }}>{title}</Text>
    <View accessible accessibilityRole="alert" style={{ gap: 4 }}>
      <Text testID={`${testID}-amount`} style={{ textAlign: 'center', fontFamily: 'Poppins_700Bold', fontSize: 22, lineHeight: 33, color: tokens.color.textPrimary }}>{value ?? (amountCentavos === undefined ? '' : formatPesos(amountCentavos))}</Text>
      <Text style={{ textAlign: 'center', fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22, color: tokens.color.textSecondary }}>{message}</Text>
    </View>
    <Button ref={done} onPress={onClose}>Done</Button>
  </View>;
}
