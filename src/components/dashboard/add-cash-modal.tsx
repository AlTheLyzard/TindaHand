import { KeyboardAwareScrollView as ScrollView, KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import type { ViewInstance } from 'react-native';
import { MotionOverlay } from '@/components/ui/motion-overlay';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { FormField } from '@/components/ui/form-field';
import { ResizableSheet } from '@/components/ui/resizable-sheet';
import { quickAddColors } from './quick-add-ui';
import { useCashRegister } from '@/state/cash-register';
import { cashAmountError } from '@/utils/cash-register';

/** Mounted for one form opening; drafts never enter navigation or shared seed data. */
export function AddCashModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const cash = useCashRegister();
  const [open, setOpen] = useState(true);
  const afterClose = useRef(onClose);
  const dismiss = (after = onClose) => { afterClose.current = after; setOpen(false); };
  const [token] = useState(cash.begin);
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmation, setConfirmation] = useState<'clear' | 'discard' | null>(null);
  const submitted = useRef(false);
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
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
    if (submitted.current || !open) return;
    Keyboard.dismiss();
    if (confirmation) { setConfirmation(null); return; }
    if (value.length) setConfirmation('discard');
    else dismiss();
  }
  function clear() {
    setValue(''); setTouched(false); setSaveError(''); setConfirmation(null);
  }
  async function add() {
    if (submitted.current || confirmation || !open || error) return;
    submitted.current = true;
    setSaving(true); setSaveError(''); Keyboard.dismiss();
    let confirmed = false;
    try {
      if (!await cash.add(token, value)) {
        setSaveError('This amount could not be added. Try a smaller amount or try again.');
        return;
      }
      confirmed = true;
      clear();
      dismiss(onSaved);
    } catch {
      // TODO(backend): Map cash movement submission and balance refresh failures to safe feedback.
      // - Method/Action: POST / Record cash movement, then GET / Refresh register balance
      // - Expected Input/Payload: Amount in centavos and stable submission token
      // - Expected Response: Confirmed movement and updated authoritative cash balance
      // - UI State to Wire: Keep the amount/token on failure and expose an explicit retry message
      setSaveError('Could not add cash. Your amount is preserved. Please try again.');
    } finally {
      setSaving(false);
      // Remain locked through the successful closing animation.
      if (!confirmed) submitted.current = false;
    }
  }
  const blocked = saving || !!confirmation || !open;
  return <Modal visible={open} sheet backdropColor={quickAddColors.backdrop} onHidden={() => afterClose.current()} onRequestClose={close}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View ref={formContainer} style={{ flex: 1, minHeight: 0 }} pointerEvents={blocked ? 'none' : 'auto'} aria-hidden={!!confirmation} accessibilityElementsHidden={!!confirmation} importantForAccessibility={confirmation ? 'no-hide-descendants' : 'auto'}>
          <ResizableSheet fullWidth compactHeight={280} testID="cash-form" title="Add Cash to Register" disabled={blocked} onClose={close}
            footer={<View style={{ gap: 8, paddingTop: 8, paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 16) }}>
              <Button onPress={add} disabled={blocked || !!error} loading={saving}>Add</Button>
              <Button disabled={blocked || !value.length} variant="secondary" onPress={() => { if (submitted.current) return; Keyboard.dismiss(); setConfirmation('clear'); }}>Clear</Button>
            </View>}>
            <FormField money testID="cash-amount" label="Enter Amount" requiredIndicator="asterisk" placeholder="0.00" prefix="₱" keyboardType="decimal-pad" inputMode="decimal" returnKeyType="done" value={value} editable={!blocked} tabIndex={blocked ? -1 : 0}
              onChangeText={text => { if (submitted.current) return; setValue(text); setTouched(true); setSaveError(''); }}
              onBlur={() => { if (value.length) setTouched(true); }}
              onSubmitEditing={Keyboard.dismiss} error={saveError || (touched ? error ?? undefined : undefined)} />
          </ResizableSheet>
        </View>
        <MotionOverlay visible={!!confirmation}>{confirmation && <>
          <ScrollView pointerEvents="box-none" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
            <Pressable testID="cash-confirmation-backdrop" accessible={false} focusable={false} tabIndex={-1} onPress={() => setConfirmation(null)} style={StyleSheet.absoluteFill} />
            <ConfirmationContent stackedActions title={confirmation === 'clear' ? 'Clear All Fields?' : 'Discard Changes?'}
              message={confirmation === 'clear' ? 'Are you sure you want to clear all information? This action cannot be undone.' : 'You have unsaved changes. Are you sure you want to close without saving?'}
              cancelLabel={confirmation === 'clear' ? 'Cancel' : 'Keep Editing'} confirmLabel={confirmation === 'clear' ? 'Clear' : 'Discard Changes'}
              onCancel={() => setConfirmation(null)} onConfirm={() => { const discard = confirmation === 'discard'; clear(); if (discard) dismiss(); }} />
          </ScrollView>
        </>}</MotionOverlay>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}
