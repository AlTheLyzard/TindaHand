import type { TextInputInstance, ViewInstance } from 'react-native';
import { MotionOverlay } from '@/components/ui/motion-overlay';
import { MotionContent, MotionLayout, MotionRegion } from '@/components/ui/motion-content';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PosIcon } from '@/components/pos/pos-icon';
import { CreditProductSelector } from '@/components/pos/credit-product-selector';
import { Button } from '@/components/ui/button';
import { QuickAddChips, QuickAddField, quickAddColors, quickAddStyles, quickAddLabels } from './quick-add-ui';
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

type Confirmation = { title: string; message: string; label: string; action: () => void };
export function QuickAddModal({ initialKind, onClose }: { initialKind: QuickAddKind; onClose: () => void }) {
  const { save } = useQuickAdd();
  const [open, setOpen] = useState(true);
  const dismiss = () => setOpen(false);
  const [baseline, setBaseline] = useState(() => emptyQuickAddDraft(initialKind, todayInManila()));
  const [draft, setDraft] = useState(baseline);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [saved, setSaved] = useState<QuickAddRecord | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { fontScale } = useWindowDimensions();
  const [compact, setCompact] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const busy = useRef(false);
  const [token] = useState(() => `quick-add-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const form = useRef<ViewInstance>(null);
  const nameInput = useRef<TextInputInstance>(null);
  const amountInput = useRef<TextInputInstance>(null);
  const dueInput = useRef<TextInputInstance>(null);
  useEffect(() => {
    if (Platform.OS === 'web' && form.current) (form.current as unknown as { inert: boolean }).inert = !!confirmation || datePickerOpen || saving;
  }, [confirmation, datePickerOpen, saving]);
  const errors = quickAddErrors(draft);
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
    if (datePickerOpen) { setDatePickerOpen(false); return; }
    if (browsing) { setBrowsing(false); return; }
    if (confirmation) setConfirmation(null);
    else discard(dismiss);
  }
  function reset(kind = draft.kind) {
    const next = emptyQuickAddDraft(kind, todayInManila());
    setDraft(next); setBaseline(next); setSubmitted(false); setFailure(''); setCategoryOpen(false); setDetailsOpen(false);
  }
  async function submit() {
    if (busy.current || saved || confirmation || datePickerOpen) return;
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
  return <Modal visible={open} onHidden={onClose} backdropColor={quickAddColors.backdrop} onRequestClose={close}>
    <SafeAreaView style={{ flex: 1, backgroundColor: browsing ? '#F0F8FF' : 'transparent' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {browsing ? <CreditProductBrowser name={draft.name} onName={name => update({ name })} selection={draft.items} onChange={changeItems}
          onReturn={() => { Keyboard.dismiss(); setBrowsing(false); }} nameError={error('name')} /> : <>
        <View ref={form} onLayout={event => setCompact(event.nativeEvent.layout.height < 420)} style={{ flex: 1, minHeight: 0, justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 8 }} pointerEvents={confirmation || datePickerOpen || saving ? 'none' : 'auto'} aria-hidden={!!confirmation || datePickerOpen} accessibilityElementsHidden={!!confirmation || datePickerOpen} importantForAccessibility={confirmation || datePickerOpen ? 'no-hide-descendants' : 'auto'}>
            <Pressable accessible={false} focusable={false} tabIndex={-1} onPress={close} style={StyleSheet.absoluteFill} />
            {/* Size follows the safe, keyboard-adjusted viewport, never the selected form. */}
            <View testID="quick-add-card" accessibilityViewIsModal onAccessibilityEscape={close} style={{ width: '100%', maxWidth: 412, height: '100%', maxHeight: 750, minHeight: 0, alignSelf: 'center', borderRadius: 24, padding: 16, backgroundColor: '#FFFFFF', boxShadow: '0 12px 24px rgba(16,35,66,0.12)' }}>
              <View testID="quick-add-header" style={{ marginBottom: 8, flexShrink: 0 }}>
                <View style={{ paddingRight: 28 }}>
                  <Text accessibilityRole="header" style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 18, lineHeight: 27, color: '#102342' }}>{expense ? 'Record Expense' : `Add ${quickAddLabels[draft.kind]}`}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Close Quick Add" onPress={close} className="absolute -right-3 -top-3 min-h-12 min-w-12 items-center justify-center"><PosIcon name="close" size={24} color="#111111" /></Pressable>
                </View>
                {!compact && <Text style={{ minHeight: 36 * fontScale }} className="mt-1 font-poppins text-[12px] leading-[18px] text-text-secondary">{customer ? 'Record what a customer owes your store.' : expense ? 'Keep track of money spent by your store.' : 'Track what your store owes a supplier.'}</Text>}
              </View>
              <QuickAddChips kind={draft.kind} onSelect={kind => { if (!saved && kind !== draft.kind) discard(() => reset(kind)); }} />
              <ScrollView testID="quick-add-body" style={{ flex: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1, paddingTop: 16, paddingBottom: 8 }}>
              <MotionContent style={{ flexGrow: 1 }} changeKey={`${draft.kind}:${draft.borrowing}:${!!saved}`}>
              {saved ? <>
                <View className="mt-4 h-[72px] w-[72px] items-center justify-center self-center rounded-pill bg-[#E7F3E8]">
                  <View className="h-12 w-12 items-center justify-center rounded-pill bg-[#B4D7B8]"><PosIcon name="checkCircle" size={48} color="#286B2C" /></View>
                </View>
                <Text accessibilityRole="header" className="mt-4 text-center text-[24px] leading-9 text-[#102342]" style={{ fontFamily: 'Poppins_600SemiBold' }}>{saved.kind === 'expense' ? 'Expense recorded' : 'Debt saved'}</Text>
                <Text accessibilityRole="alert" className="mb-5 mt-5 px-3 font-poppins text-[16px] leading-6 text-text-secondary">{formatPesos(saved.amountCentavos)} saved for {saved.name}.</Text>
                <View className="flex-1 justify-end">
                  <Text style={[quickAddStyles.note, { paddingVertical: 8 }]}>{saved.kind === 'customerDebt' ? 'Customer Debt records are updated.' : saved.kind === 'storeDebt' ? 'Store Debt records are updated.' : 'Expense information is updated.'}</Text>
                  <Text className="mt-3 font-poppins text-[12px] leading-[18px] text-text-secondary">Your entry has been saved successfully.</Text>
                </View>
              </> : <>
                <MotionLayout style={{ gap: customer && draft.borrowing === 'product' ? 12 : 16 }}>
                  {customer && <View>
                    <Text style={quickAddStyles.label}>Borrowing type</Text>
                    <View className="mt-2 flex-row">
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
                  {!expense && <QuickAddField ref={nameInput} label={customer ? 'Customer name or other identifying details' : 'Creditor name or other identifying details'} value={draft.name} onChangeText={name => update({ name })} placeholder={customer ? 'e.g. Arman Salon' : 'e.g. YCA Trading'} error={error('name')} showError={!customer} returnKeyType="next" onSubmitEditing={() => (customer && draft.borrowing === 'product' ? dueInput : amountInput).current?.focus()} />}
                  {expense && <ExpenseCategoryField value={draft.category} onChange={category => update({ category })} error={error('category')} open={categoryOpen} onOpenChange={setCategoryOpen} />}
                  {customer && draft.borrowing === 'product' ? <CreditProductSelector selection={draft.items} onChange={changeItems} onBrowse={() => { Keyboard.dismiss(); setBrowsing(true); }} error={error('items')}
                    onRemove={id => confirm('Remove Item?', `Remove ${draft.items[id].itemName} from this debt?`, 'Remove', () => setDraft(previous => ({ ...previous, items: removeSelectedProduct(previous.items, id) })))} /> :
                    <QuickAddField ref={amountInput} label={expense ? 'Amount' : 'Amount borrowed'} money large={!customer} value={draft.amount} onChangeText={amount => update({ amount })} placeholder="0.00" keyboardType="decimal-pad" inputMode="decimal" error={error('amount')} showError={!customer} returnKeyType={expense ? 'done' : 'next'} onSubmitEditing={() => expense ? Keyboard.dismiss() : dueInput.current?.focus()} />}
                  {!customer && (!expense || detailsOpen || !!draft.details) && <QuickAddField label="Transaction details (Optional)" required={false} value={draft.details} onChangeText={details => update({ details })} placeholder="e.g. 1 case of Red Horse" multiline returnKeyType="default" />}
                  {expense && !categoryOpen && !detailsOpen && !draft.details && <Pressable accessibilityRole="button" onPress={() => setDetailsOpen(true)} className="min-h-12 justify-center"><Text className="font-poppins text-[11px] text-action">Add transaction details (Optional)</Text></Pressable>}
                  {expense && <QuickAddField ref={dueInput} date onPickDate={() => { Keyboard.dismiss(); setDatePickerOpen(true); }} label="Expense date (Required)" value={draft.expenseDate} onChangeText={expenseDate => update({ expenseDate })} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} error={error('expenseDate')} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />}
                  {customer && <View className="min-h-16 flex-row flex-wrap items-center justify-between gap-2 rounded-surface px-4 py-3.5" style={{ backgroundColor: '#B8CCE4' }}>
                    <Text style={quickAddStyles.label}>Total debt</Text>
                    <Text accessibilityLiveRegion="polite" className="font-poppins-bold text-[24px] leading-9 text-[#102342]">{formatPesos(quickAddTotal(draft))}</Text>
                  </View>}
                  {!expense && <QuickAddField ref={dueInput} date label={customer ? 'Due date (30 days default)' : 'Due date (Optional)'} required={customer} value={draft.dueDate} onChangeText={dueDate => update({ dueDate })} placeholder="YYYY-MM-DD" autoCapitalize="none" keyboardType="numbers-and-punctuation" error={error('dueDate')} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />}
                </MotionLayout>
                <MotionLayout style={{ paddingTop: 12 }}>
                  {!customer && <Text style={quickAddStyles.note}>{expense ? 'This records money already spent by the store.' : 'This records money your store owes. It is saved in Store Debts.'}</Text>}
                  {!!failure && <MotionRegion><Text accessibilityRole="alert" style={[quickAddStyles.error, { marginTop: 8 }]}>{failure}</Text></MotionRegion>}
                  {submitted && Object.keys(errors).length > 0 && <MotionRegion><Text accessibilityRole="alert" style={[quickAddStyles.error, { marginTop: 8, fontSize: 12, lineHeight: 18 }]}>Complete the highlighted fields to continue.</Text></MotionRegion>}
                </MotionLayout>
              </>}
              </MotionContent>
              </ScrollView>
              <View testID="quick-add-footer" style={{ paddingTop: 12, flexShrink: 0 }}>
                {saved ? <Button visualVariant="quickAdd" onPress={dismiss}>Done</Button> : <View className="flex-row gap-3">
                    <View style={{ width: '27%' }}><Button visualVariant="quickAdd" variant="secondary" disabled={saving} onPress={() => {
                      if (hasQuickAddChanges(draft, baseline)) confirm('Clear All Fields?', 'Clear all entered information? This action cannot be undone.', 'Clear', () => reset());
                      else reset();
                    }}>Clear</Button></View>
                    <View className="flex-1"><Button visualVariant="quickAdd" loading={saving} onPress={() => void submit()}>{expense ? 'Record Expense' : 'Save Debt'}</Button></View>
                  </View>}
              </View>
            </View>
        </View>
        <MotionOverlay visible={datePickerOpen}>{datePickerOpen && <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}>
          <View accessibilityViewIsModal onAccessibilityEscape={() => setDatePickerOpen(false)} className="w-full max-w-[412px] gap-4 self-center rounded-card bg-white p-4">
            <Text accessibilityRole="header" className="font-poppins-bold text-[20px] text-brand">Expense date</Text>
            <CalendarPicker value={draft.expenseDate} onChange={expenseDate => { update({ expenseDate }); setDatePickerOpen(false); }} onClose={() => setDatePickerOpen(false)} />
          </View>
        </ScrollView>}</MotionOverlay>
        <MotionOverlay visible={!!confirmation}>{confirmation && <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <ConfirmationContent variant="quickAdd" title={confirmation.title} message={confirmation.message} cancelLabel="Keep Editing" confirmLabel={confirmation.label} onCancel={() => setConfirmation(null)} onConfirm={() => { confirmation.action(); setConfirmation(null); }} />
        </ScrollView>}</MotionOverlay>
        </>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
