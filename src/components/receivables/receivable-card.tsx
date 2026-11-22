import tokens from '@/constants/design-tokens.json';
import { Text, View } from 'react-native';
import { MotionLayout } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { formatPesos } from '@/utils/dashboard';
import { payableDueLabel } from '@/utils/payables';
import type { receivableBalance } from '@/utils/receivables';
import { receivableColors as colors } from './receivables-ui';

export function ReceivableCard({ row, today, onDetails }: {
  row: ReturnType<typeof receivableBalance>; today: string; onDetails: () => void;
}) {
  const { debt, status, originalCentavos, paidCentavos, remainingCentavos, progress, history } = row;
  const paid = status === 'paid';
  const color = paid ? colors.green : status === 'overdue' ? colors.red : status === 'partial' ? colors.orange : colors.blue;
  const surface = paid ? tokens.color.surfaceCard : status === 'overdue' ? colors.redSurface : status === 'partial' ? colors.partialSurface : colors.blueSurface;
  const label = paid ? 'Paid' : status === 'overdue' ? 'Overdue' : status === 'partial' ? 'Remaining Balance' : 'Pending';
  const lastPayment = history[history.length - 1];
  const paidOn = lastPayment ? new Date(lastPayment.occurredAt).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  return <MotionLayout className="rounded-control border p-3" style={{ borderColor: paid ? tokens.color.borderOutline : color, backgroundColor: surface }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${debt.name}, ${label}, ${formatPesos(paid ? originalCentavos : remainingCentavos)}, debt ${debt.id}. Open debt details.`}
      accessibilityHint="Opens customer debt details" onPress={onDetails} className="min-h-12 gap-2">
      <View className="flex-row flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <Text className="min-w-0 flex-shrink type-h3-heading leading-[27px] text-text-primary">{debt.name}</Text>
        <View><Text className=" type-list-financial leading-6" style={{ color: paid ? tokens.color.darkNavy : color }}>{formatPesos(paid ? originalCentavos : remainingCentavos)}</Text>{!paid && <Text className="text-right type-helper" style={{ color }}>remaining</Text>}</View>
      </View>
      <Text className=" type-micro-caption leading-[18px] text-text-placeholder">{paid && lastPayment ? `Paid on: ${paidOn}` : payableDueLabel(debt.dueDate, today).replace(/^Due:/, 'Petsa:')}</Text>
      <Text className=" type-helper leading-[15px] text-text-secondary">{debt.borrowing === 'product' ? 'Product' : 'Cash'} · {new Date(debt.occurredAt).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })} · Ref {debt.id.slice(-10)}</Text>
      <View accessibilityRole="progressbar" accessibilityLabel="Debt payment progress" accessibilityValue={{ min: 0, max: 100, now: progress, text: `${progress.toFixed(2)}% paid` }} className="my-1 h-[5px] overflow-hidden rounded-pill bg-white">
        <View style={{ height: '100%', width: `${progress}%`, backgroundColor: color, borderRadius: 9999 }} />
      </View>
      <View className="flex-row flex-wrap justify-between gap-2">
        <Text className=" type-helper leading-[15px] text-text-primary">{formatPesos(paidCentavos)} of {formatPesos(originalCentavos)}</Text>
        <Text className=" type-helper leading-[15px] text-text-primary">{progress === 0 ? '0' : paid ? '100' : progress.toFixed(2)}%</Text>
      </View>
    </Pressable>
  </MotionLayout>;
}
