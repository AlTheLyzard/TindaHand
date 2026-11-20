import type { ScrollViewInstance } from 'react-native';
import { MotionContent } from '@/components/ui/motion-content';
import { FocusRise } from '@/components/ui/focus-rise';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { useTranslation } from '@/i18n/use-translation';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BestSellersCard, CashCard, RecentActivityCard, SalesCard, StockCard } from '@/components/dashboard/dashboard-cards';
import { MainHeader } from '@/components/dashboard/main-header';
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
  // TODO(backend): Replace the decorative growth series and demo comparison with confirmed analytics.
  // - Method/Action: GET / Fetch sales growth series and comparison summary
  // - Expected Input/Payload: Selected period, comparison window, timezone, and authenticated store session
  // - Expected Response: GrowthMetrics and matching summary with the same reporting window
  // - UI State to Wire: Show a true empty state or server error instead of demo trend data
  const growthMetrics = summary.saleCount > 0 && period === growthPreview.reportingPeriod ? { ...growthPreview, percentageChange: summary.growth } : null;
  const [todayDate] = useState(() => new Date());
  const dateOptions = { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' } as const;
  const today = todayDate.toLocaleDateString(getLocaleFormats().date, dateOptions);
  function unavailable(feature: NavigationLabelKey) {
    setNotice(feature);
  }
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: tokens.color.appBackground }}>
    <MainHeader />
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
          <FocusRise index={0} testID="dashboard-card-cash">
            <CashCard summary={summary} loading={preview.loading} onCashAction={() => { preview.reset(); dismissCashToast(); setCashOpen(true); }} />
          </FocusRise>
          <FocusRise index={1} testID="dashboard-card-sales">
            <SalesCard summary={summary} period={period} onPeriod={setPeriod} growthMetrics={growthMetrics} loading={preview.loading} empty={summary.saleCount === 0} />
          </FocusRise>
          <FocusRise index={2} testID="dashboard-card-stock">
            <StockCard summary={{ ...summary, outOfStock: stock.out, lowStock: stock.low + stock.critical }} loading={preview.loading} empty={preview.empty || !products.length} onInventory={() => { preview.reset(); router.navigate('/owner-inventory'); }} onSelect={status => router.navigate({ pathname: '/owner-inventory', params: { status } })} />
          </FocusRise>
          <FocusRise index={3} testID="dashboard-card-best-sellers">
            <BestSellersCard summary={summarizeDashboard('daily', data)} products={products} loading={preview.loading} onBrowse={() => { preview.reset(); router.navigate('/owner-pos'); }} />
          </FocusRise>
          <FocusRise index={4} testID="dashboard-card-activity">
            <RecentActivityCard activity={[...quickActivity, ...data.activity]} loading={preview.loading} onViewAll={() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'transaction-history' } })} />
          </FocusRise>
        </MotionContent>
      </View>
    </ScrollView>
    <DashboardNavigation onHome={() => scroll.current?.scrollTo({ y: 0, animated: true })} onPos={() => router.navigate('/owner-pos')} onUnavailable={unavailable} />
    <DashboardQuickAdd onSelect={action => { preview.reset(); setQuickKind(action === 'dashboard.quick.customerDebt' ? 'customerDebt' : action === 'dashboard.quick.storeDebt' ? 'storeDebt' : 'expense'); }} />
    {quickKind && <QuickAddModal initialKind={quickKind} onClose={() => setQuickKind(null)} />}
    {cashToastExpiresAt !== null && <RegistrationToast expiresAt={cashToastExpiresAt} onDismiss={dismissCashToast} title="Amount Saved!" message="Cash added successfully." />}
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
