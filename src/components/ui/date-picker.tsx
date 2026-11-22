import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Button, IconButton } from './button';
import { MotionPressable } from './motion-pressable';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';
import { formatCalendarDate, validCalendarDate } from '@/utils/date';
import { calendarDays, inclusiveCalendarDays, localToday, moveCalendarMonth, selectCalendarRange, type CalendarSelection } from '@/utils/calendar';

type CalendarProps = {
  selection: CalendarSelection; mode: 'single' | 'range'; month: string; onMonth: (month: string) => void;
  onSelect: (date: string) => void; minDate?: string; maxDate?: string; helperText?: string;
};

/** Shared calendar surface. Callers own draft/commit boundaries and contextual actions. */
export function DateCalendar({ selection, mode, month, onMonth, onSelect, minDate = '0001-01-01', maxDate = '9999-12-31', helperText }: CalendarProps) {
  const count = inclusiveCalendarDays(selection);
  const { fontScale } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const daySize = Math.min(Math.max(36, Math.ceil(22 * fontScale) + 12), gridWidth ? gridWidth / 7 - 2 : 36);
  const today = localToday();
  const previous = moveCalendarMonth(month, -1, minDate, maxDate);
  const next = moveCalendarMonth(month, 1, minDate, maxDate);
  const title = new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  return <View testID="date-calendar" style={{ borderWidth: 1, borderColor: tokens.color.borderOutline, borderRadius: tokens.radius.surface, backgroundColor: tokens.color.surfaceCard, padding: 8, gap: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <IconButton accessibilityLabel="Previous month" disabled={previous === month} onPress={() => onMonth(previous)} icon={({ color }) => <View style={{ transform: [{ rotate: '180deg' }] }}><PosIcon name="chevronRight" size={20} color={color} /></View>} />
      <Text accessibilityRole="header" style={{ flex: 1, textAlign: 'center', fontFamily: tokens.typography.weights.bold, fontSize: tokens.typography.h3Heading.fontSize, color: tokens.color.textPrimary }}>{title}</Text>
      <IconButton accessibilityLabel="Next month" disabled={next === month} onPress={() => onMonth(next)} icon={({ color }) => <PosIcon name="chevronRight" size={20} color={color} />} />
    </View>
    <View style={{ flexDirection: 'row' }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <Text key={day}
      style={{ width: `${100 / 7}%`, textAlign: 'center', fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, color: tokens.color.textSecondary }}>{day}</Text>)}</View>
    <View onLayout={event => setGridWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{calendarDays(month).map(date => {
      const disabled = !validCalendarDate(date) || date < minDate || date > maxDate;
      const endpoint = date === selection.from || date === selection.to;
      const between = mode === 'range' && !!count && date > selection.from && date < selection.to;
      return <MotionPressable key={date} accessibilityRole="button" accessibilityLabel={`${formatCalendarDate(date)}${date === today ? ', today' : ''}`} accessibilityState={{ selected: endpoint || between, disabled }} aria-pressed={endpoint || between} disabled={disabled}
        onPress={() => onSelect(date)} style={{ width: `${100 / 7}%`, minHeight: 48, marginVertical: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: between ? tokens.color.accentContainer : 'transparent' }}>
        <View testID={endpoint ? 'calendar-selected-day' : undefined} style={{ width: daySize, height: daySize, borderRadius: daySize / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: endpoint ? tokens.button.primary.default : 'transparent', borderWidth: date === today && !endpoint && !between ? 1 : 0, borderColor: tokens.color.accentBase }}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={{ width: daySize, height: daySize, lineHeight: daySize, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false,
            fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.h3Heading.fontSize, color: endpoint ? tokens.color.surfaceCard : disabled ? tokens.color.textDisabled : date.startsWith(month) ? tokens.color.textPrimary : tokens.color.textPlaceholder }}>{Number(date.slice(-2))}</Text>
        </View>
      </MotionPressable>;
    })}</View>
    <View style={{ padding: 4, gap: 8 }}>
      <Text accessibilityLiveRegion="polite" style={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, color: tokens.button.primary.default }}>
        {mode === 'single' ? `Selected: ${selection.from ? formatCalendarDate(selection.from) : 'Choose a date'}`
          : `From: ${selection.from ? formatCalendarDate(selection.from) : '—'} → To: ${selection.to ? formatCalendarDate(selection.to) : '—'}${count ? ` · ${count} ${count === 1 ? 'day' : 'days'}` : ''}`}
      </Text>
      <Text style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microCaption.fontSize, lineHeight: 18, color: tokens.color.textSecondary }}>
        {helperText ?? (mode === 'range' ? 'Choose a start and end date. Both dates are included.' : 'Choose one date, then tap Confirm Date.')}
      </Text>
    </View>
  </View>;
}

/** Mount on opening: dismissal never changes the committed field value. */
export function DatePicker({ value, onChange, onClose, minYear = 1, minDate = `${String(minYear).padStart(4, '0')}-01-01`, maxDate = '9999-12-31', confirmLabel = 'Confirm Date', helperText }: {
  value: string; onChange: (date: string) => void; onClose: () => void; minYear?: number; minDate?: string; maxDate?: string; confirmLabel?: string; helperText?: string;
}) {
  const [draft, setDraft] = useState(validCalendarDate(value) ? value : '');
  const [month, setMonth] = useState(() => {
    const initial = validCalendarDate(value) ? value : localToday();
    return (initial < minDate ? minDate : initial > maxDate ? maxDate : initial).slice(0, 7);
  });
  return <View style={{ gap: 16 }}>
    <DateCalendar selection={{ from: draft, to: draft }} mode="single" month={month} onMonth={setMonth} onSelect={setDraft} minDate={minDate} maxDate={maxDate}
      helperText={helperText ?? `Choose one date, then tap ${confirmLabel}.`} />
    <Button disabled={!validCalendarDate(draft) || draft < minDate || draft > maxDate} onPress={() => onChange(draft)}>{confirmLabel}</Button>
    <Button variant="secondary" onPress={onClose}>Cancel</Button>
  </View>;
}

export function DateRangePicker({ value, onChange, onClose }: { value: CalendarSelection; onChange: (range: CalendarSelection) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState((validCalendarDate(value.from) ? value.from : validCalendarDate(value.to) ? value.to : localToday()).slice(0, 7));
  return <View style={{ gap: 16 }}>
    <DateCalendar selection={draft} mode="range" month={month} onMonth={setMonth} onSelect={date => setDraft(previous => selectCalendarRange(previous, date))} />
    <Button disabled={!inclusiveCalendarDays(draft)} onPress={() => onChange(draft)}>Confirm Dates</Button>
    <Button variant="secondary" onPress={onClose}>Cancel</Button>
  </View>;
}
