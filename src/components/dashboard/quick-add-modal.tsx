import type { TextInputInstance, ViewInstance } from 'react-native';
import { MotionOverlay } from '@/components/ui/motion-overlay';
import { MotionContent, MotionLayout, MotionRegion } from '@/components/ui/motion-content';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreditProductSelector } from '@/components/pos/credit-product-selector';
import { Button } from '@/components/ui/button';
import { ResizableSheet } from '@/components/ui/resizable-sheet';
import { QuickAddField, quickAddColors, quickAddStyles, quickAddLabels } from './quick-add-ui';
import { CreditProductBrowser } from '@/components/pos/credit-product-browser';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { ExpenseCategoryField } from '@/components/expenses/expense-category-field';
import { CalendarPicker } from '@/components/inventory/inventory-ui';
import { useQuickAdd } from '@/state/quick-add';
import type { QuickAddDraft, QuickAddKind, QuickAddRecord } from '@/types/quick-add';
import { emptyQuickAddDraft, hasQuickAddChanges, quickAddErrors, quickAddTotal } from '@/utils/quick-add';
import { todayInManila } from '@/utils/inventory';
import { removeSelectedProduct } from '@/utils/pos';
import { formatPesos } from '@/utils/dashboard';
import { CreditorList, CreditorNameField } from '@/components/payables/payables-ui';
import { CustomerList, CustomerNameField } from '@/components/receivables/receivables-ui';
import { useInventory } from '@/state/inventory';
import { customerDebtErrors } from '@/utils/receivables';
import tokens from '@/constants/design-tokens.json';
import { useOverlayTransition } from '@/hooks/use-overlay-transition';
import { motion } from '@/constants/motion';
import { QuickAddSuccess, useSuccessPulse } from './quick-add-success';

type Confirmation = { title: string; message: string; label: string; action: () => void };
export function QuickAddModal({ initialKind, onClose }: { initialKind: QuickAddKind; onClose: () => void }) {
  const { save, payables } = useQuickAdd();
  const { store } = useInventory();
  const [open, setOpen] = useState(true);
  const dismiss = () => setOpen(false);
  const [baseline, setBaseline] = useState(() => emptyQuickAddDraft(initialKind, todayInManila()));
  const [draft, setDraft] = useState(baseline);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [saved, setSaved] = useState<QuickAddRecord | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const entry = useOverlayTransition(!saved, () => setSuccessVisible(true), motion.state, false);
  const window = useWindowDimensions();
  const entryStyle = useAnimatedStyle(() => ({ opacity: entry.progress.value,
    transform: [{ translateY: entry.reduced ? 0 : (1 - entry.progress.value) * window.height }] }));
  const pulseStyle = useSuccessPulse(successVisible && open);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [picker, setPicker] = useState<'customer' | 'creditor' | null>(null);
  const [manualName, setManualName] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const busy = useRef(false);
  const [token] = useState(() => `quick-add-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const form = useRef<ViewInstance>(null);
  const nameInput = useRef<TextInputInstance>(null);
  const amountInput = useRef<TextInputInstance>(null);
  const dueInput = useRef<TextInputInstance>(null);
  useEffect(() => {
    if (Platform.OS === 'web' && form.current) (form.current as unknown as { inert: boolean }).inert = !!saved || !!confirmation || datePickerOpen || !!picker || saving;
  }, [saved, confirmation, datePickerOpen, picker, saving]);
  useEffect(() => { if (manualName && !picker) nameInput.current?.focus(); }, [manualName, picker]);
  const errors = draft.kind === 'customerDebt' ? customerDebtErrors(draft, store.products) : quickAddErrors(draft);
  const error = (field: keyof QuickAddDraft) => submitted ? errors[field] : undefined;
  const update = (patch: Partial<QuickAddDraft>) => { setDraft(previous => ({ ...previous, ...patch })); setFailure(''); };
  function confirm(title: string, message: string, label: string, action: () => void) {
    if (busy.current) return;
    Keyboard.dismiss(); setConfirmation({ title, message, label, action });
  }
  function discard(action: () => void) {
    if (busy.current) return;
    if (!saved && hasQuickAddChanges(draft, baseline)) confirm('Discard Changes?', 'You have unsaved changes. Discard them to continue?', 'Discard Changes', action);
    else action();
  }
  function close() {
    Keyboard.dismiss();
    if (busy.current) return;
    if (saved) { dismiss(); return; }
    if (datePickerOpen) { setDatePickerOpen(false); return; }
    if (picker) { setPicker(null); return; }
    if (browsing) { setBrowsing(false); return; }
    if (confirmation) setConfirmation(null);
    else discard(dismiss);
  }
  function reset(kind = draft.kind) {
    const next = emptyQuickAddDraft(kind, todayInManila());
    setDraft(next); setBaseline(next); setSubmitted(false); setFailure(''); setCategoryOpen(false); setDetailsOpen(false); setManualName(false);
  }
  async function submit() {
    if (busy.current || saved || confirmation || datePickerOpen || picker) return;
    setSubmitted(true);
    if (Object.keys(errors).length) {
      if (errors.category) setCategoryOpen(true);
      else if (errors.name) nameInput.current?.focus();
      else if (errors.amount) amountInput.current?.focus();
      else if (errors.expenseDate) dueInput.current?.focus();
      else if (errors.dueDate) dueInput.current?.focus();
      return;
    }
    busy.current = true; setSaving(true); setFailure(''); Keyboard.dismiss();
    try { setSaved(await save(token, draft)); }
    catch { setFailure('Could not save your record. Your draft is preserved. Please try again.'); }
    finally { busy.current = false; setSaving(false); }
  }
  const expense = draft.kind === 'expense';
  const customer = draft.kind === 'customerDebt';
  const changeItems = (change: (previous: QuickAddDraft['items']) => QuickAddDraft['items']) => {
    setDraft(previous => ({ ...previous, items: change(previous.items) })); setFailure('');
  };
  return <Modal visible={open} sheet onHidden={onClose} backdropColor={quickAddColors.backdrop} onRequestClose={close}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={browsing ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']} style={{ flex: 1, backgroundColor: browsing ? '#F0F8FF' : 'transparent' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {saved && successVisible ? <MotionRegion style={{ flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          <Pressable testID="quick-add-success-backdrop" accessible={false} focusable={false} tabIndex={-1} onPress={dismiss} style={StyleSheet.absoluteFill} />
          <QuickAddSuccess record={saved} onClose={dismiss} pulseStyle={pulseStyle} />
        </ScrollView></MotionRegion> : browsing ? <CreditProductBrowser name={draft.name} onName={name => update({ name, customerId: undefined })} selection={draft.items} onChange={changeItems}
          onReturn={() => { Keyboard.dismiss(); setBrowsing(false); }} nameError={error('name')} /> : <>
        {entry.presented && <Animated.View ref={form} style={[{ flex: 1, minHeight: 0 }, entryStyle]} pointerEvents={saved || confirmation || datePickerOpen || picker || saving ? 'none' : 'auto'} aria-hidden={!!saved || !!confirmation || datePickerOpen || !!picker} accessibilityElementsHidden={!!saved || !!confirmation || datePickerOpen || !!picker} importantForAccessibility={saved || confirmation || datePickerOpen || picker ? 'no-hide-descendants' : 'auto'}>
          <ResizableSheet title={expense ? 'Record Expense' : `Add ${quickAddLabels[draft.kind]}`}
            subtitle={customer ? 'Record what a customer owes your store.' : expense ? 'Keep track of money spent by your store.' : 'Track what your store owes a supplier.'}
            disabled={saving || !!saved || !!confirmation || datePickerOpen || !!picker} onClose={close}
            footer={compact => <View style={{ paddingTop: compact ? 4 : 8, paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8) }}>
              {!expense && <View testID="quick-add-total" style={{ minHeight: compact ? 36 : 56, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: tokens.radius.surface, paddingHorizontal: 16, paddingVertical: compact ? 3 : 10, marginBottom: compact ? 4 : 8, backgroundColor: tokens.color.primaryDisabled }}>
                <Text style={quickAddStyles.label}>Total debt</Text>
                <Text accessibilityLiveRegion="polite" className="font-poppins-bold text-[#102342]" style={{ fontSize: compact ? 20 : 24, lineHeight: compact ? 30 : 36 }}>{formatPesos(quickAddTotal(draft))}</Text>
              </View>}
              <View style={{ gap: compact ? 4 : 8 }}>
                <Button loading={saving} disabled={!!saved} onPress={() => void submit()}>{expense ? 'Save Expense' : 'Save Debt'}</Button>
                <Button variant="secondary" disabled={saving || !!saved} onPress={() => {
                  if (hasQuickAddChanges(draft, baseline)) confirm('Clear All Fields?', 'Clear all entered information? This action cannot be undone.', 'Clear', () => reset());
                  else reset();
                }}>Clear</Button>
              </View>
            </View>}>
              <MotionContent changeKey={`${draft.kind}:${draft.borrowing}`}>
                <MotionLayout style={{ gap: tokens.spacing.two }}>
                  {customer && <View>
                    <Text style={quickAddStyles.label}>Borrowing type</Text>
                    <View className="mt-1 flex-row">
                      {(['cash', 'product'] as const).map(borrowing => <Pressable key={borrowing} accessibilityRole="radio" accessibilityState={{ checked: draft.borrowing === borrowing }}
                        onPress={() => {
                          if (borrowing === draft.borrowing) return;
                          const action = () => update({ borrowing, amount: '', items: {} });
                          if (draft.amount.length || Object.keys(draft.items).length) confirm('Discard Borrowing Details?', 'Switching borrowing type clears the amount and selected products. Your name and due date will be kept.', 'Switch Type', action);
                          else action();
                        }} className="min-h-12 flex-1 flex-row items-center gap-2.5">
                        <View className="h-5 w-5 items-center justify-center rounded-pill border-2 border-action">{draft.borrowing === borrowing && <View className="h-3 w-3 rounded-pill bg-action" />}</View>
                        <Text className="font-poppins text-[14px] leading-[21px] text-[#102342]">{borrowing === 'cash' ? 'Cash' : 'Product'}</Text>
                      </Pressable>)}
                    </View>
                  </View>}
                  {draft.kind === 'storeDebt' ? <CreditorNameField inputRef={nameInput} value={draft.name} onChange={name => update({ name, creditorId: undefined })} error={error('name')} onPressField={manualName ? undefined : () => { Keyboard.dismiss(); setPicker('creditor'); }} onSelect={() => { Keyboard.dismiss(); setPicker('creditor'); }} onSubmitEditing={() => amountInput.current?.focus()} /> : customer && <CustomerNameField inputRef={nameInput} value={draft.name} customerId={draft.customerId} onChange={name => update({ name, customerId: undefined })} error={error('name')} onPressField={manualName ? undefined : () => { Keyboard.dismiss(); setPicker('customer'); }} onSelect={() => { Keyboard.dismiss(); setPicker('customer'); }} onNext={() => (draft.borrowing === 'product' ? dueInput : amountInput).current?.focus()} />}
                  {expense && <ExpenseCategoryField value={draft.category} onChange={category => update({ category })} error={error('category')} open={categoryOpen} onOpenChange={setCategoryOpen} />}
                  {customer && draft.borrowing === 'product' ? <CreditProductSelector selection={draft.items} onChange={changeItems} onBrowse={() => { Keyboard.dismiss(); setBrowsing(true); }} error={error('items')}
                    onRemove={id => confirm('Remove Item?', `Remove ${draft.items[id].itemName} from this debt?`, 'Remove', () => setDraft(previous => ({ ...previous, items: removeSelectedProduct(previous.items, id) })))} /> :
                    <QuickAddField ref={amountInput} label={expense ? 'Amount' : 'Amount borrowed'} money large={!customer} value={draft.amount} onChangeText={amount => update({ amount })} placeholder="0.00" keyboardType="decimal-pad" inputMode="decimal" error={error('amount')} returnKeyType={expense ? 'done' : 'next'} onSubmitEditing={() => expense ? Keyboard.dismiss() : dueInput.current?.focus()} />}
                  {!customer && (!expense || detailsOpen || !!draft.details) && <QuickAddField label="Transaction details (Optional)" required={false} value={draft.details} onChangeText={details => update({ details })} placeholder="e.g. 1 case of Red Horse" multiline returnKeyType="default" />}
                  {expense && !categoryOpen && !detailsOpen && !draft.details && <Button variant="text" fullWidth={false} compact style={{ alignSelf: 'flex-start' }} onPress={() => setDetailsOpen(true)}>Add transaction details (Optional)</Button>}
                  {expense && <QuickAddField ref={dueInput} date onPickDate={() => { Keyboard.dismiss(); setDatePickerOpen(true); }} label="Expense date (Required)" value={draft.expenseDate} onChangeText={expenseDate => update({ expenseDate })} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} error={error('expenseDate')} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />}
                  {!expense && <QuickAddField ref={dueInput} date dueDate onPickDate={() => { Keyboard.dismiss(); setDatePickerOpen(true); }} label={customer ? 'Due date (30 days default)' : 'Due date (Optional)'} required={customer} value={draft.dueDate} onChangeText={dueDate => update({ dueDate })} placeholder="YYYY-MM-DD" autoCapitalize="none" keyboardType="numbers-and-punctuation" error={error('dueDate')} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />}
                </MotionLayout>
                <MotionLayout style={{ paddingTop: tokens.spacing.two }}>
                  {!customer && <Text style={quickAddStyles.note}>{expense ? 'This records money already spent by the store.' : 'This records money your store owes. It is saved in Store Debts.'}</Text>}
                  {!!failure && <MotionRegion><Text accessibilityRole="alert" style={[quickAddStyles.error, { marginTop: 8 }]}>{failure}</Text></MotionRegion>}
                  {submitted && Object.keys(errors).length > 0 && <MotionRegion><Text accessibilityRole="alert" style={[quickAddStyles.error, { marginTop: 8, fontSize: 12, lineHeight: 18 }]}>Complete the highlighted fields to continue.</Text></MotionRegion>}
                </MotionLayout>
              </MotionContent>
          </ResizableSheet>
        </Animated.View>}
        <MotionOverlay visible={!!picker}>{picker && <ResizableSheet testID="quick-add-picker" title={picker === 'customer' ? 'Select Customer' : 'Select Creditor'}
          onClose={() => { Keyboard.dismiss(); setPicker(null); }}
          footer={<View style={{ paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8), paddingTop: 8 }}>
            <Button onPress={() => { Keyboard.dismiss(); setManualName(true); setPicker(null); }}>{picker === 'customer' ? 'Enter a new customer' : 'Enter a new creditor'}</Button>
          </View>}>
          {picker === 'customer' ? <CustomerList customers={store.pos?.customers ?? []} onSelect={selected => { update({ name: selected.name, customerId: selected.id }); setManualName(false); Keyboard.dismiss(); setPicker(null); }} />
            : <CreditorList creditors={payables.creditors} onSelect={selected => { update({ name: selected.name, creditorId: selected.id }); setManualName(false); Keyboard.dismiss(); setPicker(null); }} />}
        </ResizableSheet>}</MotionOverlay>
        <MotionOverlay visible={datePickerOpen}>{datePickerOpen && <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
          <View accessibilityViewIsModal onAccessibilityEscape={() => setDatePickerOpen(false)} className="w-full max-w-[412px] gap-4 self-center rounded-card bg-white p-4">
            <Text accessibilityRole="header" className="font-poppins-bold text-[20px] text-brand">{expense ? 'Expense date' : 'Due date'}</Text>
            <CalendarPicker value={expense ? draft.expenseDate : draft.dueDate} onChange={date => { update(expense ? { expenseDate: date } : { dueDate: date }); setDatePickerOpen(false); }} onClose={() => setDatePickerOpen(false)} />
          </View>
        </ScrollView>}</MotionOverlay>
        <MotionOverlay visible={!!confirmation}>{confirmation && <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          <ConfirmationContent variant="quickAdd" title={confirmation.title} message={confirmation.message} cancelLabel="Keep Editing" confirmLabel={confirmation.label} onCancel={() => setConfirmation(null)} onConfirm={() => { confirmation.action(); setConfirmation(null); }} />
        </ScrollView>}</MotionOverlay>
        </>}
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}
