import { CustomerList } from '@/components/receivables/receivables-ui';
import { PartyNameField } from '@/components/ui/party-name-field';
import { PartySelectionSheet } from '@/components/ui/party-selection-sheet';
import { useEffect, useRef, useState, type Ref } from 'react';
import { Keyboard, type TextInputInstance } from 'react-native';
import type { Customer, PaymentDraft } from '@/types/pos';

export function PaymentCustomerField({ customers, draft, update, error, inputRef, onNext, onBlur }: {
  customers: readonly Customer[]; draft: PaymentDraft; update: (patch: Partial<PaymentDraft>) => void;
  error?: string; inputRef: Ref<TextInputInstance>; onNext: () => void; onBlur?: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSession, setPickerSession] = useState(0);
  const pendingPicker = useRef(false);
  const openTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closePicker = () => setPickerOpen(false);
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      if (!pendingPicker.current) return;
      pendingPicker.current = false;
      if (openTimeout.current) clearTimeout(openTimeout.current);
      openTimeout.current = null;
      setPickerOpen(true);
    });
    return () => {
      subscription.remove();
      pendingPicker.current = false;
      if (openTimeout.current) clearTimeout(openTimeout.current);
    };
  }, []);
  const openPicker = () => {
    if (pickerOpen || pendingPicker.current) return;
    setPickerSession(session => session + 1);
    if (!Keyboard.isVisible()) {
      setPickerOpen(true);
      return;
    }
    pendingPicker.current = true;
    Keyboard.dismiss();
    // Some Android keyboards do not emit keyboardDidHide as a native modal is presented.
    openTimeout.current = setTimeout(() => {
      if (!pendingPicker.current) return;
      pendingPicker.current = false;
      openTimeout.current = null;
      setPickerOpen(true);
    }, 400);
  };
  const selectCustomer = (customer: Customer) => {
    update({ customerId: customer.id, customerName: customer.name });
    closePicker();
  };

  return <>
    <PartyNameField kind="customer" label="Customer name or other identifying details" value={draft.customerName}
      selectedId={draft.customerId ?? undefined} records={customers} inputRef={inputRef} error={error} onNext={onNext} onFieldBlur={onBlur} floatingSuggestions
      onChange={customerName => update({ customerName, customerId: null })}
      onMatch={customer => update({ customerId: customer.id, customerName: customer.name })}
      onSelect={openPicker} />
    <PartySelectionSheet visible={pickerOpen} title="Select Customer" subtitle="Choose an existing customer for this order."
      testID="pos-customer-picker" onClose={closePicker}>
      <CustomerList key={pickerSession} customers={customers} onSelect={selectCustomer} searchPlaceholder="Search Customer..."
        description="Choose a customer for this order."
        emptyDescription="Return to the payment form and enter a customer name." />
    </PartySelectionSheet>
  </>;
}
