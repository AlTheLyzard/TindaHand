import tokens from '@/constants/design-tokens.json';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { FinancialFrame, financialRoot } from './financial-frame';
import { PosIcon } from '@/components/pos/pos-icon';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { EmptyState, Skeleton, SkeletonBar } from '@/components/ui/content-state';
import { useTranslation } from '@/i18n/use-translation';
import { financialRepository } from '@/services/financial';
import { useAuthFlow } from '@/state/auth-flow';
import { reportTimestamp, reportTitles } from '@/utils/financial';

const cards = [
  { kind: 'general-journal', description: 'financial.journal.description', icon: 'book' },
  { kind: 'general-ledger', description: 'financial.ledger.description', icon: 'history' },
  { kind: 'income-statement', description: 'financial.income.description', icon: 'financial' },
  { kind: 'balance-sheet', description: 'financial.balance.description', icon: 'creditCard' },
] as const;
export function FinancialLandingScreen() {
  const { t } = useTranslation();
  const { owner } = useAuthFlow();
  const [status, setStatus] = useState<{ updatedAt: string; storeName: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [pressedCard, setPressedCard] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void financialRepository.getStatus(owner).then(value => { if (active) { setStatus(value); setFailed(false); } }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [owner, revision]);
  return <FinancialFrame title={t('financial.title')} landing onRefresh={() => setRevision(value => value + 1)}>
    <Text className="-mt-4 mb-10 type-micro-caption leading-[18px] text-text-secondary">{t('financial.subtitle')}</Text>
    <View className="gap-4">{cards.map(card => <MotionPressable key={card.kind} accessibilityRole="button" accessibilityLabel={reportTitles[card.kind]}
      onPress={() => router.navigate(`${financialRoot}/${card.kind}`)} fadeOnPress={false}
      onPressIn={() => setPressedCard(card.kind)} onPressOut={() => setPressedCard(null)}
      className="min-h-[94px] flex-row items-center gap-4 rounded-card border border-outline bg-white px-4 py-4 active:bg-ice-container">
      <View className="h-12 w-12 items-center justify-center rounded-pill" style={{ backgroundColor: pressedCard === card.kind ? tokens.color.darkNavy : tokens.color.appBackground }}><PosIcon name={card.icon} size={24} color={pressedCard === card.kind ? tokens.color.surfaceCard : tokens.color.royalBlue} /></View>
      <View className="min-w-0 flex-1 gap-1"><Text className=" type-button-cta leading-[21px] text-brand">{reportTitles[card.kind]}</Text><Text className=" type-helper leading-[15px] text-text-secondary">{t(card.description)}</Text></View>
      <PosIcon name="chevronRight" size={18} color={tokens.color.textPrimary} />
    </MotionPressable>)}</View>
    <View className="mt-6">
      {failed ? <EmptyState title={t('financial.loadFailed')} description={t('financial.mock')} action={t('financial.refresh')} onAction={() => setRevision(value => value + 1)} /> : status ? <View className="gap-2 rounded-control border border-success-base bg-success-tint p-4">
        <View className="flex-row items-center gap-2"><PosIcon name="checkCircle" size={20} color={tokens.color.successBase} /><Text className=" type-label-nav text-success-base">{t('financial.updated')}</Text></View>
        <Text className=" type-helper text-success-base">{t('financial.lastUpdated', { date: reportTimestamp(status.updatedAt) })}</Text>
      </View> : <Skeleton><SkeletonBar height={70} /></Skeleton>}
    </View>
    <Text className="mb-14 mt-3 type-helper text-text-secondary">{t('financial.mock')}</Text>
  </FinancialFrame>;
}
