import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Text, View, type TextInputInstance } from 'react-native';
import { InventoryFrame, InvDateField, InvField } from '@/components/inventory/inventory-ui';
import { QuickAddField } from '@/components/dashboard/quick-add-ui';
import { Button } from '@/components/ui/button';
import { MotionRegion } from '@/components/ui/motion-content';
import { usePushOnce } from '@/hooks/use-push-once';
import { useQuickAdd } from '@/state/quick-add';
import { newPayableDraft, usePayableDraft } from '@/state/payable-draft';
import { quickAddErrors, quickAddTotal } from '@/utils/quick-add';
import { formatPesos } from '@/utils/dashboard';
import { BalancePanel, balancesRoot, CreditorNameField } from './payables-ui';
import type { QuickAddDraft } from '@/types/quick-add';

export function PayableFormScreen() {
  const { draft, setDraft, setSearchQuery } = usePayableDraft();
  const { save } = useQuickAdd();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const busy = useRef(false);
  const nameInput = useRef<TextInputInstance>(null);
  const amountInput = useRef<TextInputInstance>(null);
  const dateInput = useRef<TextInputInstance>(null);
  const detailsInput = useRef<TextInputInstance>(null);
  const [token] = useState(() => `payable-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const push = usePushOnce();
  // Runs on a new form mount, not when returning from creditor selection.
  useEffect(() => { setDraft(newPayableDraft()); }, [setDraft]);
  const errors = quickAddErrors(draft);
  const error = (field: keyof QuickAddDraft) => submitted ? errors[field] : undefined;
  const update = (patch: Partial<QuickAddDraft>) => { setDraft(previous => ({ ...previous, ...patch })); setFailure(''); };
  function back() {
    if (busy.current) return;
    Keyboard.dismiss();
    setDraft(newPayableDraft());
    router.dismissTo({ pathname: balancesRoot, params: { section: 'payable', status: 'unpaid' } });
  }
  async function submit() {
    if (busy.current) return;
    setSubmitted(true);
    if (Object.keys(errors).length) {
      if (errors.name) nameInput.current?.focus();
      else if (errors.amount) amountInput.current?.focus();
      else if (errors.dueDate) dateInput.current?.focus();
      return;
    }
    busy.current = true; setSaving(true); setFailure(''); Keyboard.dismiss();
    try {
      await save(token, draft);
      setDraft(newPayableDraft());
      setSearchQuery('');
      router.dismissTo({ pathname: balancesRoot, params: { section: 'payable', status: 'unpaid' } });
    } catch {
      setFailure('Could not save this debt. Your draft is preserved. Please try again.');
      busy.current = false; setSaving(false);
    }
  }
  return <InventoryFrame title="New Business Debt" back inlineTitle onBack={back} onNavigate={action => { if (!busy.current) action(); }}>
    <Text className="mb-7 font-poppins text-[14px] leading-[21px] text-text-secondary">Keep track of what your business owes and when payments are due.</Text>
    <View className="gap-6" pointerEvents={saving ? 'none' : 'auto'}>
      <CreditorNameField inputRef={nameInput} value={draft.name} onChange={name => update({ name, creditorId: undefined })} error={error('name')}
        onSelect={() => { Keyboard.dismiss(); push(`${balancesRoot}/creditors`); }} onSubmitEditing={() => amountInput.current?.focus()} />
      <QuickAddField ref={amountInput} label="Amount borrowed" money value={draft.amount} onChangeText={amount => update({ amount })} placeholder="0.00" inputMode="decimal" keyboardType="decimal-pad" error={error('amount')} returnKeyType="next" onSubmitEditing={() => dateInput.current?.focus()} />
      <View>
        <InvDateField compact required={false} inputRef={dateInput} label="Due date (Optional)" value={draft.dueDate} onChange={dueDate => update({ dueDate })} error={error('dueDate')} />
        {!!draft.dueDate && <Button variant="text" fullWidth={false} compact onPress={() => update({ dueDate: '' })} style={{ alignSelf: 'flex-start' }}>Clear due date</Button>}
      </View>
      <InvField inputRef={detailsInput} label="Other details (Optional)" value={draft.details} onChangeText={details => update({ details })} placeholder="e.g. Cash" multiline textAlignVertical="top" style={{ minHeight: 160 }} />
      <BalancePanel title="Total Debt" amount={formatPesos(quickAddTotal(draft))} caption="This amount will be recorded as accounts payable." dark />
      {!!failure && <MotionRegion><Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{failure}</Text></MotionRegion>}
      <View className="mt-3 flex-row flex-wrap gap-3">
        <View className="min-w-[120px] flex-1"><Button variant="secondary" disabled={saving} onPress={back}>Cancel</Button></View>
        <View className="min-w-[140px] flex-1"><Button loading={saving} onPress={() => void submit()}>Save Debt</Button></View>
      </View>
    </View>
  </InventoryFrame>;
}
