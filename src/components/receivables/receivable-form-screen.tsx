import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Text, View, type TextInputInstance } from 'react-native';
import { InventoryFrame, InvDateField } from '@/components/inventory/inventory-ui';
import { QuickAddField } from '@/components/dashboard/quick-add-ui';
import { Button } from '@/components/ui/button';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PosIcon } from '@/components/pos/pos-icon';
import { CreditProductSelector } from '@/components/pos/credit-product-selector';
import { BalancePanel } from '@/components/payables/payables-ui';
import { usePushOnce } from '@/hooks/use-push-once';
import { useQuickAdd } from '@/state/quick-add';
import { useInventory } from '@/state/inventory';
import { newReceivableDraft, useReceivableDraft } from '@/state/receivable-draft';
import { customerDebtErrors } from '@/utils/receivables';
import { quickAddTotal } from '@/utils/quick-add';
import { selectionSummary, removeSelectedProduct } from '@/utils/pos';
import { formatPesos } from '@/utils/dashboard';
import type { QuickAddDraft } from '@/types/quick-add';
import { CustomerNameField, debtDescription, receivablesRoot } from './receivables-ui';

export function ReceivableFormScreen() {
  const { draft, setDraft, setQuery } = useReceivableDraft();
  const { save } = useQuickAdd();
  const { store } = useInventory();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const busy = useRef(false);
  const nameInput = useRef<TextInputInstance>(null);
  const amountInput = useRef<TextInputInstance>(null);
  const dateInput = useRef<TextInputInstance>(null);
  const [token] = useState(() => `customer-debt-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const push = usePushOnce();
  useEffect(() => { setDraft(newReceivableDraft()); }, [setDraft]);
  const errors = customerDebtErrors(draft, store.products);
  const invalid = Object.keys(errors).length > 0;
  const error = (field: keyof QuickAddDraft) => submitted ? errors[field] : undefined;
  const update = (patch: Partial<QuickAddDraft>) => { setDraft(previous => ({ ...previous, ...patch })); setFailure(''); };
  const product = draft.borrowing === 'product';
  function back() {
    if (busy.current) return;
    Keyboard.dismiss();
    router.dismissTo({ pathname: receivablesRoot, params: { section: 'receivable', status: 'unpaid' } });
  }
  async function submit() {
    if (busy.current) return;
    setSubmitted(true);
    if (invalid) {
      if (errors.name) nameInput.current?.focus();
      else if (errors.amount) amountInput.current?.focus();
      else if (errors.dueDate) dateInput.current?.focus();
      return;
    }
    busy.current = true; setSaving(true); setFailure(''); Keyboard.dismiss();
    try {
      await save(token, draft);
      setDraft(newReceivableDraft()); setQuery('');
      router.dismissTo({ pathname: receivablesRoot, params: { section: 'receivable', status: 'unpaid' } });
    } catch (reason) {
      setFailure(reason instanceof Error ? `${reason.message} Your draft is preserved.` : 'Could not save this debt. Your draft is preserved. Try again.');
      busy.current = false; setSaving(false);
    }
  }
  return <InventoryFrame title="New Customer Debt" back inlineTitle onBack={back} onNavigate={action => { if (!busy.current) action(); }}>
    <Text className="mb-5 font-poppins text-[14px] leading-[21px] text-text-secondary">{debtDescription}</Text>
    <View className="gap-6" pointerEvents={saving ? 'none' : 'auto'}>
      <CustomerNameField inputRef={nameInput} value={draft.name} customerId={draft.customerId} onChange={name => update({ name, customerId: undefined })} error={error('name')} onSelect={() => { Keyboard.dismiss(); push(`${receivablesRoot}/customers`); }} onNext={() => (product ? dateInput : amountInput).current?.focus()} />
      <View className="gap-3"><Text className="font-poppins-semibold text-[12px] text-text-secondary">Debt Type</Text>
        <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-3">{(['cash', 'product'] as const).map(type => <Pressable key={type} accessibilityRole="radio" accessibilityLabel={type === 'cash' ? 'Cash debt' : 'Product debt'} accessibilityState={{ checked: draft.borrowing === type }} onPress={() => update({ borrowing: type })} className="min-h-[88px] min-w-[130px] flex-1 flex-row items-center gap-3 rounded-control border border-[#B0C8E3] bg-white px-3 pb-3 pt-7">
          <PosIcon name={type === 'cash' ? 'money' : 'inventory'} size={32} color="#245399" />
          <View className="min-w-0 flex-1"><Text className="font-poppins-bold text-[14px] text-[#102342]">{type === 'cash' ? 'Cash' : 'Product'}</Text><Text className="font-poppins text-[10px] text-[#102342]">{type === 'cash' ? 'Money Amount' : 'Items'}</Text></View>
          <View className="absolute right-2 top-2 h-5 w-5 items-center justify-center rounded-pill border-2 border-action">{draft.borrowing === type && <View className="h-3 w-3 rounded-pill bg-action" />}</View>
        </Pressable>)}</View>
      </View>
      {product ? <CreditProductSelector fullPage selection={draft.items} onChange={change => setDraft(previous => ({ ...previous, items: change(previous.items) }))} onRemove={id => update({ items: removeSelectedProduct(draft.items, id) })} onBrowse={() => { Keyboard.dismiss(); push(`${receivablesRoot}/products`); }} error={error('items')} /> : <QuickAddField ref={amountInput} label="Amount borrowed" money value={draft.amount} onChangeText={amount => update({ amount })} placeholder="0.00" inputMode="decimal" keyboardType="decimal-pad" returnKeyType="next" onSubmitEditing={() => dateInput.current?.focus()} error={error('amount')} />}
      <BalancePanel dark title={product ? `Total Items: ${selectionSummary(draft.items).quantity} pcs` : 'Total Cash Borrowed'} amount={formatPesos(quickAddTotal(draft))} caption="This amount will be recorded as a customer receivable." />
      <InvDateField compact inputRef={dateInput} label="Due date (30 days default)" value={draft.dueDate} onChange={dueDate => update({ dueDate })} error={error('dueDate')} />
      {!!failure && <Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{failure}</Text>}
      <View className="mt-3 flex-row flex-wrap gap-3">
        <View className="min-w-[110px] flex-1"><Button variant="secondary" disabled={saving} onPress={() => { Keyboard.dismiss(); setDraft(newReceivableDraft()); setSubmitted(false); setFailure(''); }}>Clear</Button></View>
        <View className="min-w-[130px] flex-1"><Button loading={saving} disabled={submitted && invalid} onPress={() => void submit()}>Save Debt</Button></View>
      </View>
    </View>
  </InventoryFrame>;
}
