import { File, Paths } from 'expo-file-system/next';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { FinancialReport } from '@/types/financial';
import { financialFilename, financialReportHtml } from '@/utils/financial-pdf';

/** Native sharing resolves without identifying Save vs Cancel. Report only generation/handoff. */
export async function exportFinancialPdf(report: FinancialReport): Promise<'ready' | 'print-dialog'> {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const filename = financialFilename(report);
  const generated = await Print.printToFileAsync({ html: financialReportHtml(report), width: 595, height: 842 });
  // Move the printed file into the shared cache directory so expo-sharing can read it.
  const src = new File(generated.uri);
  const dest = new File(Paths.cache, filename);
  src.move(dest);
  await Sharing.shareAsync(dest.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: filename });
  return 'ready';
}
