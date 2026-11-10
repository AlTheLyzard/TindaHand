import type { FinancialReport } from '@/types/financial';
import { financialReportHtml } from '@/utils/financial-pdf';

/** Browser fallback uses the same complete report HTML. Native uses expo-print + expo-sharing. */
export async function exportFinancialPdf(report: FinancialReport): Promise<'ready' | 'print-dialog'> {
  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Allow the report window to open and try again.');
  preview.document.write(financialReportHtml(report));
  preview.document.close();
  await preview.document.fonts.ready;
  preview.focus();
  preview.print();
  return 'print-dialog';
}
