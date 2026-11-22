import { Text, View } from 'react-native';
import { useInventory } from '@/state/inventory';
import { useQuickAdd } from '@/state/quick-add';
import { formatPesos } from '@/utils/dashboard';

/** Expose the shared records inside existing tool placeholders until their designs are supplied. */
export function PosSessionRecords({ kind }: { kind: 'transactions' | 'debts' }) {
  const { store: { pos } } = useInventory();
  const { records } = useQuickAdd();
  const debts = records.filter(record => record.kind === 'customerDebt');
  const sales = pos?.sales ?? [];
  return <View className="mt-4 gap-3">
    <Text accessibilityRole="header" className=" type-h3-heading text-brand">{kind === 'transactions' ? 'Session Transactions' : 'Customer Debts'}</Text>
    <Text className=" type-micro-caption text-text-secondary">{kind === 'transactions' ? 'Completed POS orders in this demo session.' : `Outstanding: ${formatPesos(debts.reduce((sum, debt) => sum + debt.amountCentavos, 0))}`}</Text>
    {kind === 'transactions' ? sales.length ? sales.map(sale => <View key={sale.id} className="gap-2 rounded-card border border-outline bg-white p-4">
      <Text className=" type-button-cta text-brand">{formatPesos(sale.totalCentavos)} · {sale.payment.method === 'partial' ? 'Partial Payment' : sale.payment.method === 'split' ? 'Split Payment' : sale.payment.method === 'gcash' ? 'GCash' : 'Cash'}</Text>
      <Text selectable className=" type-micro-caption text-text-secondary">{sale.id} · {new Date(sale.occurredAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</Text>
      {sale.customerId && <Text className=" type-micro-caption text-brand">Customer: {pos?.customers.find(customer => customer.id === sale.customerId)?.name}</Text>}
      {Object.values(sale.items).map(item => <Text key={item.productId} className=" type-micro-caption text-text-secondary">{item.itemName} · {item.quantity} × {formatPesos(item.unitPriceCentavos)}</Text>)}
      {sale.payment.tenders.map(tender => <Text key={tender.method} className=" type-micro-caption text-text-secondary">{tender.method === 'cash' ? 'Cash' : 'GCash'} received: {formatPesos(tender.receivedCentavos)}{tender.reference ? ` · Reference: ${tender.reference}` : ''}</Text>)}
      {sale.payment.cashChangeCentavos > 0 && <Text className=" type-micro-caption text-brand">Change: {formatPesos(sale.payment.cashChangeCentavos)}</Text>}
      <Text className=" type-label-nav text-brand">{sale.remainingCentavos > 0 ? `Remaining debt: ${formatPesos(sale.remainingCentavos)}` : 'Fully paid'}</Text>
    </View>) : <Text className=" type-micro-financial-rate text-text-secondary">No completed POS transactions yet.</Text>
      : debts.length ? debts.map(debt => <View key={debt.id} className="gap-2 rounded-card border border-outline bg-white p-4">
        <Text className=" type-button-cta text-brand">{debt.name}</Text>
        <Text className=" type-list-financial text-brand">Remaining Balance: {formatPesos(debt.amountCentavos)}</Text>
        {debt.paidCentavos !== undefined && <Text className=" type-micro-caption text-text-secondary">Amount Paid: {formatPesos(debt.paidCentavos)}</Text>}
        <Text className=" type-micro-caption text-text-secondary">{debt.paymentStatus === 'partial' ? 'Partially paid' : 'Unpaid'} · {debt.dueDate ? `Due ${debt.dueDate}` : 'No due date set'}</Text>
        {debt.saleId && <Text selectable className=" type-micro-caption text-text-secondary">Sale: {debt.saleId}</Text>}
        {Object.values(debt.items).map(item => <Text key={item.productId} className=" type-micro-caption text-text-secondary">{item.itemName} · {item.quantity} × {formatPesos(item.unitPriceCentavos)}</Text>)}
      </View>) : <Text className=" type-micro-financial-rate text-text-secondary">No customer debts recorded.</Text>}
  </View>;
}
