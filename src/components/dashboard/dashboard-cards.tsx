import { Button } from '@/components/ui/button';
import { MotionPressable as Pressable } from "@/components/ui/motion-pressable";
import { useTranslation } from "@/i18n/use-translation";
import { Image, Text, View, useWindowDimensions } from "react-native";
import { useState } from 'react';

import { ActivityTile } from "@/components/dashboard/activity-tile";
import {
  DashboardCard,
  DashboardCircle,
  DashboardIcon,
  dashboardIcons,
} from "@/components/dashboard/dashboard-ui";
import { GrowthSparkline } from "@/components/dashboard/growth-sparkline";
import { PosIcon } from "@/components/pos/pos-icon";
import {
  EmptyState,
  LoadingSlot,
  Skeleton,
  SkeletonBar,
} from "@/components/ui/content-state";
import tokens from "@/constants/design-tokens.json";
import { getLocaleFormats } from "@/i18n";
import type {
  DashboardActivity,
  GrowthMetrics,
  SalesPeriod,
} from "@/types/dashboard";
import { formatActivityAmount, formatPesos, recentDashboardActivity, summarizeDashboard } from "@/utils/dashboard";
import type { ReactNode } from "react";
import type { InventoryProduct } from '@/types/inventory';
import { dashboardDemo } from '@/data/dashboard';

type Summary = ReturnType<typeof summarizeDashboard>;

function Metric({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return loading ? (
    <Skeleton>
      <LoadingSlot loading>{children}</LoadingSlot>
    </Skeleton>
  ) : (
    <>{children}</>
  );
}

export function CashCard({
  summary,
  loading = false,
  onCashAction,
}: {
  summary: Summary;
  loading?: boolean;
  onCashAction: () => void;
}) {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  return (
    <View className="rounded-card bg-[#28549A] px-5 py-4">
      <View className="flex-row items-center gap-3">
        <DashboardIcon source={dashboardIcons.money} size={40} />
        <Text
          accessibilityRole="header"
          className="flex-shrink font-poppins-bold text-[18px] leading-[27px] text-white"
        >
          {t("dashboard.cashTitle")}
        </Text>
      </View>
      <View className="mb-4 mt-3 flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Metric loading={loading}>
            <Text className="font-poppins-bold text-[30px] leading-[45px] text-white">
              {formatPesos(summary.cashCentavos)}
            </Text>
          </Metric>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("dashboard.cashAction")}
          accessibilityHint="Opens the Add Cash to Register form."
          accessibilityState={{ disabled: loading }}
          disabled={loading}
          onPress={onCashAction}
          className="min-h-12 min-w-12 items-center justify-center rounded-pill "
        >
          <DashboardCircle
            size={32}
            backgroundColor={tokens.color.primaryDisabled}
          >
            <PosIcon name="plus" size={24} color="#112F6F" active />
          </DashboardCircle>
        </Pressable>
      </View>
      <View style={{ flexDirection: fontScale > 1.3 ? 'column' : 'row', gap: 12 }}>
        <View className="min-w-0 flex-1 rounded-surface bg-[#E6F5E9] p-3">
          <Text className="font-poppins text-[12px] leading-[18px] text-[#21642C]">
            {t("dashboard.income")}
          </Text>
          <Metric loading={loading}>
            <Text className="mt-2 font-poppins-bold text-[16px] leading-6 text-[#21642C]">
              +{formatPesos(summary.moneyIn)}
            </Text>
          </Metric>
        </View>
        <View className="min-w-0 flex-1 rounded-surface bg-[#FDEDEF] p-3">
          <Text className="font-poppins text-[12px] leading-[18px] text-[#AB2025]">
            {t("dashboard.expenses")}
          </Text>
          <Metric loading={loading}>
            <Text className="mt-2 font-poppins-bold text-[16px] leading-6 text-[#AB2025]">
              −{formatPesos(summary.moneyOut)}
            </Text>
          </Metric>
        </View>
      </View>
    </View>
  );
}

const periods = [
  ["daily", "dashboard.period.daily"],
  ["weekly", "dashboard.period.weekly"],
  ["monthly", "dashboard.period.monthly"],
] as const;

export function SalesCard({
  summary,
  period,
  onPeriod,
  growthMetrics,
  loading = false,
  empty = false,
}: {
  summary: Summary;
  period: SalesPeriod;
  onPeriod: (period: SalesPeriod) => void;
  growthMetrics: GrowthMetrics | null;
  loading?: boolean;
  empty?: boolean;
}) {
  const { t } = useTranslation();
  const { fontScale, width } = useWindowDimensions();
  const noSales = { daily: 'No sales today', weekly: 'No sales this week', monthly: 'No sales this month' }[period];
  const metricStyle = { minHeight: 94 * Math.max(1, fontScale), paddingVertical: tokens.spacing.two, flex: 1, minWidth: 0 };
  return (
    <DashboardCard title={t("dashboard.salesTitle")}>
      <View className="mb-3 flex-row items-stretch gap-2">
        {periods.map(([value, label]) => (
          <View key={value} style={{ flex: 1, minWidth: 0 }}>
            <Metric loading={loading}>
              <Pressable disabled={loading} accessibilityRole="button" accessibilityLabel={t(label)} accessibilityState={{ selected: period === value, disabled: loading }} onPress={() => onPeriod(value)}
                style={{ minHeight: fontScale > 1.3 ? 36 * fontScale + 20 : 48, paddingHorizontal: 4, paddingVertical: 10, borderWidth: 1, borderColor: 'transparent', borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: period === value ? '#28549A' : tokens.color.surfaceSubtle }}>
                <Text className="font-poppins-bold text-[12px] leading-[18px] text-center" style={{ color: period === value ? '#FFFFFF' : '#102342' }}>{t(label)}</Text>
              </Pressable>
            </Metric>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: fontScale > 1.3 ? 'column' : 'row', gap: 12 }}>
        <View className="rounded-surface bg-canvas px-3" style={metricStyle}>
          <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">
            {t("dashboard.totalSales")}
          </Text>
          <Metric loading={loading}>
            <Text style={{ minHeight: 24 * fontScale, fontSize: width < 360 ? 14 : 16 }} className="mt-1 font-poppins-bold leading-6 text-[#102342]">
              {formatPesos(summary.totalSalesCentavos)}
            </Text>
          </Metric>
          <Metric loading={loading}>
            <View className="mt-0.5 flex-row items-start gap-1" style={{ minHeight: 30 * fontScale }}>
              <PosIcon name="cart" size={14} />
              <Text accessibilityLiveRegion="polite" className="flex-1 font-poppins text-[10px] leading-[15px] text-text-secondary">{empty ? noSales : 'Recorded sales'}</Text>
            </View>
          </Metric>
        </View>
        <View className="overflow-hidden rounded-surface bg-canvas px-3" style={metricStyle}>
          {!loading && growthMetrics && (
            <GrowthSparkline points={growthMetrics.points} />
          )}
          <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">
            {t("dashboard.growth")}
          </Text>
          <Metric loading={loading}>
            <Text className="mt-1 font-poppins-bold leading-6" style={{ minHeight: 24 * fontScale, fontSize: width < 360 ? 14 : 16, color: growthMetrics?.percentageChange == null ? '#4A607A' : growthMetrics.percentageChange < 0 ? '#AB2025' : '#21642C' }}>
              {growthMetrics?.percentageChange == null
                ? '—'
                : `${growthMetrics.percentageChange >= 0 ? "+" : ""}${growthMetrics.percentageChange}%`}
            </Text>
          </Metric>
          <Metric loading={loading}>
            <View className="mt-0.5" style={{ minHeight: 30 * fontScale }}>
              <Text className="font-poppins text-[10px] leading-[15px] text-text-secondary">
                {growthMetrics?.source === 'demo' ? t('dashboard.demoTrend') : t('dashboard.noComparison')}
              </Text>
            </View>
          </Metric>
        </View>
      </View>
    </DashboardCard>
  );
}

export function StockCard({
  summary,
  onSelect,
  loading = false,
  empty = false,
  onInventory,
}: {
  summary: Summary;
  onSelect?: (status: "out" | "low") => void;
  loading?: boolean;
  empty?: boolean;
  onInventory?: () => void;
}) {
  const { t } = useTranslation();
  const { fontScale, width } = useWindowDimensions();
  return (
    <DashboardCard title={t("dashboard.stockTitle")}>
      {!loading && empty ? (
        <EmptyState
          title="No inventory yet"
          description="Add products in Inventory to monitor their stock levels."
          action="Open Inventory"
          onAction={onInventory}
        />
      ) : (
        <View style={{ flexDirection: fontScale > 1.3 ? 'column' : 'row', gap: 12 }}>
          {[
            {
              status: "out" as const,
              label: t("dashboard.outOfStock"),
              count: summary.outOfStock,
              color: "#AB2025",
              countColor: "#AB2025",
              background: "#FDEDEF",
              border: "#CA2229",
            },
            {
              status: "low" as const,
              label: t("dashboard.lowStock"),
              count: summary.lowStock,
              color: tokens.color.warningBase,
              countColor: tokens.color.warningBase,
              background: "#FFF8E1",
              border: "#FF8514",
            },
          ].map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={
                loading
                  ? `Loading ${item.label}`
                  : `${item.label}: ${item.count}`
              }
              accessibilityState={{ disabled: loading }}
              disabled={loading}
              onPress={() => onSelect?.(item.status)}
              className="min-w-0 flex-1 rounded-surface border p-3"
              style={{
                backgroundColor: item.background,
                borderColor: item.border,
              }}
            >
              <View className="flex-row items-center gap-2" style={{ minHeight: (width < 360 ? 36 : 22) * fontScale }}>
                <DashboardCircle
                  size={tokens.size.statusIndicator}
                  backgroundColor="transparent"
                  borderColor={item.border}
                >
                  <Text
                    accessible={false}
                    allowFontScaling={false}
                    style={{
                      color: item.border,
                      fontSize: 14,
                      lineHeight: 18,
                      fontFamily: "Poppins_700Bold",
                      includeFontPadding: false,
                    }}
                  >
                    !
                  </Text>
                </DashboardCircle>
                <Text
                  className="flex-shrink font-poppins text-[12px] leading-[18px]"
                  style={{ color: item.color }}
                >
                  {item.label}
                </Text>
              </View>
              <Metric loading={loading}>
                <Text
                  className="mt-3 font-poppins-bold text-[16px] leading-6"
                  style={{ color: item.countColor }}
                >
                  {t(
                    item.count === 1
                      ? "dashboard.itemCountOne"
                      : "dashboard.itemCount",
                    { count: item.count },
                  )}
                </Text>
              </Metric>
            </Pressable>
          ))}
        </View>
      )}
      {!loading && !empty && summary.outOfStock === 0 && summary.lowStock === 0 && <Text className="mt-3 font-poppins text-[12px] text-[#21642C]">All products are in stock. No restocking alerts.</Text>}
    </DashboardCard>
  );
}

export function BestSellersCard({
  summary,
  products = [],
  loading = false,
  onBrowse,
}: {
  summary: Summary;
  products?: readonly InventoryProduct[];
  loading?: boolean;
  onBrowse?: () => void;
}) {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  return (
    <DashboardCard title={t('dashboard.bestSellers')}>
      {loading && summary.bestSellers.length === 0 ? (
        <DashboardRowsSkeleton kind="products" count={summary.bestSellers.length || 3} />
      ) : !loading && summary.bestSellers.length === 0 ? (
        <EmptyState
          icon="cart"
          title="No top sellers yet"
          description="Your top sellers will appear after your first sale."
          action="Open POS"
          onAction={onBrowse}
        />
      ) : (
        <View className="gap-3">
          {summary.bestSellers.map((item, index) => (
            <View
              key={item.id}
              className="min-h-[64px] flex-row items-center gap-2 rounded-surface bg-canvas px-2 py-3"
            >
              <DashboardCircle size={24}>
                <Metric loading={loading}>
                <Text className="font-poppins text-[12px] text-action">
                  {index + 1}
                </Text>
                </Metric>
              </DashboardCircle>
              {loading ? <Skeleton><SkeletonBar width={36} height={36} /></Skeleton> : <ProductThumbnail product={products.find(product => product.id === item.id)} productId={item.id} />}
              <View className="min-w-0 flex-1" style={{ flexDirection: fontScale > 1.3 ? 'column' : 'row', alignItems: fontScale > 1.3 ? 'flex-start' : 'center', gap: tokens.spacing.two }}>
              <View style={{ flex: fontScale > 1.3 ? undefined : 1, minWidth: 0 }}><Metric loading={loading}><Text className="font-poppins text-[12px] leading-[18px] text-[#102342]">
                {item.name}
              </Text></Metric></View>
              <Metric loading={loading}>
              <Text numberOfLines={fontScale > 1.3 ? undefined : 1} style={{ width: fontScale > 1.3 ? undefined : 76 }} className="text-right font-poppins-bold text-[10px] leading-[15px] text-brand">
                {t(
                  item.quantity === 1
                    ? "dashboard.unitsSoldOne"
                    : "dashboard.unitsSold",
                  { count: item.quantity },
                )}
              </Text>
              </Metric>
              </View>
            </View>
          ))}
        </View>
      )}
    </DashboardCard>
  );
}

export function RecentActivityCard({
  activity,
  onViewAll,
  loading = false,
}: {
  activity: readonly DashboardActivity[];
  onViewAll: () => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const recent = recentDashboardActivity(activity);
  return (
    <DashboardCard
      title={t("dashboard.activityTitle")}
      action={
        <Button variant="text" fullWidth={false} compact onPress={onViewAll}>{t("common.viewAll")}</Button>
      }
    >
      {loading && recent.length === 0 ? (
        <DashboardRowsSkeleton kind="activity" count={3} />
      ) : !loading && activity.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No activity yet"
          description="Recorded sales and payments will appear here."
        />
      ) : (
        <View className="gap-3">
          {recent.map((activity) => (
            <ActivityTile key={activity.id}>
              <View
                style={{
                  width: tokens.size.iconCircle,
                  height: tokens.size.iconCircle,
                  flexShrink: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {loading ? <Skeleton><SkeletonBar width={40} height={40} /></Skeleton> : activity.kind === "customerDebt" ||
                activity.kind === "storeDebt" ||
                activity.kind === "expense" ? (
                  <PosIcon name={activity.kind} size={24} color="#245399" />
                ) : (
                  <DashboardIcon
                    source={
                      activity.kind === "payment"
                        ? dashboardIcons.payment
                        : dashboardIcons.bottle
                    }
                    size={
                      activity.kind === "payment" ? 24 : tokens.size.iconCircle
                    }
                  />
                )}
              </View>
              <View className="min-w-0 flex-1">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.two }}>
                  <View style={{ flexGrow: 1, flexBasis: tokens.size.iconCircle * 2, minWidth: 0 }}>
                    <Metric loading={loading}>
                      <Text className="font-poppins text-[12px] leading-[18px] text-[#102342]">
                        {activity.label ?? ({ sale: t('dashboard.posSale'), payment: t('dashboard.debtPayment'), customerDebt: 'Customer debt', storeDebt: 'Store debt', expense: 'Expense' })[activity.kind]}
                      </Text>
                    </Metric>
                  </View>
                  <View style={{ marginLeft: 'auto', maxWidth: '100%' }}>
                    <Metric loading={loading}>
                      <Text style={{ color: activity.amountCentavos === 0 || activity.direction === 'neutral' ? '#4A607A' : activity.direction === 'in' ? '#21642C' : '#AB2025' }} className="text-right font-poppins-bold text-[16px] leading-6">
                        {formatActivityAmount(activity)}
                      </Text>
                    </Metric>
                  </View>
                </View>
                <Metric loading={loading}>
                <Text numberOfLines={1} adjustsFontSizeToFit className="mt-1 font-poppins text-[10px] leading-[15px] text-brand">
                  {new Date(activity.occurredAt).toLocaleString(
                    getLocaleFormats().date,
                    {
                      timeZone: "Asia/Manila",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      month: 'short', day: 'numeric', year: 'numeric',
                    },
                  )}
                </Text>
                </Metric>
              </View>
            </ActivityTile>
          ))}
        </View>
      )}
    </DashboardCard>
  );
}

function ProductThumbnail({ product, productId }: { product?: InventoryProduct; productId: string }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const photoUri = product?.photoUri;
  const category = product?.category ?? dashboardDemo.products.find(item => item.id === productId)?.category;
  const icon = ({ drinks: '🥤', canned: '🥫', snacks: '🍪', coldCuts: '🥩', groceries: '🛒', household: '🧹', personalCare: '🧴' } as Record<string, string>)[category ?? ''];
  return <View testID={`thumbnail-${productId}`} accessible={false} className="items-center justify-center overflow-hidden rounded-control bg-[#D9E7F4]" style={{ width: 36, height: 36, flexShrink: 0 }}>
    {photoUri && failedUri !== photoUri ? <Image source={{ uri: photoUri }} resizeMode="cover" style={{ width: 36, height: 36 }} onError={() => setFailedUri(photoUri)} />
      : icon ? <Text allowFontScaling={false} style={{ fontSize: 23 }}>{icon}</Text> : <PosIcon name="inventory" size={24} />}
  </View>;
}

function DashboardRowsSkeleton({ kind, count }: { kind: 'products' | 'activity'; count: number }) {
  return (
    <Skeleton>
      <View className="gap-3">
        {Array.from({ length: count }, (_, i) => (
          <View
            key={i}
            className={kind === 'products' ? 'min-h-[64px] flex-row items-center gap-2 rounded-surface bg-canvas px-2 py-3' : 'min-h-[70px] flex-row items-center gap-3 px-0 py-3'}
          >
            {kind === 'products' && <SkeletonBar width={24} height={24} />}
            <SkeletonBar width={kind === 'products' ? 36 : 40} height={kind === 'products' ? 36 : 40} />
            <View className="flex-1 gap-2">
              <SkeletonBar />
              <SkeletonBar width="55%" height={14} />
            </View>
            <SkeletonBar width={kind === 'products' ? 76 : 64} height={kind === 'products' ? 15 : 18} />
          </View>
        ))}
      </View>
    </Skeleton>
  );
}
