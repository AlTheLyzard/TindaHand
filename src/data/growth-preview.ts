import type { GrowthMetrics } from '@/types/dashboard';

/** Decorative placeholder history only; not recorded sales or actual performance. */
export const growthPreview: Omit<GrowthMetrics, 'percentageChange'> = {
  source: 'demo', reportingPeriod: 'daily', metric: 'sales', unit: 'centavos',
  points: [
    { timestamp: '2026-10-10T06:00:00+08:00', metricValue: 20000 },
    { timestamp: '2026-10-10T07:00:00+08:00', metricValue: 38000 },
    { timestamp: '2026-10-10T08:00:00+08:00', metricValue: 31000 },
    { timestamp: '2026-10-10T09:00:00+08:00', metricValue: 65000 },
    { timestamp: '2026-10-10T10:00:00+08:00', metricValue: 55000 },
    { timestamp: '2026-10-10T11:00:00+08:00', metricValue: 82000 },
    { timestamp: '2026-10-10T12:00:00+08:00', metricValue: 110000 },
  ],
};
