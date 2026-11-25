import { PosIcon } from '@/components/pos/pos-icon';
import { Button } from '@/components/ui/button';
import tokens from '@/constants/design-tokens.json';

/** Preserve the Products control's artwork, typography, spacing and pressed feedback. */
export function InventoryFilterControl({ onPress }: { onPress: () => void }) {
  return <Button compact variant="text" fullWidth={false} onPress={onPress} iconPosition="trailing"
    textStyle={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, lineHeight: tokens.typography.labelNav.lineHeight }}
    icon={props => <PosIcon name="filter" {...props} />}>Filter</Button>;
}
