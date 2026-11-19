import type { DeviceSession, OperatorPermission } from '@/types/auth';

export const permissionGroups = [
  { id: 'pos', title: 'Point of Sale', description: 'Process sales and payments', capabilities: ['pos'] },
  { id: 'inventory', title: 'Inventory', description: 'Edit product information and record incoming stock', capabilities: ['inventory-edit', 'restock'] },
  { id: 'receivables', title: 'Customer Debts', description: 'Record customer debts and payments', capabilities: ['receivables'] },
  { id: 'transactions', title: 'Transaction History', description: 'View, search and filter only', capabilities: ['transactions'] },
] as const;
export type PermissionGroup = typeof permissionGroups[number]['id'];
export const defaultOperatorPermissions: readonly OperatorPermission[] = ['pos', 'inventory-edit', 'restock', 'receivables', 'transactions', 'profile', 'settings'];
export function updatePermission(permissions: readonly OperatorPermission[], group: PermissionGroup, allowed: boolean): readonly OperatorPermission[] {
  const capabilities: readonly OperatorPermission[] = permissionGroups.find(item => item.id === group)!.capabilities;
  return [...permissions.filter(item => !capabilities.includes(item)), ...(allowed ? capabilities : [])];
}
/** Use the same capability for navigation, route entry and domain actions. Owner-only
 * capabilities are deliberately absent from OperatorPermission. Server must enforce too. */
export function hasCapability(session: DeviceSession | null, capability: OperatorPermission | 'manage-operators' | 'financial' | 'expenses' | 'payables' | 'products-create' | 'products-delete' | 'assets-write'): boolean {
  if (!session || session.locked || session.expiresAt <= Date.now()) return false;
  if (['manage-operators', 'financial', 'expenses', 'payables', 'products-create', 'products-delete', 'assets-write'].includes(capability)) return session.role === 'owner';
  return session.role === 'owner' || session.operator.permissions.includes(capability as OperatorPermission);
}
