import { Text, View } from 'react-native';
import { MotionLayout, MotionRegion } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { Button } from '@/components/ui/button';
import { formatPesos } from '@/utils/dashboard';
import { payableDueLabel } from '@/utils/payables';
import type { receivableBalance } from '@/utils/receivables';
import { receivableColors as colors } from './receivables-ui';

export function ReceivableCard({ row, today, expanded, onExpand, onPayment }: {
  row: ReturnType<typeof receivableBalance>; today: string; expanded: boolean; onExpand: () => void; onPayment: () => void;
}) {
  const { debt, status, originalCentavos, paidCentavos, remainingCentavos, progress, history } = row;
  const paid = status === 'paid';
  const color = paid ? colors.green : status === 'overdue' ? colors.red : status === 'partial' ? colors.orange : colors.blue;
  const surface = paid ? '#FFFFFF' : status === 'overdue' ? colors.redSurface : status === 'partial' ? colors.partialSurface : colors.blueSurface;
  const label = paid ? 'Paid' : status === 'overdue' ? 'Overdue' : status === 'partial' ? 'Remaining Balance' : 'Pending';
  const dateTime = (value: string) => new Date(value).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const lastPayment = history[history.length - 1];
  return <MotionLayout className="rounded-control border p-3" style={{ borderColor: paid ? '#B0C8E3' : color, backgroundColor: surface }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${debt.name}, ${label}, ${formatPesos(paid ? originalCentavos : remainingCentavos)}${paid ? ' paid' : ' remaining'}, debt ${debt.id}. ${expanded ? 'Hide' : 'Show'} details`} accessibilityState={{ expanded }} onPress={onExpand} className="min-h-12 gap-2">
      <View className="flex-row flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <Text className="min-w-0 flex-shrink font-poppins-semibold text-[18px] leading-[27px] text-[#102342]">{debt.name}</Text>
        <View><Text className="font-poppins-bold text-[16px] leading-6" style={{ color: paid ? '#112F6F' : color }}>{formatPesos(paid ? originalCentavos : remainingCentavos)}</Text>{!paid && <Text className="text-right font-poppins text-[10px]" style={{ color }}>remaining</Text>}</View>
      </View>
      <Text className="font-poppins text-[12px] leading-[18px] text-[#5A7394]">{paid && lastPayment ? `Paid on: ${dateTime(lastPayment.occurredAt)}` : payableDueLabel(debt.dueDate, today)}</Text>
      <Text className="font-poppins text-[10px] leading-[15px] text-text-secondary">{debt.borrowing === 'product' ? 'Product' : 'Cash'} · {new Date(debt.occurredAt).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })} · Ref {debt.id.slice(-10)}</Text>
      <View accessibilityRole="progressbar" accessibilityLabel="Debt payment progress" accessibilityValue={{ min: 0, max: 100, now: progress, text: `${progress.toFixed(2)}% paid` }} className="my-1 h-[5px] overflow-hidden rounded-pill bg-white">
        <View style={{ height: '100%', width: `${progress}%`, backgroundColor: color, borderRadius: 9999 }} />
      </View>
      <View className="flex-row flex-wrap justify-between gap-2">
        <Text className="font-poppins text-[10px] leading-[15px] text-[#102342]">{formatPesos(paidCentavos)} paid out of {formatPesos(originalCentavos)}</Text>
        <Text className="font-poppins text-[10px] leading-[15px] text-[#102342]">{progress === 0 ? '0' : paid ? '100' : progress.toFixed(2)}%</Text>
      </View>
    </Pressable>
    {expanded && <MotionRegion><View className="mt-4 gap-3">
      {!paid && <Button onPress={onPayment}>Record Payment</Button>}
      <Text className="font-poppins-semibold text-[12px]" style={{ color }}>{label}</Text>
      {!!debt.details && <Text className="font-poppins text-[12px] text-text-secondary">{debt.details}</Text>}
      {Object.values(debt.items).map(item => <Text key={item.productId} className="font-poppins text-[12px] text-text-secondary">{item.itemName} · {item.quantity} × {formatPesos(item.unitPriceCentavos)}</Text>)}
      <Text accessibilityRole="header" className="font-poppins-semibold text-[12px] text-brand">Payment history</Text>
      {history.length ? history.map(payment => <View key={payment.id} className="gap-1 border-t border-[#B0C8E3] pt-2">
        <Text className="font-poppins-semibold text-[12px] text-brand">{formatPesos(payment.amountCentavos)}</Text>
        <Text className="font-poppins text-[11px] text-text-secondary">{dateTime(payment.occurredAt)}</Text>
        {!!payment.reference && <Text selectable className="font-poppins text-[11px] text-text-secondary">GCash reference: {payment.reference}</Text>}
      </View>) : <Text className="font-poppins text-[12px] text-text-secondary">No payments recorded.</Text>}
    </View></MotionRegion>}
  </MotionLayout>;
}
