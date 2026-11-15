import { SuccessContent } from '@/components/ui/success-content';
import type { QuickAddRecord } from '@/types/quick-add';

export function QuickAddSuccess({ record, onClose, visible }: {
  record: QuickAddRecord; onClose: () => void; visible: boolean;
}) {
  const expense = record.kind === 'expense';
  return <SuccessContent testID="quick-add-success" visible={visible} onClose={onClose} eventKey={record.id}
    title={expense ? 'Expense Recorded' : record.kind === 'storeDebt' ? 'Store Debt Saved' : 'Debt Saved'}
    amountCentavos={record.amountCentavos}
    message={`${expense ? 'recorded as ' : 'saved for '}${expense ? record.category ?? record.name : record.name}.`} />;
}
