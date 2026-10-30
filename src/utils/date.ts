/** Validate date-only values without applying a device timezone or business-date policy. */
export function validCalendarDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value.slice(0, 4) !== '0000'
    && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function formatCalendarDate(value: string) {
  if (!validCalendarDate(value)) return value;
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: '2-digit', year: 'numeric' });
}
