import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { RegistrationToast } from '@/components/auth/registration-toast';
import { usePos } from '@/state/pos';

export function PaymentPreviewToast() {
  const { toastExpiresAt, dismissPreviewToast } = usePos();
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const dismiss = useCallback(() => {
    const debtId = dismissPreviewToast();
    if (debtId) router.navigate({ pathname: '/owner-menu/receivables-payables', params: { section: 'receivable', status: 'unpaid', debtId } });
  }, [dismissPreviewToast]);
  if (toastExpiresAt === null || !focused) return null;
  return <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 z-50 px-4">
    <RegistrationToast expiresAt={toastExpiresAt} onDismiss={dismiss} title="Order completed." message="Order processed and recorded in this demo session." />
  </View>;
}
