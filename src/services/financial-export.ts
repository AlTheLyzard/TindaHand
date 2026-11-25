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
  // directory. expo-file-system/legacy readAsStringAsync can read from arbitrary file:// URIs
  // (it uses the full file path, not Expo's document directory restrictions), so we read the
  // PDF bytes as base64 and write them into cacheDirectory where expo-sharing can access them.
  console.log('[TindaHand] Starting PDF export for:', filename);
  const generated = await Print.printToFileAsync({ html: financialReportHtml(report), width: 595, height: 842 });
  console.log('[TindaHand] printToFileAsync generated:', generated.uri);

  const destination = (FileSystem.cacheDirectory ?? '') + filename;
  console.log('[TindaHand] destination:', destination);

  // Read the PDF that expo-print wrote (outside sandbox) using readAsStringAsync with base64.
  const base64 = await FileSystem.readAsStringAsync(generated.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  console.log('[TindaHand] Read base64 length:', base64.length);

  // Write it into the Expo Go sandboxed cacheDirectory where expo-sharing can read it.
  await FileSystem.writeAsStringAsync(destination, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  console.log('[TindaHand] Wrote to destination, sharing...');

  await Sharing.shareAsync(destination, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: filename });
  return 'ready';
}
