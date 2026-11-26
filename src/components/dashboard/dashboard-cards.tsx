import { Button } from "@/components/ui/button";
import { MotionPressable as Pressable } from "@/components/ui/motion-pressable";
import { useTranslation } from "@/i18n/use-translation";
import { Text, View, useWindowDimensions } from "react-native";

import { ActivityTile } from "@/components/dashboard/activity-tile";
import {
  DashboardCard,
  DashboardCircle,
  DashboardIcon,
  dashboardIcons,
} from "@/components/dashboard/dashboard-ui";
import { PosIcon } from "@/components/pos/pos-icon";
import { AppIcon } from "@/components/ui/app-icon";
import { PosChip } from "@/components/pos/pos-chip";
import { MenuIcon } from "@/components/menu/menu-icon";
import {
  EmptyState,
  LoadingSlot,
  Skeleton,
  SkeletonBar,
} from "@/components/ui/content-state";
import tokens from "@/constants/design-tokens.json";
import { warningStockStatusColor } from "@/constants/stock-status-colors";
import { getLocaleFormats } from "@/i18n";
import type {
  DashboardActivity,
  SalesPeriod,
} from "@/types/dashboard";
import {
  formatActivityAmount,
  formatPesos,
  recentDashboardActivity,
  summarizeDashboard,
} from "@/utils/dashboard";
import type { ReactNode } from "react";

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
  if (loading) return <Skeleton label="Loading Pera sa Kaha">
    <View className="gap-3 rounded-card border border-outline bg-white px-5 py-4">
      <View className="flex-row items-center gap-3"><SkeletonBar width={40} height={40} /><SkeletonBar width="58%" height={26} /></View>
      <View className="flex-row items-center justify-between gap-2"><SkeletonBar width="48%" height={38} /><View className="h-12 w-12 rounded-pill" style={{ backgroundColor: tokens.color.surfaceSubtle }} /></View>
    </View>
  </Skeleton>;
  return (
    <View className="rounded-card bg-action px-5 py-4">
      <View className="flex-row items-center gap-3">
        <AppIcon name="money" size={40} color={tokens.color.surfaceCard} />
        <Text
          accessibilityRole="header"
          className="flex-shrink type-title-accent text-white"
        >
          {t("dashboard.cashTitle")}
        </Text>
      </View>
      <View className="mt-3 flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Metric loading={loading}>
            <Text className=" type-large-metric leading-[45px] text-white">
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
          <DashboardCircle size={tokens.size.iconCircle} backgroundColor={tokens.color.surfaceCard}
            style={{ boxShadow: tokens.shadow.raised, elevation: 3, shadowColor: tokens.color.black, shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } }}>
            <PosIcon name="plus" size={24} color={tokens.color.darkNavy} active />
          </DashboardCircle>
        </Pressable>
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
  loading = false,
}: {
  summary: Summary;
  period: SalesPeriod;
  onPeriod: (period: SalesPeriod) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const metricStyle = {
    minHeight: 94 * Math.max(1, fontScale),
    paddingVertical: tokens.spacing.three,
    flex: 1,
    minWidth: 0,
  };
  if (loading) return <DashboardCard title={t("dashboard.salesTitle")} loading titleSkeletonWidth="46%">
    <View className="mb-3 flex-row gap-2">
      {[0, 1, 2].map(index => <View key={index} className="min-w-0 flex-1"><SkeletonBar height={38} /></View>)}
    </View>
    <View style={{ flexDirection: fontScale > 1.3 ? "column" : "row", gap: 12 }}>
      {[0, 1].map(index => <View key={index} className="min-w-0 flex-1 gap-3 rounded-surface p-3" style={{ minHeight: 94 * Math.max(1, fontScale), backgroundColor: tokens.color.surfaceSubtle }}>
        <SkeletonBar width="55%" height={14} /><SkeletonBar width={index === 0 ? "78%" : "48%"} height={20} />
      </View>)}
    </View>
  </DashboardCard>;
  return (
    <DashboardCard title={t("dashboard.salesTitle")}>
      <View
        testID="dashboard-period-chips"
        className="mb-3 flex-row items-center gap-1"
      >
        {periods.map(([value, label]) => (
          <View key={value} style={{ flex: 1, minWidth: 0 }}>
            <PosChip stretch singleLine selected={period === value} onPress={() => onPeriod(value)} label={t(label)} />
          </View>
        ))}
      </View>
      <View
        style={{ flexDirection: fontScale > 1.3 ? "column" : "row", gap: 12 }}
      >
        <View
          className="min-w-0 flex-1 rounded-surface border bg-success-tint p-3"
          style={[metricStyle, { borderColor: tokens.color.successBase }]}
        >
          <Text className=" type-micro-caption leading-[18px] text-success-base">
            {t("dashboard.totalSales")}
          </Text>
          <Metric loading={loading}>
            <Text
              style={{
                minHeight: tokens.typography.listFinancial.lineHeight * fontScale,
                fontSize: tokens.typography.listFinancial.fontSize,
              }}
              className="mt-1 type-list-financial text-success-base"
            >
              {formatPesos(summary.totalSalesCentavos)}
            </Text>
          </Metric>
        </View>
        <View
          className="min-w-0 flex-1 rounded-surface border bg-error-tint p-3"
          style={[metricStyle, { borderColor: tokens.color.errorBase }]}
        >
          <Text className=" type-micro-caption leading-[18px]" style={{ color: tokens.color.errorBase }}>
            {t("dashboard.totalExpense")}
          </Text>
          <Metric loading={loading}>
            <Text
              className="mt-1 type-list-financial leading-6"
              style={{
                minHeight: tokens.typography.listFinancial.lineHeight * fontScale,
                color: tokens.color.errorBase,
              }}
            >
              {formatPesos(summary.moneyOut)}
            </Text>
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
  const lowStockColor = warningStockStatusColor;
  if (loading) return <DashboardCard title={t("dashboard.stockTitle")} loading titleSkeletonWidth="42%">
    <View style={{ flexDirection: fontScale > 1.3 ? "column" : "row", gap: 12 }}>
      {[0, 1].map(index => <View key={index} className="min-w-0 flex-1 gap-4 rounded-surface p-3" style={{ minHeight: 94 * Math.max(1, fontScale), backgroundColor: tokens.color.surfaceSubtle }}>
        <View className="flex-row items-center gap-2"><View className="h-6 w-6 rounded-pill" style={{ backgroundColor: tokens.color.iceContainer }} /><SkeletonBar width="58%" height={18} /></View>
        <SkeletonBar width="64%" height={20} />
      </View>)}
    </View>
  </DashboardCard>;
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
        <View
          style={{ flexDirection: fontScale > 1.3 ? "column" : "row", gap: 12 }}
        >
          {[
            {
              status: "out" as const,
              label: t("dashboard.outOfStock"),
              count: summary.outOfStock,
              color: tokens.color.errorHover,
              countColor: tokens.color.errorHover,
              background: tokens.color.errorSoft,
              border: tokens.color.errorBase,
            },
            {
              status: "low" as const,
              label: t("dashboard.lowStock"),
              count: summary.lowStock,
              color: lowStockColor,
              countColor: lowStockColor,
              background: tokens.color.warningTint,
              border: lowStockColor,
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
                borderColor: item.status === "low" ? lowStockColor : item.border,
              }}
            >
              <View
                className="flex-row items-center gap-2"
                style={{ minHeight: (width < 360 ? 36 : 22) * fontScale }}
              >
                <PosIcon name="alert" size={tokens.size.statusIndicator} color={item.status === "low" ? lowStockColor : item.border} />
                <Text className="flex-shrink type-body-primary" style={{ color: item.status === "low" ? lowStockColor : item.color }}>
                  {item.label}
                </Text>
              </View>
              <Metric loading={loading}>
                <Text
                  className="mt-3 type-list-financial leading-6"
                  style={{ color: item.status === "low" ? lowStockColor : item.countColor }}
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
    </DashboardCard>
  );
}

export function BestSellersCard({
  summary,
  loading = false,
  onBrowse,
}: {
  summary: Summary;
  loading?: boolean;
  onBrowse?: () => void;
}) {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  if (loading) return <DashboardCard title={t("dashboard.bestSellers")} loading titleSkeletonWidth="54%">
    <DashboardRowsSkeleton kind="products" count={3} />
  </DashboardCard>;
  return (
    <DashboardCard title={t("dashboard.bestSellers")}>
      {loading && summary.bestSellers.length === 0 ? (
        <DashboardRowsSkeleton
          kind="products"
          count={summary.bestSellers.length || 3}
        />
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
              className="min-h-[64px] flex-row items-center gap-3 rounded-surface bg-canvas px-3 py-3"
            >
              <DashboardCircle size={tokens.size.badge} backgroundColor={tokens.color.darkNavy}>
                <Metric loading={loading}>
                  <Text className="type-body-primary text-white">
                    {index + 1}
                  </Text>
                </Metric>
              </DashboardCircle>
              <View
                className="min-w-0 flex-1"
                style={{
                  flexDirection: fontScale > 1.3 ? "column" : "row",
                  alignItems: fontScale > 1.3 ? "flex-start" : "center",
                  gap: tokens.spacing.two,
                }}
              >
                <View
                  style={{ flex: fontScale > 1.3 ? undefined : 1, minWidth: 0 }}
                >
                  <Metric loading={loading}>
                    <Text className="type-body-primary text-text-primary">
                      {item.name}
                    </Text>
                  </Metric>
                </View>
                <Metric loading={loading}>
                  <Text
                    numberOfLines={fontScale > 1.3 ? undefined : 1}
                    style={{ minWidth: fontScale > 1.3 ? undefined : 112 }}
                    className="text-right type-list-financial leading-6 text-brand"
                  >
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
  if (loading) return <DashboardCard title={t("dashboard.activityTitle")} loading titleSkeletonWidth="48%">
    <DashboardRowsSkeleton kind="activity" count={3} />
  </DashboardCard>;
  return (
    <DashboardCard
      title={t("dashboard.activityTitle")}
      action={
        <Button variant="text" fullWidth={false} compact onPress={onViewAll}>
          {t("common.viewAll")}
        </Button>
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
                {loading ? (
                  <Skeleton>
                    <SkeletonBar width={40} height={40} />
                  </Skeleton>
                ) : activity.kind === "sale" ? (
                  <AppIcon name="cart" size={28} color={tokens.color.royalBlue} />
                ) : activity.kind === "customerDebt" ||
                  activity.kind === "expense" ? (
                  <MenuIcon name={activity.kind} size={24} />
                ) : (
                  activity.kind === "payment" ? (
                    <AppIcon name="creditCard" size={24} color={tokens.color.royalBlue} />
                  ) : activity.kind === "storeDebt" ? <PosIcon name="storeDebt" size={24} color={tokens.color.royalBlue} />
                    : <DashboardIcon source={dashboardIcons.bottle} size={tokens.size.iconCircle} />
                )}
              </View>
              <View className="min-w-0 flex-1">
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: tokens.spacing.two,
                  }}
                >
                  <View
                    style={{
                      flexGrow: 1,
                      flexBasis: tokens.size.iconCircle * 2,
                      minWidth: 0,
                    }}
                  >
                    <Metric loading={loading}>
                      <Text className="type-body-primary text-text-primary">
                        {activity.label ??
                          {
                            sale: t("dashboard.posSale"),
                            payment: t("dashboard.debtPayment"),
                            customerDebt: "Customer debt",
                            storeDebt: "Store debt",
                            expense: "Expense",
                          }[activity.kind]}
                      </Text>
                    </Metric>
                  </View>
                  <View style={{ marginLeft: "auto", maxWidth: "100%" }}>
                    <Metric loading={loading}>
                      <Text
                        style={{
                          color:
                            activity.kind === "sale"
                              ? tokens.color.royalBlue
                              : activity.amountCentavos === 0 ||
                            activity.direction === "neutral"
                              ? tokens.color.textSecondary
                              : activity.direction === "in"
                                ? tokens.color.successBase
                                : tokens.color.errorHover,
                        }}
                        className="text-right type-list-financial leading-6"
                      >
                        {formatActivityAmount(activity)}
                      </Text>
                    </Metric>
                  </View>
                </View>
                <Metric loading={loading}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className="mt-1 type-helper leading-[15px] text-brand"
                  >
                    {new Date(activity.occurredAt).toLocaleTimeString(
                      getLocaleFormats().date,
                      {
                        timeZone: "Asia/Manila",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
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

function DashboardRowsSkeleton({
  kind,
  count,
}: {
  kind: "products" | "activity";
  count: number;
}) {
  return (
      <View className="gap-3">
        {Array.from({ length: count }, (_, i) => (
          <View
            key={i}
            className={
              kind === "products"
                ? "min-h-[64px] flex-row items-center gap-2 rounded-surface bg-canvas px-2 py-3"
                : "min-h-[70px] flex-row items-center gap-3 px-0 py-3"
            }
          >
            <SkeletonBar
              width={kind === "products" ? tokens.size.badge : 40}
              height={kind === "products" ? tokens.size.badge : 40}
            />
            <View className="flex-1 gap-2">
              <SkeletonBar />
              <SkeletonBar width="55%" height={14} />
            </View>
            <SkeletonBar
              width={kind === "products" ? 112 : 64}
              height={kind === "products" ? 15 : 18}
            />
          </View>
        ))}
      </View>
  );
}
