import { useLocalSearchParams } from 'expo-router';
import { ProductScreen } from '@/components/inventory/product-screen';
export default function ProductRoute() {
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  return <ProductScreen key={`${id}:${mode}`} />;
}
