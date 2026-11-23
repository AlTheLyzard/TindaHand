import tokens from '@/constants/design-tokens.json';
import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from '@/i18n/use-translation';
import { t } from '@/i18n';
import { DropdownField } from '@/components/ui/dropdown-field';
import { formatPesos } from '@/utils/dashboard';
import { formatCalendarDate } from '@/utils/date';
import { accountExplanation, reportTitles } from '@/utils/financial';
import type { FinancialReport } from '@/types/financial';

const formatFinancialAmount = (centavos: number) => `${centavos < 0 ? '−' : ''}${formatPesos(Math.abs(centavos))}`;

export function ReportSummary({ label, amount, children, tone = 'green' }: { label: string; amount: number; children?: ReactNode; tone?: 'green' | 'blue' | 'red' }) {
  const labelColor = tone === 'red' ? tokens.color.errorBase : tone === 'blue' ? tokens.color.royalBlue : tokens.color.successBase;
  const amountColor = tone === 'blue' ? tokens.color.darkNavy : labelColor;
  const background = tone === 'red' ? tokens.color.errorTint : tone === 'blue' ? tokens.color.softBlue : tokens.color.successTint;
  return <View className="gap-3 rounded-control p-4" style={{ backgroundColor: background, borderWidth: 1, borderColor: labelColor }}>
    <Text className="type-label-nav" style={{ color: labelColor }}>{label}</Text>
    <Text selectable className="type-large-metric leading-10" style={{ color: amountColor, fontVariant: ['tabular-nums'] }}>{formatFinancialAmount(amount)}</Text>
    {children && <Text className="type-micro-caption leading-[17px]" style={{ color: labelColor }}>{children}</Text>}
  </View>;
}

export function StatementRow({ label, amount, total = false, color, striped = false }: { label: string; amount: number; total?: boolean; color?: string; striped?: boolean }) {
  const { width, fontScale } = useWindowDimensions();
  const formatted = formatFinancialAmount(amount || 0);
  const stack = fontScale > 1.35 || (width < 350 && formatted.length > 13);
  return <View className={`gap-2 px-3 py-3 ${total ? 'bg-accent-soft' : striped ? 'bg-canvas' : 'bg-white'}`}
    style={{ flexDirection: stack ? 'column' : 'row', alignItems: stack ? 'stretch' : 'center', borderBottomWidth: 1,
      borderColor: tokens.color.borderOutline, borderTopWidth: total ? 1 : 0 }}>
    <Text className={`min-w-0 flex-1 ${total ? 'type-button-cta' : 'type-micro-financial-rate'} text-text-primary`}>{label}</Text>
    <Text selectable className="type-button-cta leading-5" style={{ textAlign: 'right', flexShrink: 0, color: color ?? tokens.color.darkNavy, fontVariant: ['tabular-nums'] }}>{formatted}</Text>
  </View>;
}

type TableCell = { value: string; color?: string; indent?: boolean; doubleUnderline?: boolean };
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
    index === 0 ? ledger ? 76 : 140 : ledger ? 76 : 96));
  const minimumTableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const tableWidth = Math.max(available, minimumTableWidth);
  if (ledger && tableWidth > minimumTableWidth) {
    const extraPerColumn = (tableWidth - minimumTableWidth) / headers.length;
    columnWidths.forEach((width, index) => { columnWidths[index] = width + extraPerColumn; });
  } else if (!ledger) columnWidths[0] = tableWidth - columnWidths.slice(1).reduce((sum, width) => sum + width, 0);
  return <View className="overflow-hidden rounded-control border border-outline bg-white p-1" onLayout={event => setAvailable(event.nativeEvent.layout.width - 10)}>
    <ScrollView horizontal showsHorizontalScrollIndicator accessibilityHint="Scroll horizontally to view all currency columns when needed.">
      <View style={{ width: tableWidth }}>
        <View className="flex-row rounded bg-brand py-3">{headers.map((header, index) => <Text key={header}
          style={{ boxSizing: 'border-box', width: columnWidths[index], flexShrink: 0, paddingHorizontal: 6, textAlign: index ? 'right' : 'left' }}
          className="type-label-nav text-text-inverse">{header}</Text>)}</View>
        {rows.map(row => <View key={row.id} accessibilityLabel={row.description} className={`flex-row py-3 ${row.total ? 'rounded bg-accent-soft' : ''}`}
          style={{ width: tableWidth, borderTopWidth: row.separator ? 1 : 0, borderColor: tokens.color.borderOutline }}>
          {row.cells.map((cell, index) => {
            const textColor = cell.color ?? tokens.color.textPrimary;
            return <View key={index} style={{ boxSizing: 'border-box', width: columnWidths[index], flexShrink: 0, paddingHorizontal: 6,
              paddingLeft: cell.indent ? 14 : 6, alignItems: index ? 'flex-end' : 'flex-start', justifyContent: 'center' }}>
              <Text selectable className={row.total ? 'type-button-cta' : 'type-micro-caption'}
                style={{ textAlign: index ? 'right' : 'left', color: textColor, fontVariant: ['tabular-nums'] }}>{cell.value}</Text>
              {cell.doubleUnderline && <View accessibilityElementsHidden className="mt-1 gap-[2px]" style={{ alignSelf: 'flex-end',
                width: Math.min(columnWidths[index] - 12, Math.max(32, cell.value.length * 7 * scale)), marginRight: 0 }}>
                <View style={{ height: 1, backgroundColor: textColor }} />
                <View style={{ height: 1, backgroundColor: textColor }} />
              </View>}
            </View>;
          })}
        </View>)}
      </View>
    </ScrollView>
  </View>;
}

const numeric = (amount: number, color: string): TableCell => ({ value: amount ? formatFinancialAmount(amount) : '—', color: amount ? color : tokens.color.textPrimary });

function JournalContent({ report }: { report: FinancialReport }) {
  const { t } = useTranslation();
  const journal = report.journal;
  const headers = [t('financial.particulars'), t('financial.debit'), t('financial.credit')];
  const dayTables = journal.days.map(day => ({ day, rows: [
    ...day.entries.flatMap((entry, entryIndex) => entry.lines.map((line, index) => ({ id: `${entry.id}-${index}`,
      separator: entryIndex > 0 && index === 0,
      description: `${entry.description}, ${entry.id}`,
      cells: [{ value: report.ledger.find(account => account.id === line.accountId)?.name ?? line.accountId, indent: line.credit > 0 },
        numeric(line.debit, tokens.color.errorBase), numeric(line.credit, tokens.color.successBase)] }))),
    { id: 'total', total: true, cells: [{ value: t('financial.totals') }, { value: formatFinancialAmount(day.debit) }, { value: formatFinancialAmount(day.credit) }] },
  ] as TableRow[] }));
  const allRows = dayTables.flatMap(table => table.rows);
  const sharedColumnWidths = headers.map((_, index) => Math.max(index === 0 ? 140 : 96,
    ...allRows.map(row => estimateTableTextWidth(row.cells[index]?.value ?? ''))));
  return <View className="gap-6">
    {dayTables.map(({ day, rows }) => <View key={day.date} className="gap-3">
      <Text accessibilityRole="header" className="type-label-nav uppercase text-text-primary">{formatCalendarDate(day.date).toUpperCase()}</Text>
      <AccountingTable headers={headers} rows={rows} sharedColumnWidths={sharedColumnWidths} />
    </View>)}
    <ReportSummary label={t(journal.balanced ? 'financial.check' : 'financial.mismatch')} amount={journal.debit} tone={journal.balanced ? 'blue' : 'red'}>
      {journal.balanced ? t('financial.equal') : `${formatFinancialAmount(journal.debit)} ${t('financial.doesNotEqual')} ${formatFinancialAmount(journal.credit)}`}
    </ReportSummary>
  </View>;
}

function LedgerContent({ report }: { report: FinancialReport }) {
  const { t } = useTranslation();
  const [accountId, setAccountId] = useState(report.ledger[0]?.id ?? '');
  const account = report.ledger.find(candidate => candidate.id === accountId) ?? report.ledger[0];
  const sameMonth = report.selection.from.slice(0, 7) === report.selection.to.slice(0, 7);
  const monthHeading = new Date(`${report.selection.from.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' });
  const headers = [sameMonth ? monthHeading : t('financial.date'), t('financial.debit'), t('financial.credit'), t('financial.balance')];
  if (!account) return null;
  const rows: TableRow[] = account.rows.map((row, index) => ({
    id: `${row.entryId}-${index}`, separator: index > 0,
    description: `${formatCalendarDate(row.date)}: ${row.description}`,
    cells: [
      { value: sameMonth ? String(Number(row.date.slice(-2))) : formatCalendarDate(row.date) },
      numeric(row.debit, tokens.color.errorBase),
      numeric(row.credit, tokens.color.successBase),
      { value: formatFinancialAmount(row.balance), color: tokens.color.brightBlue, doubleUnderline: index === account.rows.length - 1 },
    ],
  }));
  const columnMeasurements = headers.map((_, index) => rows.map(row => estimateTableTextWidth(row.cells[index]?.value ?? '')));
  const sharedColumnWidths = columnMeasurements.map((widths, index) => Math.max(index === 0 ? 76 : 76, ...widths,
    estimateTableTextWidth(headers[index])));
  return <View className="gap-4">
    <DropdownField label={t('financial.ledgerAccount')} required value={account.id}
      options={report.ledger.map(item => ({ value: item.id, label: item.name }))} onChange={setAccountId} />
    {rows.length ? <AccountingTable ledger headers={headers} rows={rows} sharedColumnWidths={sharedColumnWidths} />
      : <View className="rounded-control border border-outline bg-white p-4"><Text className="type-micro-caption text-text-secondary">{t('financial.noAccountActivity')}</Text></View>}
    <ReportSummary label={t('financial.endingBalance')} amount={Math.abs(account.ending)} tone="blue">
      {accountExplanation(account.normal, account.name)}
    </ReportSummary>
  </View>;
}

function reportPeriod(selection: FinancialReport['selection']) {
  if (selection.from.slice(0, 7) === selection.to.slice(0, 7)) {
    const month = new Date(`${selection.from.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });
    return `${month}`;
  }
  return `${formatCalendarDate(selection.from)} – ${formatCalendarDate(selection.to)}`;
}

function IncomeContent({ report }: { report: FinancialReport }) {
  const income = report.income;
  return <View className="gap-4 rounded-card border border-outline bg-white p-4">
    <View className="gap-1 border-b border-outline pb-3">
      <Text accessibilityRole="header" className="type-h3-heading text-brand">{report.storeName}</Text>
      <Text className="type-micro-caption text-text-secondary">{reportTitles[report.kind]} for {reportPeriod(report.selection)}</Text>
    </View>
    <View className="gap-1">
      <Text className="py-2 type-label-nav text-action">{t('financial.revenue')}</Text>
      <StatementRow label={t('financial.sales')} amount={income.sales} />
      <StatementRow label={t('financial.cogs')} amount={-income.cost} color={tokens.color.errorBase} />
      <View className="mt-2 gap-3 rounded-control border border-action bg-accent-soft p-4">
        <Text className="type-button-cta text-brand">{t('financial.gross')}</Text>
        <Text selectable className="type-large-metric leading-10 text-brand">{formatFinancialAmount(income.grossProfit)}</Text>
      </View>
    </View>
    <View className="gap-1">
      <Text className="py-2 type-label-nav text-action">{t('financial.expenses')}</Text>
      {income.expenses.map(expense => <StatementRow key={expense.id} label={expense.name} amount={expense.amount} color={tokens.color.errorBase} />)}
      <View className="mt-2 border-t border-outline pt-1"><StatementRow label={t('financial.totalExpenses')} amount={income.totalExpenses} /></View>
    </View>
    <ReportSummary label={t(income.netProfit < 0 ? 'financial.netLoss' : 'financial.netProfit')} amount={income.netProfit} tone={income.netProfit < 0 ? 'red' : 'green'} />
  </View>;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <View className="gap-1 p-4">
    <Text accessibilityRole="header" className="type-h3-heading text-brand">{title}</Text>
    <Text className="type-micro-caption text-text-secondary">{description}</Text>
  </View>;
}

function GroupHeading({ children }: { children: string }) {
  return <Text className="bg-canvas px-3 py-3 type-label-nav text-action">{children}</Text>;
}

function BalanceContent({ report }: { report: FinancialReport }) {
  const { t } = useTranslation();
  const b = report.balance;
  return <View className="gap-4">
    <View className="overflow-hidden rounded-control border border-outline bg-white">
      <SectionHeading title={t('financial.assets')} description={t('financial.assetsDescription')} />
      <GroupHeading>{t('financial.currentAssets')}</GroupHeading>
      {b.currentAssets.map((item, index) => <StatementRow key={item.id} label={item.name} amount={item.amount} striped={index % 2 === 1}
        color={item.id === 'cash' ? tokens.color.successBase : undefined} />)}
      <StatementRow label={t('financial.totalCurrent')} amount={b.currentTotal} total />
      <GroupHeading>{t('financial.nonCurrentAssets')}</GroupHeading>
      {b.nonCurrentAssets.map((item, index) => <StatementRow key={item.id} label={item.name} amount={item.amount} striped={index % 2 === 1} />)}
      <StatementRow label={t('financial.totalNonCurrent')} amount={b.nonCurrentTotal} total />
      <View className="p-3"><ReportSummary label={t('financial.totalAssets')} amount={b.assets} /></View>
    </View>
    <View className="overflow-hidden rounded-control border border-outline bg-white">
      <SectionHeading title={t('financial.liabilities')} description={t('financial.liabilitiesDescription')} />
      {b.liabilities.map(item => <StatementRow key={item.id} label={item.name} amount={item.amount} color={tokens.color.errorBase} />)}
      <StatementRow label={t('financial.totalLiabilities')} amount={b.liabilityTotal} total color={tokens.color.errorBase} />
    </View>
    <View className="overflow-hidden rounded-control border border-outline bg-white">
      <SectionHeading title={t('financial.equity')} description={t('financial.equityDescription')} />
      {b.capital.map(item => <StatementRow key={item.id} label={item.name} amount={item.amount} />)}
      <StatementRow label={t('financial.earnings')} amount={b.accumulatedEarnings} striped color={b.accumulatedEarnings < 0 ? tokens.color.errorBase : tokens.color.successBase} />
      <StatementRow label={t('financial.totalEquity')} amount={b.equity} total />
    </View>
    <ReportSummary label={t('financial.totalLE')} amount={b.liabilitiesAndEquity}>
      {t(b.balanced ? 'financial.matches' : 'financial.doesNotMatch', { amount: formatFinancialAmount(b.assets) })}
    </ReportSummary>
  </View>;
}

export function ReportContent({ report }: { report: FinancialReport }) {
  if (report.kind === 'general-journal') return <JournalContent report={report} />;
  if (report.kind === 'general-ledger') return <LedgerContent report={report} />;
  if (report.kind === 'income-statement') return <IncomeContent report={report} />;
  return <BalanceContent report={report} />;
}
