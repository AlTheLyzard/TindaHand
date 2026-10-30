import { useState } from 'react';
import { Text, View } from 'react-native';
import { MenuFrame } from '@/components/menu/menu-frame';
import { QuickAddModal } from '@/components/dashboard/quick-add-modal';
import { PosIcon } from '@/components/pos/pos-icon';
import { Button } from '@/components/ui/button';
import { PosSessionRecords } from '@/components/pos/session-records';
import type { OwnerIdentity } from '@/types/auth';
import type { OwnerTool } from '@/types/menu';
import type { QuickAddKind } from '@/types/quick-add';

export function ToolPlaceholderScreen({ tool, owner }: { tool: OwnerTool; owner: OwnerIdentity }) {
  const [quickKind, setQuickKind] = useState<QuickAddKind | null>(null);
  return <MenuFrame title={tool.label}>
    <View className="gap-4 rounded-card border border-[#B0C8E3] bg-[#F0F8FF] p-5">
      <PosIcon name={tool.icon} size={32} color="#112F6F" />
      <Text accessibilityRole="header" className="font-poppins-bold text-[18px] text-brand">{tool.id === 'transaction-history' || tool.id === 'receivables-payables' ? 'Demo session records' : 'Temporary placeholder'}</Text>
      <Text accessibilityRole="alert" className="font-poppins text-[14px] leading-[21px] text-text-secondary">{tool.temporaryMessage}</Text>
      {tool.id === 'profile' && <View className="gap-2">
        <Text className="font-poppins-bold text-[16px] text-brand">{owner.name}</Text>
        <Text className="font-poppins text-[14px] text-text-secondary">{owner.id}</Text>
        <Text className="font-poppins text-[14px] text-text-secondary">May-Ari (Owner)</Text>
      </View>}
      {tool.actions?.map(action => <Button key={action.kind} onPress={() => setQuickKind(action.kind)}>{action.label}</Button>)}
    </View>
    {tool.id === 'transaction-history' && <PosSessionRecords kind="transactions" />}
    {tool.id === 'receivables-payables' && <PosSessionRecords kind="debts" />}
    {quickKind && <QuickAddModal initialKind={quickKind} onClose={() => setQuickKind(null)} />}
  </MenuFrame>;
}
