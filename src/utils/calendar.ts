import { validCalendarDate } from './date';

export type CalendarSelection = { from: string; to: string };

// UTC is used only as a Gregorian arithmetic container. Date-only strings are
// never converted to local instants, so DST/timezone changes cannot shift a day.
export function calendarDays(month: string) {
  const first = `${month}-01`;
  if (!validCalendarDate(first)) return [];
  const start = new Date(`${first}T12:00:00Z`);
  const offset = (start.getUTCDay() + 6) % 7;
  const last = new Date(start); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0);
  return Array.from({ length: Math.ceil((last.getUTCDate() + offset) / 7) * 7 }, (_, index) => {
    const day = new Date(start); day.setUTCDate(day.getUTCDate() + index - offset);
    return day.toISOString().slice(0, 10);
  });
}

export function moveCalendarMonth(month: string, step: number, minDate = '0001-01-01', maxDate = '9999-12-31') {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + step);
  if (Number.isNaN(date.getTime())) return month;
  const next = date.toISOString().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(next) && next >= minDate.slice(0, 7) && next <= maxDate.slice(0, 7) ? next : month;
}

export function inclusiveCalendarDays({ from, to }: CalendarSelection) {
  return validCalendarDate(from) && validCalendarDate(to) && from <= to
    ? Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000) + 1 : 0;
}

export function selectCalendarRange(selection: CalendarSelection, date: string): CalendarSelection {
  if (!selection.from || selection.to) return { from: date, to: '' };
  return date < selection.from ? { from: date, to: selection.from } : { from: selection.from, to: date };
}

export function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
