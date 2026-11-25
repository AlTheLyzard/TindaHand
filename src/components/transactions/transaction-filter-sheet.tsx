import { Button } from '@/components/ui/button';
import { DateCalendar } from '@/components/ui/date-picker';
import { DropdownField, type DropdownOption } from '@/components/ui/dropdown-field';
import { InventoryPopover } from '@/components/inventory/inventory-popover';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { MotionModal } from '@/components/ui/motion-modal';
import { ResizableSheet } from '@/components/ui/resizable-sheet';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';
import { transactionMethods } from '@/data/transactions';
import type { TransactionCategory, TransactionFilters, TransactionSortOrder } from '@/types/transactions';
import { inclusiveCalendarDays, selectCalendarRange, type CalendarSelection } from '@/utils/calendar';
import { formatCalendarDate, validCalendarDate } from '@/utils/date';
import { emptyTransactionFilters, transactionDateKey, transactionFilterError } from '@/utils/transactions';
import { useRef, useState } from 'react';
import { Keyboard, ScrollView, Text, View, useWindowDimensions, type ViewInstance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type DatePreset = 'today' | 'week' | 'month' | 'custom';
type FilterSummary = { key: string; label: string; onRemove: () => void };

const datePresetOptions: readonly { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
];

const sortOptions: readonly DropdownOption<TransactionSortOrder>[] = [
  { value: 'newest', label: 'Newest to oldest' },
  { value: 'oldest', label: 'Oldest to newest' },
];

function addDays(date: string, amount: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
}

/** Period shortcuts use the store's Asia/Manila calendar, regardless of device timezone. */
function presetRange(preset: Exclude<DatePreset, 'custom'>): CalendarSelection {
  const today = transactionDateKey(new Date().toISOString());
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'week') {
    const day = new Date(`${today}T12:00:00Z`).getUTCDay();
    const mondayOffset = (day + 6) % 7;
    const from = addDays(today, -mondayOffset);
    return { from, to: addDays(from, 6) };
  }
  const from = `${today.slice(0, 7)}-01`;
  const monthEnd = new Date(`${from}T12:00:00Z`);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  monthEnd.setUTCDate(0);
  return { from, to: monthEnd.toISOString().slice(0, 10) };
}

function datePreset(value: CalendarSelection): DatePreset | null {
  if (!value.from && !value.to) return null;
  for (const preset of ['today', 'week', 'month'] as const) {
    const range = presetRange(preset);
    if (range.from === value.from && range.to === value.to) return preset;
  }
  return 'custom';
}

function shortDate(value: string) {
  if (!validCalendarDate(value)) return value;
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
}

function dateRangeLabel({ from, to }: CalendarSelection) {
  if (from && to) {
    const fromYear = from.slice(0, 4);
    const toYear = to.slice(0, 4);
    const sameMonth = from.slice(0, 7) === to.slice(0, 7);
    if (fromYear !== toYear) return `${formatCalendarDate(from)}–${formatCalendarDate(to)}`;
    return sameMonth ? `${shortDate(from)}–${Number(to.slice(-2))}` : `${shortDate(from)}–${shortDate(to)}`;
  }
  if (from) return `From ${shortDate(from)}`;
  if (to) return `Through ${shortDate(to)}`;
  return '';
}

function SummaryChip({ label, onPress }: { label: string; onPress: () => void }) {
  return <MotionPressable accessibilityRole="button" accessibilityLabel={`Remove ${label} filter`} onPress={onPress}
    style={{ minHeight: tokens.size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: tokens.radius.pill, backgroundColor: tokens.color.appBackground }}>
    <Text numberOfLines={1} style={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, color: tokens.color.royalBlue }}>{label}</Text>
    <PosIcon name="close" size={16} color={tokens.color.royalBlue} />
  </MotionPressable>;
}

function DatePresetChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <MotionPressable accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected} onPress={onPress}
    style={{ minHeight: tokens.size.touchTarget, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, borderRadius: tokens.radius.pill,
      backgroundColor: selected ? tokens.color.royalBlue : '#EDF4FC', boxShadow: tokens.shadow.chip }}>
    <Text numberOfLines={1} style={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.microFinancialRate.fontSize,
      lineHeight: tokens.typography.microFinancialRate.lineHeight, color: selected ? tokens.color.textInverse : tokens.color.black }}>{label}</Text>
  </MotionPressable>;
}

function DateValue({ label, value, onPress }: { label: 'From' | 'To'; value: string; onPress?: () => void }) {
  const contents = <>
    <Text numberOfLines={1} style={{ flex: 1, fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.microFinancialRate.fontSize,
      color: value ? tokens.color.textPrimary : tokens.color.textPlaceholder }}>{value ? formatCalendarDate(value) : 'Select date'}</Text>
    {onPress && <PosIcon name="calendar" size={20} color={tokens.color.black} />}
  </>;
  return <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
    <Text style={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.microFinancialRate.fontSize, color: tokens.color.darkNavy }}>{label}</Text>
    {onPress ? <MotionPressable accessibilityRole="button" accessibilityLabel={`${label} date: ${value ? formatCalendarDate(value) : 'Choose date'}`}
      onPress={onPress} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12,
        borderWidth: 1, borderColor: tokens.color.borderOutline, borderRadius: tokens.radius.control, backgroundColor: tokens.color.surfaceCard }}>
      {contents}
    </MotionPressable> : <View accessible accessibilityLabel={`${label}: ${value ? formatCalendarDate(value) : 'Not selected'}`}
      style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: tokens.color.borderOutline,
        borderRadius: tokens.radius.control, backgroundColor: tokens.color.surfaceCard }}>
      <Text numberOfLines={1} style={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.microFinancialRate.fontSize, color: value ? tokens.color.textPrimary : tokens.color.textPlaceholder }}>
        {value ? formatCalendarDate(value) : 'Select date'}
      </Text>
    </View>}
  </View>;
}

function TransactionDateRangeModal({ value, initialPreset, onApply, onReset, onClose }: {
  value: CalendarSelection; initialPreset: DatePreset; onApply: (range: CalendarSelection) => void; onReset: () => void; onClose: () => void;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | null>(initialPreset);
  const [month, setMonth] = useState((validCalendarDate(value.from) ? value.from : validCalendarDate(value.to) ? value.to : transactionDateKey(new Date().toISOString())).slice(0, 7));
  const complete = inclusiveCalendarDays(draft) > 0;
  const applyPreset = (preset: Exclude<DatePreset, 'custom'>) => {
    const next = presetRange(preset);
    setSelectedPreset(preset);
    setDraft(next);
    setMonth(next.from.slice(0, 7));
  };
  const onSelectDate = (date: string) => {
    setSelectedPreset('custom');
    setDraft(previous => selectCalendarRange(previous, date));
    setMonth(date.slice(0, 7));
  };
  const cardHeight = Math.max(1, Math.min(height - insets.top - insets.bottom - 24, 800));
  return <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={{ flex: 1 }}>
    <MotionPressable accessible={false} focusable={false} tabIndex={-1} onPress={onClose} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
      <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={{ width: '100%', maxWidth: 460, height: cardHeight, overflow: 'hidden',
        borderWidth: 1, borderColor: tokens.color.borderOutline, borderRadius: tokens.radius.surface, backgroundColor: tokens.color.surfaceCard }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <PosIcon name="calendar" size={28} color={tokens.color.textPrimary} />
            <Text accessibilityRole="header" style={{ flexShrink: 1, fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.h2Section.fontSize,
              lineHeight: tokens.typography.h2Section.lineHeight, color: tokens.color.darkNavy }}>Filter by date range</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, minHeight: 64, marginHorizontal: -8 }}
            contentContainerStyle={{ alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8 }}>
            {datePresetOptions.map(preset => <DatePresetChip key={preset.value} label={preset.label} selected={selectedPreset === preset.value}
              onPress={() => {
                switch (preset.value) {
                  case 'custom': setSelectedPreset('custom'); break;
                  case 'today':
                  case 'week':
                  case 'month': applyPreset(preset.value); break;
                }
              }} />)}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DateValue label="From" value={draft.from} />
            <DateValue label="To" value={draft.to} />
          </View>

          <DateCalendar selection={draft} mode="range" month={month} onMonth={setMonth} onSelect={onSelectDate}
            showFooter={false} />
          {!complete && (draft.from || draft.to) && <Text accessibilityRole="alert" style={{ fontFamily: tokens.typography.weights.regular,
            fontSize: tokens.typography.microCaption.fontSize, color: tokens.color.errorBase }}>Select both a start and end date.</Text>}
          <View style={{ gap: 12 }}>
            <Button disabled={!complete && (!!draft.from || !!draft.to)} onPress={() => { if (complete || (!draft.from && !draft.to)) onApply(draft); }}>Apply</Button>
            <Button variant="outlined" onPress={onReset}>Reset</Button>
          </View>
        </ScrollView>
      </View>
    </View>
  </SafeAreaView>;
}

/** Draft filter changes are committed only by Apply Filter; closing discards them. */
export function TransactionFilterSheet({ applied, appliedCategory, appliedSort, categories, onApply, onClose }: {
  applied: TransactionFilters; appliedCategory: TransactionCategory; appliedSort: TransactionSortOrder;
  categories: readonly { value: TransactionCategory; label: string }[];
  onApply: (filters: TransactionFilters, category: TransactionCategory, sort: TransactionSortOrder) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => ({ ...applied }));
  const [draftCategory, setDraftCategory] = useState(appliedCategory);
  const [draftSort, setDraftSort] = useState(appliedSort);
  const [open, setOpen] = useState(true);
  const [calendar, setCalendar] = useState(false);
  const [calendarPreset, setCalendarPreset] = useState<DatePreset>('custom');
  const [sortOpen, setSortOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const sortTrigger = useRef<ViewInstance>(null);
  const typeTrigger = useRef<ViewInstance>(null);
  const insets = useSafeAreaInsets();
  const error = transactionFilterError(draft);
  const dismiss = () => { Keyboard.dismiss(); setSortOpen(false); setTypeOpen(false); setOpen(false); };
  const openCalendar = (preset?: DatePreset) => {
    Keyboard.dismiss(); setSortOpen(false); setTypeOpen(false);
    setCalendarPreset(preset ?? datePreset({ from: draft.from, to: draft.to }) ?? 'custom');
    setCalendar(true);
  };
  const clearDate = () => setDraft(previous => ({ ...previous, from: '', to: '' }));
  const summary: FilterSummary[] = [];
  const rangeLabel = dateRangeLabel(draft);
  if (rangeLabel) summary.push({ key: 'date', label: rangeLabel, onRemove: clearDate });
  if (draft.paymentMethod !== 'all') {
    const method = transactionMethods.find(option => option.value === draft.paymentMethod);
    if (method) summary.push({ key: 'payment', label: method.label, onRemove: () => setDraft(previous => ({ ...previous, paymentMethod: 'all' })) });
  }
  if (draftCategory !== 'all') {
    const type = categories.find(option => option.value === draftCategory);
    if (type) summary.push({ key: 'type', label: type.label, onRemove: () => setDraftCategory('all') });
  }
  if (draftSort !== 'newest') summary.push({ key: 'sort', label: 'Oldest to newest', onRemove: () => setDraftSort('newest') });
  const categoryOptions: readonly DropdownOption<TransactionCategory>[] = categories;

  return <MotionModal visible={open} sheet statusBarTranslucent navigationBarTranslucent
    backdropColor={tokens.overlay.navySoft} onHidden={onClose}
    onRequestClose={() => calendar ? setCalendar(false) : dismiss()}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      {calendar ? <TransactionDateRangeModal value={{ from: draft.from, to: draft.to }} initialPreset={calendarPreset}
        onApply={range => { setDraft(previous => ({ ...previous, ...range })); setCalendar(false); }}
        onReset={() => { setDraft(previous => ({ ...previous, from: '', to: '' })); setCalendar(false); }}
        onClose={() => setCalendar(false)} /> :
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          <ResizableSheet testID="transaction-filters" title="Filter Transactions" titleStyle={{
            fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.h2Section.fontSize,
            lineHeight: tokens.typography.h2Section.lineHeight, color: tokens.color.textPrimary,
          }} onClose={dismiss}
            footer={<View style={{ gap: 8, paddingVertical: 12, paddingBottom: insets.bottom + 12 }}>
              {!!error && <Text accessibilityRole="alert" style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microCaption.fontSize, color: tokens.color.errorBase }}>{error}</Text>}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}><Button compact variant="text" onPress={() => {
                  Keyboard.dismiss(); setSortOpen(false); setTypeOpen(false);
                  setDraft(emptyTransactionFilters()); setDraftCategory('all'); setDraftSort('newest');
                }}>Reset</Button></View>
                <View style={{ flex: 2 }}><Button compact disabled={!!error} textStyle={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, lineHeight: tokens.typography.labelNav.lineHeight }} onPress={() => {
                  if (!error) { onApply({ ...draft }, draftCategory, draftSort); dismiss(); }
                }}>Apply Filter</Button></View>
              </View>
            </View>}>
            <View style={{ gap: 16, paddingBottom: 8 }}>
              {!!summary.length && <View accessibilityLabel="Selected filters" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {summary.map(item => <SummaryChip key={item.key} label={item.label} onPress={item.onRemove} />)}
              </View>}

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <DropdownField label="Sort by" required={false} value={draftSort} options={sortOptions}
                  onChange={setDraftSort} open={sortOpen} onOpenChange={setSortOpen} onBeforeToggle={() => setTypeOpen(false)}
                  style={{ flex: 1, zIndex: sortOpen ? 40 : 10 }} triggerRef={sortTrigger} menuTestID="transaction-sort-options"
                  optionTestIDPrefix="transaction-sort-" renderMenu={options => <InventoryPopover visible={sortOpen} anchorRef={sortTrigger}
                    label="Sort by options" onClose={() => setSortOpen(false)} testID="transaction-sort-options">{options}</InventoryPopover>} />
                <DropdownField label="Type" required={false} value={draftCategory} options={categoryOptions}
                  onChange={setDraftCategory} open={typeOpen} onOpenChange={setTypeOpen} onBeforeToggle={() => setSortOpen(false)}
                  style={{ flex: 1, zIndex: typeOpen ? 40 : 10 }} triggerRef={typeTrigger} menuTestID="transaction-type-options"
                  optionTestIDPrefix="transaction-type-" renderMenu={options => <InventoryPopover visible={typeOpen} anchorRef={typeTrigger}
                    label="Type options" onClose={() => setTypeOpen(false)} testID="transaction-type-options">{options}</InventoryPopover>} />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={sectionLabel}>Payment method</Text>
                <View accessibilityRole="radiogroup" accessibilityLabel="Payment method" style={{ minHeight: tokens.size.touchTarget + 8, flexDirection: 'row', alignItems: 'center',
                  padding: 4, borderRadius: tokens.radius.surface, backgroundColor: tokens.color.iceContainer }}>
                  {transactionMethods.map(method => {
                    const selected = draft.paymentMethod === method.value;
                    return <MotionPressable key={method.value} accessibilityRole="radio" accessibilityLabel={method.label}
                      accessibilityState={{ checked: selected }} aria-checked={selected}
                      onPress={() => setDraft(previous => ({ ...previous, paymentMethod: method.value }))}
                      style={{ flex: 1, minWidth: 0, minHeight: tokens.size.touchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
                        borderRadius: tokens.radius.control, backgroundColor: selected ? tokens.color.royalBlue : 'transparent' }}>
                      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microFinancialRate.fontSize,
                        color: selected ? tokens.color.textInverse : tokens.color.textPrimary }}>{method.label}</Text>
                    </MotionPressable>;
                  })}
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={sectionLabel}>Date Range</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, minHeight: 64, marginHorizontal: -8 }}
                  contentContainerStyle={{ alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8 }}>
                  {datePresetOptions.map(preset => {
                    const selected = datePreset({ from: draft.from, to: draft.to }) === preset.value;
                    return <DatePresetChip key={preset.value} label={preset.label} selected={selected}
                      onPress={() => {
                        switch (preset.value) {
                          case 'custom': openCalendar('custom'); break;
                          case 'today': setDraft(previous => ({ ...previous, ...presetRange('today') })); break;
                          case 'week': setDraft(previous => ({ ...previous, ...presetRange('week') })); break;
                          case 'month': setDraft(previous => ({ ...previous, ...presetRange('month') })); break;
                        }
                      }} />;
                  })}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <DateValue label="From" value={draft.from} onPress={openCalendar} />
                  <DateValue label="To" value={draft.to} onPress={openCalendar} />
                </View>
              </View>
            </View>
          </ResizableSheet>
        </SafeAreaView>}
    </GestureHandlerRootView>
  </MotionModal>;
}

const sectionLabel = { fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.microFinancialRate.fontSize,
  lineHeight: tokens.typography.microFinancialRate.lineHeight, color: tokens.color.textPrimary } as const;
