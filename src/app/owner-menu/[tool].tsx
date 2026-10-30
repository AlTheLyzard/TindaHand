import { Redirect, useLocalSearchParams } from 'expo-router';
import { ToolPlaceholderScreen } from '@/components/menu/tool-placeholder-screen';
import { findOwnerTool } from '@/data/menu';
import { useAuthFlow } from '@/state/auth-flow';

export default function OwnerToolRoute() {
  const { owner } = useAuthFlow();
  const { tool: id } = useLocalSearchParams<{ tool?: string | string[] }>();
  const tool = findOwnerTool(typeof id === 'string' ? id : undefined);
  if (!owner) return <Redirect href="/choose-account" />;
  if (!tool) return <Redirect href="/owner-menu" />;
  if (tool.id === 'store-expenses') return <Redirect href="/owner-menu/store-expenses" />;
  return <ToolPlaceholderScreen key={tool.id} tool={tool} owner={owner} />;
}
