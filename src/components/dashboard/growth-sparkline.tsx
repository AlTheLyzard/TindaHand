import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { GrowthMetrics } from '@/types/dashboard';

/** Lightweight decorative line segments; no chart library or interaction required. */
export function GrowthSparkline({ points }: Pick<GrowthMetrics, 'points'>) {
  const [width, setWidth] = useState(0);
  const height = 56;
  const validPoints = points.filter((point) => Number.isFinite(point.metricValue) && Number.isFinite(Date.parse(point.timestamp)));
  const values = validPoints.map((point) => point.metricValue);
  const times = validPoints.map((point) => Date.parse(point.timestamp));
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const duration = times[times.length - 1] - times[0];
  const coordinates = validPoints.map((point, index) => ({
    x: duration > 0 ? (times[index] - times[0]) / duration * width : index / Math.max(1, validPoints.length - 1) * width,
    y: height - 4 - (point.metricValue - min) / range * (height - 8),
  }));
  return <View pointerEvents="none" accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.graph}>
    {width > 0 && coordinates.slice(1).map((point, index) => {
      const previous = coordinates[index];
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      const length = Math.hypot(dx, dy);
      return <View key={`${validPoints[index].timestamp}-${index}`} style={{
        position: 'absolute', backgroundColor: '#21642C', opacity: 0.16, height: 2, width: length,
        left: (point.x + previous.x - length) / 2, top: (point.y + previous.y) / 2 - 1,
        transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
      }} />;
    })}
  </View>;
}

const styles = StyleSheet.create({
  graph: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56, overflow: 'hidden' },
});
