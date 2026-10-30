import { View, useWindowDimensions } from 'react-native';
import { Skeleton, SkeletonBar } from './content-state';

export function RecordSkeleton({ kind, count = 3, form = 'product', gcash = false, deleting = false }: { kind: 'product' | 'asset' | 'cart' | 'details' | 'form' | 'payment' | 'catalog'; count?: number; form?: 'product' | 'restock' | 'asset'; gcash?: boolean; deleting?: boolean }) {
  const { fontScale } = useWindowDimensions();
  const line = Math.ceil(18 * fontScale);
  const actionHeight = Math.max(48, Math.ceil(20 * fontScale) + 26);
  const card = kind === 'cart' ? 'gap-3 rounded-card bg-white p-4' : 'gap-3 rounded-surface bg-white p-4';
  const field = <View className="gap-1"><SkeletonBar width="55%" height={line} /><SkeletonBar height={actionHeight} /></View>;
  const pair = <View className="flex-row flex-wrap gap-4">{[0, 1].map(i => <View key={i} className="min-w-[130px] flex-1">{field}</View>)}</View>;
  if (kind === 'catalog') return <Skeleton label="Loading products"><SkeletonBar width={16} height={18} /><View className="mt-2 flex-row gap-2">{[0, 1].map(i => <View key={i} className="flex-1 gap-2">
    <View className="gap-2 rounded-control bg-white p-3"><View className="bg-[#D9E7F4]" style={{ aspectRatio: 1.35 }} /><SkeletonBar height={17} /><SkeletonBar height={18} width="60%" /></View>
    <SkeletonBar height={Math.ceil(fontScale * 28) + 10} /><SkeletonBar height={48} /><SkeletonBar height={Math.ceil(fontScale * 16)} width="55%" />
  </View>)}</View></Skeleton>;
  if (kind === 'payment') return <Skeleton label="Loading order for payment"><View className="gap-4">
    <View className="gap-3 rounded-card bg-action p-5"><SkeletonBar width="60%" height={17} /><SkeletonBar height={39} /></View>
    <SkeletonBar width="80%" height={33} />
    <View className="gap-3 rounded-card bg-white p-4"><SkeletonBar width="40%" /><View className="flex-row gap-2"><View className="flex-1"><SkeletonBar height={48} /></View><View className="flex-1"><SkeletonBar height={48} /></View></View><SkeletonBar width="55%" /><SkeletonBar height={actionHeight} /><SkeletonBar height={line} />{gcash ? field : <><SkeletonBar height={line} width="55%" /><View className="flex-row flex-wrap gap-1">{[0, 1, 2, 3, 4].map(i => <View key={i} className="min-w-[44px] flex-1"><SkeletonBar height={48} /></View>)}</View></>}</View>
    <View className="gap-3 rounded-card bg-[#D1E1F5] p-5"><SkeletonBar /><SkeletonBar width="50%" /><SkeletonBar /><SkeletonBar height={42} width="65%" /></View>
    <SkeletonBar height={48} /><SkeletonBar height={48} />
  </View></Skeleton>;
  if (kind === 'form') return <Skeleton label="Loading record"><View className="gap-4"><SkeletonBar width="80%" height={line} />{field}{form === 'asset' ? <>{field}{field}{field}</> : <>{pair}{pair}{field}{form === 'restock' && <><SkeletonBar width="40%" height={line} />{field}</>}<SkeletonBar height={136} /></>}<View className="mt-6 gap-3"><SkeletonBar height={actionHeight} /><SkeletonBar height={actionHeight} /></View></View></Skeleton>;
  return <Skeleton label={kind === 'cart' ? 'Loading cart' : 'Loading records'}><View className="gap-4">{Array.from({ length: kind === 'details' ? 1 : count }, (_, i) => <View key={i} className={card}>
    {(kind === 'product' || kind === 'details') && <View className={`flex-row items-center gap-3 ${kind === 'details' ? 'self-center' : ''}`}><SkeletonBar width={kind === 'details' ? 140 : 56} height={kind === 'details' ? 140 : 56} />{kind === 'product' && <View className="flex-1 gap-2"><SkeletonBar /><SkeletonBar width="60%" /></View>}</View>}
    {kind !== 'product' && <SkeletonBar height={kind === 'asset' ? 30 : 23} width="75%" />}
    <SkeletonBar width="55%" /><SkeletonBar height={kind === 'asset' ? 30 : 20} width="45%" />
    {kind !== 'cart' && <SkeletonBar width="65%" />}
    {kind === 'details' && <><SkeletonBar /><SkeletonBar /><SkeletonBar /></>}
    {kind !== 'details' && !deleting && <View className="flex-row gap-3">{Array.from({ length: kind === 'product' ? 3 : 2 }, (_, j) => <View key={j} className="flex-1"><SkeletonBar height={actionHeight} /></View>)}</View>}
  </View>)}
  {(kind === 'details' || deleting) && <>{deleting && <SkeletonBar height={72} />}<SkeletonBar height={actionHeight} /><SkeletonBar height={actionHeight} />{!deleting && <><SkeletonBar height={27} width="60%" /><SkeletonBar height={line} width="80%" /></>}</>}
  {kind === 'cart' && <><View className="gap-4 rounded-card bg-[#D1E1F5] p-5"><SkeletonBar /><SkeletonBar /><SkeletonBar height={42} width="60%" /></View><View className="flex-row gap-4">{[0, 1].map(i => <View key={i} className="flex-1"><SkeletonBar height={actionHeight} /></View>)}</View></>}</View></Skeleton>;
}
