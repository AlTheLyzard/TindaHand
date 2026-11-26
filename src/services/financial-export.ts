import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { FinancialReport } from '@/types/financial';
import { financialFilename, financialReportHtml } from '@/utils/financial-pdf';

/** Native sharing resolves without identifying Save vs Cancel. Report only generation/handoff. */
export async function exportFinancialPdf(report: FinancialReport): Promise<'ready' | 'print-dialog'> {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const filename = financialFilename(report);

  // Request base64 output directly from printToFileAsync — this avoids all file path
  // sandbox issues since the PDF bytes come back in the JS result, never on disk.
  const generated = await Print.printToFileAsync({
    html: financialReportHtml(report),
    width: 595,
    height: 842,
    base64: true,
  });

  if (!generated.base64) {
    throw new Error('printToFileAsync did not return base64 data.');
  }

  // Write the base64 PDF into cacheDirectory, which expo-sharing can always access.
  const destination = (FileSystem.cacheDirectory ?? '') + filename;
  await FileSystem.writeAsStringAsync(destination, generated.base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(destination, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: filename,
  });
  return 'ready';
}
