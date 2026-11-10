import { IconButton, Button } from '@/components/ui/button';
import { useState, type Ref } from 'react';
import { Text, TextInput, View, type TextInputInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PosIcon } from '@/components/pos/pos-icon';
import type { Customer } from '@/types/pos';
import tokens from '@/constants/design-tokens.json';
import { payableColors } from '@/components/payables/payables-ui';
import { EmptyState as ContentState } from '@/components/ui/content-state';

export const receivableColors = { ...payableColors, red: '#972020', redSurface: '#FFEBEE', overdueGroup: '#F1EBF1' };
export const receivablesRoot = '/owner-menu/receivables-payables' as const;
export const debtDescription = 'Keep track of what your customers owe and when they need to pay.';

export function CustomerSearch({ value, onChange, kind = 'customer' }: { value: string; onChange: (value: string) => void; kind?: 'customer' | 'product' }) {
  return <View className="min-h-12 flex-row items-center gap-3 rounded-control border border-white bg-white px-4" style={{ boxShadow: '0 2px 3px #B0C8E3' }}>
    <PosIcon name="search" size={20} color="#5A7394" />
    <TextInput accessibilityLabel={`Search ${kind} name`} value={value} onChangeText={onChange} placeholder={kind === 'customer' ? 'Enter Customer Name' : 'Enter Product Name'} placeholderTextColor="#5A7394" autoCorrect={false} returnKeyType="search" className="min-h-12 min-w-0 flex-1 py-3 font-poppins text-[12px] text-[#102342]" />
    {!!value && <IconButton accessibilityLabel={`Clear ${kind} search`} onPress={() => onChange('')} className="min-h-12 min-w-12 items-center justify-center" icon={({ color }) => <PosIcon name="close" size={16} color={color} />} />}
  </View>;
}
export function CustomerNameField({ value, customerId, onChange, onSelect, error, inputRef, onNext, onPressField }: {
  value: string; customerId?: string; onChange: (name: string) => void; onSelect: () => void; error?: string; inputRef?: Ref<TextInputInstance>; onNext?: () => void;
  onPressField?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return <View className="gap-2">
    <Text className="font-poppins-semibold text-[12px] leading-[18px] text-text-secondary">Customer name or other identifying details (Required)</Text>
    <View className="flex-row items-center rounded-control border bg-white px-3" style={{ borderColor: error ? '#D32F2F' : focused ? tokens.color.accentBase : tokens.color.borderOutline, backgroundColor: error ? '#FFF7F8' : '#FFFFFF' }}>
      {!!customerId && <View accessible={false} className="mr-2 h-9 w-9 items-center justify-center rounded-pill bg-[#D1E1F5]"><Text className="font-poppins-semibold text-[14px] text-action">{value.charAt(0).toUpperCase()}</Text></View>}
      <TextInput ref={inputRef} accessibilityLabel="Customer name, required" accessibilityHint={error} value={value} onChangeText={onChange} showSoftInputOnFocus={!onPressField} onPressIn={onPressField} placeholder="Enter Customer Name" placeholderTextColor="#5A7394" onFocus={() => { setFocused(true); onPressField?.(); }} onBlur={() => setFocused(false)} autoCapitalize="words" returnKeyType="next" onSubmitEditing={onNext} className="min-h-[56px] min-w-0 flex-1 py-3 font-poppins-semibold text-[12px] text-[#102342]" />
      <Button variant="text" fullWidth={false} compact accessibilityLabel="Select an existing customer" onPress={onSelect}>Select</Button>
    </View>
    {!!error && <Text accessibilityRole="alert" className="font-poppins text-[10px] leading-[15px] text-[#972020]">{error}</Text>}
    {!!value.trim() && !customerId && <Text className="font-poppins text-[10px] leading-[15px] text-text-secondary">New customer on save. Use Select to link an existing customer.</Text>}
  </View>;
}
export function CustomerList({ customers, onSelect }: { customers: readonly Customer[]; onSelect: (customer: Customer) => void }) {
  const [query, setQuery] = useState('');
  const rows = customers.filter(customer => customer.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice().sort((a, b) => a.name.localeCompare(b.name));
  return <View className="gap-4">
    <Text className="font-poppins text-[14px] leading-[21px] text-text-secondary">Choose a customer for this debt.</Text>
    <CustomerSearch value={query} onChange={setQuery} />
    {!rows.length && <ContentState title={query ? 'No matching customers' : 'No customers yet'} description="Return to the debt form to enter a new customer." />}
    {rows.map((customer, index) => {
      const letter = customer.name.charAt(0).toUpperCase();
      const duplicate = rows.filter(row => row.name.toLocaleLowerCase() === customer.name.toLocaleLowerCase()).length > 1;
      return <View key={customer.id} className="gap-3">
        {(index === 0 || rows[index - 1].name.charAt(0).toUpperCase() !== letter) && <Text className="mt-2 font-poppins-semibold text-[12px] text-[#102342]">{letter}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel={`Select customer ${customer.name}${duplicate ? `, ${customer.id}` : ''}`} onPress={() => onSelect(customer)} className="min-h-[64px] flex-row items-center gap-4 rounded-control border border-[#B0C8E3] bg-white p-4 active:bg-[#D9E7F4]">
          <View className="h-9 w-9 items-center justify-center rounded-pill bg-[#D1E1F5]"><Text className="font-poppins-semibold text-[14px] text-action">{customer.name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('')}</Text></View>
          <View className="min-w-0 flex-1"><Text className="font-poppins-bold text-[14px] text-[#102342]">{customer.name}</Text>{duplicate && <Text className="font-poppins text-[10px] text-text-secondary">{customer.id}</Text>}</View>
        </Pressable>
      </View>;
    })}
  </View>;
}
