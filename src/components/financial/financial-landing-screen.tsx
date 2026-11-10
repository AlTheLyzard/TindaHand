import { Image } from 'expo-image';
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
  { kind: 'general-journal', description: 'financial.journal.description', icon: require('@/assets/images/financial/journal.svg') },
  { kind: 'general-ledger', description: 'financial.ledger.description', icon: require('@/assets/images/financial/ledger.svg') },
  { kind: 'income-statement', description: 'financial.income.description', icon: require('@/assets/images/financial/income.svg') },
  { kind: 'balance-sheet', description: 'financial.balance.description', icon: require('@/assets/images/financial/balance.svg') },
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
    <Text className="-mt-4 mb-10 font-poppins text-[12px] leading-[18px] text-text-secondary">{t('financial.subtitle')}</Text>
    <View className="gap-4">{cards.map(card => <MotionPressable key={card.kind} accessibilityRole="button" accessibilityLabel={reportTitles[card.kind]}
      onPress={() => router.navigate(`${financialRoot}/${card.kind}`)} fadeOnPress={false}
      onPressIn={() => setPressedCard(card.kind)} onPressOut={() => setPressedCard(null)}
      className="min-h-[94px] flex-row items-center gap-4 rounded-card border border-[#B0C8E3] bg-white px-4 py-4 active:bg-[#D9E7F4]">
      <View className="h-12 w-12 items-center justify-center rounded-pill" style={{ backgroundColor: pressedCard === card.kind ? '#112F6F' : '#F0F8FF' }}><Image source={card.icon} tintColor={pressedCard === card.kind ? '#FFFFFF' : '#245399'} contentFit="contain" style={{ width: 24, height: 24 }} accessible={false} /></View>
      <View className="min-w-0 flex-1 gap-1"><Text className="font-poppins-bold text-[14px] leading-[21px] text-brand">{reportTitles[card.kind]}</Text><Text className="font-poppins text-[10px] leading-[15px] text-text-secondary">{t(card.description)}</Text></View>
      <PosIcon name="chevronRight" size={18} color="#0C1B3C" />
    </MotionPressable>)}</View>
    <View className="mt-6">
      {failed ? <EmptyState title={t('financial.loadFailed')} description={t('financial.mock')} action={t('financial.refresh')} onAction={() => setRevision(value => value + 1)} /> : status ? <View className="gap-2 rounded-control border border-[#36843B] bg-[#E8F5E9] p-4">
        <View className="flex-row items-center gap-2"><PosIcon name="checkCircle" size={20} color="#36843B" /><Text className="font-poppins-bold text-[12px] text-[#21642C]">{t('financial.updated')}</Text></View>
        <Text className="font-poppins text-[10px] text-[#21642C]">{t('financial.lastUpdated', { date: reportTimestamp(status.updatedAt) })}</Text>
      </View> : <Skeleton><SkeletonBar height={70} /></Skeleton>}
    </View>
    <Text className="mb-14 mt-3 font-poppins text-[10px] text-text-secondary">{t('financial.mock')}</Text>
  </FinancialFrame>;
}
