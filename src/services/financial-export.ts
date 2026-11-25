import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { FinancialReport } from '@/types/financial';
import { financialFilename, financialReportHtml } from '@/utils/financial-pdf';

/** Native sharing resolves without identifying Save vs Cancel. Report only generation/handoff. */
export async function exportFinancialPdf(report: FinancialReport): Promise<'ready' | 'print-dialog'> {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const filename = financialFilename(report);
  const generated = await Print.printToFileAsync({ html: financialReportHtml(report), width: 595, height: 842 });
  // Copy into the cache directory — expo-sharing requires a file in a world-readable location.
  const destination = FileSystem.cacheDirectory + filename;
  await FileSystem.copyAsync({ from: generated.uri, to: destination });
  await Sharing.shareAsync(destination, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: filename });
  return 'ready';
}
