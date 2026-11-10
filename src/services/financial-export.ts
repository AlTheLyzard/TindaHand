import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { FinancialReport } from '@/types/financial';
import { financialFilename, financialReportHtml } from '@/utils/financial-pdf';

/** Native sharing resolves without identifying Save vs Cancel. Report only generation/handoff. */
export async function exportFinancialPdf(report: FinancialReport): Promise<'ready' | 'print-dialog'> {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const generated = await Print.printToFileAsync({ html: financialReportHtml(report), width: 595, height: 842 });
  const source = new File(generated.uri);
  // A per-export cache directory prevents conflicts with retained files from earlier exports.
  const directory = new Directory(Paths.cache, `financial-${Date.now()}`);
  directory.create();
  const destination = new File(directory, financialFilename(report));
  await source.move(destination);
  await Sharing.shareAsync(destination.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: financialFilename(report) });
  return 'ready';
}
