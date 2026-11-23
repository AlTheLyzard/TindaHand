import { StatusText } from '@/components/ui/status-text';
import { SearchBar } from '@/components/ui/search-bar';
import { useState, type Ref } from 'react';
import { Text, View, type TextInputInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PartyNameField } from '@/components/ui/party-name-field';
import { useQuickAdd } from '@/state/quick-add';
import tokens from '@/constants/design-tokens.json';
import type { Creditor } from '@/types/payables';

export const balancesRoot = '/owner-menu/receivables-payables' as const;
export const payableColors = { blue: tokens.color.royalBlue, blueSurface: tokens.color.surfaceSubtle, pendingGroup: tokens.color.accentContainer, red: tokens.color.errorBase, redSurface: tokens.color.errorTint, overdueGroup: tokens.color.errorSoft, orange: tokens.color.warningBase, partialGroup: tokens.color.warningTint, partialSurface: tokens.color.warningTint, green: tokens.color.successBase, greenSurface: tokens.color.successTint };
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
  return <SearchBar label="Search creditor name" value={value} onChangeText={onChange} placeholder={placeholder}
    onClear={() => onChange('')} clearLabel="Clear creditor search" />;
}

export function CreditorList({ creditors, onSelect, description }: { creditors: readonly Creditor[]; onSelect: (creditor: Creditor) => void; description?: string }) {
  const [query, setQuery] = useState('');
  const rows = creditors.filter(row => row.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice().sort((a, b) => a.name.localeCompare(b.name));
  return <View className="gap-4">
    {!!description && <Text className=" type-micro-financial-rate leading-[21px] text-text-secondary">{description}</Text>}
    <CreditorSearch value={query} onChange={setQuery} placeholder="Search creditor name" />
    {!rows.length && <StatusText className="py-5 type-micro-financial-rate text-text-secondary">{query.trim() ? 'No creditors match your search.' : 'No creditors yet. Return to enter a new creditor.'}</StatusText>}
    {rows.map((creditor, index) => {
      const letter = creditor.name.charAt(0).toLocaleUpperCase();
      const initials = creditor.name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toLocaleUpperCase();
      return <View key={creditor.id} className="gap-3">
        {(index === 0 || rows[index - 1].name.charAt(0).toLocaleUpperCase() !== letter) && <Text className="mt-2 type-label-nav text-text-primary">{letter}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel={`Select ${creditor.name}`} onPress={() => onSelect(creditor)} className="min-h-[64px] flex-row items-center gap-4 rounded-control border border-outline bg-white p-4 active:bg-ice-container">
          <View className="h-9 w-9 items-center justify-center rounded-pill bg-accent-soft"><Text className=" type-micro-financial-rate text-action">{initials}</Text></View>
          <Text className="min-w-0 flex-1 type-button-cta text-text-primary">{creditor.name}</Text>
        </Pressable>
      </View>;
    })}
  </View>;
}

export function BalancePanel({ title, amount, caption, paid = false, dark = false }: { title: string; amount: string; caption?: string; paid?: boolean; dark?: boolean }) {
  const color = dark ? tokens.color.surfaceCard : paid ? payableColors.green : payableColors.blue;
  return <View className="rounded-card border" style={{ gap: dark ? 8 : 12, padding: dark ? 16 : 20, borderColor: color, backgroundColor: dark ? tokens.color.darkNavy : paid ? payableColors.greenSurface : payableColors.blueSurface }}>
    <Text style={{ color, fontFamily: dark ? tokens.typography.weights.medium : tokens.typography.weights.semibold,
      fontSize: dark ? tokens.typography.inlineStatus.fontSize : tokens.typography.h3Heading.fontSize,
      lineHeight: dark ? tokens.typography.inlineStatus.lineHeight : tokens.typography.h3Heading.lineHeight }}>{title}</Text>
    <Text accessibilityLiveRegion="polite" className="type-large-metric" style={{ color }}>{amount}</Text>
    {!!caption && <Text style={{ color: dark ? tokens.color.surfaceCard : tokens.color.textSecondary,
      fontFamily: tokens.typography.weights.regular, fontSize: dark ? tokens.typography.helper.fontSize : tokens.typography.microCaption.fontSize,
      lineHeight: dark ? tokens.typography.helper.lineHeight : tokens.typography.microCaption.lineHeight }}>{caption}</Text>}
  </View>;
}

export function PayableStatusPill({ status }: { status: PayableDisplayStatus }) {
  const appearance = status === 'paid' ? { label: 'Paid', color: payableColors.green, surface: payableColors.greenSurface }
    : status === 'overdue' ? { label: 'Overdue', color: payableColors.red, surface: payableColors.redSurface }
      : status === 'partial' ? { label: 'Remaining Balance', color: payableColors.orange, surface: payableColors.partialSurface }
        : { label: 'Pending', color: payableColors.blue, surface: payableColors.blueSurface };
  return <View className="rounded-pill border px-3 py-1" style={{ borderColor: appearance.color, backgroundColor: appearance.surface }}>
    <Text className="type-status-badge" style={{ color: appearance.color }}>{appearance.label}</Text>
  </View>;
}
