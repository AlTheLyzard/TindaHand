import { RecordSkeleton } from '@/components/ui/content-skeletons';
import { Skeleton, SkeletonBar } from '@/components/ui/content-state';
import tokens from '@/constants/design-tokens.json';
import { View } from 'react-native';

/** Full inventory loading state: headings, summary, filters, actions, search and rows. */
export function InventoryContentSkeleton({ assets = false, tabs = false, actions = true }: {
  assets?: boolean;
  tabs?: boolean;
  actions?: boolean | number;
}) {
  return <View className="gap-3">
    {tabs && <Skeleton label="Loading inventory tabs"><View className="flex-row gap-2">{[0, 1].map(index => <View key={index} className="min-w-0 flex-1"><SkeletonBar height={48} /></View>)}</View></Skeleton>}
    <Skeleton label={assets ? 'Loading business assets' : 'Loading products'}>
      <View className="gap-4">
        <View className="gap-2 rounded-card border border-outline p-4" style={{ backgroundColor: tokens.color.surfaceSubtle }}>
          <SkeletonBar width={assets ? '72%' : '42%'} height={assets ? 24 : 16} />
          <View className="flex-row items-center justify-between gap-3">
            <SkeletonBar width={assets ? '56%' : '22%'} height={assets ? 34 : 28} />
            {assets && <SkeletonBar width="32%" height={18} />}
          </View>
        </View>
        {!assets && <View className="flex-row flex-wrap gap-2">
          {[0, 1, 2, 3].map(index => <View key={index} className="min-w-[44%] flex-1"><SkeletonBar height={38} /></View>)}
        </View>}
        {assets && <View className="flex-row flex-wrap gap-3">
          {[0, 1].map(index => <View key={index} className="min-w-[130px] flex-1 gap-2 rounded-control p-3" style={{ backgroundColor: tokens.color.surfaceSubtle }}>
            <SkeletonBar width="60%" height={18} /><SkeletonBar width="75%" height={22} />
          </View>)}
        </View>}
        {!!actions && <View className="flex-row gap-3">{Array.from({ length: typeof actions === 'number' ? actions : 2 }, (_, index) => <View key={index} className="min-w-0 flex-1"><SkeletonBar height={50} /></View>)}</View>}
        <View className="flex-row items-center justify-between gap-3"><SkeletonBar width="34%" height={24} /><SkeletonBar width={84} height={42} /></View>
        {assets && <View className="flex-row gap-2">{[0, 1, 2].map(index => <View key={index} className="min-w-[72px] flex-1"><SkeletonBar height={36} /></View>)}</View>}
        <SkeletonBar height={48} />
      </View>
    </Skeleton>
    <RecordSkeleton kind={assets ? 'asset' : 'product'} />
  </View>;
}
