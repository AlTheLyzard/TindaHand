import { useOverlayTransition } from '@/hooks/use-overlay-transition';
import { menuMotion } from '@/utils/menu-description-sequence';

/** More Tools keeps its original duration and description clock. */
export function useMenuDrawerTransition(visible: boolean, onHidden: () => void) {
  return useOverlayTransition(visible, onHidden, menuMotion.drawerMs);
}
