import { QuickAddSuccess } from '@/components/dashboard/quick-add-success';
import { QuickAddField } from '@/components/dashboard/quick-add-ui';
import { InvDateField, InvField, InventoryFrame } from '@/components/inventory/inventory-ui';
import { Button } from '@/components/ui/button';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { MotionRegion } from '@/components/ui/motion-content';
import { MotionModal } from '@/components/ui/motion-modal';
import tokens from '@/constants/design-tokens.json';
import { useQuickAdd } from '@/state/quick-add';
import type { QuickAddDraft, QuickAddRecord } from '@/types/quick-add';
import { formatPesos } from '@/utils/dashboard';
import { expenseCategoryLabel, formatExpenseDate } from '@/utils/expenses';
import { todayInManila } from '@/utils/inventory';
import { emptyQuickAddDraft, hasQuickAddChanges, quickAddErrors, quickAddTotal } from '@/utils/quick-add';
import { router, useFocusEffect, usePreventRemove } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Keyboard, ScrollView, Text, TouchableOpacity, View, useWindowDimensions, type ScrollViewInstance, type TextInputInstance, type ViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpenseCategoryField } from './expense-category-field';

import { useExpenseClassifier } from '@/hooks/use-expense-classifier';

type Confirmation = { kind: 'clear' | 'discard' | 'record'; action: () => void };

export function ExpenseFormScreen() {
  const { save } = useQuickAdd();
  const [baseline] = useState(() => emptyQuickAddDraft('expense', todayInManila()));
  const [draft, setDraft] = useState(baseline);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [savedRecord, setSavedRecord] = useState<QuickAddRecord | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const { fontScale } = useWindowDimensions();
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

  // Classifier — only active in confirmed (real) sessions.
  // Watches the description field and suggests a category after a short debounce.
  const { suggestion: categorySuggestion, loading: classifierLoading } = useExpenseClassifier(draft.details);
  // Hide the suggestion once the user has explicitly picked a category.
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const showSuggestion =
    !suggestionDismissed &&
    !!categorySuggestion &&
    !draft.category &&
    !saving &&
    !leaving;

  function applySuggestion() {
    if (!categorySuggestion) return;
    update({ category: categorySuggestion.category });
    setSuggestionDismissed(true);
  }

  useFocusEffect(useCallback(() => {
    busy.current = false; setLeaving(false); setSaving(false);
  }, []));
  const errors = quickAddErrors(draft);
  const error = (field: keyof QuickAddDraft) => submitted ? errors[field] : undefined;
  const update = (patch: Partial<QuickAddDraft>) => { setDraft(previous => ({ ...previous, ...patch })); setFailure(''); };

  const disablePrevention = usePreventRemove(!leaving && (dirty || saving), ({ repeat }) => {
    if (busy.current || pending.current) return;
    Keyboard.dismiss();
    setConfirmation({ kind: 'discard', action: repeat });
  });
  function navigate(action: () => void) {
    if (busy.current || confirmation || pending.current) return;
    Keyboard.dismiss();
    if (dirty && !leaving) setConfirmation({ kind: 'discard', action });
    else action();
  }
  function back() {
    navigate(() => router.canGoBack() ? router.back() : router.replace('/owner-menu/store-expenses'));
  }
  function reset() {
    setDraft({ ...baseline }); setSubmitted(false); setFailure('');
  }
  function confirm() {
    if (!confirmation || pending.current) return;
    if (confirmation.kind === 'clear') { reset(); setConfirmation(null); return; }
    pending.current = confirmation.action;
    if (confirmation.kind === 'record') { setConfirmation(null); return; }
    reset();
    setLeaving(true); disablePrevention(); setConfirmation(null);
  }
  function finishDismissal() {
    const action = pending.current; pending.current = null; action?.();
  }
  async function saveExpense() {
    if (busy.current || leaving) return;
    busy.current = true; setSaving(true); setFailure(''); Keyboard.dismiss();
    try {
      setSavedRecord(await save(token, draft));
      setSuccessVisible(true);
    } catch {
      setFailure('Could not save your expense. Your draft is preserved. Please try again.');
    } finally {
      busy.current = false; setSaving(false);
    }
  }
  function finishSuccess() {
    if (!savedRecord) return;
    setLeaving(true); disablePrevention();
    router.dismissTo('/owner-menu/store-expenses');
  }
  function submit() {
    if (busy.current || confirmation || leaving) return;
    setSubmitted(true);
    const first = (['category', 'amount', 'expenseDate'] as const).find(field => errors[field]);
    if (first) {
      scroll.current?.scrollTo({ y: Math.max(0, formTop.current + (positions.current[first] ?? 0) - 16), animated: false });
      if (first === 'category') { Keyboard.dismiss(); categoryInput.current?.focus(); }
      else (first === 'amount' ? amountInput : dateInput).current?.focus();
      return;
    }
    Keyboard.dismiss();
    setConfirmation({ kind: 'record', action: () => { void saveExpense(); } });
  }
  return <InventoryFrame title="New Record" back inlineTitle illustration={require('@/assets/images/expenses/store-expense-illustration.png')} background onBack={back} onNavigate={navigate} scrollRef={scroll} hideNavigationWithKeyboard overlay={
    <>
      <MotionModal visible={!!confirmation} onHidden={finishDismissal} onRequestClose={() => setConfirmation(null)}>
        <SafeAreaView className="flex-1"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
          {confirmation && <ConfirmationContent variant={confirmation.kind === 'record' ? 'quickAdd' : 'default'}
            title={confirmation.kind === 'clear' ? 'Clear All Fields?' : confirmation.kind === 'discard' ? 'Discard Changes?' : 'Record Expense?'}
            message={confirmation.kind === 'clear' ? 'Are you sure you want to clear all information? This action cannot be undone.'
              : confirmation.kind === 'discard' ? 'You have unsaved changes. Are you sure you want to leave without saving?'
                : `Record ${formatPesos(quickAddTotal(draft))} for ${expenseCategoryLabel(draft.category)} on ${formatExpenseDate(draft.expenseDate)}?`}
            cancelLabel={confirmation.kind === 'discard' ? 'Keep Editing' : 'Cancel'}
            confirmLabel={confirmation.kind === 'clear' ? 'Clear' : confirmation.kind === 'discard' ? 'Discard Changes' : 'Record Expense'}
            titleColor={confirmation.kind === 'record' ? tokens.color.darkNavy : undefined}
            iconTone={confirmation.kind === 'record' ? 'blue' : 'danger'} destructive={confirmation.kind !== 'record'}
            cancelVariant={confirmation.kind === 'record' ? 'secondary' : undefined}
            onCancel={() => setConfirmation(null)} onConfirm={confirm} />}
        </ScrollView></SafeAreaView>
      </MotionModal>
      <MotionModal visible={successVisible} onHidden={finishSuccess} onRequestClose={() => setSuccessVisible(false)}>
        <SafeAreaView className="flex-1"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          {savedRecord && <QuickAddSuccess record={savedRecord} onClose={() => setSuccessVisible(false)} visible={successVisible} />}
        </ScrollView></SafeAreaView>
      </MotionModal>
    </>}>
    <Text className=" type-micro-financial-rate leading-[21px] text-text-secondary">Track your store&apos;s expenses.</Text>
    <View onLayout={event => { formTop.current = event.nativeEvent.layout.y; }} pointerEvents={saving || leaving || !!confirmation || !!savedRecord ? 'none' : 'auto'} style={{ gap: 16 }}>
      <View onLayout={event => { positions.current.category = event.nativeEvent.layout.y; }}>
        <ExpenseCategoryField triggerRef={categoryInput} value={draft.category} onChange={category => { update({ category }); setSuggestionDismissed(true); }} error={error('category')} />
      </View>

      {/* AI classifier suggestion banner — appears after typing in Other Details */}
      <MotionRegion>
        {showSuggestion && categorySuggestion && (
          <TouchableOpacity
            onPress={applySuggestion}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`AI suggested category: ${categorySuggestion.category}. Tap to apply.`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: tokens.radius.card,
              backgroundColor: tokens.color.royalBlue + '14',
              borderWidth: 1,
              borderColor: tokens.color.royalBlue + '40',
            }}
          >
            <Text style={{ fontSize: 15 }}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: tokens.typography.weights.semibold, fontSize: 12, color: tokens.color.royalBlue, lineHeight: 16 }}>
                AI Suggested Category
              </Text>
              <Text style={{ fontFamily: tokens.typography.weights.regular, fontSize: 13, color: tokens.color.darkNavy, lineHeight: 18 }}>
                {categorySuggestion.category.replace(' Expense', '')}
                {' '}
                <Text style={{ color: tokens.color.textSecondary, fontSize: 11 }}>
                  ({Math.round(categorySuggestion.confidence * 100)}% confidence)
                </Text>
              </Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: tokens.color.royalBlue }}>
              <Text style={{ fontFamily: tokens.typography.weights.semibold, fontSize: 11, color: '#fff', lineHeight: 15 }}>
                Apply
              </Text>
            </View>
          </TouchableOpacity>
        )}
        {classifierLoading && !categorySuggestion && (
          <Text style={{ fontFamily: tokens.typography.weights.regular, fontSize: 11, color: tokens.color.textSecondary, textAlign: 'center', paddingVertical: 4 }}>
            Detecting category…
          </Text>
        )}
      </MotionRegion>

      <View onLayout={event => { positions.current.amount = event.nativeEvent.layout.y; }}>
        <QuickAddField ref={amountInput} label="Amount" money large value={draft.amount} onChangeText={amount => update({ amount })} error={error('amount')} placeholder="0.00" inputMode="decimal" keyboardType="decimal-pad" returnKeyType="next" onSubmitEditing={() => detailsInput.current?.focus()} />
      </View>
      <InvField inputRef={detailsInput} label="Other Details" value={draft.details} onChangeText={details => update({ details })} placeholder="Details/note" multiline maxLength={200}
        fieldFooter={<Text style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.helper.fontSize,
          lineHeight: tokens.typography.helper.lineHeight * fontScale, color: tokens.color.textPlaceholder }}>{draft.details.length}/200</Text>}
        style={{ minHeight: 150, textAlign: 'left', textAlignVertical: 'top', paddingLeft: 16, paddingTop: 12,
          paddingRight: Math.max(64, 42 + fontScale * 14), paddingBottom: Math.max(32, tokens.typography.helper.lineHeight * fontScale + 14) }} returnKeyType="default" />
      <View onLayout={event => { positions.current.expenseDate = event.nativeEvent.layout.y; }}>
        <InvDateField compact inputRef={dateInput} label="Expense date" displayLabel="Date" value={draft.expenseDate} onChange={expenseDate => update({ expenseDate })} error={error('expenseDate')} />
      </View>
      {!!failure && <MotionRegion><Text accessibilityRole="alert" className=" type-micro-caption text-error-base">{failure}</Text></MotionRegion>}
      <View className="mt-6 gap-4">
        <Button loading={saving} disabled={leaving} onPress={() => void submit()}>Record Expense</Button>
        <Button variant="secondary" disabled={saving || leaving} onPress={() => {
          Keyboard.dismiss();
          if (dirty) setConfirmation({ kind: 'clear', action: reset }); else reset();
        }}>Clear</Button>
      </View>
    </View>
  </InventoryFrame>;
}
