/** Retain the current cell near a boundary so a stationary finger cannot flicker. */
export function alphabetIndexAtOffset(offset: number, height: number, count: number, previous = -1) {
  if (height <= 0 || count <= 0) return -1;
  const cell = height / count;
  const next = Math.max(0, Math.min(count - 1, Math.floor(offset / cell)));
  if (previous >= 0 && previous < count && Math.abs(next - previous) === 1) {
    const boundary = Math.max(next, previous) * cell;
    if (Math.abs(offset - boundary) < Math.min(3, cell / 4)) return previous;
  }
  return next;
}

/** The topmost section wins, except at the bottom where the last section may be too short to align. */
export function currentAlphabetSection(letters: readonly string[], offsets: Readonly<Record<string, number>>, gridTop: number,
  scrollOffset: number, viewportHeight: number, contentHeight: number) {
  if (!letters.length) return null;
  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  if (maxScroll > 0 && scrollOffset >= maxScroll - 1) return letters[letters.length - 1];
  let current = letters[0];
  for (const letter of letters) {
    if (offsets[letter] !== undefined && gridTop + offsets[letter] <= scrollOffset + 1) current = letter;
  }
  return current;
}
