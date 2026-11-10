import type { Ref } from 'react';
import { Keyboard, Text, View, type TextInputInstance } from 'react-native';
import { FormField } from '@/components/ui/form-field';
import { PosChip } from '@/components/pos/pos-chip';
import { paymentQuickAmountsCentavos } from '@/data/pos';
import { formatPesos } from '@/utils/dashboard';
import { parsePaymentAmount } from '@/utils/pos-payment';

export function PaymentAmountField({ label, value, onChange, error, inputRef, onNext, onBlur }: {
  label: string; value: string; onChange: (value: string) => void; error?: string;
  inputRef?: Ref<TextInputInstance>; onNext?: () => void; onBlur?: () => void;
}) {
  return <View className="gap-2">
    <FormField ref={inputRef} label={label} requiredIndicator="asterisk" prefix="₱" value={value} onChangeText={onChange} placeholder="0.00" onBlur={onBlur}
      keyboardType="decimal-pad" inputMode="decimal" returnKeyType={onNext ? 'next' : 'done'}
      onSubmitEditing={onNext ?? Keyboard.dismiss} error={error} />
    <Text className="mt-2 font-poppins-bold text-[12px] text-text-secondary">Quick Amounts</Text>
    <View className="flex-row gap-1">
      {paymentQuickAmountsCentavos.map(amount => <PosChip key={amount} appearance="quickAmount" stretch label={`₱${amount / 100}`}
        accessibilityLabel={`Set ${label} to ${formatPesos(amount)}`} selected={parsePaymentAmount(value) === amount}
        onPress={() => { onChange((amount / 100).toFixed(2)); Keyboard.dismiss(); }} />)}
    </View>
  </View>;
}
