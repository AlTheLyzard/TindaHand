import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { RegistrationToast } from '@/components/auth/registration-toast';
import { usePos } from '@/state/pos';

export function PaymentPreviewToast({ ownerMode = true }: { ownerMode?: boolean }) {
  const { toastExpiresAt, dismissPreviewToast } = usePos();
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const dismiss = useCallback(() => {
    const debtId = dismissPreviewToast();
    if (ownerMode && debtId) router.navigate({ pathname: '/owner-menu/receivables-payables', params: { section: 'receivable', status: 'unpaid', debtId } });
  }, [dismissPreviewToast, ownerMode]);
  if (toastExpiresAt === null || !focused) return null;
  return <RegistrationToast expiresAt={toastExpiresAt} onDismiss={dismiss} title="Order completed." message="Order processed and recorded in this demo session." />;
}
