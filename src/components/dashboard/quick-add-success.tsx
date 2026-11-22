import { SuccessContent } from '@/components/ui/success-content';
import type { QuickAddRecord } from '@/types/quick-add';

export function QuickAddSuccess({ record, onClose, visible }: {
  record: QuickAddRecord; onClose: () => void; visible: boolean;
}) {
  const expense = record.kind === 'expense';
  const asset = record.kind === 'asset';
  return <SuccessContent testID="quick-add-success" visible={visible} onClose={onClose} eventKey={record.id}
    title={expense ? 'Expense Recorded' : asset ? 'Asset Recorded' : record.kind === 'storeDebt' ? 'Store Debt Saved' : 'Debt Saved'}
    amountCentavos={record.amountCentavos}
    message={`${expense ? 'recorded as ' : asset ? 'recorded: ' : 'saved for '}${expense ? record.category ?? record.name : record.name}.`} />;
}
