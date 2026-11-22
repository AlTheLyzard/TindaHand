import tokens from '@/constants/design-tokens.json';
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinancialFrame } from './financial-frame';
import { ReportFilters } from './report-filters';
import { ReportContent } from './report-content';
import { Button, IconButton } from '@/components/ui/button';
import { MotionModal } from '@/components/ui/motion-modal';
import { ConfirmationActions } from '@/components/ui/confirmation-actions';
import { SuccessContent } from '@/components/ui/success-content';
import { EmptyState, Skeleton, SkeletonBar } from '@/components/ui/content-state';
import { PosIcon } from '@/components/pos/pos-icon';
import { quickAddColors } from '@/components/dashboard/quick-add-ui';
import { useTranslation } from '@/i18n/use-translation';
import { useFinancialReport } from '@/hooks/use-financial-report';
import { exportFinancialPdf } from '@/services/financial-export';
import { periodLabel, reportTimestamp, reportTitles } from '@/utils/financial';
import type { ReportKind } from '@/types/financial';

export function FinancialReportScreen({ kind }: { kind: ReportKind }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const state = useFinancialReport(kind);
  const { report } = state;
  const [confirm, setConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [feedback, setFeedback] = useState<'print-dialog' | 'cancelled' | null>(null);
  const [successEvent, setSuccessEvent] = useState<string | null>(null);
  const exportLock = useRef(false);
  const pendingSuccess = useRef(false);
  const exportCount = useRef(0);
  const title = reportTitles[kind];
  const single = kind === 'balance-sheet';
  function cancel() { if (exportLock.current) return; setConfirm(false); setFeedback('cancelled'); setExportError(false); }
  async function download() {
    if (!report || state.loading || exportLock.current) return;
    exportLock.current = true; setGenerating(true); setExportError(false); setFeedback(null); pendingSuccess.current = false;
    // Capture the immutable applied result. Draft filters are deliberately absent here.
    const snapshot = { ...report, generatedAt: new Date().toISOString() };
    try {
      const result = await exportFinancialPdf(snapshot);
      if (result === 'ready') pendingSuccess.current = true;
      else setFeedback(result);
      setConfirm(false);
    }
    catch { setExportError(true); }
    finally { exportLock.current = false; setGenerating(false); }
  }
  function afterConfirmationHidden() {
    if (!pendingSuccess.current) return;
    pendingSuccess.current = false;
    exportCount.current += 1;
    setSuccessEvent(`${kind}-${exportCount.current}`);
  }
  return <FinancialFrame title={title} refreshing={state.loading} onRefresh={state.refresh}>
    <ReportFilters draft={state.filters.draft} single={single} pending={state.pending} busy={state.loading || generating}
      onDraft={state.setDraft} onApply={state.apply} onReset={state.reset} />
    {report && <View className="mt-4 gap-2">
      <View accessibilityLiveRegion="polite" className="gap-1 rounded-control bg-accent-soft p-3">
        <Text className=" type-helper text-brand">{t(state.pending ? single ? 'financial.unchangedDate' : 'financial.unchanged' : single ? 'financial.appliedDate' : 'financial.applied')}</Text>
        <Text className=" type-button-cta text-brand">{periodLabel(report.selection, single)}</Text>
      </View>
      <Text className=" type-helper leading-4 text-text-secondary">{t('financial.lastUpdated', { date: reportTimestamp(report.generatedAt) })}{'\n'}{t('financial.refreshHint')}</Text>
    </View>}
    <View className="mt-8">
      {state.error ? <EmptyState title={t('financial.loadFailed')} description={t('financial.refreshHint')} action={t('financial.refresh')} onAction={state.refresh} /> : state.loading ? <Skeleton label={title}><View className="gap-4"><SkeletonBar height={180} /><SkeletonBar height={100} /></View></Skeleton> : report && <>
        {!report.hasActivity && <View className="mb-5"><EmptyState title={t('financial.empty')} description={t('financial.emptyHint')} /></View>}
        <ReportContent report={report} />
      </>}
    </View>
    <View className="flex-1" />
    <View className="mt-14 gap-3">
      {feedback && <Text accessibilityLiveRegion="polite" className="rounded-control p-3 type-micro-caption leading-[18px] text-text-secondary bg-accent-soft">{t(feedback === 'print-dialog' ? 'financial.printReady' : 'financial.cancelled')}</Text>}
      <Button disabled={!report || state.loading || state.error || generating} onPress={() => { setConfirm(true); setExportError(false); setFeedback(null); }}>{t('financial.downloadPdf')}</Button>
    </View>
    <MotionModal visible={confirm} onRequestClose={cancel} onHidden={afterConfirmationHidden} backdropColor={quickAddColors.backdrop}>
      <SafeAreaView className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <View accessibilityViewIsModal onAccessibilityEscape={cancel} className="w-full max-w-[412px] self-center rounded-control bg-white p-5">
            <View className="mb-3 flex-row items-center gap-2 border-b border-outline pb-3 pr-8">
              <View className="h-8 w-8 items-center justify-center rounded-pill bg-accent-soft"><PosIcon name="financial" size={20} color={tokens.color.darkNavy} /></View>
              <Text accessibilityRole="header" className="flex-1 type-list-financial text-brand">{t('financial.downloadTitle', { report: title })}</Text>
              <IconButton accessibilityLabel={t('common.close')} disabled={generating} onPress={cancel} className="absolute -right-3 -top-3" icon={({ color }) => <PosIcon name="close" size={18} color={color} />} />
            </View>
            <Text className="mb-5 type-micro-financial-rate leading-[22px] text-text-primary">{t('financial.downloadMessage')}</Text>
            {exportError && <Text accessibilityRole="alert" className="mb-4 type-micro-caption text-error-base">{t('financial.failed')}</Text>}
            <ConfirmationActions destructive={false} cancelVariant="secondary" busy={generating}
              confirmLabel={t(generating ? 'financial.generating' : 'financial.download')} cancelLabel={t('common.cancel')}
              onConfirm={download} onCancel={cancel} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </MotionModal>
    <MotionModal visible={!!successEvent} onRequestClose={() => setSuccessEvent(null)} backdropColor={quickAddColors.backdrop}>
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          <SuccessContent testID="financial-export-success" title={t('financial.pdfDownloaded')} value={title}
            message={t('financial.pdfDownloadedMessage', { report: title })} eventKey={successEvent ?? ''}
            visible={!!successEvent} onClose={() => setSuccessEvent(null)} />
        </ScrollView>
      </SafeAreaView>
    </MotionModal>
  </FinancialFrame>;
}
