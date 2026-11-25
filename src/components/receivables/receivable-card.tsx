import { memo } from 'react';
import tokens from '@/constants/design-tokens.json';
import { Text, View } from 'react-native';
import { MotionRegion } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { formatPesos } from '@/utils/dashboard';
import { payableDueLabel } from '@/utils/payables';
import type { receivableBalance } from '@/utils/receivables';
import { AnimatedNumber, ReceivableProgressBar, receivableStatusStyles } from './receivables-ui';

export const ReceivableCard = memo(function ReceivableCard({ row, today, onDetails }: {
  row: ReturnType<typeof receivableBalance>; today: string; onDetails: () => void;
}) {
  const { debt, status, originalCentavos, paidCentavos, remainingCentavos, progress, history } = row;
  const paid = status === 'paid';
  const label = paid ? 'Paid' : status === 'overdue' ? 'Overdue' : status === 'partial' ? 'Remaining Balance' : 'Pending';
  const color = receivableStatusStyles[status].accent;
  const lastPayment = history.reduce<typeof history[number] | undefined>((latest, payment) =>
    !latest || payment.occurredAt > latest.occurredAt ? payment : latest, undefined);
  const paidOn = lastPayment ? new Date(lastPayment.occurredAt).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }) : '';
  const dateLine = paid && lastPayment
    ? `Paid on: ${paidOn}`
    : payableDueLabel(debt.dueDate, today).replace(/^Due:/, 'Petsa:').replace(' overdue', ' late');

  return <MotionRegion className={`rounded-card border p-3 ${receivableStatusStyles[status].card}`} style={!paid ? { boxShadow: tokens.shadow.small } : undefined}>
    <Pressable accessibilityRole="button"
      accessibilityLabel={`${debt.name}, ${label}, ${formatPesos(paid ? originalCentavos : remainingCentavos)}, debt ${debt.id}. Open debt details.`}
      accessibilityHint="Opens customer debt details" onPress={onDetails} className="min-h-12 gap-2">
      <View className="flex-row flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <Text className="min-w-0 flex-shrink type-h3-heading text-text-primary">{debt.name}</Text>
        <Text className="type-list-financial text-right" style={{ color: paid ? tokens.color.darkNavy : color }}>
          {formatPesos(paid ? originalCentavos : remainingCentavos)}
        </Text>
      </View>
      <Text className="type-micro-caption text-text-secondary" style={{ color: paid ? tokens.color.textSecondary : color }}>{dateLine}</Text>
      <ReceivableProgressBar progress={progress} color={color} />
      <View className="flex-row flex-wrap justify-between gap-2">
        <Text className="type-helper text-text-primary">{formatPesos(paidCentavos)} of {formatPesos(originalCentavos)}</Text>
        <AnimatedNumber value={progress * 100} format="percent" className="type-helper text-right text-text-primary" />
      </View>
    </Pressable>
  </MotionRegion>;
});
