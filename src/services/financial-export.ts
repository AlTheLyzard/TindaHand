import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { FinancialReport } from '@/types/financial';
import { financialFilename, financialReportHtml } from '@/utils/financial-pdf';

/** Native sharing resolves without identifying Save vs Cancel. Report only generation/handoff. */
export async function exportFinancialPdf(report: FinancialReport): Promise<'ready' | 'print-dialog'> {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const filename = financialFilename(report);
  // expo-print writes to .../cache/Print/ which is outside Expo Go's sandboxed ExperienceData
  // directory. expo-sharing can only read from within that sandbox. Work around by reading
  // the PDF bytes via fetch() (which crosses the boundary) and writing them into cacheDirectory.
  const generated = await Print.printToFileAsync({ html: financialReportHtml(report), width: 595, height: 842 });
  const destination = (FileSystem.cacheDirectory ?? '') + filename;
  const response = await fetch(generated.uri);
  const blob = await response.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(destination, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: filename });
  return 'ready';
}
