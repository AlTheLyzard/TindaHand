import { Text, View } from 'react-native';
import { IconButton } from '@/components/ui/button';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { PosIcon } from '@/components/pos/pos-icon';
import { useTranslation } from '@/i18n/use-translation';
import type { ReportSelection } from '@/types/financial';
import { shiftDate } from '@/utils/financial';
import { validCalendarDate, formatCalendarDate } from '@/utils/date';

export function ReportCalendar({ selection, single, month, onMonth, onSelect }: {
  selection: ReportSelection; single: boolean; month: string; onMonth: (month: string) => void; onSelect: (date: string) => void;
}) {
  const { t } = useTranslation();
  const first = `${month}-01`;
  const offset = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();
  const days = Array.from({ length: Math.ceil((count + offset) / 7) * 7 }, (_, index) => shiftDate(first, index - offset));
  const move = (step: number) => {
    const date = new Date(`${first}T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + step);
    const next = date.toISOString().slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(next) && next.slice(0, 4) !== '0000') onMonth(next);
  };
  return <View className="rounded-control border border-[#B0C8E3] bg-white p-2">
    <View className="flex-row items-center justify-between">
      <IconButton accessibilityLabel={t('financial.previousMonth')} onPress={() => move(-1)} icon={({ color }) => <PosIcon name="back" size={18} color={color} />} />
      <Text accessibilityRole="header" className="flex-1 text-center font-poppins-bold text-[16px] text-brand">{new Date(`${first}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' })}</Text>
      <IconButton accessibilityLabel={t('financial.nextMonth')} onPress={() => move(1)} icon={({ color }) => <PosIcon name="chevronRight" size={18} color={color} />} />
    </View>
    <View className="flex-row">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <Text key={day} style={{ width: `${100 / 7}%` }} className="py-2 text-center font-poppins-semibold text-[10px] text-text-secondary">{day}</Text>)}</View>
    <View className="flex-row flex-wrap">{days.map(date => {
      const endpoint = date === selection.from || date === selection.to;
      const between = !single && selection.from <= date && selection.to >= date;
      return <MotionPressable key={date} accessibilityRole="button" accessibilityLabel={formatCalendarDate(date)} accessibilityState={{ selected: endpoint || between }}
        onPress={() => onSelect(date)} style={{ width: `${100 / 7}%`, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginVertical: 2, backgroundColor: between ? '#D1E1F5' : 'transparent' }}>
        <View style={{ minWidth: 34, minHeight: 38, paddingHorizontal: 2, paddingVertical: 8, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: endpoint ? '#245399' : 'transparent' }}>
          <Text className="font-poppins text-[11px]" style={{ color: endpoint ? '#FFFFFF' : date.startsWith(month) ? '#0C1B3C' : '#8196B1' }}>{Number(date.slice(-2))}</Text>
        </View>
      </MotionPressable>;
    })}</View>
    <Text className="mt-2 font-poppins-semibold text-[10px] text-action">{single ? t('financial.selected', { date: formatCalendarDate(selection.to) }) : t('financial.range', { from: validCalendarDate(selection.from) ? formatCalendarDate(selection.from) : '—', to: validCalendarDate(selection.to) ? formatCalendarDate(selection.to) : '—' })}</Text>
    <Text className="mt-1 font-poppins text-[10px] text-text-secondary">{t(single ? 'financial.singleHint' : 'financial.inclusive')}</Text>
  </View>;
}
