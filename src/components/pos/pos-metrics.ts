import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** MA-POS-001, leftmost phone, measured at 414 px wide. Safe area is owned by PosFrame. */
export function usePosMetrics() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = Math.min(460, width - insets.left - insets.right) / 414;
  return {
    gutter: 21 * scale,
    titleTop: Math.max(0, 30 * scale - 4),
    titleSize: 32 * scale,
    titleLine: 48 * scale,
    stepsTop: 8 * scale,
    stepsBottom: 16 * scale,
    columnGap: 12 * scale,
    tileHeight: 217 * scale,
    sheetHeight: 92 * scale,
    sheetPadding: 36 * scale,
  };
}
