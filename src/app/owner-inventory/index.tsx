import { useLocalSearchParams } from 'expo-router';
import { InventoryScreen } from '@/components/inventory/inventory-screen';
export default function InventoryRoute() {
  const { tab, status } = useLocalSearchParams<{ tab?: string; status?: string }>();
  return <InventoryScreen key={`${tab}:${status}`} />;
}
