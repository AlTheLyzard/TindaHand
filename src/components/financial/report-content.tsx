import tokens from '@/constants/design-tokens.json';
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
  const color = tone === 'red' ? tokens.color.errorBase : tone === 'blue' ? tokens.color.darkNavy : tokens.color.successBase;
  return <View className="gap-3 rounded-control p-4" style={{ backgroundColor: tone === 'red' ? tokens.color.errorTint : tone === 'blue' ? tokens.color.softBlue : tokens.color.successTint, borderWidth: tone === 'blue' ? 0 : 1, borderColor: color }}>
    <Text className=" type-label-nav" style={{ color }}>{label}</Text>
    <Text selectable className=" type-large-metric leading-10" style={{ color, fontVariant: ['tabular-nums'] }}>{formatFinancialAmount(amount)}</Text>
    {children && <Text className=" type-micro-caption leading-[17px]" style={{ color }}>{children}</Text>}
  </View>;
}
export function StatementRow({ label, amount, total = false, color, striped = false }: { label: string; amount: number; total?: boolean; color?: string; striped?: boolean }) {
  const { width, fontScale } = useWindowDimensions();
  const stack = fontScale > 1.35 || (width < 350 && formatFinancialAmount(amount).length > 13);
  return <View className={`gap-2 px-3 py-3 ${total ? 'bg-accent-soft' : striped ? 'bg-canvas' : ''}`} style={{ flexDirection: stack ? 'column' : 'row', alignItems: stack ? 'stretch' : 'center' }}>
    <Text className="min-w-0 flex-1 type-label-nav text-text-primary">{label}</Text>
    <Text selectable className=" type-button-cta leading-5" style={{ textAlign: 'right', flexShrink: 0, color: color ?? tokens.color.darkNavy, fontVariant: ['tabular-nums'] }}>{formatFinancialAmount(amount || 0)}</Text>
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
  return <View className="overflow-hidden rounded-control border border-outline bg-white p-1" onLayout={event => setAvailable(event.nativeEvent.layout.width - 10)}>
    <ScrollView horizontal showsHorizontalScrollIndicator accessibilityHint="Scroll horizontally to view all currency columns when needed.">
      <View style={{ width: tableWidth }}>
        <View className="flex-row rounded bg-accent-soft py-3">{headers.map((header, index) => <Text key={header} style={{ boxSizing: 'border-box', width: columnWidths[index], flexShrink: 0, paddingHorizontal: 6, textAlign: index ? 'right' : 'left' }} className=" type-helper text-text-primary">{header}</Text>)}</View>
        {rows.map(row => <View key={row.id} accessibilityLabel={row.description} className={`flex-row py-3 ${row.total ? 'rounded bg-accent-soft' : ''}`} style={{ width: tableWidth, borderTopWidth: row.separator ? 1 : 0, borderColor: tokens.color.borderOutline }}>
          {row.cells.map((cell, index) => <Text key={index} selectable className={row.total ? 'type-list-financial' : 'type-micro-caption'} style={{ boxSizing: 'border-box', width: columnWidths[index], flexShrink: 0, paddingHorizontal: 6, paddingLeft: cell.indent ? 14 : 6, textAlign: index ? 'right' : 'left', color: cell.color ?? tokens.color.textPrimary, fontVariant: ['tabular-nums'] }}>{cell.value}</Text>)}
        </View>)}
      </View>
    </ScrollView>
  </View>;
}
const numeric = (amount: number, color: string): TableCell => ({ value: formatFinancialAmount(amount), color: amount ? color : tokens.color.textPrimary });

function JournalContent({ report }: { report: FinancialReport }) {
  const { t } = useTranslation();
  const journal = report.journal;
  const headers = [t('financial.particulars'), t('financial.debit'), t('financial.credit')];
  const dayTables = journal.days.map(day => ({ day, rows: [
    ...day.entries.flatMap((entry, entryIndex) => entry.lines.map((line, index) => ({ id: `${entry.id}-${index}`, separator: entryIndex > 0 && index === 0, description: `${entry.description}, ${entry.id}`,
      cells: [{ value: report.ledger.find(account => account.id === line.accountId)?.name ?? line.accountId, indent: line.credit > 0 }, numeric(line.debit, tokens.color.errorBase), numeric(line.credit, tokens.color.successBase)] }))),
    { id: 'total', total: true, cells: [{ value: t('financial.totals') }, { value: formatFinancialAmount(day.debit) }, { value: formatFinancialAmount(day.credit) }] },
  ] as TableRow[] }));
  const overallRows: TableRow[] = [{ id: 'overall', total: true, cells: [{ value: t('financial.overallTotals') }, { value: formatFinancialAmount(journal.debit) }, { value: formatFinancialAmount(journal.credit) }] }];
  const allRows = [...dayTables.flatMap(table => table.rows), ...overallRows];
  const sharedColumnWidths = headers.map((_, index) => Math.max(index === 0 ? 140 : 96,
    ...allRows.map(row => estimateTableTextWidth(row.cells[index]?.value ?? ''))));
  return <View className="gap-6">
    {dayTables.map(({ day, rows }) => <View key={day.date} className="gap-3">
      <Text accessibilityRole="header" className=" type-label-nav uppercase text-text-primary">{formatCalendarDate(day.date)}</Text>
      <AccountingTable headers={headers} rows={rows} sharedColumnWidths={sharedColumnWidths} />
    </View>)}
    <AccountingTable headers={headers} rows={overallRows} sharedColumnWidths={sharedColumnWidths} />
    <View className="gap-3 rounded-control border p-4" style={{ borderColor: journal.balanced ? tokens.color.successBase : tokens.color.errorBase, backgroundColor: journal.balanced ? tokens.color.successTint : tokens.color.errorTint }}>
      <View className="flex-row items-center gap-2"><PosIcon name={journal.balanced ? 'check' : 'alert'} size={18} color={journal.balanced ? tokens.color.successBase : tokens.color.errorBase} /><Text className="flex-1 type-label-nav" style={{ color: journal.balanced ? tokens.color.successBase : tokens.color.errorBase }}>{t(journal.balanced ? 'financial.check' : 'financial.mismatch')}</Text></View>
      <Text selectable className=" type-list-financial" style={{ color: journal.balanced ? tokens.color.successBase : tokens.color.errorBase }}>{formatFinancialAmount(journal.debit)} {journal.balanced ? '=' : '≠'} {formatFinancialAmount(journal.credit)}</Text>
      <Text className=" type-micro-caption text-text-secondary">{t(journal.balanced ? 'financial.equal' : 'financial.unequal')}</Text>
    </View>
  </View>;
}
function LedgerContent({ report }: { report: FinancialReport }) {
  const { t } = useTranslation();
  const balance = (value: number): TableCell => ({ value: formatFinancialAmount(value), color: tokens.color.brightBlue });
  const headers = [t('financial.date'), t('financial.debit'), t('financial.credit'), t('financial.balance')];
  const accountTables = report.ledger.map(account => ({ account, rows: [
      { id: 'opening', cells: [{ value: t('financial.opening') }, { value: formatFinancialAmount(0) }, { value: formatFinancialAmount(0) }, balance(account.opening)] },
      ...account.rows.map((row, index) => ({ id: `${row.entryId}-${index}`, separator: index === 0 || account.rows[index - 1].date !== row.date, description: `${formatCalendarDate(row.date)}: ${row.description}`,
        cells: [{ value: formatCalendarDate(row.date) }, numeric(row.debit, tokens.color.errorBase), numeric(row.credit, tokens.color.successBase), balance(row.balance)] })),
      { id: 'activity', total: true, cells: [{ value: t('financial.totals') }, { value: formatFinancialAmount(account.debit) }, { value: formatFinancialAmount(account.credit) }, balance(account.ending)] },
    ] as TableRow[] }));
  const columnMeasurements = headers.map((_, index) => accountTables.flatMap(table =>
    table.rows.map(row => estimateTableTextWidth(row.cells[index]?.value ?? ''))));
  const sharedColumnWidths = columnMeasurements.map(widths => Math.max(112, ...widths));
  return <View className="gap-8">{accountTables.map(({ account, rows }) => <View key={account.id} className="gap-4">
    <Text accessibilityRole="header" className=" type-title-accent text-brand">{account.name}</Text>
    <AccountingTable ledger headers={headers} rows={rows} sharedColumnWidths={sharedColumnWidths} />
    <ReportSummary label={t(balanceSide(account.ending) === 'debit' ? 'financial.endingDebit' : 'financial.endingCredit')} amount={Math.abs(account.ending)}>{accountExplanation(account.normal, account.name)}</ReportSummary>
  </View>)}</View>;
}
function IncomeContent({ report }: { report: FinancialReport }) {
  const income = report.income;
  return <View className="gap-2 rounded-card border border-outline bg-white p-4">
    <Text accessibilityRole="header" className=" type-h3-heading text-brand">{report.storeName}</Text>
    <Text className="border-b border-outline pb-3 type-micro-caption text-text-secondary">{reportTitles[report.kind]} · {periodLabel(report.selection)}</Text>
    <Text className="py-2 type-label-nav text-action">{t('financial.revenue')}</Text>
    <StatementRow label={t('financial.sales')} amount={income.sales} />
    <StatementRow label={t('financial.cogs')} amount={-income.cost} color={tokens.color.errorBase} />
    <ReportSummary label={t('financial.gross')} amount={income.grossProfit} tone={income.grossProfit < 0 ? 'red' : 'blue'} />
    <Text className="py-2 type-label-nav text-action">{t('financial.expenses')}</Text>
    {income.expenses.map(expense => <StatementRow key={expense.id} label={expense.name} amount={expense.amount} color={tokens.color.errorBase} />)}
    <View className="border-t border-outline"><StatementRow label={t('financial.totalExpenses')} amount={income.totalExpenses} /></View>
    <ReportSummary label={t(income.netProfit < 0 ? 'financial.netLoss' : 'financial.netProfit')} amount={income.netProfit} tone={income.netProfit < 0 ? 'red' : 'green'} />
  </View>;
}
function BalanceContent({ report }: { report: FinancialReport }) {
  const { t } = useTranslation();
  const b = report.balance;
  return <View className="gap-6">
    <View className="overflow-hidden rounded-control border border-outline bg-white">
      <Text accessibilityRole="header" className="bg-canvas px-3 pt-4 type-h3-heading text-brand">{t('financial.assets')}</Text>
      <Text className="bg-canvas px-3 pb-2 pt-1 type-micro-caption text-text-secondary">{t('financial.assetsDescription')}</Text>
      <Text className="bg-canvas px-3 py-3 type-label-nav text-action">{t('financial.currentAssets')}</Text>
      {b.currentAssets.map((item, index) => <StatementRow key={item.id} label={item.name} amount={item.amount} striped={index % 2 === 1} color={item.id === 'cash' ? tokens.color.successBase : undefined} />)}
      <StatementRow label={t('financial.totalCurrent')} amount={b.currentTotal} total />
      <Text className="bg-canvas px-3 py-3 type-label-nav text-action">{t('financial.nonCurrentAssets')}</Text>
      {b.nonCurrentAssets.map(item => <StatementRow key={item.id} label={item.name} amount={item.amount} />)}
      <StatementRow label={t('financial.totalNonCurrent')} amount={b.nonCurrentTotal} total />
      <View className="bg-canvas pt-3"><ReportSummary label={t('financial.totalAssets')} amount={b.assets} /></View>
    </View>
    <View className="gap-2 rounded-control border border-outline bg-white p-3">
      <Text accessibilityRole="header" className=" type-h3-heading text-brand">{t('financial.liabilities')}</Text>
      <Text className=" type-micro-caption text-text-secondary">{t('financial.liabilitiesDescription')}</Text>
      {b.liabilities.map(item => <StatementRow key={item.id} label={item.name} amount={item.amount} color={tokens.color.errorBase} />)}
      <StatementRow label={t('financial.totalLiabilities')} amount={b.liabilityTotal} total color={tokens.color.errorBase} />
    </View>
    <View className="gap-2 rounded-control border border-outline bg-white p-3">
      <Text accessibilityRole="header" className=" type-h3-heading text-brand">{t('financial.equity')}</Text>
      <Text className=" type-micro-caption text-text-secondary">{t('financial.equityDescription')}</Text>
      {b.capital.map(item => <StatementRow key={item.id} label={item.name} amount={item.amount} />)}
      <StatementRow label={t('financial.earnings')} amount={b.accumulatedEarnings} striped color={b.accumulatedEarnings < 0 ? tokens.color.errorBase : tokens.color.successBase} />
      <Text className=" type-helper text-text-secondary">{t('financial.earningsHint')}</Text>
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
