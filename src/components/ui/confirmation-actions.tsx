import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Button, type ButtonVariant } from './button';
import tokens from '@/constants/design-tokens.json';

/** Shared action geometry for confirmations, including unsaved-draft dismissal. */
export function ConfirmationActions({ confirmLabel, cancelLabel, onConfirm, onCancel, destructive = true, cancelVariant = 'secondary', stacked = true, busy = false, confirmDisabled = false }: {
  confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void;
  destructive?: boolean; cancelVariant?: ButtonVariant; stacked?: boolean; busy?: boolean; confirmDisabled?: boolean;
}) {
  const handled = useRef(false);
  useEffect(() => { handled.current = false; }, [onConfirm]);
  const confirm = <Button fullWidth={stacked} style={stacked ? undefined : { flex: 1 }} variant={destructive ? 'destructive' : 'primary'} loading={busy} disabled={confirmDisabled}
    onPress={() => { if (handled.current || busy || confirmDisabled) return; handled.current = true; onConfirm(); }}>{confirmLabel}</Button>;
  const cancel = <Button fullWidth={stacked} style={stacked ? undefined : { flex: 1 }} variant={cancelVariant} disabled={busy}
    onPress={() => { if (!handled.current && !busy) onCancel(); }}>{cancelLabel}</Button>;
  return <View testID="confirmation-actions" style={{ flexDirection: stacked ? 'column' : 'row', alignItems: 'stretch', gap: tokens.spacing.two }}>
    {stacked ? confirm : cancel}
    {stacked ? cancel : confirm}
  </View>;
}
