import { demoOwner } from '@/data/mock-auth';

export type InputSelection = { start: number; end: number };

const compact = (value: string) => value.replace(/-/g, '').trim().toUpperCase();

/** The documented ID is TH-MA-0001; retain the existing fictional demo login. */
export function formatOwnerId(value: string) {
  const characters = compact(value);
  const demo = compact(demoOwner.id).startsWith(characters);
  const boundaries = [2, demo ? 6 : 4];
  let formatted = '';
  for (let index = 0; index < characters.length; index++) {
    if (boundaries.includes(index)) formatted += '-';
    formatted += characters[index];
  }
  // A manually entered separator at a group boundary is also accepted.
  if (value.endsWith('-') && boundaries.includes(characters.length)) formatted += '-';
  return formatted;
}

export function isOwnerId(value: string) {
  return /^TH-MA-[0-9]{4}$/.test(value) || value === demoOwner.id;
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
