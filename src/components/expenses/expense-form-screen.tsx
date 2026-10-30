import { router, useFocusEffect, usePreventRemove } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Keyboard, ScrollView, Text, View, type ScrollViewInstance, type TextInputInstance, type ViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpenseCategoryField } from './expense-category-field';
import { InventoryFrame, InvDateField, InvField } from '@/components/inventory/inventory-ui';
import { QuickAddField } from '@/components/dashboard/quick-add-ui';
import { Button } from '@/components/ui/button';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { MotionModal } from '@/components/ui/motion-modal';
import { MotionRegion } from '@/components/ui/motion-content';
import { useQuickAdd } from '@/state/quick-add';
import type { QuickAddDraft } from '@/types/quick-add';
import { emptyQuickAddDraft, hasQuickAddChanges, quickAddErrors } from '@/utils/quick-add';
import { todayInManila } from '@/utils/inventory';

type Confirmation = { kind: 'clear' | 'discard'; action: () => void };

export function ExpenseFormScreen() {
  const { save } = useQuickAdd();
  const [baseline] = useState(() => emptyQuickAddDraft('expense', todayInManila()));
  const [draft, setDraft] = useState(baseline);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const busy = useRef(false);
  const [token] = useState(() => `expense-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const scroll = useRef<ScrollViewInstance>(null);
  const categoryInput = useRef<ViewInstance>(null);
  const amountInput = useRef<TextInputInstance>(null);
  const detailsInput = useRef<TextInputInstance>(null);
  const dateInput = useRef<TextInputInstance>(null);
  const positions = useRef<Record<string, number>>({});
  const formTop = useRef(0);
  const dirty = hasQuickAddChanges(draft, baseline);
  useFocusEffect(useCallback(() => {
    busy.current = false; setLeaving(false); setSaving(false);
  }, []));
  const errors = quickAddErrors(draft);
  const error = (field: keyof QuickAddDraft) => submitted ? errors[field] : undefined;
  const update = (patch: Partial<QuickAddDraft>) => { setDraft(previous => ({ ...previous, ...patch })); setFailure(''); };

  const disablePrevention = usePreventRemove(!leaving && (dirty || saving), ({ repeat }) => {
    if (busy.current || pending.current) return;
    Keyboard.dismiss(); setCategoryOpen(false);
    setConfirmation({ kind: 'discard', action: repeat });
  });
  function navigate(action: () => void) {
    if (busy.current || confirmation || pending.current) return;
    Keyboard.dismiss(); setCategoryOpen(false);
    if (dirty && !leaving) setConfirmation({ kind: 'discard', action });
    else action();
  }
  function back() {
    navigate(() => router.canGoBack() ? router.back() : router.replace('/owner-menu/store-expenses'));
  }
  function reset() {
    setDraft({ ...baseline }); setSubmitted(false); setFailure(''); setCategoryOpen(false);
  }
  function confirm() {
    if (!confirmation || pending.current) return;
    if (confirmation.kind === 'clear') { reset(); setConfirmation(null); return; }
    pending.current = confirmation.action;
    reset();
    setLeaving(true); disablePrevention(); setConfirmation(null);
  }
  function finishDismissal() {
    const action = pending.current; pending.current = null; action?.();
  }
  async function submit() {
    if (busy.current || confirmation || leaving) return;
    setSubmitted(true);
    const first = (['category', 'amount', 'expenseDate'] as const).find(field => errors[field]);
    if (first) {
      scroll.current?.scrollTo({ y: Math.max(0, formTop.current + (positions.current[first] ?? 0) - 16), animated: false });
      if (first === 'category') { Keyboard.dismiss(); setCategoryOpen(true); categoryInput.current?.focus(); }
      else (first === 'amount' ? amountInput : dateInput).current?.focus();
      return;
    }
    busy.current = true; setSaving(true); setFailure(''); Keyboard.dismiss();
    try {
      await save(token, draft);
      setLeaving(true); disablePrevention();
      router.dismissTo('/owner-menu/store-expenses');
    } catch {
      busy.current = false; setSaving(false);
      setFailure('Could not save your expense. Your draft is preserved. Please try again.');
    }
  }
  return <InventoryFrame title="Add Store Expense" back onBack={back} onNavigate={navigate} scrollRef={scroll} hideNavigationWithKeyboard overlay={
    <MotionModal visible={!!confirmation} onHidden={finishDismissal} onRequestClose={() => setConfirmation(null)}>
      <SafeAreaView className="flex-1"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        {confirmation && <ConfirmationContent title={confirmation.kind === 'clear' ? 'Clear All Fields?' : 'Discard Changes?'}
          message={confirmation.kind === 'clear' ? 'Are you sure you want to clear all information? This action cannot be undone.' : 'You have unsaved changes. Are you sure you want to leave without saving?'}
          cancelLabel={confirmation.kind === 'clear' ? 'Cancel' : 'Keep Editing'} confirmLabel={confirmation.kind === 'clear' ? 'Clear' : 'Discard Changes'}
          onCancel={() => setConfirmation(null)} onConfirm={confirm} />}
      </ScrollView></SafeAreaView>
    </MotionModal>}>
    <Text className="font-poppins text-[14px] leading-[21px] text-text-secondary">Record and track your store’s expenses.</Text>
    <View onLayout={event => { formTop.current = event.nativeEvent.layout.y; }} pointerEvents={saving || leaving ? 'none' : 'auto'} style={{ gap: 24 }}>
      <View onLayout={event => { positions.current.category = event.nativeEvent.layout.y; }}>
        <ExpenseCategoryField triggerRef={categoryInput} value={draft.category} onChange={category => update({ category })} error={error('category')} open={categoryOpen} onOpenChange={setCategoryOpen} />
      </View>
      <View onLayout={event => { positions.current.amount = event.nativeEvent.layout.y; }}>
        <QuickAddField ref={amountInput} label="Amount" money large value={draft.amount} onChangeText={amount => update({ amount })} error={error('amount')} placeholder="0.00" inputMode="decimal" keyboardType="decimal-pad" returnKeyType="next" onSubmitEditing={() => detailsInput.current?.focus()} />
      </View>
      <InvField inputRef={detailsInput} label="Other details (Optional)" value={draft.details} onChangeText={details => update({ details })} placeholder="e.g. Electricity bill for this month" multiline textAlignVertical="top" style={{ minHeight: 150 }} returnKeyType="default" />
      <View onLayout={event => { positions.current.expenseDate = event.nativeEvent.layout.y; }}>
        <InvDateField compact inputRef={dateInput} label="Expense date (Required)" value={draft.expenseDate} onChange={expenseDate => update({ expenseDate })} error={error('expenseDate')} />
      </View>
      {!!failure && <MotionRegion><Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{failure}</Text></MotionRegion>}
      <View className="mt-6 gap-4">
        <Button loading={saving} disabled={leaving} onPress={() => void submit()}>Save Expense</Button>
        <Button variant="secondary" disabled={saving || leaving} onPress={() => {
          Keyboard.dismiss();
          if (dirty) setConfirmation({ kind: 'clear', action: reset }); else reset();
        }}>Clear</Button>
      </View>
    </View>
  </InventoryFrame>;
}
