import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { FinancialReport } from '@/types/financial';
import { financialFilename, financialReportHtml } from '@/utils/financial-pdf';

/** Native sharing resolves without identifying Save vs Cancel. Report only generation/handoff. */
export async function exportFinancialPdf(report: FinancialReport): Promise<'ready' | 'print-dialog'> {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const generated = await Print.printToFileAsync({ html: financialReportHtml(report), width: 595, height: 842 });
  // Rename to a human-readable filename in the same cache directory.
  const filename = financialFilename(report);
  const destination = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.moveAsync({ from: generated.uri, to: destination });
  await Sharing.shareAsync(destination, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: filename });
  return 'ready';
}
