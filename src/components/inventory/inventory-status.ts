import tokens from '@/constants/design-tokens.json';

export function inventoryStatusAppearance(status: string) {
  return status === 'good' ? { color: '#1D5D21', backgroundColor: '#E8F5E9', borderColor: tokens.button.positive.default }
    : ['out', 'expired'].includes(status) ? { color: '#972020', backgroundColor: '#FFEBEE', borderColor: tokens.button.destructive.default }
      : { color: '#805000', backgroundColor: '#FFF8E1', borderColor: tokens.color.warningBase };
}
