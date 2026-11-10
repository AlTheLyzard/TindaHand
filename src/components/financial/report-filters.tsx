import { useRef, useState } from 'react';
import { Keyboard, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { Button } from '@/components/ui/button';
import { PosChip } from '@/components/pos/pos-chip';
import { PosIcon } from '@/components/pos/pos-icon';
import { ReportCalendar } from './report-calendar';
import { useTranslation } from '@/i18n/use-translation';
import type { ReportSelection, ReportPreset } from '@/types/financial';
import { presetSelection, selectionError, storeToday } from '@/utils/financial';
import { formatCalendarDate, validCalendarDate } from '@/utils/date';

export function ReportFilters({ draft, single, pending, busy, onDraft, onApply, onReset }: {
  draft: ReportSelection; single: boolean; pending: boolean; busy: boolean;
  onDraft: (selection: ReportSelection) => void; onApply: () => void; onReset: () => void;
}) {
  const { t } = useTranslation();
  const [field, setField] = useState<'from' | 'to'>(single ? 'to' : 'from');
  const [focused, setFocused] = useState<'from' | 'to' | null>(null);
  const [month, setMonth] = useState(draft.from.slice(0, 7));
  const toInput = useRef<TextInputInstance>(null);
  const error = selectionError(draft);
  const presets: ReportPreset[] = single ? ['today', 'yesterday', 'custom'] : ['today', 'week', 'month', 'custom'];
  function choosePreset(preset: ReportPreset) {
    if (preset === 'custom') { onDraft({ ...draft, preset }); setMonth((validCalendarDate(draft.from) ? draft.from : storeToday()).slice(0, 7)); }
    else { Keyboard.dismiss(); setFocused(null); onDraft(presetSelection(preset)); }
  }
  function update(value: string, target: 'from' | 'to') {
    onDraft(single ? { preset: 'custom', from: value, to: value } : { ...draft, preset: 'custom', [target]: value });
    if (validCalendarDate(value)) setMonth(value.slice(0, 7));
  }
  function select(date: string) { Keyboard.dismiss(); setFocused(null); update(date, field); if (!single) setField(field === 'from' ? 'to' : 'from'); }
  return <View className="gap-3">
    <View className="flex-row items-center gap-2"><PosIcon name="calendar" size={18} /><Text className="font-poppins text-[14px] text-brand">{t(single ? 'financial.filterDate' : 'financial.filterRange')}</Text></View>
    <View className="flex-row gap-x-2">{presets.map(preset => <PosChip key={preset} compact stretch label={t(`financial.${preset}`)} selected={draft.preset === preset} onPress={() => choosePreset(preset)} />)}</View>
    <View className="flex-row gap-3">{(single ? ['to'] as const : ['from', 'to'] as const).map(target => {
      const invalid = target === 'from' ? !validCalendarDate(draft.from) : !validCalendarDate(draft.to) || (validCalendarDate(draft.from) && draft.to < draft.from);
      return <View key={target} className="min-w-0 flex-1 gap-1">
        <Text className="font-poppins-semibold text-[11px] text-brand">{t(single ? 'financial.asOf' : `financial.${target}`)}</Text>
        <TextInput accessibilityLabel={t(single ? 'financial.asOf' : `financial.${target}`)} accessibilityHint={invalid ? error ?? undefined : 'YYYY-MM-DD. Select a date using the calendar or enter it.'}
          ref={target === 'to' ? toInput : undefined}
          value={focused === target || !validCalendarDate(draft[target]) ? draft[target] : formatCalendarDate(draft[target])}
          onFocus={() => { setFocused(target); setField(target); choosePreset('custom'); if (validCalendarDate(draft[target])) setMonth(draft[target].slice(0, 7)); }} onBlur={() => setFocused(null)}
          onChangeText={value => update(value, target)} autoCorrect={false} autoCapitalize="none" inputMode="text" returnKeyType={target === 'from' ? 'next' : 'done'} maxLength={10} selectTextOnFocus
          onSubmitEditing={() => { if (target === 'from') toInput.current?.focus(); else Keyboard.dismiss(); }}
          className="min-h-12 rounded-control border bg-white px-3 py-3 font-poppins-semibold text-[11px] text-[#0C1B3C]"
          style={{ borderColor: invalid ? '#D32F2F' : field === target && draft.preset === 'custom' ? '#2F6CC9' : '#B0C8E3', backgroundColor: invalid ? '#FFF7F8' : '#FFFFFF', boxShadow: '0 1px 3px #B0C8E3' }} />
      </View>;
    })}</View>
    {error && <View className="flex-row items-start gap-2 rounded-control bg-[#FFEBEE] p-3"><PosIcon name="alert" size={18} color="#B4232C" /><Text accessibilityRole="alert" className="flex-1 font-poppins text-[11px] text-[#B4232C]">{error}</Text></View>}
    {draft.preset === 'custom' && <ReportCalendar selection={draft} single={single} month={month} onMonth={setMonth} onSelect={select} />}
    <Text accessibilityLiveRegion="polite" className="font-poppins text-[10px] leading-4 text-text-secondary">{t(pending ? 'financial.pending' : single ? 'financial.singleHint' : 'financial.dateHint')}</Text>
    <View className="flex-row gap-3"><Button style={{ flex: 1 }} fullWidth={false} variant="secondary" disabled={busy} onPress={() => { Keyboard.dismiss(); setFocused(null); onReset(); }}>{t('financial.reset')}</Button><Button style={{ flex: 2 }} fullWidth={false} disabled={!!error || busy} onPress={() => { Keyboard.dismiss(); setFocused(null); onApply(); }}>{t('financial.apply')}</Button></View>
  </View>;
}
