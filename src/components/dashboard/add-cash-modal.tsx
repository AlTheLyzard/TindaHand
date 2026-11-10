import type { ViewInstance } from 'react-native';
import { MotionOverlay } from '@/components/ui/motion-overlay';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, IconButton } from '@/components/ui/button';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { FormField } from '@/components/ui/form-field';
import { useCashRegister } from '@/state/cash-register';
import { cashAmountError } from '@/utils/cash-register';
import { parsePaymentAmount } from '@/utils/pos-payment';

/** Mounted for one form opening; drafts never enter navigation or shared seed data. */
export function AddCashModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const cash = useCashRegister();
  const [open, setOpen] = useState(true);
  const afterClose = useRef(onClose);
  const dismiss = (after = onClose) => { afterClose.current = after; setOpen(false); };
  const [token] = useState(cash.begin);
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmation, setConfirmation] = useState<'clear' | 'discard' | null>(null);
  const submitted = useRef(false);
  const formContainer = useRef<ViewInstance>(null);
  useEffect(() => {
    // RN Web's Modal focus trap attempts programmatic focus even on tabIndex=-1
    // descendants. Inert also blocks that path while the confirmation is active.
    if (Platform.OS === 'web' && formContainer.current) {
      (formContainer.current as unknown as { inert: boolean }).inert = !!confirmation;
    }
  }, [confirmation]);
  const error = cashAmountError(value);
  function close() {
    Keyboard.dismiss();
    if (confirmation) { setConfirmation(null); return; }
    if (value.length) setConfirmation('discard');
    else dismiss();
  }
  function clear() {
    setValue(''); setTouched(false); setSaveError(''); setConfirmation(null);
  }
  function add() {
    if (submitted.current || confirmation) return;
    setTouched(true);
    if (error) return;
    submitted.current = true;
    if (!cash.add(token, value)) {
      submitted.current = false;
      setSaveError('This amount cannot be added. Enter a smaller amount and try again.');
      return;
    }
    Keyboard.dismiss();
    clear();
    dismiss(onSaved);
  }
  return <Modal visible={open} onHidden={() => afterClose.current()} onRequestClose={close}>
    <SafeAreaView className="flex-1">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View ref={formContainer} style={{ flex: 1 }} pointerEvents={confirmation ? 'none' : 'auto'} aria-hidden={!!confirmation} accessibilityElementsHidden={!!confirmation} importantForAccessibility={confirmation ? 'no-hide-descendants' : 'auto'}>
          <ScrollView pointerEvents="box-none" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
            <Pressable testID="cash-form-backdrop" accessible={false} focusable={false} tabIndex={-1} disabled={!!confirmation} onPress={close} style={StyleSheet.absoluteFill} />
            <View accessibilityViewIsModal className="w-full max-w-[412px] gap-5 self-center rounded-control bg-canvas p-5" style={{ boxShadow: '0 3px 6px #00000040' }}>
              <View className="flex-row items-center pr-8">
                <Text accessibilityRole="header" className="flex-1 font-poppins-bold text-[18px] text-brand">Add Cash to Register</Text>
                <IconButton disabled={!!confirmation} accessibilityLabel="Close Add Cash to Register" onPress={close} className="absolute -right-3 -top-3" icon={({ color }) => <Text accessible={false} style={{ color, fontSize: 20 }}>×</Text>} />
              </View>
              <FormField label="Amount" placeholder="₱0.00" prefix={value ? '₱' : undefined} errorVariant="registration" keyboardType="decimal-pad" inputMode="decimal" returnKeyType="done" value={value} editable={!confirmation} tabIndex={confirmation ? -1 : 0}
                onChangeText={text => { setValue(text); setSaveError(''); }}
                onBlur={() => {
                  const amount = parsePaymentAmount(value);
                  if (amount !== null && amount > 0) setValue(`${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, '0')}`);
                }}
                onSubmitEditing={Keyboard.dismiss} error={saveError || (touched ? error ?? undefined : undefined)} />
              <View className="flex-row flex-wrap gap-3">
                <View className="min-w-[100px] flex-1"><Button disabled={!!confirmation} variant="secondary" onPress={() => { Keyboard.dismiss(); if (value.length) setConfirmation('clear'); else clear(); }}>Clear</Button></View>
                <View className="min-w-[100px] flex-1"><Button onPress={add} disabled={!!confirmation}>Add</Button></View>
              </View>
            </View>
          </ScrollView>
        </View>
        <MotionOverlay visible={!!confirmation}>{confirmation && <>
          <ScrollView pointerEvents="box-none" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
            <Pressable testID="cash-confirmation-backdrop" accessible={false} focusable={false} tabIndex={-1} onPress={() => setConfirmation(null)} style={StyleSheet.absoluteFill} />
            <ConfirmationContent balancedActions={confirmation === 'discard'} title={confirmation === 'clear' ? 'Clear All Fields?' : 'Discard Changes?'}
              message={confirmation === 'clear' ? 'Are you sure you want to clear all information? This action cannot be undone.' : 'You have unsaved changes. Are you sure you want to close without saving?'}
              cancelLabel={confirmation === 'clear' ? 'Cancel' : 'Keep Editing'} confirmLabel={confirmation === 'clear' ? 'Clear' : 'Discard Changes'}
              onCancel={() => setConfirmation(null)} onConfirm={() => { const discard = confirmation === 'discard'; clear(); if (discard) dismiss(); }} />
          </ScrollView>
        </>}</MotionOverlay>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
