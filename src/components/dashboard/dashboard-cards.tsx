import { MotionPressable as Pressable } from "@/components/ui/motion-pressable";
import { useTranslation } from "@/i18n/use-translation";
import { Text, View } from "react-native";

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
import { formatPesos, summarizeDashboard } from "@/utils/dashboard";
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
      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[120px] flex-1 rounded-surface bg-[#E6F5E9] p-3">
          <Text className="font-poppins text-[12px] leading-[18px] text-[#21642C]">
            {t("dashboard.income")}
          </Text>
          <Metric loading={loading}>
            <Text className="mt-2 font-poppins-bold text-[16px] leading-6 text-[#21642C]">
              +{formatPesos(summary.moneyIn)}
            </Text>
          </Metric>
        </View>
        <View className="min-w-[120px] flex-1 rounded-surface bg-[#FDEDEF] p-3">
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
  return (
    <DashboardCard title={t("dashboard.salesTitle")}>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {periods.map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: period === value }}
            onPress={() => onPeriod(value)}
            className={`min-h-11 min-w-[88px] flex-1 items-center justify-center rounded-pill px-2 py-2 ${period === value ? "bg-[#28549A]" : "bg-[#D8E7F5]"}`}
          >
            <Text
              className={`font-poppins-bold text-[12px] leading-[18px] ${period === value ? "text-white" : "text-[#102342]"}`}
            >
              {t(label)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View className="flex-row flex-wrap gap-4">
        <View className="min-w-[120px] flex-1 rounded-surface bg-canvas p-4">
          <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">
            {t("dashboard.totalSales")}
          </Text>
          <Metric loading={loading}>
            <Text className="mt-2 font-poppins-bold text-[16px] leading-6 text-[#102342]">
              {formatPesos(summary.totalSalesCentavos)}
            </Text>
          </Metric>
        </View>
        <View className="min-w-[120px] flex-1 overflow-hidden rounded-surface bg-canvas p-4">
          {!loading && growthMetrics && (
            <GrowthSparkline points={growthMetrics.points} />
          )}
          <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">
            {t("dashboard.growth")}
          </Text>
          <Metric loading={loading}>
            <Text className="mt-2 font-poppins-bold text-[16px] leading-6 text-[#21642C]">
              {growthMetrics?.percentageChange == null
                ? t("dashboard.noComparison")
                : `${growthMetrics.percentageChange >= 0 ? "+" : ""}${growthMetrics.percentageChange}%`}
            </Text>
          </Metric>
          {growthMetrics?.source === "demo" && (
            <View style={{ opacity: loading ? 0 : 1 }}>
              <Text className="mt-1 font-poppins text-[10px] leading-[15px] text-text-secondary">
                {t("dashboard.demoTrend")}
              </Text>
            </View>
          )}
        </View>
      </View>
      {!loading && empty && (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-3 font-poppins text-[12px] text-text-secondary"
        >
          No sales in this period. Sales will appear here once recorded.
        </Text>
      )}
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
        <View className="flex-row flex-wrap gap-3">
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
              className="min-w-[120px] flex-1 rounded-surface border p-[15px] "
              style={{
                backgroundColor: item.background,
                borderColor: item.border,
              }}
            >
              <View className="flex-row items-center gap-2">
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
  return (
    <DashboardCard title={t("dashboard.bestSellers")}>
      {loading ? (
        <DashboardRowsSkeleton />
      ) : summary.bestSellers.length === 0 ? (
        <EmptyState
          icon="cart"
          title="No best sellers yet"
          description="Products will be ranked here once sales are recorded."
          action="Open POS"
          onAction={onBrowse}
        />
      ) : (
        <View className="gap-3">
          {summary.bestSellers.map((item, index) => (
            <View
              key={item.id}
              className="min-h-[60px] flex-row items-center gap-3 rounded-surface bg-canvas px-3 py-3"
            >
              <DashboardCircle>
                <Text className="font-poppins text-[12px] text-action">
                  {index + 1}
                </Text>
              </DashboardCircle>
              <Text className="flex-1 font-poppins text-[12px] leading-[18px] text-[#102342]">
                {item.name}
              </Text>
              <Text className="max-w-[86px] font-poppins-bold text-[12px] leading-[18px] text-brand">
                {t(
                  item.quantity === 1
                    ? "dashboard.unitsSoldOne"
                    : "dashboard.unitsSold",
                  { count: item.quantity },
                )}
              </Text>
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
  return (
    <DashboardCard
      title={t("dashboard.activityTitle")}
      action={
        <Pressable
          accessibilityRole="button"
          onPress={onViewAll}
          className="min-h-11 justify-center "
        >
          <Text className="font-poppins text-[12px] text-[#2675DB]">
            {t("common.viewAll")}
          </Text>
        </Pressable>
      }
    >
      {loading ? (
        <DashboardRowsSkeleton />
      ) : activity.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No activity yet"
          description="Recorded sales and payments will appear here."
        />
      ) : (
        <View className="gap-3">
          {activity.map((activity) => (
            <ActivityTile key={activity.id}>
              <View
                style={{
                  width: tokens.size.iconCircle,
                  height: tokens.size.iconCircle,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {activity.kind === "customerDebt" ||
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
              <View className="flex-1">
                <Text className="font-poppins text-[12px] leading-[18px] text-[#102342]">
                  {activity.label ??
                    (activity.kind === "payment"
                      ? t("dashboard.debtPayment")
                      : t("dashboard.posSale"))}
                </Text>
                <Text className="mt-1 font-poppins text-[10px] leading-[15px] text-brand">
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
              </View>
              <Text className="max-w-[110px] font-poppins-bold text-[16px] leading-6 text-[#102342]">
                {activity.kind === "payment" ? "+" : ""}
                {formatPesos(activity.amountCentavos)}
              </Text>
            </ActivityTile>
          ))}
        </View>
      )}
    </DashboardCard>
  );
}

function DashboardRowsSkeleton() {
  return (
    <Skeleton>
      <View className="gap-3">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className="min-h-[60px] flex-row items-center gap-3 rounded-surface bg-canvas px-3 py-3"
          >
            <SkeletonBar width={36} height={36} />
            <View className="flex-1 gap-2">
              <SkeletonBar />
              <SkeletonBar width="55%" height={14} />
            </View>
            <SkeletonBar width={64} height={18} />
          </View>
        ))}
      </View>
    </Skeleton>
  );
}
