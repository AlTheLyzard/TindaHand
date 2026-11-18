export type InputSelection = { start: number; end: number };

const compact = (value: string) => value.replace(/-/g, '').trim().toUpperCase();

// Dash boundaries for the standard TH-MA-XXXX format: after position 2 and 4.
const BOUNDARIES = [2, 4];

/** Formats a raw string into TH-MA-XXXX style as the user types. */
export function formatOwnerId(value: string) {
  const characters = compact(value);
  let formatted = '';
  for (let index = 0; index < characters.length; index++) {
    if (BOUNDARIES.includes(index)) formatted += '-';
    formatted += characters[index];
  }
  // A manually entered separator at a group boundary is also accepted.
  if (value.endsWith('-') && BOUNDARIES.includes(characters.length)) formatted += '-';
  return formatted;
}

export function isOwnerId(value: string) {
  return /^TH-MA-[0-9]{4}$/.test(value);
}

/** Map the native edit's caret through formatting instead of moving it to the end. */
export function editOwnerId(previous: string, next: string, selection: InputSelection) {
  const insertedLength = next.length - previous.length + selection.end - selection.start;
  const matchesSelection = insertedLength >= 0
    && next.slice(0, selection.start) === previous.slice(0, selection.start)
    && next.slice(selection.start + insertedLength) === previous.slice(selection.end);
  let caret: number;
  if (matchesSelection) {
    caret = selection.start + insertedLength;
  } else if (insertedLength < 0 && selection.start === selection.end
    && previous.slice(0, selection.start + insertedLength) + previous.slice(selection.end) === next) {
    caret = selection.start + insertedLength;
  } else if (insertedLength < 0 && selection.start === selection.end
    && previous.slice(0, selection.start) + previous.slice(selection.end - insertedLength) === next) {
    caret = selection.start;
  } else {
    // Backspace/delete, or a native edit delivered before its selection event.
    let suffix = 0;
    while (suffix < previous.length && suffix < next.length
      && previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;
    caret = next.length - suffix;
  }
  const text = formatOwnerId(next);
  const charactersBeforeCaret = compact(next.slice(0, caret)).length;
  let position = 0;
  let count = 0;
  while (position < text.length && count < charactersBeforeCaret) {
    if (text[position] !== '-') count++;
    position++;
  }
  // Keep the caret after a separator the user explicitly entered/pasted.
  if (next[caret - 1] === '-' && text[position] === '-') position++;
  return { text, selection: { start: position, end: position } };
}
