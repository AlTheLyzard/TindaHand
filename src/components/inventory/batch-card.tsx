import { Keyboard, View } from 'react-native';
import { Button, IconButton } from '@/components/ui/button';
import { MotionPressable } from '@/components/ui/motion-pressable';
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
  return <View className="overflow-hidden rounded-control border border-[#B0C8E3] bg-white">
    <View className="bg-brand px-3 py-2"><InvText bold color="#FFFFFF">Batch {index + 1}</InvText></View>
    {expanded ? <View className="gap-3 p-3">
      <View className="flex-row flex-wrap items-start gap-3">
        <View className="min-w-[100px] flex-1"><InvField label="Quantity *" accessibilityLabel={'Batch ' + (index + 1) + ' quantity, required'} value={batch.quantity} onChangeText={quantity => onChange({ ...batch, quantity })} keyboardType="number-pad" placeholder="0 PCS" maxLength={7} error={errors.quantity} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} /></View>
        <View className="min-w-[155px] flex-[2]"><InvDateField compact label={'Batch ' + (index + 1) + ' expiry date'} value={batch.expirationDate} required={!batch.noExpiry} disabled={batch.noExpiry} onChange={expirationDate => onChange({ ...batch, expirationDate })} error={errors.expirationDate} /></View>
      </View>
      <View className="flex-row items-center gap-3"><MotionPressable accessibilityRole="checkbox" accessibilityLabel={'Batch ' + (index + 1) + ': No expiry date'} accessibilityState={{ checked: batch.noExpiry }} aria-checked={batch.noExpiry} onPress={() => onChange(setBatchNoExpiry(batch, !batch.noExpiry))} className="min-h-12 flex-1 flex-row items-center gap-2"><PosIcon name={batch.noExpiry ? 'checkCircle' : 'calendar'} color="#245399" /><InvText>No expiry date</InvText></MotionPressable>{onRemove && !onUpdate && <IconButton variant="destructiveOutline" accessibilityLabel={'Delete Batch ' + (index + 1)} onPress={onRemove} icon={props => <PosIcon name="trash" {...props} />} />}</View>
      {onUpdate && <View className="flex-row items-center gap-3"><View className="flex-1"><Button compact onPress={onUpdate}>Update Batch</Button></View>{onRemove && <IconButton variant="destructiveOutline" accessibilityLabel={'Delete Batch ' + (index + 1)} onPress={onRemove} icon={props => <PosIcon name="trash" {...props} />} />}</View>}
    </View> : <View className="flex-row items-center gap-2 px-3 py-2"><View className="min-w-0 flex-1"><InvText size={11}>{batch.quantity} PCS | {batch.noExpiry ? 'No expiry date' : 'Expires ' + batchExpiryLabel(batch)}</InvText></View><Button compact fullWidth={false} variant="text" accessibilityLabel={'Edit Batch ' + (index + 1)} onPress={onExpand}>Edit</Button></View>}
  </View>;
}
export function ExistingBatchCard({ batch, index }: { batch: StockBatch; index: number }) {
  const expiry = expiryStatus(batch.expirationDate, todayInManila());
  return <View className="flex-row items-center gap-3 rounded-control bg-white p-3" style={{ borderLeftWidth: 4, borderLeftColor: batch.quantity > 0 && expiry === 'expired' ? '#D32F2F' : batch.quantity > 0 && expiry === 'nearExpiry' ? '#F9A825' : '#245399' }}>
    <View className="min-w-0 flex-1 gap-1"><InvText bold color="#245399">Batch {index + 1}</InvText><InvText size={11}>{batch.noExpiry ? 'No expiry date' : 'Expiry: ' + batchExpiryLabel(batch)}</InvText>{batch.quantity > 0 && expiry !== 'fresh' && <InvText bold size={11} color={expiry === 'expired' ? '#972020' : '#805000'}>{expiry === 'expired' ? 'Expired' : 'Nearing expiry'}</InvText>}</View><InvText bold>{batch.quantity} PCS</InvText>
  </View>;
}
