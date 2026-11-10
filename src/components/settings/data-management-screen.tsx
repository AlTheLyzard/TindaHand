import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RegistrationToast } from '@/components/auth/registration-toast';
import { Button } from '@/components/ui/button';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { MotionContent } from '@/components/ui/motion-content';
import { MotionModal } from '@/components/ui/motion-modal';
import { PosIcon } from '@/components/pos/pos-icon';
import { useAuthFlow } from '@/state/auth-flow';
import { useSettings } from '@/state/settings';
import { canClearCache } from '@/utils/settings';
import type { SyncStatus } from '@/types/settings';
import { SettingsFrame } from './settings-frame';
import { SettingsDescription, SettingsNotice, SettingsSection } from './settings-ui';

const titles: Record<SyncStatus, string> = {
  'up-to-date': 'All demo data is up to date', offline: 'Offline — Changes Pending', failed: 'Sync Failed',
  syncing: 'Syncing Your Data…', complete: 'Sync Complete!',
};
export function DataManagementScreen() {
  const { owner } = useAuthFlow();
  const service = useSettings();
  const insets = useSafeAreaInsets();
  const [dialog, setDialog] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState({ title: '', message: '', expiresAt: null as number | null });
  const mounted = useRef(true);
  const locked = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const dismissToast = useCallback(() => setToast(current => ({ ...current, expiresAt: null })), []);
  if (!owner) return null;
  const state = service.syncState(owner.id);
  const syncing = state.status === 'syncing';
  const eligible = canClearCache(state) && !clearing;
  const good = state.status === 'complete' || state.status === 'up-to-date';
  const failed = state.status === 'failed';
  const lastSynced = state.lastSyncedAt ? new Date(state.lastSyncedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not yet synced';
  const description = state.status === 'up-to-date' ? `Last simulated sync: ${lastSynced}. No demo records are pending.`
    : state.status === 'offline' ? `${state.pendingRecords} demo records are waiting to sync. This simulates offline changes; no durable offline storage is connected.`
    : failed ? `We couldn't complete the simulated sync. ${state.pendingRecords} demo records pending. Please try again.`
    : syncing ? `Please wait while we simulate synchronizing your demo records. ${state.pendingRecords} pending.`
    : `The simulated sync finished successfully. Last simulated sync: ${lastSynced}.`;
  function cancel() { if (!locked.current) { setDialog(false); setNotice(''); } }
  async function synchronize() {
    if (locked.current || !owner || service.syncState(owner.id).status === 'syncing') return;
    locked.current = true; setNotice('');
    try {
      const result = await service.synchronize(owner);
      if (!mounted.current) return;
      if (result.ok) setToast({ title: 'Sync complete.', message: 'The simulated sync is complete.', expiresAt: Date.now() + 15000 });
      else setNotice(result.message);
    } catch { if (mounted.current) setNotice('The simulated sync failed. Please try again.'); }
    finally { locked.current = false; }
  }
  async function clear() {
    if (locked.current || !owner) return;
    if (!canClearCache(service.syncState(owner.id))) { setDialog(false); setNotice('Sync pending records before clearing cached data.'); return; }
    locked.current = true; setClearing(true); setNotice('');
    try {
      const result = await service.clearCache(owner);
      if (!mounted.current) return;
      if (result.ok) {
        setDialog(false);
        setToast({ title: 'Cache clearing complete', message: 'Simulated only. No files or business records were removed.', expiresAt: Date.now() + 15000 });
      } else setNotice(result.message);
    } catch { if (mounted.current) setNotice('The cache-clearing simulation failed. Please try again.'); }
    finally { locked.current = false; if (mounted.current) setClearing(false); }
  }
  return <SettingsFrame title="Data Management">
    <SettingsDescription>Manage data synchronization and device storage.</SettingsDescription>
    <Text className="mb-5 font-poppins text-[11px] leading-4 text-text-secondary">Demo only. Sync and cache clearing are simulated. No backend or durable offline storage is connected.</Text>
    {toast.expiresAt && <RegistrationToast {...toast} onDismiss={dismissToast} />}
    <SettingsSection>DATA SYNC</SettingsSection>
    <MotionContent changeKey={state.status}>
      <View accessibilityLiveRegion="polite" className="mb-5 gap-3 rounded-control p-4" style={{ backgroundColor: good ? '#E8F5E9' : failed ? '#FFEBEE' : '#D9E7F4' }}>
        <View className="flex-row items-center gap-3">
          <PosIcon name={good ? 'checkCircle' : failed ? 'alert' : 'history'} color={good ? '#1D5D21' : failed ? '#972020' : '#112F6F'} />
          <Text accessibilityRole="header" className="flex-1 font-poppins-bold text-[14px] leading-[21px]" style={{ color: good ? '#1D5D21' : failed ? '#972020' : '#112F6F' }}>{titles[state.status]}</Text>
        </View>
        <Text className="font-poppins text-[12px] leading-[18px]" style={{ color: failed ? '#972020' : '#4A607A' }}>{description}</Text>
        {syncing && <View accessibilityRole="progressbar" accessibilityLabel="Simulated synchronization" accessibilityValue={{ min: 0, max: 100, now: state.progress }} className="gap-2">
          <View className="h-[6px] overflow-hidden rounded-pill bg-white"><View className="h-full rounded-pill bg-action" style={{ width: `${state.progress}%` }} /></View>
          <Text className="font-poppins text-[11px] text-brand">Synchronizing demo records… {state.progress}%</Text>
        </View>}
      </View>
    </MotionContent>
    <Button loading={syncing} disabled={clearing} onPress={() => void synchronize()}>{failed ? 'Retry Sync' : state.status === 'offline' ? 'Try Again' : 'Sync Now'}</Button>
    {!dialog && notice ? <SettingsNotice error>{notice}</SettingsNotice> : null}
    <View className="h-6" /><SettingsSection>DEVICE STORAGE</SettingsSection>
    <View className="mb-5 gap-2 rounded-control bg-[#D1E1F5] p-4">
      <Text className="font-poppins-bold text-[12px] leading-[18px] text-brand">Clear Local Cache</Text>
      <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">{eligible ? 'Remove temporary files from this device. Business records are retained.' : 'Sync pending records before clearing cached data.'}</Text>
    </View>
    <Button variant="secondary" disabled={!eligible} onPress={() => { if (canClearCache(service.syncState(owner.id)) && !locked.current) { setNotice(''); setDialog(true); } }}>{clearing ? 'Clearing…' : eligible ? 'Clear Local Cache' : 'Sync Required Before Clearing'}</Button>
    <MotionModal visible={dialog} onRequestClose={cancel} statusBarTranslucent navigationBarTranslucent>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        {clearing ? <View accessibilityViewIsModal accessibilityRole="alert" accessibilityLiveRegion="polite" className="w-full max-w-[412px] gap-4 self-center rounded-control bg-white p-6"><ActivityIndicator color="#245399" /><Text className="text-center font-poppins-bold text-[16px] text-brand">Simulating cache clearing…</Text></View>
          : <View onAccessibilityEscape={cancel} className="w-full max-w-[412px] self-center">
            <ConfirmationContent title="Clear Local Cache?" message="This will remove temporary files stored on your device. Your saved business records will not be deleted. In this demo, no files are removed." cancelLabel="Cancel" confirmLabel="Clear Cache" onCancel={cancel} onConfirm={() => void clear()} />
            {notice ? <View className="mt-3 rounded-control bg-white px-4"><SettingsNotice error>{notice}</SettingsNotice></View> : null}
          </View>}
      </ScrollView>
    </MotionModal>
  </SettingsFrame>;
}
