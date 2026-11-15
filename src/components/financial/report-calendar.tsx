import { DateCalendar } from '@/components/ui/date-picker';
import type { ReportSelection } from '@/types/financial';

/** ReportFilters owns the draft; only its Apply Filter action commits it. */
export function ReportCalendar({ selection, single, month, onMonth, onSelect }: {
  selection: ReportSelection; single: boolean; month: string; onMonth: (month: string) => void; onSelect: (date: string) => void;
}) {
  return <DateCalendar selection={single ? { from: selection.to, to: selection.to } : selection}
    mode={single ? 'single' : 'range'} month={month} onMonth={onMonth} onSelect={onSelect}
    helperText={single ? 'Choose one date, then tap Apply Filter.' : 'Both start and end dates are included. Tap Apply Filter to confirm.'} />;
}
