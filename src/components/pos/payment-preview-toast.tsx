import { useCallback } from 'react';
import { View } from 'react-native';
import { RegistrationToast } from '@/components/auth/registration-toast';
import { usePos } from '@/state/pos';

export function PaymentPreviewToast() {
  const { toastExpiresAt, dismissPreviewToast } = usePos();
  const dismiss = useCallback(() => dismissPreviewToast(), [dismissPreviewToast]);
  if (toastExpiresAt === null) return null;
  return <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 z-50 px-4">
    <RegistrationToast expiresAt={toastExpiresAt} onDismiss={dismiss} title="Order completed." message="Order processed and recorded in this demo session." />
  </View>;
}
