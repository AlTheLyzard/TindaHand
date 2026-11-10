import { Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { MotionLayout, MotionRegion } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { formatPesos } from '@/utils/dashboard';
import { payableDueLabel, payableLists } from '@/utils/payables';
import { todayInManila } from '@/utils/inventory';
import { payableColors } from './payables-ui';

export function PayableCard({ row, expanded, onExpand, onPayment }: { row: ReturnType<typeof payableLists>['paid'][number]; expanded: boolean; onExpand: () => void; onPayment: () => void }) {
  const { debt, status, paidCentavos, remainingCentavos, progress, history } = row;
  const paid = status === 'paid';
  const partial = status === 'partial';
  const color = paid ? payableColors.green : partial ? payableColors.orange : payableColors.blue;
  const statusLabel = paid ? 'Paid' : partial ? 'Partially Paid' : 'Pending';
  const dateTime = (value: string) => new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return <MotionLayout className="rounded-control border p-3" style={{ borderColor: paid ? '#B0C8E3' : color, backgroundColor: paid ? '#FFFFFF' : partial ? payableColors.partialSurface : payableColors.blueSurface }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${debt.name}, ${statusLabel}, ${formatPesos(paid ? debt.originalAmountCentavos : remainingCentavos)}. ${expanded ? 'Hide' : 'Show'} details`} accessibilityState={{ expanded }} aria-expanded={expanded} onPress={onExpand} className="min-h-12 gap-2">
      <View className="flex-row flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <Text className="min-w-0 flex-shrink font-poppins-semibold text-[18px] leading-[27px] text-[#102342]">{debt.name}</Text>
        <Text className="font-poppins-bold text-[16px] leading-6" style={{ color: partial ? color : '#112F6F' }}>{formatPesos(paid ? debt.originalAmountCentavos : remainingCentavos)}</Text>
      </View>
      <Text className="font-poppins text-[12px] leading-[18px] text-[#5A7394]">{paid ? `Paid on: ${dateTime(history[history.length - 1].occurredAt)}` : payableDueLabel(debt.dueDate, todayInManila())}</Text>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress, text: `${progress.toFixed(2)}% paid` }} className="my-1 h-[5px] overflow-hidden rounded-pill bg-white">
        <View style={{ height: '100%', width: `${progress}%`, backgroundColor: color, borderRadius: 9999 }} />
      </View>
      <View className="flex-row flex-wrap justify-between gap-2">
        <Text className="font-poppins text-[10px] leading-[15px] text-[#102342]">{formatPesos(paidCentavos)} paid of {formatPesos(debt.originalAmountCentavos)}</Text>
        <Text className="font-poppins text-[10px] leading-[15px] text-[#102342]">{paid ? '100' : progress === 0 ? '0' : progress.toFixed(2)}%</Text>
      </View>
    </Pressable>
    {expanded && <MotionRegion><View className="mt-4 gap-3">
      <Text className="font-poppins-semibold text-[12px]" style={{ color }}>{statusLabel}</Text>
      {!!debt.details && <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">{debt.details}</Text>}
      <Text className="font-poppins text-[11px] text-text-secondary">Recorded: {dateTime(debt.occurredAt)}</Text>
      {paid && <Text className="font-poppins text-[11px] text-text-secondary">{payableDueLabel(debt.dueDate, todayInManila()).split(' · ')[0]}</Text>}
      <Text accessibilityRole="header" className="font-poppins-semibold text-[12px] text-brand">Payment history</Text>
      {history.length ? history.map(payment => <View key={payment.id} className="gap-1 border-t border-[#B0C8E3] pt-2">
        <Text className="font-poppins-semibold text-[12px] text-brand">{formatPesos(payment.amountCentavos)}</Text>
        <Text className="font-poppins text-[11px] text-text-secondary">{dateTime(payment.occurredAt)}</Text>
      </View>) : <Text className="font-poppins text-[12px] text-text-secondary">No payments recorded.</Text>}
      {!paid && <Button onPress={onPayment}>Record Payment</Button>}
    </View></MotionRegion>}
  </MotionLayout>;
}
