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
  const { fontScale } = useWindowDimensions();
  return (
    <View className="rounded-card bg-action px-5 py-4">
      <View className="flex-row items-center gap-3">
        <PosIcon name="money" size={40} color={tokens.color.surfaceCard} />
        <Text
          accessibilityRole="header"
          className="flex-shrink type-title-accent text-white"
        >
          {t("dashboard.cashTitle")}
        </Text>
      </View>
      <View className="mb-4 mt-3 flex-row items-center justify-between gap-2">
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
          <DashboardCircle size={tokens.size.iconCircle} backgroundColor={tokens.color.surfaceCard}>
            <PosIcon name="plus" size={24} color={tokens.color.darkNavy} active />
          </DashboardCircle>
        </Pressable>
      </View>
      <View
        style={{ flexDirection: fontScale > 1.3 ? "column" : "row", gap: 12 }}
      >
        <View className="min-w-0 flex-1 rounded-surface bg-success-tint p-3">
          <Text className=" type-micro-caption leading-[18px] text-success-base">
            {t("dashboard.income")}
          </Text>
          <Metric loading={loading}>
            <Text className="mt-2 type-list-financial leading-6 text-success-base">
              +{formatPesos(summary.moneyIn)}
            </Text>
          </Metric>
        </View>
        <View className="min-w-0 flex-1 rounded-surface bg-error-tint p-3">
          <Text className=" type-micro-caption leading-[18px] text-text-secondary">
            {t("dashboard.expenses")}
          </Text>
          <Metric loading={loading}>
            <Text className="mt-2 type-list-financial leading-6 text-text-secondary">
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
}: {
  summary: Summary;
  period: SalesPeriod;
  onPeriod: (period: SalesPeriod) => void;
  growthMetrics: GrowthMetrics | null;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const metricStyle = {
    minHeight: 94 * Math.max(1, fontScale),
    paddingVertical: tokens.spacing.two,
    flex: 1,
    minWidth: 0,
  };
  return (
    <DashboardCard title={t("dashboard.salesTitle")}>
      <View
        testID="dashboard-period-chips"
        className="mb-3 flex-row items-center gap-1"
      >
        {periods.map(([value, label]) => (
          <View key={value} style={{ flex: 1, minWidth: 0 }}>
            <Metric loading={loading}>
              <Pressable
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={t(label)}
                accessibilityState={{
                  selected: period === value,
                  disabled: loading,
                }}
                onPress={() => onPeriod(value)}
                style={{
                  minHeight: tokens.size.touchTarget,
                  minWidth: tokens.size.touchTarget,
                  alignItems: "stretch",
                  justifyContent: "center",
                }}
              >
                <View
                  testID={`dashboard-period-${value}`}
                  pointerEvents="none"
                  style={{
                    paddingHorizontal: tokens.spacing.two,
                    paddingVertical: tokens.spacing.one + 2,
                    borderWidth: 1,
                    borderColor: "transparent",
                    borderRadius: tokens.radius.pill,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      period === value ? tokens.color.royalBlue : tokens.color.surfaceSubtle,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    className=" type-label-nav leading-[18px] text-center"
                    style={{ color: period === value ? tokens.color.surfaceCard : tokens.color.textPrimary }}
                  >
                    {t(label)}
                  </Text>
                </View>
              </Pressable>
            </Metric>
          </View>
        ))}
      </View>
      <View
        style={{ flexDirection: fontScale > 1.3 ? "column" : "row", gap: 12 }}
      >
        <View className="rounded-surface bg-canvas px-3" style={metricStyle}>
          <Text className=" type-micro-caption leading-[18px] text-text-secondary">
            {t("dashboard.totalSales")}
          </Text>
          <Metric loading={loading}>
            <Text
              style={{
                minHeight: tokens.typography.listFinancial.lineHeight * fontScale,
                fontSize: tokens.typography.listFinancial.fontSize,
              }}
              className="mt-1 type-list-financial text-text-primary"
            >
              {formatPesos(summary.totalSalesCentavos)}
            </Text>
          </Metric>
        </View>
        <View
          className="overflow-hidden rounded-surface bg-canvas px-3"
          style={metricStyle}
        >
          <Text className=" type-micro-caption leading-[18px] text-text-secondary">
            {t("dashboard.growth")}
          </Text>
          <Metric loading={loading}>
            <Text
              className="mt-1 type-list-financial leading-6"
              style={{
                minHeight: tokens.typography.listFinancial.lineHeight * fontScale,
                color:
                  growthMetrics?.percentageChange == null
                    ? tokens.color.textSecondary
                    : growthMetrics.percentageChange < 0
                      ? tokens.color.errorHover
                      : tokens.color.successBase,
              }}
            >
              {growthMetrics?.percentageChange == null
                ? "—"
                : `${growthMetrics.percentageChange >= 0 ? "+" : ""}${growthMetrics.percentageChange}%`}
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
              color: tokens.color.warningBase,
              countColor: tokens.color.warningBase,
              background: tokens.color.warningTint,
              border: tokens.color.warningBase,
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
              <View
                className="flex-row items-center gap-2"
                style={{ minHeight: (width < 360 ? 36 : 22) * fontScale }}
              >
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
                      fontSize: tokens.typography.microFinancialRate.fontSize,
                      lineHeight: 18,
                      fontFamily: tokens.typography.weights.bold,
                      includeFontPadding: false,
                    }}
                  >
                    !
                  </Text>
                </DashboardCircle>
                <Text className="flex-shrink type-body-primary" style={{ color: item.color }}>
                  {item.label}
                </Text>
              </View>
              <Metric loading={loading}>
                <Text
                  className="mt-3 type-list-financial leading-6"
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
      {!loading &&
        !empty &&
        summary.outOfStock === 0 &&
        summary.lowStock === 0 && (
          <Text className="mt-3 type-micro-caption text-success-base">
            All products are in stock. No restocking alerts.
          </Text>
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
                  <DashboardCircle size={tokens.size.iconCircle} backgroundColor={tokens.color.darkNavy} />
                ) : activity.kind === "customerDebt" ||
                  activity.kind === "storeDebt" ||
                  activity.kind === "expense" ? (
                  <PosIcon name={activity.kind} size={24} color={tokens.color.royalBlue} />
                ) : (
                  activity.kind === "payment" ? (
                    <PosIcon name="money" size={24} color={tokens.color.royalBlue} />
                  ) : (
                    <DashboardIcon source={dashboardIcons.bottle} size={tokens.size.iconCircle} />
                  )
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
    <Skeleton>
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
    </Skeleton>
  );
}
