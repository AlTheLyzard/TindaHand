export type SheetPosition = 'content' | 'compact' | 'expanded';

export function sheetHeights(available: number, content: number, fixed: number) {
  const expanded = Math.max(1, available);
  const compact = Math.min(expanded, Math.max(fixed + 80, Math.min(360, expanded * 0.5)));
  return { compact, content: Math.min(expanded, Math.max(compact, fixed + content)), expanded };
}

/** Velocities are points/ms. Dismissal is a request, never a mutation. */
export function releaseSheet(height: number, velocityY: number, heights: ReturnType<typeof sheetHeights>) {
  'worklet';
  if (height < heights.compact - 72 || (velocityY > 1.2 && height < heights.compact + 24)) return 'dismiss' as const;
  const projected = height - velocityY * 160;
  const positions: SheetPosition[] = ['compact', 'content', 'expanded'];
  return positions.reduce((best, position) => Math.abs(heights[position] - projected) < Math.abs(heights[best] - projected) ? position : best, 'content');
}
