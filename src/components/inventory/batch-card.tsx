import tokens from '@/constants/design-tokens.json';
import { warningStockStatusColor } from '@/constants/stock-status-colors';
import { Keyboard, Switch, View, useWindowDimensions } from 'react-native';
import { Button, IconButton } from '@/components/ui/button';
import { PosIcon } from '@/components/pos/pos-icon';
import type { BatchDraft, BatchErrors, StockBatch } from '@/types/inventory';
import { setBatchNoExpiry } from '@/utils/inventory-draft';
import { expiryStatus, todayInManila } from '@/utils/inventory';
import { InvDateField, InvField, InvText } from './inventory-ui';

export function batchExpiryLabel(batch: { noExpiry: boolean; expirationDate: string | null }) {
  if (batch.noExpiry) return 'No expiry date';
  if (!batch.expirationDate) return 'Expiry date required';
  const [year, month, day] = batch.expirationDate.split('-');
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(month) - 1] + ' ' + Number(day) + ', ' + year;
}
export function BatchCard({ batch, index, expanded = true, onChange, onNoExpiryChange, onExpand, onUpdate, onRemove, errors = {} }: {
  batch: BatchDraft; index: number; expanded?: boolean; onChange: (batch: BatchDraft) => void;
  onNoExpiryChange?: (value: boolean) => void;
  onExpand?: () => void; onUpdate?: () => void; onRemove?: () => void; errors?: BatchErrors;
}) {
  const { fontScale } = useWindowDimensions();
  return <View className="w-full overflow-hidden rounded-control border border-outline bg-white">
    <View className="min-h-9 justify-center px-3 py-2" style={{ backgroundColor: tokens.color.darkNavy }}><InvText bold color={tokens.color.surfaceCard}>Restock {index + 1}</InvText></View>
    {expanded ? <View className="gap-3 p-3">
      <View className="flex-row flex-wrap items-start gap-2">
        <View className="flex-1" style={{ minWidth: fontScale > 1.2 ? '100%' : 88 }}><InvField batch label="Quantity *" accessibilityLabel={'Restock ' + (index + 1) + ' quantity, required'} value={batch.quantity} onChangeText={quantity => onChange({ ...batch, quantity })} keyboardType="number-pad" placeholder="0" trailing={<View className="pr-2"><InvText size={10}>PCS</InvText></View>} maxLength={7} error={errors.quantity} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} /></View>
        <View className="flex-[1.4]" style={{ minWidth: fontScale > 1.2 ? '100%' : 140 }}><InvDateField compact displayLabel="Expiry Date" label={'Restock ' + (index + 1) + ' expiry date'} value={batch.expirationDate} required={!batch.noExpiry} disabled={batch.noExpiry} onChange={expirationDate => onChange({ ...batch, expirationDate })} error={errors.expirationDate} /></View>
      </View>
      <View className="min-h-12 flex-row items-center gap-3">
        <View className="min-w-0 flex-1"><InvText bold size={11} color={tokens.color.textPrimary}>No expiry date</InvText></View>
        <View className="min-h-12 items-center justify-center">
          <Switch style={{ alignSelf: 'center' }} accessibilityLabel={'Restock ' + (index + 1) + ': No expiry date'} value={batch.noExpiry} onValueChange={value => onNoExpiryChange ? onNoExpiryChange(value) : onChange(setBatchNoExpiry(batch, value))}
          trackColor={{ false: tokens.color.borderOutline, true: tokens.color.royalBlue }} ios_backgroundColor={tokens.color.borderOutline} />
        </View>
        {onRemove && !onUpdate && <IconButton variant="destructiveOutline" accessibilityLabel={'Delete Restock ' + (index + 1)} onPress={onRemove} icon={props => <PosIcon name="trash" {...props} />} />}
      </View>
      {onUpdate && <View className="flex-row items-center gap-3"><View className="flex-1"><Button compact onPress={onUpdate}>Update Restock</Button></View>{onRemove && <IconButton variant="destructiveOutline" accessibilityLabel={'Delete Restock ' + (index + 1)} onPress={onRemove} icon={props => <PosIcon name="trash" {...props} />} />}</View>}
    </View> : <View className="min-h-20 flex-row items-center gap-2 px-3 py-2"><View className="min-w-0 flex-1 gap-1"><InvText bold size={11}>{batch.quantity} PCS</InvText><InvText size={11}>{batch.noExpiry ? 'No expiry date' : 'Expires ' + batchExpiryLabel(batch)}</InvText></View><Button compact fullWidth={false} variant="text" accessibilityLabel={'Edit Restock ' + (index + 1)} onPress={onExpand}>Edit</Button></View>}
  </View>;
}
export function ExistingBatchCard({ batch, index }: { batch: StockBatch; index: number }) {
  const expiry = expiryStatus(batch.expirationDate, todayInManila());
  const accent = batch.quantity > 0 && expiry === 'expired' ? tokens.color.errorBase : batch.quantity > 0 && expiry === 'nearExpiry' ? warningStockStatusColor : tokens.color.royalBlue;
  const expiryColor = expiry === 'expired' ? tokens.color.errorBase : expiry === 'nearExpiry' ? warningStockStatusColor : tokens.color.textSecondary;
  return <View className="min-h-20 w-full flex-row items-center gap-3 rounded-control border border-ice-container bg-white p-3" style={{ borderLeftWidth: 4, borderLeftColor: accent }}>
    <View className="min-w-0 flex-1 gap-1">
      <InvText bold size={12} color={tokens.color.textSecondary}>Restock {index + 1}</InvText>
      <View className="flex-row flex-wrap items-center gap-x-1">
        <InvText size={11} color={expiryColor}>{batch.noExpiry ? 'No expiry date' : 'Expiry: ' + batchExpiryLabel(batch)}</InvText>
        {batch.quantity > 0 && expiry !== 'fresh' && <InvText bold size={10} color={expiryColor}>{expiry === 'expired' ? '· Expired' : '· Nearing expiry'}</InvText>}
      </View>
    </View>
    <View className="min-w-[68px] self-stretch items-center justify-center"><InvText size={14} color={tokens.color.textPrimary}>{batch.quantity} PCS</InvText></View>
  </View>;
}
