export type ScrollDirection = 'up' | 'down';

/** Accumulate movement in one direction; ignore jitter and out-of-range bounce. */
export function createScrollDirectionTracker(threshold: number) {
  let last = 0;
  let distance = 0;
  let direction: ScrollDirection | null = null;
  return (offset: number, maxOffset: number): ScrollDirection | null => {
    const max = Math.max(0, maxOffset);
    if (!Number.isFinite(offset) || !Number.isFinite(maxOffset)) return null;
    if (offset < 0 || offset > max) {
      last = Math.max(0, Math.min(max, offset));
      distance = 0;
      direction = null;
      return null;
    }
    const delta = offset - last;
    last = offset;
    if (!delta) return null;
    const next = delta > 0 ? 'down' : 'up';
    distance = direction === next ? distance + Math.abs(delta) : Math.abs(delta);
    direction = next;
    if (distance < threshold) return null;
    distance = 0;
    return next;
  };
}
