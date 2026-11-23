import { DateCalendar } from '@/components/ui/date-picker';
import type { ReportSelection } from '@/types/financial';

/** ReportFilters owns the draft; its Apply action commits it. */
export function ReportCalendar({ selection, single, month, onMonth, onSelect, compact = false }: {
  selection: ReportSelection; single: boolean; month: string; onMonth: (month: string) => void; onSelect: (date: string) => void; compact?: boolean;
}) {
  return <DateCalendar selection={single ? { from: selection.to, to: selection.to } : selection}
    mode={single ? 'single' : 'range'} month={month} onMonth={onMonth} onSelect={onSelect}
    showFooter={!compact} compact={compact}
    helperText={single ? 'Choose one date, then tap Apply.' : 'Both start and end dates are included.'} />;
}
