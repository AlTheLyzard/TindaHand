import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FinancialFrame } from './financial-frame';
import { ReportFilters } from './report-filters';
import { ReportContent } from './report-content';
import { Button, IconButton } from '@/components/ui/button';
import { MotionModal } from '@/components/ui/motion-modal';
import { EmptyState, Skeleton, SkeletonBar } from '@/components/ui/content-state';
import { PosIcon } from '@/components/pos/pos-icon';
import { useTranslation } from '@/i18n/use-translation';
import { useFinancialReport } from '@/hooks/use-financial-report';
import { exportFinancialPdf } from '@/services/financial-export';
import { periodLabel, reportTimestamp, reportTitles } from '@/utils/financial';
import type { ReportKind } from '@/types/financial';

export function FinancialReportScreen({ kind }: { kind: ReportKind }) {
  const { t } = useTranslation();
  const state = useFinancialReport(kind);
  const { report } = state;
  const [confirm, setConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [feedback, setFeedback] = useState<'ready' | 'print-dialog' | 'cancelled' | null>(null);
  const exportLock = useRef(false);
  const title = reportTitles[kind];
  const single = kind === 'balance-sheet';
  function cancel() { if (exportLock.current) return; setConfirm(false); setFeedback('cancelled'); setExportError(false); }
  async function download() {
    if (!report || state.loading || exportLock.current) return;
    exportLock.current = true; setGenerating(true); setExportError(false); setFeedback(null);
    // Capture the immutable applied result. Draft filters are deliberately absent here.
    const snapshot = { ...report, generatedAt: new Date().toISOString() };
    try { const result = await exportFinancialPdf(snapshot); setFeedback(result); setConfirm(false); }
    catch { setExportError(true); }
    finally { exportLock.current = false; setGenerating(false); }
  }
  return <FinancialFrame title={title} refreshing={state.loading} onRefresh={state.refresh}>
    <ReportFilters draft={state.filters.draft} single={single} pending={state.pending} busy={state.loading || generating}
      onDraft={state.setDraft} onApply={state.apply} onReset={state.reset} />
    {report && <View className="mt-4 gap-2">
      <View accessibilityLiveRegion="polite" className="gap-1 rounded-control bg-[#D1E1F5] p-3">
        <Text className="font-poppins-bold text-[10px] text-brand">{t(state.pending ? single ? 'financial.unchangedDate' : 'financial.unchanged' : single ? 'financial.appliedDate' : 'financial.applied')}</Text>
        <Text className="font-poppins-bold text-[13px] text-brand">{periodLabel(report.selection, single)}</Text>
      </View>
      <Text className="font-poppins text-[10px] leading-4 text-text-secondary">{t('financial.lastUpdated', { date: reportTimestamp(report.generatedAt) })}{'\n'}{t('financial.refreshHint')}</Text>
    </View>}
    <View className="mt-8">
      {state.error ? <EmptyState title={t('financial.loadFailed')} description={t('financial.refreshHint')} action={t('financial.refresh')} onAction={state.refresh} /> : state.loading ? <Skeleton label={title}><View className="gap-4"><SkeletonBar height={180} /><SkeletonBar height={100} /></View></Skeleton> : report && <>
        {!report.hasActivity && <View className="mb-5"><EmptyState title={t('financial.empty')} description={t('financial.emptyHint')} /></View>}
        <ReportContent report={report} />
      </>}
    </View>
    <View className="flex-1" />
    <View className="mt-14 gap-3">
      {feedback && <Text accessibilityLiveRegion="polite" className="rounded-control p-3 font-poppins text-[11px] leading-[18px]" style={{ backgroundColor: feedback === 'cancelled' ? '#D1E1F5' : '#E8F5E9', color: feedback === 'cancelled' ? '#4A607A' : '#21642C' }}>{t(feedback === 'ready' ? 'financial.ready' : feedback === 'print-dialog' ? 'financial.printReady' : 'financial.cancelled')}</Text>}
      <Button disabled={!report || state.loading || state.error || generating} onPress={() => { setConfirm(true); setExportError(false); setFeedback(null); }}>{t('financial.downloadPdf')}</Button>
    </View>
    <MotionModal visible={confirm} onRequestClose={cancel} backdropColor="rgba(16,35,48,0.36)">
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <View accessibilityViewIsModal className="w-full max-w-[360px] self-center rounded-control bg-canvas p-5" style={{ boxShadow: '0 3px 6px #00000040' }}>
            <IconButton accessibilityLabel={t('common.close')} disabled={generating} onPress={cancel} className="absolute right-0 top-0" icon={({ color }) => <PosIcon name="close" size={16} color={color} />} />
            <Text accessibilityRole="header" className="mb-6 mt-2 pr-5 text-center font-poppins-bold text-[16px] leading-6 text-brand">{t('financial.downloadTitle', { report: title })}</Text>
            <Text className="mb-8 font-poppins text-[12px] leading-[19px] text-[#0C1B3C]">{t('financial.downloadMessage')}</Text>
            {exportError && <Text accessibilityRole="alert" className="mb-4 font-poppins text-[12px] text-[#B4232C]">{t('financial.failed')}</Text>}
            <View className="gap-3"><Button loading={generating} accessibilityLabel={t(generating ? 'financial.generating' : 'financial.download')} onPress={download}>{t('financial.download')}</Button><Button variant="secondary" disabled={generating} onPress={cancel}>{t('common.cancel')}</Button></View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </MotionModal>
  </FinancialFrame>;
}
