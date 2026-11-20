import { KeyboardInput as TextInput } from '@/components/ui/keyboard-aware-scroll-view';
import { Button, IconButton } from '@/components/ui/button';
import { useState, type Ref } from 'react';
import { Text, View, type TextInputInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PosIcon } from '@/components/pos/pos-icon';
import type { Customer } from '@/types/pos';
import { PartyNameField } from '@/components/ui/party-name-field';
import { useInventory } from '@/state/inventory';
import { payableColors } from '@/components/payables/payables-ui';
import { EmptyState as ContentState } from '@/components/ui/content-state';
import type { ReceivableStatus } from '@/types/receivables';

export const receivableColors = { ...payableColors, red: '#972020', redSurface: '#FFEBEE', overdueGroup: '#F1EBF1' };
export const receivablesRoot = '/owner-menu/receivables-payables' as const;
export const debtDescription = 'Keep track of what your customers owe and when they need to pay.';

export function receivableStatusAppearance(status: ReceivableStatus) {
  if (status === 'paid') return { label: 'Paid', color: receivableColors.green, surface: receivableColors.greenSurface };
  if (status === 'overdue') return { label: 'Overdue', color: receivableColors.red, surface: receivableColors.redSurface };
  if (status === 'partial') return { label: 'Remaining Balance', color: receivableColors.orange, surface: receivableColors.partialSurface };
  return { label: 'Pending', color: receivableColors.blue, surface: receivableColors.blueSurface };
}

export function ReceivableStatusPill({ status }: { status: ReceivableStatus }) {
  const appearance = receivableStatusAppearance(status);
  return <View className="rounded-pill border px-3 py-1" style={{ borderColor: appearance.color, backgroundColor: appearance.surface }}>
    <Text className="font-poppins-semibold text-[11px]" style={{ color: appearance.color }}>{appearance.label}</Text>
  </View>;
}

export function CustomerSearch({ value, onChange, kind = 'customer', placeholder }: { value: string; onChange: (value: string) => void; kind?: 'customer' | 'product'; placeholder?: string }) {
  return <View className="min-h-12 flex-row items-center gap-3 rounded-control border border-white bg-white px-4" style={{ boxShadow: '0 2px 3px #B0C8E3' }}>
    <PosIcon name="search" size={20} color="#5A7394" />
    <TextInput accessibilityLabel={`Search ${kind} name`} value={value} onChangeText={onChange} placeholder={placeholder ?? (kind === 'customer' ? 'Enter Customer Name' : 'Enter Product Name')} placeholderTextColor="#5A7394" autoCorrect={false} returnKeyType="search" className="min-h-12 min-w-0 flex-1 py-3 font-poppins text-[12px] text-[#102342]" />
    {!!value && <IconButton accessibilityLabel={`Clear ${kind} search`} onPress={() => onChange('')} className="min-h-12 min-w-12 items-center justify-center" icon={({ color }) => <PosIcon name="close" size={16} color={color} />} />}
  </View>;
}
export function CustomerNameField({ value, customerId, onChange, onMatch, onSelect, error, inputRef, onNext, floatingSuggestions }: {
  value: string; customerId?: string; onChange: (name: string) => void; onMatch: (customer: Customer) => void;
  onSelect: () => void; error?: string; inputRef?: Ref<TextInputInstance>; onNext?: () => void; floatingSuggestions?: boolean;
}) {
  const { store } = useInventory();
  return <PartyNameField kind="customer" label="Customer name or other identifying details" value={value} selectedId={customerId}
    records={store.pos?.customers ?? []} onChange={onChange} onMatch={onMatch} onSelect={onSelect} error={error} inputRef={inputRef} onNext={onNext} floatingSuggestions={floatingSuggestions} />;
}
export function CustomerList({ customers, onSelect, onAddNew, searchPlaceholder = 'Search Customer...' }: { customers: readonly Customer[]; onSelect: (customer: Customer) => void; onAddNew?: () => void; searchPlaceholder?: string }) {
  const [query, setQuery] = useState('');
  const rows = customers.filter(customer => customer.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice().sort((a, b) => a.name.localeCompare(b.name));
  return <View className="gap-4">
    <Text className="font-poppins text-[14px] leading-[21px] text-text-secondary">Choose a customer for this debt.</Text>
    {onAddNew && <Button variant="secondary" onPress={onAddNew}>+ Add New Customer</Button>}
    <CustomerSearch value={query} onChange={setQuery} placeholder={searchPlaceholder} />
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
