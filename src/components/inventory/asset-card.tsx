import { useRef, useState } from 'react';
import { Keyboard, Text, View, type ViewInstance } from 'react-native';
import { IconButton, ButtonSurface } from '@/components/ui/button';
import tokens from '@/constants/design-tokens.json';
import type { BusinessAsset } from '@/types/inventory';
import { formatPesos } from '@/utils/dashboard';
import { formatCalendarDate } from '@/utils/date';
import { InventoryPopover } from './inventory-popover';

export function AssetCard({ asset, onEdit }: {
  asset: BusinessAsset; onEdit: () => void;
}) {
  const trigger = useRef<ViewInstance>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  function choose(action: () => void) { pendingAction.current = action; setOpen(false); }
  return <View testID={`asset-card-${asset.id}`} style={{ width: '100%', padding: tokens.spacing.three,
    gap: tokens.spacing.one, borderWidth: 1, borderColor: tokens.color.navigationBorder,
    borderRadius: tokens.radius.control, backgroundColor: tokens.color.surfaceCard }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.spacing.two }}>
      <Text numberOfLines={2} style={{ flex: 1, minWidth: 0, fontFamily: tokens.typography.weights.semibold,
        fontSize: tokens.typography.h3Heading.fontSize, lineHeight: tokens.typography.h3Heading.lineHeight, color: tokens.color.textPrimary }}>{asset.name}</Text>
      <IconButton ref={trigger} accessibilityLabel={`Actions for ${asset.name}`} accessibilityState={{ expanded: open }}
        onPress={() => { Keyboard.dismiss(); setOpen(true); }}
        style={{ flexShrink: 0, marginTop: -tokens.spacing.two, marginRight: -tokens.spacing.two, marginLeft: -tokens.spacing.two }}
        icon={() => <View accessible={false} style={{ gap: 3 }}>{[0, 1, 2].map(dot => <View key={dot} style={{ width: 4, height: 4, borderRadius: tokens.radius.pill, backgroundColor: tokens.color.textPrimary }} />)}</View>} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: tokens.spacing.two }}>
      <Text style={{ flex: 1, fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microFinancialRate.fontSize,
        lineHeight: tokens.typography.microFinancialRate.lineHeight, color: tokens.color.textSecondary }}>{formatCalendarDate(asset.recordedDate)}</Text>
      <Text style={{ flexShrink: 0, textAlign: 'right', fontFamily: tokens.typography.weights.bold,
        fontSize: tokens.typography.listFinancial.fontSize, lineHeight: tokens.typography.listFinancial.lineHeight, color: tokens.color.darkNavy }}>{formatPesos(asset.valueCentavos)}</Text>
    </View>
    <InventoryPopover visible={open} anchorRef={trigger} label={`actions for ${asset.name}`} testID={`asset-actions-${asset.id}`} width={tokens.size.touchTarget * 2 + tokens.spacing.four} placement="below"
      onClose={() => setOpen(false)} onHidden={() => {
        const action = pendingAction.current; pendingAction.current = null;
        // Finish dismissing this window before navigating on iOS.
        if (action) action(); else trigger.current?.focus();
      }}>
      <ButtonSurface variant="text" accessibilityLabel={`Edit ${asset.name}`} onPress={() => choose(onEdit)}
        style={{ minHeight: tokens.size.touchTarget, paddingHorizontal: tokens.button.paddingHorizontal,
          paddingVertical: tokens.spacing.two, justifyContent: 'center', alignItems: 'flex-start', borderRadius: tokens.radius.control }}>
        {({ color }) => <Text style={{ fontFamily: tokens.button.fontFamily, fontSize: tokens.button.fontSize,
          lineHeight: tokens.button.lineHeight, color, textAlign: 'left' }}>Edit</Text>}
      </ButtonSurface>
    </InventoryPopover>
  </View>;
}
