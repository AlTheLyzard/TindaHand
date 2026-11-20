import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from '@/i18n/use-translation';
import { t } from '@/i18n';
import { formatPesos } from '@/utils/dashboard';
import { formatCalendarDate } from '@/utils/date';
import { accountExplanation, balanceSide, periodLabel, reportTitles } from '@/utils/financial';
import type { FinancialReport } from '@/types/financial';
import { PosIcon } from '@/components/pos/pos-icon';

const formatFinancialAmount = (centavos: number) => formatPesos(Math.abs(centavos));

export function ReportSummary({ label, amount, children, tone = 'green' }: { label: string; amount: number; children?: ReactNode; tone?: 'green' | 'blue' | 'red' }) {
  const color = tone === 'red' ? '#B4232C' : tone === 'blue' ? '#112F6F' : '#21642C';
  return <View className="gap-3 rounded-control p-4" style={{ backgroundColor: tone === 'red' ? '#FFEBEE' : tone === 'blue' ? '#D1E1F5' : '#E8F5E9', borderWidth: tone === 'blue' ? 0 : 1, borderColor: color }}>
    <Text className="font-poppins-bold text-[11px]" style={{ color }}>{label}</Text>
    <Text selectable className="font-poppins-bold text-[26px] leading-10" style={{ color, fontVariant: ['tabular-nums'] }}>{formatFinancialAmount(amount)}</Text>
    {children && <Text className="font-poppins text-[11px] leading-[17px]" style={{ color }}>{children}</Text>}
  </View>;
}
export function StatementRow({ label, amount, total = false, color, striped = false }: { label: string; amount: number; total?: boolean; color?: string; striped?: boolean }) {
  const { width, fontScale } = useWindowDimensions();
  const stack = fontScale > 1.35 || (width < 350 && formatFinancialAmount(amount).length > 13);
  return <View className={`gap-2 px-3 py-3 ${total ? 'bg-[#D1E1F5]' : striped ? 'bg-[#F0F8FF]' : ''}`} style={{ flexDirection: stack ? 'column' : 'row', alignItems: stack ? 'stretch' : 'center' }}>
    <Text className={`min-w-0 flex-1 text-[11px] leading-[18px] text-[#0C1B3C] ${total ? 'font-poppins-bold' : 'font-poppins-semibold'}`}>{label}</Text>
    <Text selectable className="font-poppins-bold text-[13px] leading-5" style={{ textAlign: 'right', flexShrink: 0, color: color ?? '#112F6F', fontVariant: ['tabular-nums'] }}>{formatFinancialAmount(amount || 0)}</Text>
  </View>;
}
type TableCell = { value: string; color?: string; indent?: boolean };
type TableRow = { id: string; cells: TableCell[]; total?: boolean; separator?: boolean; description?: string };
const estimateTableTextWidth = (value: string) => value.length * 7 + 16;
function AccountingTable({ headers, rows, ledger = false, sharedColumnWidths }: {
  headers: string[]; rows: TableRow[]; ledger?: boolean; sharedColumnWidths?: number[];
}) {
  const { fontScale } = useWindowDimensions();
  const [available, setAvailable] = useState(300);
  const scale = Math.max(1, fontScale);
  const columnWidth = (index: number, minimum: number) => Math.max(minimum, sharedColumnWidths?.[index] ?? 0,
    ...(sharedColumnWidths ? [] : [headers[index], ...rows.map(row => row.cells[index]?.value ?? '')].map(estimateTableTextWidth))) * scale;
  const columnWidths = headers.map((_, index) => columnWidth(index,
    index === 0 ? ledger ? 112 : 140 : ledger ? 112 : 96));
  const minimumTableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const tableWidth = Math.max(available, minimumTableWidth);
  if (ledger && tableWidth > minimumTableWidth) {
    const extraPerColumn = (tableWidth - minimumTableWidth) / headers.length;
    columnWidths.forEach((width, index) => { columnWidths[index] = width + extraPerColumn; });
  } else if (!ledger) columnWidths[0] = tableWidth - columnWidths.slice(1).reduce((sum, width) => sum + width, 0);
  return <View className="overflow-hidden rounded-control border border-[#B0C8E3] bg-white p-1" onLayout={event => setAvailable(event.nativeEvent.layout.width - 10)}>
    <ScrollView horizontal showsHorizontalScrollIndicator accessibilityHint="Scroll horizontally to view all currency columns when needed.">
      <View style={{ width: tableWidth }}>
        <View className="flex-row rounded bg-[#D1E1F5] py-3">{headers.map((header, index) => <Text key={header} style={{ boxSizing: 'border-box', width: columnWidths[index], flexShrink: 0, paddingHorizontal: 6, textAlign: index ? 'right' : 'left' }} className="font-poppins-bold text-[10px] text-[#0C1B3C]">{header}</Text>)}</View>
        {rows.map(row => <View key={row.id} accessibilityLabel={row.description} className={`flex-row py-3 ${row.total ? 'rounded bg-[#D1E1F5]' : ''}`} style={{ width: tableWidth, borderTopWidth: row.separator ? 1 : 0, borderColor: '#B0C8E3' }}>
          {row.cells.map((cell, index) => <Text key={index} selectable className={row.total ? 'font-poppins-bold text-[11px]' : 'font-poppins text-[10px]'} style={{ boxSizing: 'border-box', width: columnWidths[index], flexShrink: 0, paddingHorizontal: 6, paddingLeft: cell.indent ? 14 : 6, textAlign: index ? 'right' : 'left', color: cell.color ?? '#0C1B3C', fontVariant: ['tabular-nums'] }}>{cell.value}</Text>)}
        </View>)}
      </View>
    </ScrollView>
  </View>;
}
const numeric = (amount: number, color: string): TableCell => ({ value: formatFinancialAmount(amount), color: amount ? color : '#0C1B3C' });

function JournalContent({ report }: { report: FinancialReport }) {
  const { t } = useTranslation();
  const journal = report.journal;
  const headers = [t('financial.particulars'), t('financial.debit'), t('financial.credit')];
  const dayTables = journal.days.map(day => ({ day, rows: [
    ...day.entries.flatMap((entry, entryIndex) => entry.lines.map((line, index) => ({ id: `${entry.id}-${index}`, separator: entryIndex > 0 && index === 0, description: `${entry.description}, ${entry.id}`,
      cells: [{ value: report.ledger.find(account => account.id === line.accountId)?.name ?? line.accountId, indent: line.credit > 0 }, numeric(line.debit, '#B4232C'), numeric(line.credit, '#21642C')] }))),
    { id: 'total', total: true, cells: [{ value: t('financial.totals') }, { value: formatFinancialAmount(day.debit) }, { value: formatFinancialAmount(day.credit) }] },
  ] as TableRow[] }));
  const overallRows: TableRow[] = [{ id: 'overall', total: true, cells: [{ value: t('financial.overallTotals') }, { value: formatFinancialAmount(journal.debit) }, { value: formatFinancialAmount(journal.credit) }] }];
  const allRows = [...dayTables.flatMap(table => table.rows), ...overallRows];
  const sharedColumnWidths = headers.map((_, index) => Math.max(index === 0 ? 140 : 96,
    ...allRows.map(row => estimateTableTextWidth(row.cells[index]?.value ?? ''))));
  return <View className="gap-6">
    {dayTables.map(({ day, rows }) => <View key={day.date} className="gap-3">
      <Text accessibilityRole="header" className="font-poppins-bold text-[11px] uppercase text-[#0C1B3C]">{formatCalendarDate(day.date)}</Text>
      <AccountingTable headers={headers} rows={rows} sharedColumnWidths={sharedColumnWidths} />
    </View>)}
    <AccountingTable headers={headers} rows={overallRows} sharedColumnWidths={sharedColumnWidths} />
    <View className="gap-3 rounded-control border p-4" style={{ borderColor: journal.balanced ? '#36843B' : '#B4232C', backgroundColor: journal.balanced ? '#E8F5E9' : '#FFEBEE' }}>
      <View className="flex-row items-center gap-2"><PosIcon name={journal.balanced ? 'check' : 'alert'} size={18} color={journal.balanced ? '#21642C' : '#B4232C'} /><Text className="flex-1 font-poppins-bold text-[11px]" style={{ color: journal.balanced ? '#21642C' : '#B4232C' }}>{t(journal.balanced ? 'financial.check' : 'financial.mismatch')}</Text></View>
      <Text selectable className="font-poppins-bold text-[15px]" style={{ color: journal.balanced ? '#21642C' : '#B4232C' }}>{formatFinancialAmount(journal.debit)} {journal.balanced ? '=' : '≠'} {formatFinancialAmount(journal.credit)}</Text>
      <Text className="font-poppins text-[11px] text-text-secondary">{t(journal.balanced ? 'financial.equal' : 'financial.unequal')}</Text>
    </View>
  </View>;
}
function LedgerContent({ report }: { report: FinancialReport }) {
  const { t } = useTranslation();
  const balance = (value: number): TableCell => ({ value: formatFinancialAmount(value), color: '#2F6CC9' });
  const headers = [t('financial.date'), t('financial.debit'), t('financial.credit'), t('financial.balance')];
  const accountTables = report.ledger.map(account => ({ account, rows: [
      { id: 'opening', cells: [{ value: t('financial.opening') }, { value: formatFinancialAmount(0) }, { value: formatFinancialAmount(0) }, balance(account.opening)] },
      ...account.rows.map((row, index) => ({ id: `${row.entryId}-${index}`, separator: index === 0 || account.rows[index - 1].date !== row.date, description: `${formatCalendarDate(row.date)}: ${row.description}`,
        cells: [{ value: formatCalendarDate(row.date) }, numeric(row.debit, '#B4232C'), numeric(row.credit, '#21642C'), balance(row.balance)] })),
      { id: 'activity', total: true, cells: [{ value: t('financial.totals') }, { value: formatFinancialAmount(account.debit) }, { value: formatFinancialAmount(account.credit) }, balance(account.ending)] },
    ] as TableRow[] }));
  const columnMeasurements = headers.map((_, index) => accountTables.flatMap(table =>
    table.rows.map(row => estimateTableTextWidth(row.cells[index]?.value ?? ''))));
  const sharedColumnWidths = columnMeasurements.map(widths => Math.max(112, ...widths));
  return <View className="gap-8">{accountTables.map(({ account, rows }) => <View key={account.id} className="gap-4">
    <Text accessibilityRole="header" className="font-poppins-semibold text-[20px] text-brand">{account.name}</Text>
    <AccountingTable ledger headers={headers} rows={rows} sharedColumnWidths={sharedColumnWidths} />
    <ReportSummary label={t(balanceSide(account.ending) === 'debit' ? 'financial.endingDebit' : 'financial.endingCredit')} amount={Math.abs(account.ending)}>{accountExplanation(account.normal, account.name)}</ReportSummary>
  </View>)}</View>;
}
function IncomeContent({ report }: { report: FinancialReport }) {
  const income = report.income;
  return <View className="gap-2 rounded-card border border-[#B0C8E3] bg-white p-4">
    <Text accessibilityRole="header" className="font-poppins-bold text-[17px] text-brand">{report.storeName}</Text>
    <Text className="border-b border-[#B0C8E3] pb-3 font-poppins text-[11px] text-text-secondary">{reportTitles[report.kind]} · {periodLabel(report.selection)}</Text>
    <Text className="py-2 font-poppins-bold text-[11px] text-action">{t('financial.revenue')}</Text>
    <StatementRow label={t('financial.sales')} amount={income.sales} />
    <StatementRow label={t('financial.cogs')} amount={-income.cost} color="#B4232C" />
    <ReportSummary label={t('financial.gross')} amount={income.grossProfit} tone={income.grossProfit < 0 ? 'red' : 'blue'} />
    <Text className="py-2 font-poppins-bold text-[11px] text-action">{t('financial.expenses')}</Text>
    {income.expenses.map(expense => <StatementRow key={expense.id} label={expense.name} amount={expense.amount} color="#B4232C" />)}
    <View className="border-t border-[#B0C8E3]"><StatementRow label={t('financial.totalExpenses')} amount={income.totalExpenses} /></View>
    <ReportSummary label={t(income.netProfit < 0 ? 'financial.netLoss' : 'financial.netProfit')} amount={income.netProfit} tone={income.netProfit < 0 ? 'red' : 'green'} />
  </View>;
}
function BalanceContent({ report }: { report: FinancialReport }) {
  const { t } = useTranslation();
  const b = report.balance;
  return <View className="gap-6">
    <View className="overflow-hidden rounded-control border border-[#B0C8E3] bg-white">
      <Text accessibilityRole="header" className="bg-[#F0F8FF] px-3 pt-4 font-poppins-semibold text-[18px] text-brand">{t('financial.assets')}</Text>
      <Text className="bg-[#F0F8FF] px-3 pb-2 pt-1 font-poppins text-[11px] text-text-secondary">{t('financial.assetsDescription')}</Text>
      <Text className="bg-[#F0F8FF] px-3 py-3 font-poppins-bold text-[11px] text-action">{t('financial.currentAssets')}</Text>
      {b.currentAssets.map((item, index) => <StatementRow key={item.id} label={item.name} amount={item.amount} striped={index % 2 === 1} color={item.id === 'cash' ? '#21642C' : undefined} />)}
      <StatementRow label={t('financial.totalCurrent')} amount={b.currentTotal} total />
      <Text className="bg-[#F0F8FF] px-3 py-3 font-poppins-bold text-[11px] text-action">{t('financial.nonCurrentAssets')}</Text>
      {b.nonCurrentAssets.map(item => <StatementRow key={item.id} label={item.name} amount={item.amount} />)}
      <StatementRow label={t('financial.totalNonCurrent')} amount={b.nonCurrentTotal} total />
      <View className="bg-[#F0F8FF] pt-3"><ReportSummary label={t('financial.totalAssets')} amount={b.assets} /></View>
    </View>
    <View className="gap-2 rounded-control border border-[#B0C8E3] bg-white p-3">
      <Text accessibilityRole="header" className="font-poppins-semibold text-[18px] text-brand">{t('financial.liabilities')}</Text>
      <Text className="font-poppins text-[11px] text-text-secondary">{t('financial.liabilitiesDescription')}</Text>
      {b.liabilities.map(item => <StatementRow key={item.id} label={item.name} amount={item.amount} color="#B4232C" />)}
      <StatementRow label={t('financial.totalLiabilities')} amount={b.liabilityTotal} total color="#B4232C" />
    </View>
    <View className="gap-2 rounded-control border border-[#B0C8E3] bg-white p-3">
      <Text accessibilityRole="header" className="font-poppins-semibold text-[18px] text-brand">{t('financial.equity')}</Text>
      <Text className="font-poppins text-[11px] text-text-secondary">{t('financial.equityDescription')}</Text>
      {b.capital.map(item => <StatementRow key={item.id} label={item.name} amount={item.amount} />)}
      <StatementRow label={t('financial.earnings')} amount={b.accumulatedEarnings} striped color={b.accumulatedEarnings < 0 ? '#B4232C' : '#21642C'} />
      <Text className="font-poppins text-[10px] text-text-secondary">{t('financial.earningsHint')}</Text>
      <StatementRow label={t('financial.totalEquity')} amount={b.equity} total />
    </View>
    <ReportSummary label={t('financial.totalLE')} amount={b.liabilitiesAndEquity} tone={b.balanced ? 'green' : 'red'}>{t(b.balanced ? 'financial.matches' : 'financial.doesNotMatch', { amount: formatFinancialAmount(b.assets) })}</ReportSummary>
  </View>;
}
export function ReportContent({ report }: { report: FinancialReport }) {
  if (report.kind === 'general-journal') return <JournalContent report={report} />;
  if (report.kind === 'general-ledger') return <LedgerContent report={report} />;
  if (report.kind === 'income-statement') return <IncomeContent report={report} />;
  return <BalanceContent report={report} />;
}
