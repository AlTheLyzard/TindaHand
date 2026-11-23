import type { ReactNode } from 'react';
import { View } from 'react-native';

/** Informational activity row with no press interaction or detail destination. */
export function ActivityTile({ children }: { children: ReactNode }) {
  return (
    <View className="min-h-[70px] flex-row items-center gap-3 rounded-surface py-3">
      {children}
    </View>
  );
}
