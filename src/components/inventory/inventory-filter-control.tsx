import { PosIcon } from '@/components/pos/pos-icon';
import { Button } from '@/components/ui/button';

/** Preserve the Products control's artwork, typography, spacing and pressed feedback. */
export function InventoryFilterControl({ onPress }: { onPress: () => void }) {
  return <Button compact variant="text" fullWidth={false} onPress={onPress} iconPosition="trailing"
    icon={props => <PosIcon name="filter" {...props} />}>Filter</Button>;
}
