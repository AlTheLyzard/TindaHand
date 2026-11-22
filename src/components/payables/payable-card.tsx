import tokens from '@/constants/design-tokens.json';
import { Text, View } from 'react-native';
import { MotionLayout } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { formatPesos } from '@/utils/dashboard';
import { payableDueLabel, payableLists } from '@/utils/payables';
import { payableColors } from './payables-ui';

export function PayableCard({ row, today, onDetails }: {
  row: ReturnType<typeof payableLists>['paid'][number]; today: string; onDetails: () => void;
}) {
  const { debt, status, paidCentavos, remainingCentavos, progress, history } = row;
  const paid = status === 'paid';
  const overdue = !paid && !!debt.dueDate && debt.dueDate < today;
  const color = paid ? payableColors.green : overdue ? payableColors.red : status === 'partial' ? payableColors.orange : payableColors.blue;
  const surface = paid ? tokens.color.surfaceCard : overdue ? payableColors.redSurface : status === 'partial' ? payableColors.partialSurface : payableColors.blueSurface;
  const label = paid ? 'Paid' : overdue ? 'Overdue' : status === 'partial' ? 'Remaining Balance' : 'Pending';
  const lastPayment = history[history.length - 1];
  const paidOn = lastPayment ? new Date(lastPayment.occurredAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  const dueLabel = payableDueLabel(debt.dueDate, today).replace(/^Due:/, 'Petsa:');
  const borrowingType = debt.borrowingType === 'goods-stock' ? 'Goods/Stock' : 'Cash';
  const borrowingDate = new Date(debt.occurredAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: '2-digit', year: 'numeric' });
  return <MotionLayout className="rounded-control border p-3" style={{ borderColor: paid ? tokens.color.borderOutline : color, backgroundColor: surface }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${debt.name}, ${label}, ${formatPesos(paid ? debt.originalAmountCentavos : remainingCentavos)}. Open debt details.`}
      accessibilityHint="Opens creditor debt details" onPress={onDetails} className="min-h-12 gap-2">
      <View className="flex-row flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <Text className="min-w-0 flex-shrink type-h3-heading leading-[27px] text-text-primary">{debt.name}</Text>
        <View><Text className=" type-list-financial leading-6" style={{ color: paid ? tokens.color.darkNavy : color }}>{formatPesos(paid ? debt.originalAmountCentavos : remainingCentavos)}</Text>{!paid && <Text className="text-right type-helper" style={{ color }}>remaining</Text>}</View>
      </View>
      <Text className=" type-micro-caption leading-[18px] text-text-placeholder">{paid && lastPayment ? `Paid on: ${paidOn}` : dueLabel}</Text>
      <Text className=" type-helper leading-[15px] text-text-secondary">{borrowingType} · {borrowingDate} · Ref {debt.id.slice(-10)}</Text>
      <View accessibilityRole="progressbar" accessibilityLabel="Debt payment progress" accessibilityValue={{ min: 0, max: 100, now: progress, text: `${progress.toFixed(2)}% paid` }} className="my-1 h-[5px] overflow-hidden rounded-pill bg-white">
        <View style={{ height: '100%', width: `${Math.max(0, Math.min(progress, 100))}%`, backgroundColor: color, borderRadius: 9999 }} />
      </View>
      <View className="flex-row flex-wrap justify-between gap-2">
        <Text className=" type-helper leading-[15px] text-text-primary">{formatPesos(paidCentavos)} of {formatPesos(debt.originalAmountCentavos)}</Text>
        <Text className=" type-helper leading-[15px] text-text-primary">{paid ? '100' : progress === 0 ? '0' : progress.toFixed(2)}%</Text>
      </View>
    </Pressable>
  </MotionLayout>;
}
