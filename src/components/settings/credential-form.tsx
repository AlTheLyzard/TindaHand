import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Keyboard, Text, View, type TextInputInstance } from 'react-native';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { SettingsNotice } from './settings-ui';
import { validateCashier, validatePinChange } from '@/utils/settings';
import type { CashierValues, PinValues, SettingsErrors, SettingsResult } from '@/types/settings';

type Values = CashierValues & PinValues;
const empty = (): Values => ({ name: '', ownerPin: '', pin: '', confirmPin: '' });
/** Shared PIN validation, independent visibility, request lock and sensitive-value lifecycle. */
export function CredentialForm<T>({ mode, onSave, onSuccess, onCancel, fieldsCard = false }: {
  mode: 'owner' | 'cashier' | 'create';
  onSave: (values: Values) => Promise<SettingsResult<T>>;
  onSuccess: (result: T) => void;
  onCancel?: () => void;
  fieldsCard?: boolean;
}) {
  const [values, setValues] = useState(empty);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<SettingsErrors>({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
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
  const errors: SettingsErrors = {};
  for (const field of fields) if (submitted || touched[field]) errors[field] = clientErrors[field] ?? serverErrors[field];

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
    Keyboard.dismiss(); locked.current = true; setBusy(true); setNotice(''); setServerErrors({});
    const requestGeneration = generation.current;
    try {
      const result = await onSave({ ...sensitive.current });
      if (!active.current || requestGeneration !== generation.current) return;
      if (result.ok) { reset(); onSuccess(result.value); }
      else { setServerErrors(result.fields ?? {}); setNotice(result.message); const field = fields.find(item => result.fields?.[item]); if (field) inputs.current[field]?.focus(); }
    } catch {
      if (active.current && requestGeneration === generation.current) setNotice('The demo service is unavailable. Please try again.');
    } finally {
      if (active.current && requestGeneration === generation.current) { locked.current = false; setBusy(false); }
    }
  }
  return <View className="flex-1">
    <Text className="mb-4 font-poppins text-[10px] text-text-secondary">Fields marked * are required.</Text>
    <View className={fieldsCard ? 'gap-7 rounded-[20px] bg-[#D9E7F5] px-5 py-6' : 'gap-7'} key={epoch}>
      {fields.map((field, index) => {
        const name = field === 'name';
        const label = name ? 'Operator name' : field === 'ownerPin' ? mode === 'owner' ? 'Current Owner PIN' : 'Your Owner PIN' : field === 'pin' ? create ? 'Operator PIN' : mode === 'owner' ? 'New Owner PIN' : 'New Operator PIN' : create ? 'Confirm PIN' : mode === 'owner' ? 'Confirm new Owner PIN' : 'Confirm new Operator PIN';
        return <FormField key={field} ref={input => { inputs.current[field] = input; }} label={label}
          value={values[field]} onChangeText={value => update(field, value)} error={errors[field]} requiredIndicator="asterisk" onBlur={() => setTouched(current => ({ ...current, [field]: true }))}
          placeholder={name ? 'Enter Operator name' : undefined} pin={!name} pinIndicators={!name} pinVisibilityToggle={!name}
          errorVariant="registration" editable={!busy} maxLength={name ? 120 : 4} keyboardType={name ? 'default' : 'number-pad'}
          autoCapitalize={name ? 'words' : 'none'} autoComplete="off" textContentType="none"
          returnKeyType={index === fields.length - 1 ? 'done' : 'next'} submitBehavior={index === fields.length - 1 ? 'blurAndSubmit' : 'submit'}
          onSubmitEditing={() => index === fields.length - 1 ? void submit() : inputs.current[fields[index + 1]]?.focus()} />;
      })}
    </View>
    {notice ? <SettingsNotice error>{notice}</SettingsNotice> : null}
    <View className="min-h-10 flex-1" />
    {create && <Text className="mb-4 text-center font-poppins-bold text-[12px] leading-[18px] text-brand">Review your Operator account details</Text>}
    <View className="gap-4 pb-2 pt-6">
      <Button loading={busy} onPress={() => void submit()}>{create ? 'Continue' : mode === 'cashier' ? 'Reset Operator PIN' : 'Save New PIN'}</Button>
      <Button variant="secondary" disabled={busy} onPress={onCancel ?? reset}>{onCancel ? 'Cancel' : 'Clear'}</Button>
    </View>
  </View>;
}
