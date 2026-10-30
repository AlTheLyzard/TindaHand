import { useLocalSearchParams } from 'expo-router';
import { AssetScreen } from '@/components/inventory/asset-screen';
export default function AssetRoute() {
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  return <AssetScreen key={`${id}:${mode}`} />;
}
