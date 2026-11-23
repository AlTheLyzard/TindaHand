import { selectDraftCreditor } from '@/utils/creditor-selection';
import { KeyboardAwareScrollView as ScrollView, KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import type { TextInputInstance, ViewInstance } from 'react-native';
import { MotionOverlay } from '@/components/ui/motion-overlay';
import { MotionContent, MotionLayout, MotionRegion } from '@/components/ui/motion-content';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Text, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreditProductSelector } from '@/components/pos/credit-product-selector';
import { Button } from '@/components/ui/button';
import { ResizableSheet } from '@/components/ui/resizable-sheet';
import { QuickAddExpenseCategoryField, QuickAddField, quickAddColors, quickAddStyles } from './quick-add-ui';
import { CreditProductBrowser } from '@/components/pos/credit-product-browser';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { DatePicker } from '@/components/ui/date-picker';
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
import { QuickAddSuccess } from './quick-add-success';

type Confirmation = { title: string; message: string; label: string; cancelLabel: string; action: () => void };
export function QuickAddModal({ initialKind, onClose }: { initialKind: QuickAddKind; onClose: () => void }) {
  const { save, payables } = useQuickAdd();
  const { store } = useInventory();
  const [open, setOpen] = useState(true);
  const dismiss = () => setOpen(false);
  const [draft, setDraft] = useState(() => emptyQuickAddDraft(initialKind, todayInManila()));
  const baseline = useRef(draft).current;
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [saved, setSaved] = useState<QuickAddRecord | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const entry = useOverlayTransition(!saved, () => setSuccessVisible(true), motion.transition, false, 1);
  const window = useWindowDimensions();
  const entryStyle = useAnimatedStyle(() => ({ opacity: entry.progress.value,
    transform: [{ translateY: entry.reduced ? 0 : (1 - entry.progress.value) * window.height }] }));
  // One destination prevents rapid taps from stacking a picker/date/product surface.
  const [surface, setSurface] = useState<'form' | 'customer' | 'creditor' | 'date' | 'products'>('form');
  const datePickerOpen = surface === 'date';
  const browsing = surface === 'products';
  const picker = surface === 'customer' || surface === 'creditor' ? surface : null;
  const setDatePickerOpen = (visible: boolean) => setSurface(visible ? 'date' : 'form');
  const setBrowsing = (visible: boolean) => setSurface(visible ? 'products' : 'form');
  const setPicker = (value: 'customer' | 'creditor' | null) => setSurface(value ?? 'form');
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
    if (Platform.OS === 'web' && form.current) (form.current as unknown as { inert: boolean }).inert = !!saved || !!confirmation || datePickerOpen || saving;
  }, [saved, confirmation, datePickerOpen, picker, saving]);
  const errors = draft.kind === 'customerDebt' ? customerDebtErrors(draft, store.products) : quickAddErrors(draft);
  const error = (field: keyof QuickAddDraft) => submitted ? errors[field] : undefined;
  const update = (patch: Partial<QuickAddDraft>) => { setDraft(previous => ({ ...previous, ...patch })); setFailure(''); };
  function confirm(title: string, message: string, label: string, action: () => void, cancelLabel = 'Cancel') {
    if (busy.current) return;
    Keyboard.dismiss(); setConfirmation({ title, message, label, cancelLabel, action });
  }
  function discard(action: () => void) {
    if (busy.current) return;
    if (!saved && hasQuickAddChanges(draft, baseline)) confirm('Discard Changes?', 'You have unsaved changes. Are you sure you want to close without saving?', 'Discard Changes', action, 'Keep Editing');
    else action();
  }
  function close() {
    Keyboard.dismiss();
    if (busy.current || !open) return;
    if (saved) { dismiss(); return; }
    if (datePickerOpen) { setDatePickerOpen(false); return; }
    if (picker) { setPicker(null); return; }
    if (browsing) { setBrowsing(false); return; }
    if (confirmation) setConfirmation(null);
    else discard(dismiss);
  }
  async function submit() {
    if (busy.current || !open || saved || confirmation || datePickerOpen || picker || browsing) return;
    setSubmitted(true);
    if (Object.keys(errors).length) {
      if (errors.name) nameInput.current?.focus();
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
  return <Modal visible={open} sheet transitionDuration={motion.quickAddSheet} onHidden={onClose} backdropColor={quickAddColors.backdrop} onRequestClose={close}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={browsing ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']} style={{ flex: 1, backgroundColor: browsing ? tokens.color.appBackground : 'transparent' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {saved && successVisible ? <MotionRegion style={{ flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          <QuickAddSuccess record={saved} onClose={dismiss} visible={successVisible && open} />
        </ScrollView></MotionRegion> : browsing ? <CreditProductBrowser name={draft.name} selection={draft.items} onConfirm={items => { update({ items }); setBrowsing(false); }} onReturn={() => { Keyboard.dismiss(); setBrowsing(false); }} /> : <>
        {entry.presented && <Animated.View ref={form} style={[{ flex: 1, minHeight: 0 }, entryStyle]} pointerEvents={saved || confirmation || datePickerOpen || saving ? 'none' : 'auto'} aria-hidden={!!saved || !!confirmation || datePickerOpen} accessibilityElementsHidden={!!saved || !!confirmation || datePickerOpen} importantForAccessibility={saved || confirmation || datePickerOpen ? 'no-hide-descendants' : 'auto'}>
          <ResizableSheet title={picker ? 'Select Customer' : expense ? 'Record Expense' : customer ? 'Add Customer Debt' : 'Add Store Debt'}
            subtitle={undefined}
            titleStyle={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.h2Section.fontSize, lineHeight: tokens.typography.h2Section.lineHeight }}
            disabled={saving || !!saved || !!confirmation || datePickerOpen} onClose={close}
            footer={picker ? undefined : compact => <View style={{ paddingTop: compact ? 8 : 16, paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8) }}>
              <View testID="quick-add-total" style={{ minHeight: compact ? 44 : 56, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: tokens.radius.surface, paddingHorizontal: 16, paddingVertical: compact ? 6 : 10, marginBottom: compact ? 8 : 12, backgroundColor: tokens.color.primaryDisabled }}>
                <Text style={quickAddStyles.label}>{expense ? 'Total expense' : 'Total debt'}</Text>
                <Text accessibilityLiveRegion="polite" className={compact ? 'type-title-accent text-text-primary' : 'type-large-metric text-text-primary'}>{formatPesos(quickAddTotal(draft))}</Text>
              </View>
              <Button loading={saving} disabled={!!saved} onPress={() => void submit()}>{expense ? 'Save Expense' : 'Save Debt'}</Button>
            </View>}>
              <MotionContent changeKey={picker ?? `${draft.kind}:${draft.borrowing}`}>
                {picker ? picker === 'customer' ? <CustomerList description="Record what a customer owes your store." searchPlaceholder="Enter Customer Name" customers={store.pos?.customers ?? []} onSelect={selected => { update({ name: selected.name, customerId: selected.id }); Keyboard.dismiss(); setPicker(null); }} />
                  : <CreditorList description="Choose a supplier or creditor for this store debt." creditors={payables.creditors} onSelect={selected => { setDraft(previous => selectDraftCreditor(previous, payables.creditors, selected.id)); Keyboard.dismiss(); setPicker(null); }} /> : <>

                <MotionLayout style={{ gap: tokens.spacing.three }}>
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
                        <Text className=" type-micro-financial-rate leading-[21px] text-text-primary">{borrowing === 'cash' ? 'Cash' : 'Product'}</Text>
                      </Pressable>)}
                    </View>
                  </View>}
                  {draft.kind === 'storeDebt' ? <CreditorNameField label="Creditor name or other identifying details" floatingSuggestions creditorId={draft.creditorId} onMatch={selected => update({ name: selected.name, creditorId: selected.id })} inputRef={nameInput} value={draft.name} onChange={name => update({ name, creditorId: undefined })} error={error('name')} onSelect={() => { Keyboard.dismiss(); setPicker('creditor'); }} onSubmitEditing={() => amountInput.current?.focus()} /> : customer && <CustomerNameField label="Customer Name or other identifying details" floatingSuggestions onMatch={selected => update({ name: selected.name, customerId: selected.id })} inputRef={nameInput} value={draft.name} customerId={draft.customerId} onChange={name => update({ name, customerId: undefined })} error={error('name')} onSelect={() => { Keyboard.dismiss(); setPicker('customer'); }} onNext={() => (draft.borrowing === 'product' ? dueInput : amountInput).current?.focus()} />}
                  {expense && <QuickAddExpenseCategoryField value={draft.category} onChange={category => update({ category })} error={error('category')} />}
                  {customer && draft.borrowing === 'product' ? <CreditProductSelector selection={draft.items} onChange={changeItems} onBrowse={() => { Keyboard.dismiss(); setBrowsing(true); }} error={error('items')}
                    onRemove={(id, reason) => confirm(reason === 'quantity-zero' ? 'Remove Item from Cart?' : 'Remove Item?', reason === 'quantity-zero' ? 'Setting the quantity to 0 will remove this item from your cart. Do you want to continue?' : 'Are you sure you want to remove this item from your cart?', 'Remove', () => setDraft(previous => ({ ...previous, items: removeSelectedProduct(previous.items, id) })))} /> :
                    <QuickAddField ref={amountInput} label={expense ? 'Amount' : 'Amount borrowed'} money large={!customer} value={draft.amount} onChangeText={amount => update({ amount })} placeholder="0.00" keyboardType="decimal-pad" inputMode="decimal" error={error('amount')} returnKeyType={expense ? 'done' : 'next'} onSubmitEditing={() => expense ? Keyboard.dismiss() : dueInput.current?.focus()} />}
                  {draft.kind === 'storeDebt' && <QuickAddField label="Transaction Details" required={false} value={draft.details} onChangeText={details => update({ details })} placeholder="e.g. 1 case of red H" multiline returnKeyType="default" />}
                  {expense && <QuickAddField ref={dueInput} date onPickDate={() => { Keyboard.dismiss(); setDatePickerOpen(true); }} label="Expense Date" value={draft.expenseDate} onChangeText={expenseDate => update({ expenseDate })} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} error={error('expenseDate')} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />}
                  {!expense && <QuickAddField ref={dueInput} date dueDate onPickDate={() => { Keyboard.dismiss(); setDatePickerOpen(true); }} label={customer ? 'Due Date (30 days default)' : 'Due Date'} required={customer} value={draft.dueDate} onChangeText={dueDate => update({ dueDate })} placeholder="YYYY-MM-DD" autoCapitalize="none" keyboardType="numbers-and-punctuation" error={error('dueDate')} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />}
                </MotionLayout>
                <MotionLayout style={{ paddingTop: tokens.spacing.three }}>
                  {!!failure && <MotionRegion><Text accessibilityRole="alert" style={[quickAddStyles.error, { marginTop: 8 }]}>{failure}</Text></MotionRegion>}
                  {submitted && Object.keys(errors).length > 0 && <MotionRegion><Text accessibilityRole="alert" style={[quickAddStyles.error, { marginTop: 8, fontSize: tokens.typography.microCaption.fontSize, lineHeight: 18 }]}>Complete the highlighted fields to continue.</Text></MotionRegion>}
                </MotionLayout>
                </>}
              </MotionContent>
          </ResizableSheet>
        </Animated.View>}
        <MotionOverlay visible={datePickerOpen}>{datePickerOpen && <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
          <View accessibilityViewIsModal onAccessibilityEscape={() => setDatePickerOpen(false)} className="w-full max-w-[412px] gap-4 self-center rounded-card bg-white p-4">
            <Text accessibilityRole="header" className=" type-title-accent text-brand">{expense ? 'Expense Date' : 'Due Date'}</Text>
            <DatePicker confirmLabel={expense ? 'Confirm Expense Date' : 'Confirm Due Date'} value={expense ? draft.expenseDate : draft.dueDate} onChange={date => { update(expense ? { expenseDate: date } : { dueDate: date }); setDatePickerOpen(false); }} onClose={() => setDatePickerOpen(false)} />
          </View>
        </ScrollView>}</MotionOverlay>
        <MotionOverlay visible={!!confirmation}>{confirmation && <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          <ConfirmationContent variant="quickAddDialog" title={confirmation.title} message={confirmation.message} cancelLabel={confirmation.cancelLabel} confirmLabel={confirmation.label} onCancel={() => setConfirmation(null)} onConfirm={() => { confirmation.action(); setConfirmation(null); }} />
        </ScrollView>}</MotionOverlay>
        </>}
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}
