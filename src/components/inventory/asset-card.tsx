import { useRef, useState } from 'react';
import { Keyboard, Text, View, type ViewInstance } from 'react-native';
import { IconButton, ButtonSurface } from '@/components/ui/button';
import tokens from '@/constants/design-tokens.json';
import type { BusinessAsset } from '@/types/inventory';
import { formatPesos } from '@/utils/dashboard';
import { formatCalendarDate } from '@/utils/date';
import { assetLabels } from '@/utils/inventory';
import { InventoryPopover } from './inventory-popover';

export function AssetCard({ asset, onEdit }: {
  asset: BusinessAsset; onEdit: () => void;
}) {
  const trigger = useRef<ViewInstance>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  function choose(action: () => void) { pendingAction.current = action; setOpen(false); }
  return <View testID={`asset-card-${asset.id}`} style={{ width: '100%', padding: tokens.spacing.four,
    gap: tokens.spacing.three, borderWidth: 1, borderColor: tokens.color.navigationBorder,
    borderRadius: tokens.radius.control, backgroundColor: tokens.color.surfaceCard }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.spacing.two }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: tokens.button.fontFamily, fontSize: tokens.typography.titleAccent.fontSize, lineHeight: 30, color: tokens.color.textPrimary }}>{asset.name}</Text>
        <Text style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microCaption.fontSize, lineHeight: 18, color: tokens.color.textSecondary }}>{assetLabels[asset.classification]}</Text>
      </View>
      <IconButton ref={trigger} accessibilityLabel={`Actions for ${asset.name}`} accessibilityState={{ expanded: open }}
        onPress={() => { Keyboard.dismiss(); setOpen(true); }}
        style={{ flexShrink: 0, marginTop: -tokens.spacing.two, marginRight: -tokens.spacing.three }}
        icon={() => <View accessible={false} style={{ gap: 3 }}>{[0, 1, 2].map(dot => <View key={dot} style={{ width: 4, height: 4, borderRadius: tokens.radius.pill, backgroundColor: tokens.color.textPrimary }} />)}</View>} />
    </View>
    <View>
      <Text style={{ fontFamily: tokens.button.fontFamily, fontSize: tokens.typography.titleAccent.fontSize, lineHeight: 30, color: tokens.button.primary.pressed }}>{formatPesos(asset.valueCentavos)}</Text>
      <Text style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microFinancialRate.fontSize, lineHeight: 21, color: tokens.color.textSecondary }}>Recorded {formatCalendarDate(asset.recordedDate)}</Text>
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
