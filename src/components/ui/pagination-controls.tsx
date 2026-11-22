import tokens from '@/constants/design-tokens.json';
import { Button } from '@/components/ui/button';
import { Text, View } from 'react-native';

/** Shared compact Previous / page count / Next controls. */
export function PaginationControls({ pageIndex, pageCount, itemName, onPageChange }: {
  pageIndex: number;
  pageCount: number;
  itemName: string;
  onPageChange: (pageIndex: number) => void;
}) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 }}>
    <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
      <Button compact fullWidth={false} variant="text" interactionBackgroundColor="transparent" disabled={pageIndex === 0}
        accessibilityLabel={`Previous ${itemName} page`} onPress={() => onPageChange(Math.max(0, pageIndex - 1))}>Previous</Button>
    </View>
    <Text accessibilityLiveRegion="polite" style={{ flex: 1, minWidth: 0, textAlign: 'center', fontFamily: tokens.typography.weights.bold, fontSize: tokens.typography.labelNav.fontSize, lineHeight: 16, color: tokens.color.royalBlue }}>Page {pageIndex + 1} of {pageCount}</Text>
    <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
      <Button compact fullWidth={false} variant="text" interactionBackgroundColor="transparent" disabled={pageIndex >= pageCount - 1}
        accessibilityLabel={`Next ${itemName} page`} onPress={() => onPageChange(Math.min(pageCount - 1, pageIndex + 1))}>Next</Button>
    </View>
  </View>;
}
