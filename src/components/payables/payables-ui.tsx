import { IconButton } from '@/components/ui/button';
import { useState, type Ref } from 'react';
import { Text, TextInput, View, type TextInputInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { MotionRegion } from '@/components/ui/motion-content';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';
import type { Creditor } from '@/types/payables';

export const balancesRoot = '/owner-menu/receivables-payables' as const;
export const payableColors = { blue: '#245399', blueSurface: tokens.color.surfaceSubtle, pendingGroup: '#E3F0FF', orange: '#FF861C', partialGroup: '#FAF4EF', partialSurface: '#FFF8E1', green: '#1D5D21', greenSurface: '#E8F5E9' };

export function CreditorNameField({ value, onChange, onSelect, error, inputRef, onSubmitEditing, onPressField }: {
  value: string; onChange: (name: string) => void; onSelect: () => void; error?: string; inputRef?: Ref<TextInputInstance>; onSubmitEditing?: () => void;
  onPressField?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return <View className="gap-1">
    <Text className="font-poppins-semibold text-[12px] leading-[18px] text-brand">Supplier/Creditor (Name or other identifying details)</Text>
    <View className="flex-row items-center rounded-control border" style={{ borderColor: error ? '#D32F2F' : focused ? '#2675FF' : '#FFFFFF', backgroundColor: error ? '#FFF7F8' : '#FFFFFF', boxShadow: '0 3px 3px rgba(115,153,204,0.45)' }}>
      <TextInput ref={inputRef} accessibilityLabel="Supplier or creditor, required" accessibilityHint={error} value={value} onChangeText={onChange} showSoftInputOnFocus={!onPressField} onPressIn={onPressField}
        placeholder="Creditor information" placeholderTextColor="#5A7394" onFocus={() => { setFocused(true); onPressField?.(); }} onBlur={() => setFocused(false)}
        returnKeyType="next" onSubmitEditing={onSubmitEditing} autoCapitalize="words" className="min-h-12 min-w-0 flex-1 px-4 py-3 font-poppins-semibold text-[12px] leading-[18px] text-[#102342]" />
      <IconButton accessibilityLabel="Select an existing creditor" onPress={onSelect} className="min-h-12 min-w-12 items-center justify-center" icon={({ color }) => <PosIcon name="customerDebt" size={22} color={color} />} />
    </View>
    {!!error && <MotionRegion><Text accessibilityRole="alert" className="font-poppins text-[10px] leading-[15px] text-[#972020]">{error}</Text></MotionRegion>}
  </View>;
}

export function CreditorSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <View className="min-h-12 flex-row items-center gap-3 rounded-control border border-white bg-white px-4" style={{ boxShadow: '0 2px 3px #B0C8E3' }}>
    <PosIcon name="search" size={20} color="#5A7394" />
    <TextInput accessibilityLabel="Search creditor name" value={value} onChangeText={onChange} placeholder="Search creditor name" placeholderTextColor="#5A7394"
      autoCorrect={false} returnKeyType="search" className="min-h-12 min-w-0 flex-1 py-3 font-poppins text-[12px] text-[#102342]" />
    {!!value && <IconButton accessibilityLabel="Clear creditor search" onPress={() => onChange('')} className="min-h-12 min-w-12 items-center justify-center" icon={({ color }) => <PosIcon name="close" size={16} color={color} />} />}
  </View>;
}

export function CreditorList({ creditors, onSelect }: { creditors: readonly Creditor[]; onSelect: (creditor: Creditor) => void }) {
  const [query, setQuery] = useState('');
  const rows = creditors.filter(row => row.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice().sort((a, b) => a.name.localeCompare(b.name));
  return <View className="gap-4">
    <Text className="font-poppins text-[14px] leading-[21px] text-text-secondary">Choose a supplier or creditor for this business debt.</Text>
    <CreditorSearch value={query} onChange={setQuery} />
    {!rows.length && <Text accessibilityRole="status" className="py-5 font-poppins text-[14px] text-text-secondary">{query.trim() ? 'No creditors match your search.' : 'No creditors yet. Return to enter a new creditor.'}</Text>}
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
