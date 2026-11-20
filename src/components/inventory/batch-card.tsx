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
export function BatchCard({ batch, index, expanded = true, onChange, onExpand, onUpdate, onRemove, errors = {} }: {
  batch: BatchDraft; index: number; expanded?: boolean; onChange: (batch: BatchDraft) => void;
  onExpand?: () => void; onUpdate?: () => void; onRemove?: () => void; errors?: BatchErrors;
}) {
  const { fontScale } = useWindowDimensions();
  return <View className="w-full overflow-hidden rounded-control border border-[#B0C8E3] bg-white">
    <View className="min-h-9 justify-center bg-brand px-3 py-2"><InvText bold color="#FFFFFF">Batch {index + 1}</InvText></View>
    {expanded ? <View className="gap-3 p-3">
      <View className="flex-row flex-wrap items-start gap-2">
        <View className="flex-1" style={{ minWidth: fontScale > 1.2 ? '100%' : 88 }}><InvField batch label="Quantity *" accessibilityLabel={'Batch ' + (index + 1) + ' quantity, required'} value={batch.quantity} onChangeText={quantity => onChange({ ...batch, quantity })} keyboardType="number-pad" placeholder="0" trailing={<View className="pr-2"><InvText size={10}>PCS</InvText></View>} maxLength={7} error={errors.quantity} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} /></View>
        <View className="flex-[1.4]" style={{ minWidth: fontScale > 1.2 ? '100%' : 140 }}><InvDateField compact displayLabel="Expiry Date" label={'Batch ' + (index + 1) + ' expiry date'} value={batch.expirationDate} required={!batch.noExpiry} disabled={batch.noExpiry} onChange={expirationDate => onChange({ ...batch, expirationDate })} error={errors.expirationDate} /></View>
      </View>
      <View className="min-h-12 flex-row items-center gap-3">
        <View className="min-w-0 flex-1"><InvText>No expiry date</InvText></View>
        <View className="min-h-12 items-center justify-center">
          <Switch style={{ alignSelf: 'center' }} accessibilityLabel={'Batch ' + (index + 1) + ': No expiry date'} value={batch.noExpiry} onValueChange={value => onChange(setBatchNoExpiry(batch, value))}
          trackColor={{ false: '#B0C8E3', true: '#245399' }} ios_backgroundColor="#B0C8E3" />
        </View>
        {onRemove && !onUpdate && <IconButton variant="destructiveOutline" accessibilityLabel={'Delete Batch ' + (index + 1)} onPress={onRemove} icon={props => <PosIcon name="trash" {...props} />} />}
      </View>
      {onUpdate && <View className="flex-row items-center gap-3"><View className="flex-1"><Button compact onPress={onUpdate}>Update Batch</Button></View>{onRemove && <IconButton variant="destructiveOutline" accessibilityLabel={'Delete Batch ' + (index + 1)} onPress={onRemove} icon={props => <PosIcon name="trash" {...props} />} />}</View>}
    </View> : <View className="min-h-20 flex-row items-center gap-2 px-3 py-2"><View className="min-w-0 flex-1 gap-1"><InvText bold size={11}>{batch.quantity} PCS</InvText><InvText size={11}>{batch.noExpiry ? 'No expiry date' : 'Expires ' + batchExpiryLabel(batch)}</InvText></View><Button compact fullWidth={false} variant="text" accessibilityLabel={'Edit Batch ' + (index + 1)} onPress={onExpand}>Edit</Button></View>}
  </View>;
}
export function ExistingBatchCard({ batch, index }: { batch: StockBatch; index: number }) {
  const expiry = expiryStatus(batch.expirationDate, todayInManila());
  const accent = batch.quantity > 0 && expiry === 'expired' ? '#D32F2F' : batch.quantity > 0 && expiry === 'nearExpiry' ? '#F9A825' : '#245399';
  const expiryColor = expiry === 'expired' ? '#972020' : expiry === 'nearExpiry' ? '#805000' : '#4A607A';
  return <View className="min-h-20 w-full flex-row items-center gap-3 rounded-control border border-[#E2EDF9] bg-white p-3" style={{ boxShadow: '0 3px 3px #B0C8E360', borderLeftWidth: 4, borderLeftColor: accent }}>
    <View className="min-w-0 flex-1 gap-1">
      <View className="flex-row items-center justify-between gap-3">
        <InvText bold size={12} color="#4A607A">B{String(index + 1).padStart(3, '0')}</InvText>
        <InvText bold size={11} color="#4A607A">{batch.quantity} PCS</InvText>
      </View>
      <View className="flex-row flex-wrap items-center gap-x-1">
        <InvText size={11} color={expiryColor}>{batch.noExpiry ? 'No expiry date' : 'Expiry: ' + batchExpiryLabel(batch)}</InvText>
        {batch.quantity > 0 && expiry !== 'fresh' && <InvText bold size={10} color={expiryColor}>{expiry === 'expired' ? '· Expired' : '· Nearing expiry'}</InvText>}
      </View>
    </View>
  </View>;
}
