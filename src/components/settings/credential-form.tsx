import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Keyboard, ScrollView, Text, View, type TextInputInstance } from 'react-native';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { MotionModal } from '@/components/ui/motion-modal';
import { SuccessContent } from '@/components/ui/success-content';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';
import { SettingsNotice } from './settings-ui';
import { validateCashier, validatePinChange } from '@/utils/settings';
import type { CashierValues, PinValues, SettingsErrors, SettingsResult } from '@/types/settings';

type Values = CashierValues & PinValues;
const empty = (): Values => ({ name: '', ownerPin: '', pin: '', confirmPin: '' });
/** Shared PIN validation, independent visibility, request lock and sensitive-value lifecycle. */
export function CredentialForm<T>({ mode, onSave, onSuccess, onCancel, onSuccessClose, successMessage, successEventKey = 'settings-pin-change', fieldsCard = false, labelOverrides, showReviewLabel = true, setupValidationCopy = false }: {
  mode: 'owner' | 'cashier' | 'create';
  onSave: (values: Values) => Promise<SettingsResult<T>>;
  onSuccess: (result: T) => void;
  onCancel?: () => void;
  onSuccessClose?: () => void;
  successMessage?: string;
  successEventKey?: string;
  fieldsCard?: boolean;
  labelOverrides?: Partial<Record<keyof Values, string>>;
  showReviewLabel?: boolean;
  setupValidationCopy?: boolean;
}) {
  const [values, setValues] = useState(empty);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<SettingsErrors>({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'confirm' | 'success' | null>(null);
  const [epoch, setEpoch] = useState(0);
  const inputs = useRef<Partial<Record<keyof Values, TextInputInstance | null>>>({});
  const active = useRef(false);
  const locked = useRef(false);
  const generation = useRef(0);
  const sensitive = useRef(empty());
  const create = mode === 'create';
  const validate = create ? validateCashier : validatePinChange;
  const fields: (keyof Values)[] = [create ? 'name' : 'ownerPin', 'pin', 'confirmPin'];
  const clientErrors = validate(values);
  const formComplete = fields.every(field => Boolean(values[field]) && !clientErrors[field]);
  const errors: SettingsErrors = {};
  for (const field of fields) {
    if (!submitted && !touched[field]) continue;
    let error = clientErrors[field] ?? serverErrors[field];
    if (error && setupValidationCopy) {
      if (field === 'name' && !values.name.trim()) error = 'Please enter kahera name.';
      if (field === 'pin' && !values.pin) error = 'Please enter kahera PIN.';
      if (field === 'confirmPin') {
        if (!values.confirmPin) error = 'Please confirm kahera PIN.';
        else if (values.pin !== values.confirmPin) error = 'PIN do not match. Please enter correct PIN.';
      }
    }
    errors[field] = error;
  }

  function reset() {
    sensitive.current = empty(); setValues(empty()); setSubmitted(false); setTouched({}); setServerErrors({}); setNotice(''); setEpoch(value => value + 1);
  }
  useFocusEffect(useCallback(() => {
    active.current = true;
    return () => {
      active.current = false; generation.current++; locked.current = false;
      sensitive.current = empty(); setValues(empty()); setSubmitted(false); setTouched({}); setServerErrors({}); setNotice(''); setBusy(false); setEpoch(value => value + 1);
    };
  }, []));
  function update(field: keyof Values, value: string) {
    const next = { ...sensitive.current, [field]: field === 'name' ? value : value.replace(/[^0-9]/g, '').slice(0, 4) };
    sensitive.current = next; setValues(next);
    setTouched(current => ({ ...current, [field]: true }));
    setServerErrors(current => { const next = { ...current }; delete next[field]; if (field === 'pin') delete next.confirmPin; return next; });
    setNotice('');
  }
  async function submit() {
    if (locked.current) return;
    setSubmitted(true);
    const invalid = validate(sensitive.current);
    const first = fields.find(field => invalid[field]);
    if (first) { inputs.current[first]?.focus(); return; }
    Keyboard.dismiss(); setNotice(''); setServerErrors({});
    if (create) {
      await save();
      return;
    }
    setDialog('confirm');
  }
  async function save() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setNotice(''); setServerErrors({});
    const requestGeneration = generation.current;
    try {
      const result = await onSave({ ...sensitive.current });
      if (!active.current || requestGeneration !== generation.current) return;
      if (result.ok) {
        reset();
        onSuccess(result.value);
        setDialog(create ? null : 'success');
      } else {
        setDialog(null);
        setServerErrors(result.fields ?? {});
        setNotice(result.message);
        const field = fields.find(item => result.fields?.[item]);
        if (field) inputs.current[field]?.focus();
      }
    } catch {
      if (active.current && requestGeneration === generation.current) {
        setDialog(null);
        setNotice('The demo service is unavailable. Please try again.');
      }
    } finally {
      if (active.current && requestGeneration === generation.current) { locked.current = false; setBusy(false); }
    }
  }
  function closeDialog() {
    if (!locked.current) setDialog(null);
  }
  function closeSuccess() {
    setDialog(null);
    onSuccessClose?.();
  }
  return <View className="flex-1">
    <View className={`${create ? 'gap-4' : 'gap-7'} ${fieldsCard ? 'rounded-[20px] bg-ice-container px-5 py-6' : ''}`} key={epoch}>
      {fields.map((field, index) => {
        const name = field === 'name';
        const visibilityToggle = !name && !create && field !== 'ownerPin';
        const pinLengthLabel = !create && (field === 'pin' || field === 'confirmPin');
        const label = name ? 'Kahera name' : field === 'ownerPin' ? mode === 'owner' ? 'Current May-Ari PIN' : 'Your May-Ari PIN' : field === 'pin' ? create ? 'Kahera PIN' : mode === 'owner' ? 'New May-Ari PIN' : 'New Kahera PIN' : create ? 'Confirm PIN' : mode === 'owner' ? 'Confirm new May-Ari PIN' : 'Confirm new Kahera PIN';
        return <FormField key={field} ref={input => { inputs.current[field] = input; }} label={labelOverrides?.[field] ?? label}
          value={values[field]} onChangeText={value => update(field, value)} error={errors[field]} requiredIndicator="asterisk" onBlur={() => setTouched(current => ({ ...current, [field]: true }))}
          placeholder={name ? 'Enter Kahera name' : undefined} pin={!name} pinIndicators={!name} pinVisibilityToggle={visibilityToggle}
          pinLengthIndicator={!create && field === 'ownerPin' ? false : true}
          trailingAccessory={pinLengthLabel ? <Text accessible={false} className="type-label-nav text-text-secondary">4-digit</Text> : undefined}
          errorVariant="registration" editable={!busy} maxLength={name ? 120 : 4} keyboardType={name ? 'default' : 'number-pad'}
          autoCapitalize={name ? 'words' : 'none'} autoComplete="off" textContentType="none"
          returnKeyType={index === fields.length - 1 ? 'done' : 'next'} submitBehavior={index === fields.length - 1 ? 'blurAndSubmit' : 'submit'}
          onSubmitEditing={() => index === fields.length - 1 ? Keyboard.dismiss() : inputs.current[fields[index + 1]]?.focus()} />;
      })}
    </View>
    {notice ? <SettingsNotice error>{notice}</SettingsNotice> : null}
    <View className="min-h-10 flex-1" />
    {create && showReviewLabel && <Text className="mb-4 text-center type-label-nav leading-[18px] text-brand">Review your Kahera account details</Text>}
    <View className="gap-4 pb-2 pt-6">
      <Button disabled={!create && !formComplete} loading={busy} onPress={() => void submit()}>{create ? 'Continue' : 'Save Changes'}</Button>
      <Button variant="secondary" disabled={busy} onPress={onCancel ?? reset}>Cancel</Button>
    </View>
    {!create && <MotionModal visible={dialog !== null} onRequestClose={closeDialog} backdropColor={tokens.overlay.navy}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 }}>
        {dialog === 'confirm' && <ConfirmationContent
          title="Save Changes?"
          titleColor={tokens.color.darkNavy}
          leadingIcon={<PosIcon name="info" size={24} color={tokens.color.brightBlue} />}
          message="Are you sure you want to save the changes to this account?"
          cancelLabel="Cancel"
          confirmLabel="Save Changes"
          destructive={false}
          cancelVariant="secondary"
          onCancel={closeDialog}
          onConfirm={() => void save()}
          busy={busy}
        />}
        {dialog === 'success' && <SuccessContent
          testID="settings-pin-success"
          title="Changes Saved"
          message={successMessage ?? 'Your PIN has been updated successfully.'}
          eventKey={successEventKey}
          visible
          onClose={closeSuccess}
        />}
        {dialog === null && <View />}
      </ScrollView>
    </MotionModal>}
  </View>;
}
