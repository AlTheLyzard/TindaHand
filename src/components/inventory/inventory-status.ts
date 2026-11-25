import tokens from '@/constants/design-tokens.json';
import { warningStockStatusColor } from '@/constants/stock-status-colors';

export function inventoryStatusAppearance(status: string) {
  return status === 'good' ? { color: tokens.color.successBase, backgroundColor: tokens.color.successTint, borderColor: tokens.button.positive.default }
    : ['out', 'expired'].includes(status) ? { color: tokens.color.errorBase, backgroundColor: tokens.color.errorTint, borderColor: tokens.button.destructive.default }
      : { color: warningStockStatusColor, backgroundColor: tokens.color.warningTint, borderColor: warningStockStatusColor };
}
