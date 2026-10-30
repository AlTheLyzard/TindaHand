import { Text, View, type TextInputInstance } from 'react-native';
import type { Ref } from 'react';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { FormField } from '@/components/ui/form-field';
import type { Customer, PaymentDraft } from '@/types/pos';
import { customerNameKey } from '@/utils/pos-checkout';

export function PaymentCustomerField({ customers, draft, update, error, inputRef, onNext }: {
  customers: readonly Customer[]; draft: PaymentDraft; update: (patch: Partial<PaymentDraft>) => void;
  error?: string; inputRef: Ref<TextInputInstance>; onNext: () => void;
}) {
  const matches = customers.filter(customer => customerNameKey(customer.name).includes(customerNameKey(draft.customerName)));
  return <View className="gap-2">
    <FormField ref={inputRef} label="Customer" placeholder="Search or enter a customer name" value={draft.customerName}
      onChangeText={customerName => update({ customerName, customerId: null })} autoCapitalize="words" returnKeyType="next" onSubmitEditing={onNext}
      error={error} help="Select an existing record or enter a new customer name." />
    {draft.customerId ? <View className="rounded-control bg-[#E8F5E9] px-3 py-2">
      <Text accessibilityLiveRegion="polite" className="font-poppins-bold text-[12px] text-[#28652F]">Existing customer selected · {draft.customerName}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Change customer" onPress={() => update({ customerId: null })} className="min-h-12 justify-center"><Text className="font-poppins-bold text-[12px] text-action">Change customer</Text></Pressable>
    </View> : <>
      <View className="rounded-control border border-[#B0C8E3] bg-white">
        <Text className="px-3 pt-2 font-poppins-bold text-[11px] text-text-secondary">Existing customers</Text>
        {matches.slice(0, 5).map(customer => <Pressable key={customer.id} accessibilityRole="button" accessibilityLabel={`Select existing customer ${customer.name}`}
          onPress={() => update({ customerId: customer.id, customerName: customer.name })} className="min-h-12 justify-center border-b border-[#D9E7F4] px-3 py-2">
          <Text className="font-poppins text-[12px] text-brand">{customer.name}</Text>
        </Pressable>)}
        {!matches.length && <Text className="p-3 font-poppins text-[12px] text-text-secondary">No matching customers</Text>}
      </View>
      {!!draft.customerName.trim() && <Text accessibilityLiveRegion="polite" className="font-poppins text-[11px] text-text-secondary">{matches.some(customer => customerNameKey(customer.name) === customerNameKey(draft.customerName))
        ? 'This name matches an existing customer. The existing record will be used.'
        : `New customer · ${draft.customerName.trim()} — created when the order completes.`}</Text>}
    </>}
  </View>;
}
