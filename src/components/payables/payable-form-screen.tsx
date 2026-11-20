import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Text, View, type TextInputInstance } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { InventoryFrame, InvDateField, InvField } from '@/components/inventory/inventory-ui';
import { QuickAddField, quickAddColors } from '@/components/dashboard/quick-add-ui';
import { QuickAddSuccess } from '@/components/dashboard/quick-add-success';
import { Button } from '@/components/ui/button';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { KeyboardAwareScrollView as ScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionModal } from '@/components/ui/motion-modal';
import { MotionRegion } from '@/components/ui/motion-content';
import { PartySelectionSheet } from '@/components/ui/party-selection-sheet';
import { useQuickAdd } from '@/state/quick-add';
import { newPayableDraft, usePayableDraft } from '@/state/payable-draft';
import { quickAddErrors, quickAddTotal } from '@/utils/quick-add';
import { formatPesos } from '@/utils/dashboard';
import { formatCalendarDate } from '@/utils/date';
import { selectDraftCreditor } from '@/utils/creditor-selection';
import { BalancePanel, balancesRoot, CreditorList, CreditorNameField } from './payables-ui';
import type { QuickAddDraft, QuickAddRecord } from '@/types/quick-add';
import type { Creditor } from '@/types/payables';
import tokens from '@/constants/design-tokens.json';

export function PayableFormScreen() {
  const { draft, setDraft, setSearchQuery } = usePayableDraft();
  const { save, payables } = useQuickAdd();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [savedRecord, setSavedRecord] = useState<QuickAddRecord | null>(null);
  const [creditorPickerOpen, setCreditorPickerOpen] = useState(false);
  const [creditorPickerSession, setCreditorPickerSession] = useState(0);
  const busy = useRef(false);
  const confirmationDismissed = useRef(true);
  const pendingSaveDraft = useRef<QuickAddDraft | null>(null);
  const nameInput = useRef<TextInputInstance>(null);
  const amountInput = useRef<TextInputInstance>(null);
  const dateInput = useRef<TextInputInstance>(null);
  const detailsInput = useRef<TextInputInstance>(null);
  const [token] = useState(() => `payable-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const insets = useSafeAreaInsets();
  // Runs on a new form mount, not when returning from creditor selection.
  useEffect(() => { setDraft(newPayableDraft()); }, [setDraft]);
  const errors = quickAddErrors(draft);
  const invalid = Object.keys(errors).length > 0;
  const error = (field: keyof QuickAddDraft) => submitted ? errors[field] : undefined;
  const update = (patch: Partial<QuickAddDraft>) => { setDraft(previous => ({ ...previous, ...patch })); setFailure(''); };
  function back() {
    if (busy.current) return;
    Keyboard.dismiss();
    setDraft(newPayableDraft());
    router.dismissTo({ pathname: balancesRoot, params: { section: 'payable', status: 'unpaid' } });
  }
  function openCreditorPicker() {
    if (busy.current || saving) return;
    Keyboard.dismiss();
    setCreditorPickerSession(session => session + 1);
    setCreditorPickerOpen(true);
  }
  function closeCreditorPicker() {
    Keyboard.dismiss();
    setCreditorPickerOpen(false);
  }
  function selectCreditor(creditor: Creditor) {
    setDraft(previous => selectDraftCreditor(previous, payables.creditors, creditor.id));
    setFailure('');
    closeCreditorPicker();
  }
  function focusFirstInvalid() {
    if (errors.name) nameInput.current?.focus();
    else if (errors.amount) amountInput.current?.focus();
    else if (errors.dueDate) dateInput.current?.focus();
  }
  function submit() {
    if (busy.current || savedRecord || !confirmationDismissed.current || confirmationOpen) return;
    setSubmitted(true);
    if (invalid) { focusFirstInvalid(); return; }
    Keyboard.dismiss();
    confirmationDismissed.current = false;
    setConfirmationOpen(true);
  }
  function confirmSave() {
    if (busy.current || !confirmationOpen || savedRecord) return;
    setSubmitted(true);
    if (invalid) {
      setConfirmationOpen(false);
      focusFirstInvalid();
      return;
    }
    busy.current = true;
    pendingSaveDraft.current = draft;
    setConfirmationOpen(false);
    setSaving(true);
    setFailure('');
  }
  async function persistDebt(snapshot: QuickAddDraft) {
    try {
      const record = await save(token, snapshot);
      setDraft(newPayableDraft());
      setSearchQuery('');
      setSavedRecord(record);
    } catch (reason) {
      setFailure(reason instanceof Error ? `${reason.message} Your draft is preserved.` : 'Could not save this debt. Your draft is preserved. Try again.');
    } finally {
      busy.current = false; setSaving(false);
    }
  }
  function finishSuccess() {
    if (!savedRecord) return;
    setSavedRecord(null);
    router.dismissTo({ pathname: balancesRoot, params: { section: 'payable', status: 'unpaid' } });
  }
  function afterConfirmationHidden() {
    confirmationDismissed.current = true;
    const snapshot = pendingSaveDraft.current;
    pendingSaveDraft.current = null;
    if (snapshot) void persistDebt(snapshot);
  }
  const summaryLines = [
    `Creditor: ${draft.name.trim()}`,
    `Amount Borrowed: ${formatPesos(quickAddTotal(draft))}`,
    `Due Date: ${draft.dueDate ? formatCalendarDate(draft.dueDate) : 'No due date'}`,
    ...(draft.details.trim() ? [`Other Details: ${draft.details.trim()}`] : []),
  ];
  const overlay = <>
    <PartySelectionSheet visible={creditorPickerOpen} title="Select Creditor/Supplier"
      subtitle="Choose an existing name. Your debt details are kept." onClose={closeCreditorPicker} disabled={saving} testID="creditor-picker">
      <CreditorList key={creditorPickerSession} creditors={payables.creditors} onSelect={selectCreditor} />
    </PartySelectionSheet>
    <MotionModal visible={confirmationOpen} backdropColor={quickAddColors.backdrop}
      onRequestClose={() => { if (!busy.current) setConfirmationOpen(false); }} onHidden={afterConfirmationHidden}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          <ConfirmationContent variant="quickAdd" title="Save Business Debt?" message={summaryLines.join('\n')} cancelLabel="Cancel" confirmLabel="Confirm"
            titleColor={tokens.color.textPrimary} destructive={false} cancelVariant="secondary" onCancel={() => setConfirmationOpen(false)} onConfirm={() => confirmSave()} />
        </ScrollView>
      </SafeAreaView>
    </MotionModal>
    <MotionModal visible={!!savedRecord} backdropColor={quickAddColors.backdrop} onRequestClose={finishSuccess}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          {savedRecord && <QuickAddSuccess record={savedRecord} onClose={finishSuccess} visible={!!savedRecord} />}
        </ScrollView>
      </SafeAreaView>
    </MotionModal>
  </>;
  return <InventoryFrame title="New Business Debt" back inlineTitle subtitle="Keep track of what your business owes and when payment is due" onBack={back} overlay={overlay} onNavigate={action => { if (!busy.current) action(); }}>
    <View className="gap-6" pointerEvents={saving ? 'none' : 'auto'}>
      <CreditorNameField creditorId={draft.creditorId} label="Supplier / Creditor (Name or business you're buying goods from)" placeholder="Creditor Information" onMatch={selected => update({ name: selected.name, creditorId: selected.id })} inputRef={nameInput} value={draft.name} onChange={name => update({ name, creditorId: undefined })} error={error('name')} onBlur={() => setSubmitted(true)}
        onSelect={openCreditorPicker} onSubmitEditing={() => amountInput.current?.focus()} />
      <QuickAddField ref={amountInput} label="Amount Borrowed" money value={draft.amount} onChangeText={amount => update({ amount })} placeholder="0.00" inputMode="decimal" keyboardType="decimal-pad" error={error('amount')} onBlur={() => setSubmitted(true)} returnKeyType="next" onSubmitEditing={() => dateInput.current?.focus()} />
      <InvDateField compact required={false} inputRef={dateInput} label="Due Date (Optional)" value={draft.dueDate} onChange={dueDate => update({ dueDate })} error={error('dueDate')} />
      <InvField inputRef={detailsInput} label="Other Details (Optional)" value={draft.details} onChangeText={details => update({ details })} placeholder="e.g Cash loan used for store supplies" multiline textAlignVertical="top" style={{ minHeight: 160 }} />
      <BalancePanel title="Total Debt" amount={formatPesos(quickAddTotal(draft))} caption="This amount will be recorded as accounts payable." dark />
      {!!failure && <MotionRegion><Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{failure}</Text></MotionRegion>}
      <View className="mt-3 flex-row flex-wrap gap-3">
        <View className="min-w-[120px] flex-1"><Button variant="secondary" disabled={saving} onPress={back}>Cancel</Button></View>
        <View className="min-w-[140px] flex-1"><Button loading={saving} disabled={saving || !!savedRecord || (submitted && invalid)} onPress={submit}>Save Debt</Button></View>
      </View>
    </View>
  </InventoryFrame>;
}
