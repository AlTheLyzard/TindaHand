import { StatusText } from '@/components/ui/status-text';
import { KeyboardInput as TextInput } from '@/components/ui/keyboard-aware-scroll-view';
import { IconButton } from '@/components/ui/button';
import { useState, type Ref } from 'react';
import { Text, View, type TextInputInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PartyNameField } from '@/components/ui/party-name-field';
import { useQuickAdd } from '@/state/quick-add';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';
import type { Creditor } from '@/types/payables';

export const balancesRoot = '/owner-menu/receivables-payables' as const;
export const payableColors = { blue: '#245399', blueSurface: tokens.color.surfaceSubtle, pendingGroup: '#E3F0FF', red: '#972020', redSurface: '#FFEBEE', overdueGroup: '#FFF1F1', orange: '#FF861C', partialGroup: '#FAF4EF', partialSurface: '#FFF8E1', green: '#1D5D21', greenSurface: '#E8F5E9' };
export type PayableDisplayStatus = 'paid' | 'overdue' | 'partial' | 'pending';

export function CreditorNameField({ value, creditorId, onChange, onMatch, onSelect, error, inputRef, onSubmitEditing, onBlur, floatingSuggestions, placeholder = 'Enter creditor name', label = 'Supplier/Creditor (Name or business you are buying goods from)' }: {
  value: string; creditorId?: string; onChange: (name: string) => void; onMatch: (creditor: Creditor) => void;
  onSelect: () => void; error?: string; inputRef?: Ref<TextInputInstance>; onSubmitEditing?: () => void; onBlur?: () => void; floatingSuggestions?: boolean; placeholder?: string; label?: string;
}) {
  const { payables } = useQuickAdd();
  return <PartyNameField kind="creditor" label={label} value={value} selectedId={creditorId} placeholder={placeholder} onFieldBlur={onBlur}
    records={payables.creditors} onChange={onChange} onMatch={onMatch} onSelect={onSelect} error={error} inputRef={inputRef} onNext={onSubmitEditing} floatingSuggestions={floatingSuggestions} />;
}
export function CreditorSearch({ value, onChange, placeholder = 'Enter Creditor Name' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <View className="min-h-12 flex-row items-center gap-3 rounded-control border border-white bg-white px-4" style={{ boxShadow: '0 2px 3px #B0C8E3' }}>
    <PosIcon name="search" size={20} color="#5A7394" />
    <TextInput accessibilityLabel="Search creditor name" value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#5A7394"
      autoCorrect={false} returnKeyType="search" className="min-h-12 min-w-0 flex-1 py-3 font-poppins text-[12px] text-[#102342]" />
    {!!value && <IconButton accessibilityLabel="Clear creditor search" onPress={() => onChange('')} className="min-h-12 min-w-12 items-center justify-center" icon={({ color }) => <PosIcon name="close" size={16} color={color} />} />}
  </View>;
}

export function CreditorList({ creditors, onSelect }: { creditors: readonly Creditor[]; onSelect: (creditor: Creditor) => void }) {
  const [query, setQuery] = useState('');
  const rows = creditors.filter(row => row.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice().sort((a, b) => a.name.localeCompare(b.name));
  return <View className="gap-4">
    <CreditorSearch value={query} onChange={setQuery} placeholder="Search creditor name" />
    {!rows.length && <StatusText className="py-5 font-poppins text-[14px] text-text-secondary">{query.trim() ? 'No creditors match your search.' : 'No creditors yet. Return to enter a new creditor.'}</StatusText>}
    {rows.map((creditor, index) => {
      const letter = creditor.name.charAt(0).toLocaleUpperCase();
      const initials = creditor.name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toLocaleUpperCase();
      return <View key={creditor.id} className="gap-3">
        {(index === 0 || rows[index - 1].name.charAt(0).toLocaleUpperCase() !== letter) && <Text className="mt-2 font-poppins-semibold text-[12px] text-[#102342]">{letter}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel={`Select ${creditor.name}`} onPress={() => onSelect(creditor)} className="min-h-[64px] flex-row items-center gap-4 rounded-control border border-[#B0C8E3] bg-white p-4 active:bg-[#D9E7F4]">
          <View className="h-9 w-9 items-center justify-center rounded-pill bg-[#D1E1F5]"><Text className="font-poppins-semibold text-[14px] text-action">{initials}</Text></View>
          <Text className="min-w-0 flex-1 font-poppins-bold text-[14px] text-[#102342]">{creditor.name}</Text>
        </Pressable>
      </View>;
    })}
  </View>;
}

export function BalancePanel({ title, amount, caption, paid = false, dark = false }: { title: string; amount: string; caption?: string; paid?: boolean; dark?: boolean }) {
  const color = dark ? '#FFFFFF' : paid ? payableColors.green : payableColors.blue;
  return <View className="rounded-card border" style={{ gap: dark ? 8 : 12, padding: dark ? 16 : 20, borderColor: color, backgroundColor: dark ? '#112F6F' : paid ? payableColors.greenSurface : payableColors.blueSurface }}>
    <Text className="font-poppins-semibold" style={{ color, fontSize: dark ? 12 : 18, lineHeight: dark ? 18 : 27 }}>{title}</Text>
    <Text accessibilityLiveRegion="polite" className="font-poppins-bold text-[30px] leading-[45px]" style={{ color }}>{amount}</Text>
    {!!caption && <Text className="font-poppins" style={{ color: dark ? '#FFFFFF' : tokens.color.textSecondary, fontSize: dark ? 10 : 12, lineHeight: dark ? 15 : 18 }}>{caption}</Text>}
  </View>;
}

export function PayableStatusPill({ status }: { status: PayableDisplayStatus }) {
  const appearance = status === 'paid' ? { label: 'Paid', color: payableColors.green, surface: payableColors.greenSurface }
    : status === 'overdue' ? { label: 'Overdue', color: payableColors.red, surface: payableColors.redSurface }
      : status === 'partial' ? { label: 'Remaining Balance', color: payableColors.orange, surface: payableColors.partialSurface }
        : { label: 'Pending', color: payableColors.blue, surface: payableColors.blueSurface };
  return <View className="rounded-pill border px-3 py-1" style={{ borderColor: appearance.color, backgroundColor: appearance.surface }}>
    <Text className="font-poppins-semibold text-[11px]" style={{ color: appearance.color }}>{appearance.label}</Text>
  </View>;
}
