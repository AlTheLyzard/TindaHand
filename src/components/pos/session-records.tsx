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
    <Text accessibilityRole="header" className="font-poppins-bold text-[18px] text-brand">{kind === 'transactions' ? 'Session Transactions' : 'Customer Debts'}</Text>
    <Text className="font-poppins text-[12px] text-text-secondary">{kind === 'transactions' ? 'Completed POS orders in this demo session.' : `Outstanding: ${formatPesos(debts.reduce((sum, debt) => sum + debt.amountCentavos, 0))}`}</Text>
    {kind === 'transactions' ? sales.length ? sales.map(sale => <View key={sale.id} className="gap-2 rounded-card border border-[#B0C8E3] bg-white p-4">
      <Text className="font-poppins-bold text-[14px] text-brand">{formatPesos(sale.totalCentavos)} · {sale.payment.method === 'partial' ? 'Partial Payment' : sale.payment.method === 'split' ? 'Split Payment' : sale.payment.method === 'gcash' ? 'GCash' : 'Cash'}</Text>
      <Text selectable className="font-poppins text-[11px] text-text-secondary">{sale.id} · {new Date(sale.occurredAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</Text>
      {sale.customerId && <Text className="font-poppins text-[12px] text-brand">Customer: {pos?.customers.find(customer => customer.id === sale.customerId)?.name}</Text>}
      {Object.values(sale.items).map(item => <Text key={item.productId} className="font-poppins text-[12px] text-text-secondary">{item.itemName} · {item.quantity} × {formatPesos(item.unitPriceCentavos)}</Text>)}
      {sale.payment.tenders.map(tender => <Text key={tender.method} className="font-poppins text-[12px] text-text-secondary">{tender.method === 'cash' ? 'Cash' : 'GCash'} received: {formatPesos(tender.receivedCentavos)}{tender.reference ? ` · Reference: ${tender.reference}` : ''}</Text>)}
      {sale.payment.cashChangeCentavos > 0 && <Text className="font-poppins text-[12px] text-brand">Change: {formatPesos(sale.payment.cashChangeCentavos)}</Text>}
      <Text className="font-poppins-bold text-[12px] text-brand">{sale.remainingCentavos > 0 ? `Remaining debt: ${formatPesos(sale.remainingCentavos)}` : 'Fully paid'}</Text>
    </View>) : <Text className="font-poppins text-[14px] text-text-secondary">No completed POS transactions yet.</Text>
      : debts.length ? debts.map(debt => <View key={debt.id} className="gap-2 rounded-card border border-[#B0C8E3] bg-white p-4">
        <Text className="font-poppins-bold text-[14px] text-brand">{debt.name}</Text>
        <Text className="font-poppins-bold text-[16px] text-brand">Remaining Balance: {formatPesos(debt.amountCentavos)}</Text>
        {debt.paidCentavos !== undefined && <Text className="font-poppins text-[12px] text-text-secondary">Amount Paid: {formatPesos(debt.paidCentavos)}</Text>}
        <Text className="font-poppins text-[12px] text-text-secondary">{debt.paymentStatus === 'partial' ? 'Partially paid' : 'Unpaid'} · {debt.dueDate ? `Due ${debt.dueDate}` : 'No due date set'}</Text>
        {debt.saleId && <Text selectable className="font-poppins text-[11px] text-text-secondary">Sale: {debt.saleId}</Text>}
        {Object.values(debt.items).map(item => <Text key={item.productId} className="font-poppins text-[12px] text-text-secondary">{item.itemName} · {item.quantity} × {formatPesos(item.unitPriceCentavos)}</Text>)}
      </View>) : <Text className="font-poppins text-[14px] text-text-secondary">No customer debts recorded.</Text>}
  </View>;
}
