import type { ScrollViewInstance } from 'react-native';
import { MotionContent } from '@/components/ui/motion-content';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { useTranslation } from '@/i18n/use-translation';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Image, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BestSellersCard, CashCard, RecentActivityCard, SalesCard, StockCard } from '@/components/dashboard/dashboard-cards';
import { DashboardAction, DashboardCircle, DashboardIcon, dashboardIcons } from '@/components/dashboard/dashboard-ui';
import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { DashboardQuickAdd, type QuickAddAction } from '@/components/dashboard/dashboard-quick-add';
import { Button } from '@/components/ui/button';
import tokens from '@/constants/design-tokens.json';
import { getDashboardData } from '@/services/dashboard';
import { growthPreview } from '@/data/growth-preview';
import { useNavigationHeight } from '@/state/navigation-motion';
import { getLocaleFormats, type NavigationLabelKey } from '@/i18n';
import type { OwnerIdentity } from '@/types/auth';
import type { DashboardActivity, SalesPeriod } from '@/types/dashboard';
import { quickAddDashboardActivity, summarizeDashboard } from '@/utils/dashboard';
import { useInventory } from '@/state/inventory';
import { inventorySummary, todayInManila } from '@/utils/inventory';
import { useContentPreview } from '@/components/ui/content-state';
import { emptyDashboardDemo } from '@/data/content-preview';
import { AddCashModal } from '@/components/dashboard/add-cash-modal';
import { RegistrationToast } from '@/components/auth/registration-toast';
import { useCashRegister } from '@/state/cash-register';
import { useQuickAdd } from '@/state/quick-add';
import { isInitialSaleReceipt } from '@/utils/transactions';
import { QuickAddModal } from '@/components/dashboard/quick-add-modal';
import type { QuickAddKind } from '@/types/quick-add';

export function OwnerDashboardScreen({ owner, onLogout }: { owner: OwnerIdentity; onLogout?: () => void }) {
  const { store: { products, pos } } = useInventory();
  const preview = useContentPreview();
  const data = preview.empty ? emptyDashboardDemo : getDashboardData(pos?.sales ?? []);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigationHeight = useNavigationHeight();
  const [period, setPeriod] = useState<SalesPeriod>('daily');
  const [notice, setNotice] = useState<NavigationLabelKey | QuickAddAction | null>(null);
  const [cashOpen, setCashOpen] = useState(false);
  const [quickKind, setQuickKind] = useState<QuickAddKind | null>(null);
  const quickAdd = useQuickAdd();
  const quickActivity: DashboardActivity[] = preview.empty ? [] : [
    ...quickAddDashboardActivity(quickAdd.records),
    ...quickAdd.receivablePayments.filter(payment => !isInitialSaleReceipt(payment, quickAdd.records, pos?.sales ?? [])).map((payment): DashboardActivity => ({ id: payment.id, kind: 'payment', direction: 'in', label: 'Customer payment', occurredAt: payment.occurredAt, amountCentavos: payment.amountCentavos })),
    ...quickAdd.payables.payments.map((payment): DashboardActivity => ({ id: payment.id, kind: 'payment', direction: 'out', label: 'Store debt payment', occurredAt: payment.occurredAt, amountCentavos: payment.amountCentavos })),
  ];
  const [cashToastExpiresAt, setCashToastExpiresAt] = useState<number | null>(null);
  const dismissCashToast = useCallback(() => setCashToastExpiresAt(null), [setCashToastExpiresAt]);
  const { addedCentavos } = useCashRegister();
  const scroll = useRef<ScrollViewInstance>(null);
  const summary = summarizeDashboard(period, data, preview.empty ? 0 : addedCentavos);
  const stock = inventorySummary(preview.empty ? [] : products, todayInManila());
  // TODO(BACKEND): Replace growthPreview and the demo summary percentage together
  // with validated GrowthMetrics: source, reportingPeriod, metric, unit,
  // ordered points [{ timestamp (ISO), metricValue (integer centavos) }], and
  // percentageChange (number | null) for that same period and comparison window.
  // Never mix real percentages with placeholder history. No endpoint is defined yet.
  // See docs/api-contract.md#dashboard for the proposed display contract.
  const growthMetrics = summary.saleCount > 0 && period === growthPreview.reportingPeriod ? { ...growthPreview, percentageChange: summary.growth } : null;
  const [todayDate] = useState(() => new Date());
  const dateOptions = { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' } as const;
  const today = todayDate.toLocaleDateString(getLocaleFormats().date, dateOptions);
  function unavailable(feature: NavigationLabelKey) {
    setNotice(feature);
  }
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#F0F8FF' }}>
    <View className="border-b border-[#ADC9EE] bg-white">
      <View className="w-full max-w-[460px] flex-row items-center gap-2 self-center px-5 py-2">
        <Image source={require('@/assets/images/brand/tindahand-mark.png')} style={{ width: 32, height: 34 }} resizeMode="contain" accessible={false} />
        <Text className="flex-1 font-poppins-bold text-[20px] leading-[30px] text-brand">TindaHand</Text>
        <DashboardAction label={t('navigation.settings')} onPress={() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'settings' } })}><DashboardIcon source={dashboardIcons.settings} size={26} /></DashboardAction>
        <DashboardAction label={t('navigation.profile')} onPress={() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'profile' } })}>
          <DashboardCircle><Text className="font-poppins-bold text-[14px] text-action">{owner.name.trim().charAt(0).toUpperCase()}</Text></DashboardCircle>
        </DashboardAction>
      </View>
    </View>
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: navigationHeight + insets.bottom + tokens.spacing.three + 56 + tokens.spacing.three }}>
      <View className="w-full max-w-[460px] self-center pt-4" style={{ paddingHorizontal: width < 360 ? 16 : 24 }}>
        <Text accessibilityRole="header" className="font-poppins-bold text-[22px] leading-[33px] text-[#28549A]">{t('dashboard.greeting', { name: owner.name.trim().split(/\s+/)[0] })}</Text>
        <View className="mt-0.5 flex-row flex-wrap gap-2">
          <Text className="rounded-pill bg-[#D1E2F8] px-2 py-1 font-poppins text-[10px] leading-[15px] text-[#102342]">{t('roles.owner')}</Text>
          <Text className="rounded-pill bg-[#D1E2F8] px-2 py-1 font-poppins text-[10px] leading-[15px] text-[#102342]">{t('dashboard.identity', { id: owner.id, date: today })}</Text>
        </View>
        <Text accessibilityRole="alert" className="mb-4 mt-3 font-poppins text-[10px] leading-[15px] text-text-secondary">{owner.mode === 'mock' ? t('auth.mock.session') : owner.mode === 'preview' ? t('dashboard.preview') : ''}{t('dashboard.demoDisclosure', { date: new Date(getDashboardData().asOf).toLocaleDateString(getLocaleFormats().date, dateOptions) })}</Text>
        {onLogout && <View className="mb-4"><Button variant="secondary" onPress={onLogout}>{t('auth.mock.logout')}</Button></View>}
        <MotionContent changeKey={preview.mode} className="gap-card-gap">
          {preview.control}
          <CashCard summary={summary} loading={preview.loading} onCashAction={() => { preview.reset(); dismissCashToast(); setCashOpen(true); }} />
          <SalesCard summary={summary} period={period} onPeriod={setPeriod} growthMetrics={growthMetrics} loading={preview.loading} empty={summary.saleCount === 0} />
          <StockCard summary={{ ...summary, outOfStock: stock.out, lowStock: stock.low + stock.critical }} loading={preview.loading} empty={preview.empty || !products.length} onInventory={() => { preview.reset(); router.navigate('/owner-inventory'); }} onSelect={status => router.navigate({ pathname: '/owner-inventory', params: { status } })} />
          <BestSellersCard summary={summarizeDashboard('daily', data)} products={products} loading={preview.loading} onBrowse={() => { preview.reset(); router.navigate('/owner-pos'); }} />
          <RecentActivityCard activity={[...quickActivity, ...data.activity]} loading={preview.loading} onViewAll={() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'transaction-history' } })} />
        </MotionContent>
      </View>
    </ScrollView>
    <DashboardNavigation onHome={() => scroll.current?.scrollTo({ y: 0, animated: true })} onPos={() => router.navigate('/owner-pos')} onUnavailable={unavailable} />
    <DashboardQuickAdd onSelect={action => { preview.reset(); setQuickKind(action === 'dashboard.quick.customerDebt' ? 'customerDebt' : action === 'dashboard.quick.storeDebt' ? 'storeDebt' : 'expense'); }} />
    {quickKind && <QuickAddModal initialKind={quickKind} onClose={() => setQuickKind(null)} />}
    {cashToastExpiresAt !== null && <View pointerEvents="box-none" className="absolute left-0 right-0 items-center px-4" style={{ top: insets.top + 56 }}>
      <View pointerEvents="box-none" className="w-full max-w-[460px]"><RegistrationToast expiresAt={cashToastExpiresAt} onDismiss={dismissCashToast} title="Amount Saved!" message="Cash has been added successfully." /></View>
    </View>}
    {cashOpen && <AddCashModal onClose={() => setCashOpen(false)} onSaved={() => { setCashOpen(false); setCashToastExpiresAt(Date.now() + 15000); }} />}
    <Modal visible={!!notice} onRequestClose={() => setNotice(null)}>
      <View className="flex-1 items-center justify-center px-6">
        <View accessibilityViewIsModal className="w-full max-w-[412px] gap-4 rounded-card bg-white p-6">
          <Text accessibilityRole="header" className="font-poppins-bold text-[18px] text-brand">{t('dashboard.comingSoon')}</Text>
          <Text accessibilityRole="alert" className="font-poppins text-[14px] leading-[21px] text-text-secondary">{notice?.startsWith('dashboard.quick.') ? t('dashboard.quick.unavailable', { feature: t(notice) })
            : notice ? t('dashboard.unavailable', { feature: t(notice) }) : ''}</Text>
          <Button onPress={() => setNotice(null)}>{t('common.close')}</Button>
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}
