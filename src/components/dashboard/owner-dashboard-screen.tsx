import { FocusRise } from '@/components/ui/focus-rise';
import { MotionContent } from '@/components/ui/motion-content';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { useTranslation } from '@/i18n/use-translation';
import { Image as BackgroundImage } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import type { ScrollViewInstance } from 'react-native';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RegistrationToast } from '@/components/auth/registration-toast';
import { AddCashModal } from '@/components/dashboard/add-cash-modal';
import { BestSellersCard, CashCard, RecentActivityCard, SalesCard, StockCard } from '@/components/dashboard/dashboard-cards';
import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { DashboardQuickAdd, type QuickAddAction } from '@/components/dashboard/dashboard-quick-add';
import { MainHeader } from '@/components/dashboard/main-header';
import { QuickAddModal } from '@/components/dashboard/quick-add-modal';
import { Button } from '@/components/ui/button';
import { useContentPreview } from '@/components/ui/content-state';
import tokens from '@/constants/design-tokens.json';
import { emptyDashboardDemo } from '@/data/content-preview';
import { getLocaleFormats, type NavigationLabelKey } from '@/i18n';
import type { CashMovement, DashboardSummary } from '@/services/dashboard';
import { getCashMovements, getDashboardData, getDashboardSummary } from '@/services/dashboard';
import { getTransactions } from '@/services/transactions';
import type { TransactionRecord } from '@/types/transactions';
import { useCashRegister } from '@/state/cash-register';
import { useInventory } from '@/state/inventory';
import { useNavigationHeight } from '@/state/navigation-motion';
import { useQuickAdd } from '@/state/quick-add';
import type { OwnerIdentity } from '@/types/auth';
import type { DashboardActivity, SalesPeriod } from '@/types/dashboard';
import type { QuickAddKind } from '@/types/quick-add';
import { quickAddDashboardActivity, summarizeDashboard } from '@/utils/dashboard';
import { inventorySummary, todayInManila } from '@/utils/inventory';
import { isInitialSaleReceipt } from '@/utils/transactions';

export function OwnerDashboardScreen({ owner, onLogout }: { owner: OwnerIdentity; onLogout?: () => void }) {
  const { store: { products, pos } } = useInventory();
  const preview = useContentPreview();
  const data = preview.empty ? emptyDashboardDemo : getDashboardData(pos?.sales ?? []);

  // ── Real backend dashboard data ──────────────────────────────────────────
  const [apiSummary, setApiSummary] = useState<DashboardSummary | null>(null);
  const [apiMovements, setApiMovements] = useState<CashMovement[] | null>(null);
  const [apiActivity, setApiActivity] = useState<TransactionRecord[] | null>(null);
  const [apiLoading, setApiLoading] = useState(owner.mode === 'confirmed');

  const refreshDashboard = useCallback(() => {
    if (owner.mode !== 'confirmed') return;
    setApiLoading(true);
    Promise.allSettled([getDashboardSummary(), getCashMovements(), getTransactions({ })])
      .then(([summaryResult, movementsResult, activityResult]) => {
        if (summaryResult.status === 'fulfilled') setApiSummary(summaryResult.value);
        if (movementsResult.status === 'fulfilled') setApiMovements(movementsResult.value);
        if (activityResult.status === 'fulfilled') setApiActivity(activityResult.value);
        setApiLoading(false);
      });
  }, [owner.mode]);

  // Re-fetch every time the dashboard comes back into focus (e.g. after a POS sale)
  useFocusEffect(
    useCallback(() => {
      refreshDashboard();
    }, [refreshDashboard])
  );

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

  // Use summarizeDashboard for local/mock data, but override specific fields
  // with real backend numbers when available.
  const localSummary = summarizeDashboard(period, data, preview.empty ? 0 : addedCentavos);

  // Derive moneyIn / moneyOut from real cash movements when available.
  // Positive amounts = cash added (money in); backend only records additions.
  const apiMoneyIn = apiMovements
    ? apiMovements.reduce((sum, m) => sum + Math.max(0, m.amountCentavos), 0)
    : null;
  const apiMoneyOut = apiMovements
    ? apiMovements.reduce((sum, m) => sum + Math.max(0, -m.amountCentavos), 0)
    : null;

  const summary = apiSummary && owner.mode === 'confirmed' ? {
    ...localSummary,
    // Cash balance comes directly from the backend (includes opening cash + cash movements + sales tenders)
    cashCentavos: apiSummary.cashBalanceCentavos,
    // Money In = manual cash additions + all sales revenue
    moneyIn: (apiMoneyIn ?? 0) + apiSummary.totalSalesCentavos,
    moneyOut: apiSummary.totalMoneyOutCentavos,
    // Sales totals per period — all three now come from the backend
    totalSalesCentavos: period === 'daily'
      ? apiSummary.totalSalesTodayCentavos
      : period === 'weekly'
        ? apiSummary.totalSalesThisWeekCentavos
        : apiSummary.totalSalesThisMonthCentavos,
    // Best sellers from the backend top-K algorithm (quantitySold maps to quantity)
    bestSellers: apiSummary.topProducts.map(p => ({ id: p.productId, name: p.name, quantity: p.quantitySold })),
  } : localSummary;

  const isLoading = preview.loading || apiLoading;
  const stock = inventorySummary(preview.empty ? [] : products, todayInManila());
  const [todayDate] = useState(() => new Date());
  const dateOptions = { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' } as const;
  const today = todayDate.toLocaleDateString(getLocaleFormats().date, dateOptions);
  function unavailable(feature: NavigationLabelKey) {
    setNotice(feature);
  }
  return <View style={{ flex: 1, backgroundColor: tokens.color.appBackground }}>
    <BackgroundImage source={require('@/assets/images/auth/background.png')} contentFit="fill" style={StyleSheet.absoluteFill} accessible={false} />
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
    <MainHeader onLogoPress={() => { scroll.current?.scrollTo({ y: 0, animated: true }); refreshDashboard(); }} />
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: navigationHeight + insets.bottom + tokens.spacing.three + 56 + tokens.spacing.three }}>
      <View className="w-full max-w-[460px] self-center" style={{ paddingHorizontal: width < 360 ? 16 : 24, paddingTop: tokens.spacing.headerTitleGap }}>
        <Text accessibilityRole="header" className="type-h1-display text-brand">{t('navigation.dashboard')}</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          <Text className="rounded-pill bg-accent-soft px-2 py-1 type-micro-caption text-text-primary">{t('roles.owner')}</Text>
          <Text className="rounded-pill bg-accent-soft px-2 py-1 type-micro-caption text-text-primary">{t('dashboard.identity', { id: owner.id, date: today })}</Text>
        </View>
        {owner.mode !== 'confirmed' && <Text accessibilityRole="alert" className="mb-4 mt-3 type-helper leading-[15px] text-text-secondary">{owner.mode === 'mock' ? t('auth.mock.session') : owner.mode === 'preview' ? t('dashboard.preview') : ''}{t('dashboard.demoDisclosure', { date: new Date(getDashboardData().asOf).toLocaleDateString(getLocaleFormats().date, dateOptions) })}</Text>}
        {onLogout && owner.mode !== 'confirmed' && <View className="mb-4"><Button variant="secondary" onPress={onLogout}>{t('auth.mock.logout')}</Button></View>}
        <MotionContent changeKey={preview.mode} className="gap-card-gap" style={{ marginTop: tokens.spacing.four }}>
          {preview.control}
          <FocusRise index={0} testID="dashboard-card-cash">
            <CashCard summary={summary} loading={isLoading} onCashAction={() => { preview.reset(); dismissCashToast(); setCashOpen(true); }} />
          </FocusRise>
          <FocusRise index={1} testID="dashboard-card-sales">
            <SalesCard summary={summary} period={period} onPeriod={setPeriod} loading={isLoading} />
          </FocusRise>
          <FocusRise index={2} testID="dashboard-card-stock">
            <StockCard summary={{ ...summary, outOfStock: stock.out, lowStock: stock.low + stock.critical }} loading={isLoading} empty={preview.empty || !products.length} onInventory={() => { preview.reset(); router.navigate('/owner-inventory'); }} onSelect={status => router.navigate({ pathname: '/owner-inventory', params: { status } })} />
          </FocusRise>
          <FocusRise index={3} testID="dashboard-card-best-sellers">
            <BestSellersCard summary={summary} loading={isLoading} onBrowse={() => { preview.reset(); router.navigate('/owner-pos'); }} />
          </FocusRise>
          <FocusRise index={4} testID="dashboard-card-activity">
            <RecentActivityCard
              activity={
                apiActivity && owner.mode === 'confirmed'
                  ? apiActivity.slice(0, 20).map((t): DashboardActivity => ({
                      id: t.id,
                      kind: t.type === 'sale' ? 'sale'
                          : t.type === 'customerPayment' ? 'payment'
                          : t.type === 'expense' ? 'expense'
                          : t.type === 'supplierPayment' ? 'storeDebt'
                          : t.type === 'customerDebt' ? 'customerDebt'
                          : 'payment',
                      direction: t.direction,
                      label: t.description,
                      occurredAt: t.occurredAt,
                      amountCentavos: t.amountCentavos,
                    }))
                  : [...quickActivity, ...data.activity]
              }
              loading={isLoading}
              onViewAll={() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'transaction-history' } })}
            />
          </FocusRise>
        </MotionContent>
      </View>
    </ScrollView>
    <DashboardNavigation onHome={() => { scroll.current?.scrollTo({ y: 0, animated: true }); refreshDashboard(); }} onPos={() => router.navigate('/owner-pos')} onUnavailable={unavailable} />
    <DashboardQuickAdd onSelect={action => { preview.reset(); setQuickKind(action === 'dashboard.quick.customerDebt' ? 'customerDebt' : action === 'dashboard.quick.storeDebt' ? 'storeDebt' : 'expense'); }} />
    {quickKind && <QuickAddModal initialKind={quickKind} onClose={() => setQuickKind(null)} />}
    {cashToastExpiresAt !== null && <RegistrationToast expiresAt={cashToastExpiresAt} onDismiss={dismissCashToast} title="Amount Saved!" message="Cash added successfully." />}
    {cashOpen && <AddCashModal onClose={() => setCashOpen(false)} onSaved={() => { setCashOpen(false); setCashToastExpiresAt(Date.now() + 15000); refreshDashboard(); }} />}
    <Modal visible={!!notice} onRequestClose={() => setNotice(null)}>
      <View className="flex-1 items-center justify-center px-6">
        <View accessibilityViewIsModal className="w-full max-w-[412px] gap-4 rounded-card bg-white p-6">
          <Text accessibilityRole="header" className=" type-h3-heading text-brand">{t('dashboard.comingSoon')}</Text>
          <Text accessibilityRole="alert" className=" type-micro-financial-rate leading-[21px] text-text-secondary">{notice?.startsWith('dashboard.quick.') ? t('dashboard.quick.unavailable', { feature: t(notice) })
            : notice ? t('dashboard.unavailable', { feature: t(notice) }) : ''}</Text>
          <Button onPress={() => setNotice(null)}>{t('common.close')}</Button>
        </View>
      </View>
    </Modal>
    </SafeAreaView>
  </View>;
}

