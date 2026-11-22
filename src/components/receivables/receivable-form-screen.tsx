import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Text, View, type TextInputInstance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { InventoryFrame, InvDateField } from '@/components/inventory/inventory-ui';
import { QuickAddField, quickAddColors } from '@/components/dashboard/quick-add-ui';
import { QuickAddSuccess } from '@/components/dashboard/quick-add-success';
import { CreditProductBrowser } from '@/components/pos/credit-product-browser';
import { CreditProductSelector } from '@/components/pos/credit-product-selector';
import { BalancePanel } from '@/components/payables/payables-ui';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { KeyboardAwareScrollView as ScrollView, KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionModal } from '@/components/ui/motion-modal';
import { PartySelectionSheet } from '@/components/ui/party-selection-sheet';
import { Button } from '@/components/ui/button';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PosIcon } from '@/components/pos/pos-icon';
import { useQuickAdd } from '@/state/quick-add';
import { useInventory } from '@/state/inventory';
import { newReceivableDraft, useReceivableDraft } from '@/state/receivable-draft';
import { customerDebtErrors } from '@/utils/receivables';
import { quickAddTotal } from '@/utils/quick-add';
import { selectionSummary, removeSelectedProduct } from '@/utils/pos';
import { formatPesos } from '@/utils/dashboard';
import { formatCalendarDate } from '@/utils/date';
import type { QuickAddDraft, QuickAddRecord } from '@/types/quick-add';
import type { Customer } from '@/types/pos';
import { CustomerList, CustomerNameField, debtDescription, receivablesRoot } from './receivables-ui';
import { motion } from '@/constants/motion';
import tokens from '@/constants/design-tokens.json';

type Picker = 'customer' | 'products' | null;

export function ReceivableFormScreen() {
  const { draft, setDraft, setQuery } = useReceivableDraft();
  const { save } = useQuickAdd();
  const { store } = useInventory();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [picker, setPicker] = useState<Picker>(null);
  const [pickerSession, setPickerSession] = useState(0);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [savedRecord, setSavedRecord] = useState<QuickAddRecord | null>(null);
  const busy = useRef(false);
  const confirmationDismissed = useRef(true);
  const pendingSaveDraft = useRef<QuickAddDraft | null>(null);
  const focusCustomerAfterPicker = useRef(false);
  const nameInput = useRef<TextInputInstance>(null);
  const amountInput = useRef<TextInputInstance>(null);
  const dateInput = useRef<TextInputInstance>(null);
  const [token] = useState(() => `customer-debt-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const insets = useSafeAreaInsets();

  useEffect(() => { setDraft(newReceivableDraft()); }, [setDraft]);
  const errors = customerDebtErrors(draft, store.products);
  const invalid = Object.keys(errors).length > 0;
  const error = (field: keyof QuickAddDraft) => submitted ? errors[field] : undefined;
  const update = (patch: Partial<QuickAddDraft>) => { setDraft(previous => ({ ...previous, ...patch })); setFailure(''); };
  const product = draft.borrowing === 'product';
  const summaryLines = [
    `Customer: ${draft.name.trim()}`,
    `Debt Type: ${product ? 'Product' : 'Cash'}`,
    ...(product ? Object.values(draft.items).map(item => `${item.itemName} × ${item.quantity} · ${formatPesos(item.quantity * item.unitPriceCentavos)}`) : []),
    `Total Amount: ${formatPesos(quickAddTotal(draft))}`,
    `Due Date: ${formatCalendarDate(draft.dueDate)}`,
  ];

  function closePicker() {
    Keyboard.dismiss();
    setPicker(null);
  }
  function openPicker(next: Exclude<Picker, null>) {
    Keyboard.dismiss();
    setPickerSession(session => session + 1);
    setPicker(next);
  }
  function focusFirstInvalid() {
    if (errors.name) nameInput.current?.focus();
    else if (errors.amount) amountInput.current?.focus();
    else if (errors.dueDate) dateInput.current?.focus();
    else if (errors.items) openPicker('products');
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
      setDraft(newReceivableDraft());
      setQuery('');
      setSavedRecord(record);
    } catch (reason) {
      setFailure(reason instanceof Error ? `${reason.message} Your draft is preserved.` : 'Could not save this debt. Your draft is preserved. Try again.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  function finishSuccess() {
    if (!savedRecord) return;
    setSavedRecord(null);
    router.dismissTo({ pathname: receivablesRoot, params: { section: 'receivable', status: 'unpaid' } });
  }
  function afterConfirmationHidden() {
    confirmationDismissed.current = true;
    const snapshot = pendingSaveDraft.current;
    pendingSaveDraft.current = null;
    if (snapshot) void persistDebt(snapshot);
  }
  function back() {
    if (busy.current) return;
    Keyboard.dismiss();
    router.dismissTo({ pathname: receivablesRoot, params: { section: 'receivable', status: 'unpaid' } });
  }
  function selectCustomer(customer: Customer) {
    update({ name: customer.name, customerId: customer.id });
    closePicker();
  }

  const overlay = <>
    <PartySelectionSheet visible={picker === 'customer'} title="Select Customer" subtitle="Choose an existing name. Your debt details are kept."
      onClose={closePicker} onHidden={() => {
        if (focusCustomerAfterPicker.current) {
          focusCustomerAfterPicker.current = false;
          nameInput.current?.focus();
        }
      }} disabled={saving} testID="customer-picker">
      <CustomerList key={pickerSession} customers={store.pos?.customers ?? []} searchPlaceholder="Search Customer..."
        onAddNew={() => { focusCustomerAfterPicker.current = true; closePicker(); }} onSelect={selectCustomer} />
    </PartySelectionSheet>
    <MotionModal visible={picker === 'products'} sheet transitionDuration={motion.quickAddSheet} backdropColor={quickAddColors.backdrop}
      onRequestClose={closePicker}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: tokens.color.appBackground }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {picker === 'products' && <CreditProductBrowser key={pickerSession} name={draft.name} selection={draft.items}
              onConfirm={items => { setDraft(previous => ({ ...previous, items })); setFailure(''); closePicker(); }} onReturn={closePicker} />}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GestureHandlerRootView>
    </MotionModal>
    <MotionModal visible={confirmationOpen} backdropColor={quickAddColors.backdrop} onRequestClose={() => setConfirmationOpen(false)} onHidden={afterConfirmationHidden}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          <ConfirmationContent variant="quickAdd" title="Save Customer Debt?" message={summaryLines.join('\n')} cancelLabel="Cancel" confirmLabel="Confirm"
            titleColor={tokens.color.textPrimary} iconTone="blue" destructive={false} cancelVariant="secondary" onCancel={() => setConfirmationOpen(false)} onConfirm={() => void confirmSave()} />
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

  return <InventoryFrame title="New Customer Debt" back inlineTitle onBack={back} overlay={overlay} onNavigate={action => { if (!busy.current) action(); }}>
    <Text className=" type-micro-financial-rate leading-[21px] text-text-secondary">{debtDescription}</Text>
    <View className="gap-5" pointerEvents={saving ? 'none' : 'auto'}>
      <CustomerNameField onMatch={selected => update({ name: selected.name, customerId: selected.id })} inputRef={nameInput} value={draft.name} customerId={draft.customerId} onChange={name => update({ name, customerId: undefined })} error={error('name')} onSelect={() => openPicker('customer')} onNext={() => (product ? dateInput : amountInput).current?.focus()} />
      <View className="gap-2"><Text className=" type-label-nav text-text-secondary">Debt Type</Text>
        <View accessibilityRole="radiogroup" className="flex-row gap-3">{(['cash', 'product'] as const).map(type => {
          const selected = draft.borrowing === type;
          return <Pressable key={type} accessibilityRole="radio" accessibilityLabel={type === 'cash' ? 'Cash debt' : 'Product debt'} accessibilityState={{ checked: selected }} onPress={() => update({ borrowing: type })}
            className="min-h-[76px] min-w-0 flex-1 flex-row items-center gap-2 rounded-control border px-3 py-3" style={{ borderColor: selected ? tokens.color.accentBase : tokens.color.borderOutline, backgroundColor: selected ? tokens.color.accentContainer : tokens.color.surfaceCard }}>
            <PosIcon name={type === 'cash' ? 'money' : 'inventory'} size={28} color={selected ? tokens.color.accentBase : tokens.color.textSecondary} />
            <View className="min-w-0 flex-1"><Text className=" type-button-cta" style={{ color: selected ? tokens.color.textPrimary : tokens.color.textSecondary }}>{type === 'cash' ? 'Cash' : 'Product'}</Text><Text className=" type-helper" style={{ color: tokens.color.textSecondary }}>{type === 'cash' ? 'Money Amount' : 'Items'}</Text></View>
            <View className="h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: selected ? tokens.color.accentBase : tokens.color.borderOutline }}>
              {selected && <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tokens.color.accentBase }} />}
            </View>
          </Pressable>;
        })}</View>
      </View>
      {product ? <CreditProductSelector fullPage selection={draft.items} onChange={change => setDraft(previous => ({ ...previous, items: change(previous.items) }))} onRemove={id => update({ items: removeSelectedProduct(draft.items, id) })} onBrowse={() => openPicker('products')} error={error('items')} /> : <QuickAddField ref={amountInput} label="Amount borrowed" money value={draft.amount} onChangeText={amount => update({ amount })} placeholder="0.00" inputMode="decimal" keyboardType="decimal-pad" returnKeyType="next" onSubmitEditing={() => dateInput.current?.focus()} error={error('amount')} />}
      <BalancePanel dark title={product ? `Total Items: ${selectionSummary(draft.items).quantity} pcs` : 'Total Cash Borrowed'} amount={formatPesos(quickAddTotal(draft))} caption="This amount will be recorded as a customer receivable." />
      <InvDateField compact inputRef={dateInput} label="Due date (30 days default)" value={draft.dueDate} onChange={dueDate => update({ dueDate })} error={error('dueDate')} />
      {!!failure && <Text accessibilityRole="alert" className=" type-micro-caption text-error-base">{failure}</Text>}
      <View className="mt-3 flex-row flex-wrap gap-3">
        <View className="min-w-[110px] flex-1"><Button variant="secondary" disabled={saving} onPress={() => { Keyboard.dismiss(); setDraft(newReceivableDraft()); setSubmitted(false); setFailure(''); }}>Clear</Button></View>
        <View className="min-w-[130px] flex-1"><Button loading={saving} disabled={saving || !!savedRecord || (submitted && invalid)} onPress={submit}>Save Debt</Button></View>
      </View>
    </View>
  </InventoryFrame>;
}
