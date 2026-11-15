export type VerticalBounds = { top: number; height: number };

/** Minimal movement inside the *measured* viewport; never add keyboard padding. */
export function focusedFieldScroll({ viewport, field, input, offset, keyboardTop = Infinity, gap = 12, contentHeight, scrollAfter = 0 }: {
  viewport: VerticalBounds; field: VerticalBounds; input: VerticalBounds;
  offset: number; keyboardTop?: number; gap?: number; contentHeight?: number; scrollAfter?: number;
}) {
  const top = viewport.top + gap;
  const bottom = Math.min(viewport.top + viewport.height, keyboardTop) - gap;
  if (bottom <= top || input.height <= 0) return offset;
  // If an unusually large help/error region cannot fit, prioritize the editor.
  const targetHeight = field.height + Math.max(0, scrollAfter);
  const target = field.height > 0 && targetHeight <= bottom - top ? { ...field, height: targetHeight } : input;
  const delta = target.top < top ? target.top - top
    : target.top + target.height > bottom ? target.top + target.height - bottom : 0;
  const maximum = contentHeight === undefined ? Infinity : Math.max(0, contentHeight - viewport.height);
  return Math.min(maximum, Math.max(0, offset + delta));
}
