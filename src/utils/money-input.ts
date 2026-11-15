import { parsePaymentAmount } from './pos-payment';

export type MoneySelection = { start: number; end: number };
const decimalDraft = /^\d*(?:\.\d{0,2})?$/;

/** Validate grouping before removing it. Never salvage digits from malformed pastes. */
export function parseMoneyPaste(text: string): string | null {
  const value = text.trim().replace(/^₱\s*/, '');
  if (!value && text !== '') return null;
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d{0,2})?$/.test(value)) return null;
  return value.replace(/,/g, '');
}

export function formatMoneyInput(value: string, settled = false): string {
  if (!value || !decimalDraft.test(value)) return value;
  let [whole, fraction] = value.split('.');
  if (settled && parsePaymentAmount(value) !== null) {
    whole = (whole || '0').replace(/^0+(?=\d)/, '');
    fraction = (fraction ?? '').padEnd(2, '0');
  }
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`);
}

function editRange(previous: string, next: string, selection: MoneySelection) {
  const { start, end } = selection;
  const prefix = previous.slice(0, start), suffix = previous.slice(end);
  if (next.length >= prefix.length + suffix.length && next.startsWith(prefix) && next.endsWith(suffix)) {
    return { start, end, inserted: next.slice(start, next.length - suffix.length) };
  }
  if (start === end && start > 0 && next === previous.slice(0, start - 1) + previous.slice(end)) return { start: start - 1, end, inserted: '' };
  if (start === end && next === prefix + previous.slice(end + 1)) return { start, end: end + 1, inserted: '' };
  // Autofill/native keyboards can replace text without first sending selection.
  let left = 0, right = 0;
  while (left < previous.length && left < next.length && previous[left] === next[left]) left++;
  while (right < previous.length - left && right < next.length - left && previous[previous.length - right - 1] === next[next.length - right - 1]) right++;
  return { start: left, end: previous.length - right, inserted: next.slice(left, next.length - right) };
}

/** Map the native edit into decimal pesos and restore the caret by digit position. */
export function editMoneyInput(previous: string, next: string, selection: MoneySelection): { canonical: string; text: string; selection: MoneySelection } | null {
  // Selection notifications can lag a Clear/external update on native inputs.
  // Slicing the insertion at an obsolete offset would silently drop its digits.
  const start = Math.max(0, Math.min(previous.length, selection.start));
  selection = { start, end: Math.max(start, Math.min(previous.length, selection.end)) };
  if (previous === next) return { canonical: next.replace(/,/g, ''), text: next, selection };
  const edit = editRange(previous, next, selection);
  let inserted = edit.inserted;
  if (inserted.length > 1 || /[,₱\s]/.test(inserted)) {
    const paste = parseMoneyPaste(inserted);
    if (paste === null) return null;
    inserted = paste;
  } else if (inserted && !/^[\d.]$/.test(inserted)) return null;

  // Backspacing over a grouping separator also removes the preceding digit;
  // forward-delete removes the following digit. The regenerated comma cannot trap the caret.
  if (!inserted && selection.start === selection.end && previous.slice(edit.start, edit.end) === ',') {
    if (edit.start < selection.start) edit.start = Math.max(0, edit.start - 1);
    else edit.end = Math.min(previous.length, edit.end + 1);
  }
  const before = previous.slice(0, edit.start).replace(/,/g, '');
  const canonical = before + inserted + previous.slice(edit.end).replace(/,/g, '');
  if (!decimalDraft.test(canonical)) return null;
  const text = formatMoneyInput(canonical);
  const rawCaret = before.length + inserted.length;
  let caret = 0, digits = 0;
  while (caret < text.length && digits < rawCaret) { if (text[caret] !== ',') digits++; caret++; }
  return { canonical, text, selection: { start: caret, end: caret } };
}
