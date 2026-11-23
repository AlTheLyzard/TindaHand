import tokens from '@/constants/design-tokens.json';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RegistrationToast } from '@/components/auth/registration-toast';
import { Button } from '@/components/ui/button';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { MotionContent } from '@/components/ui/motion-content';
import { MotionModal } from '@/components/ui/motion-modal';
import { PosIcon } from '@/components/pos/pos-icon';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { useAuthFlow } from '@/state/auth-flow';
import { useInventory } from '@/state/inventory';
import { useSettings } from '@/state/settings';
import { clearPersistedData } from '@/services/local-persist';
import type { OwnerIdentity } from '@/types/auth';
import { SettingsFrame } from './settings-frame';
import { SettingsDescription, SettingsNotice, SettingsSection } from './settings-ui';

type RealSyncStatus = 'idle' | 'syncing' | 'complete' | 'failed';

export function DataManagementScreen() {
  const { owner: ownerSession, deviceSession } = useAuthFlow();
  const operatorSession = !ownerSession && deviceSession?.role === 'operator' ? deviceSession : null;
  const operator = !!operatorSession;
  const owner: OwnerIdentity | null = ownerSession ?? (operatorSession
    ? { ...operatorSession.owner, mode: 'mock' }
    : null);

  const service = useSettings();
  const { refetchProducts, refetchAssets } = useInventory();
  const insets = useSafeAreaInsets();
  const mounted = useRef(true);
  const locked = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // ── Real backend path ──────────────────────────────────────────────────────
  const [realStatus, setRealStatus] = useState<RealSyncStatus>('idle');
  const [dialog, setDialog] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState({ title: '', message: '', expiresAt: null as number | null });
  const dismissToast = useCallback(() => setToast(current => ({ ...current, expiresAt: null })), []);

  if (!owner) return null;

  const settingsParent = operator
    ? { pathname: '/operator-more', params: { section: 'settings' } } as const
    : undefined;

  // ── Real backend: Sync = re-fetch products + assets from the API ───────────
  if (!MOCK_AUTH_ENABLED) {
    const syncing = realStatus === 'syncing';
    const good = realStatus === 'complete';
    const failed = realStatus === 'failed';

    async function synchronize() {
      if (locked.current) return;
      locked.current = true;
      setRealStatus('syncing');
      setNotice('');
      try {
        await Promise.all([refetchProducts(), refetchAssets()]);
        if (!mounted.current) return;
        setRealStatus('complete');
        setToast({ title: 'Sync complete.', message: 'Products and assets are up to date.', expiresAt: Date.now() + 10000 });
      } catch {
        if (!mounted.current) return;
        setRealStatus('failed');
        setNotice('Sync failed. Check your connection and try again.');
      } finally {
        locked.current = false;
      }
    }

    async function clear() {
      if (locked.current || !owner) return;
      locked.current = true;
      setClearing(true);
      setNotice('');
      try {
        await clearPersistedData(owner.id);
        if (!mounted.current) return;
        setDialog(false);
        setToast({ title: 'Cache cleared.', message: 'Local transaction data has been removed from this device.', expiresAt: Date.now() + 10000 });
      } catch {
        if (!mounted.current) return;
        setNotice('Cache clearing failed. Please try again.');
      } finally {
        locked.current = false;
        if (mounted.current) setClearing(false);
      }
    }

    return <SettingsFrame title="Data Management" parent={settingsParent}>
      <SettingsDescription>Manage data synchronization and device storage.</SettingsDescription>
      {toast.expiresAt && <RegistrationToast {...toast} onDismiss={dismissToast} />}

      <SettingsSection>DATA SYNC</SettingsSection>
      <MotionContent changeKey={realStatus}>
        <View accessibilityLiveRegion="polite" className="mb-5 gap-3 rounded-control p-4"
          style={{ backgroundColor: good ? tokens.color.successTint : failed ? tokens.color.errorTint : tokens.color.iceContainer }}>
          <View className="flex-row items-center gap-3">
            <PosIcon
              name={good ? 'checkCircle' : failed ? 'alert' : syncing ? 'refresh' : 'wifiOff'}
              color={good ? tokens.color.successBase : failed ? tokens.color.errorBase : tokens.color.darkNavy} />
            <Text accessibilityRole="header" className="flex-1 type-button-cta leading-[21px]"
              style={{ color: good ? tokens.color.successBase : failed ? tokens.color.errorBase : tokens.color.darkNavy }}>
              {good ? 'Data is up to date' : failed ? 'Sync Failed' : syncing ? 'Syncing…' : 'Ready to sync'}
            </Text>
          </View>
          <Text className=" type-micro-caption leading-[18px]"
            style={{ color: failed ? tokens.color.errorBase : tokens.color.textSecondary }}>
            {good
              ? 'Products and assets were refreshed from the server.'
              : failed
              ? 'Could not reach the server. Check your connection and try again.'
              : syncing
              ? 'Fetching the latest products and assets from the server…'
              : 'Tap Sync Now to refresh products and assets from the server.'}
          </Text>
          {syncing && <ActivityIndicator color={tokens.color.royalBlue} />}
        </View>
      </MotionContent>
      <Button loading={syncing} onPress={() => void synchronize()}>
        {failed ? 'Retry Sync' : 'Sync Now'}
      </Button>
      {!dialog && notice ? <SettingsNotice error>{notice}</SettingsNotice> : null}

      <View className="h-6" />
      <SettingsSection>DEVICE STORAGE</SettingsSection>
      <View className="mb-5 gap-2 rounded-control bg-accent-soft p-4">
        <Text className=" type-label-nav leading-[18px] text-brand">Clear Local Cache</Text>
        <Text className=" type-micro-caption leading-[18px] text-text-secondary">
          Remove locally saved transaction data (sales, debts, payments, cash additions) from this device. Business records on the server are not affected.
        </Text>
      </View>
      <Button variant="secondary" disabled={clearing} onPress={() => { setNotice(''); setDialog(true); }}>
        {clearing ? 'Clearing…' : 'Clear Local Cache'}
      </Button>

      <MotionModal visible={dialog} onRequestClose={() => { if (!locked.current) setDialog(false); }} statusBarTranslucent navigationBarTranslucent>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
          {clearing
            ? <View accessibilityViewIsModal accessibilityRole="alert" accessibilityLiveRegion="polite" className="w-full max-w-[412px] gap-4 self-center rounded-control bg-white p-6">
              <ActivityIndicator color={tokens.color.royalBlue} />
              <Text className="text-center type-list-financial text-brand">Clearing local cache…</Text>
            </View>
            : <View onAccessibilityEscape={() => { if (!locked.current) setDialog(false); }} className="w-full max-w-[412px] self-center">
              <ConfirmationContent title="Clear Local Cache?"
                message="This will remove locally saved sales, debts, payments, and cash addition records from this device. Your data on the server is not affected and will reload automatically."
                cancelLabel="Cancel" confirmLabel="Clear Cache"
                onCancel={() => { if (!locked.current) setDialog(false); }}
                onConfirm={() => void clear()} />
              {notice ? <View className="mt-3 rounded-control bg-white px-4"><SettingsNotice error>{notice}</SettingsNotice></View> : null}
            </View>}
        </ScrollView>
      </MotionModal>
    </SettingsFrame>;
  }

  // ── Mock / demo path (unchanged simulation) ────────────────────────────────
  const state = service.syncState(owner.id);
  const syncing = state.status === 'syncing';
  const eligible = !clearing && (state.status === 'complete' || state.status === 'up-to-date');
  const good = state.status === 'complete' || state.status === 'up-to-date';
  const failed = state.status === 'failed';
  const lastSynced = state.lastSyncedAt
    ? new Date(state.lastSyncedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not yet synced';
  const description = state.status === 'up-to-date' ? `Last simulated sync: ${lastSynced}. No demo records are pending.`
    : state.status === 'offline' ? `${state.pendingRecords} demo records are waiting to sync.`
    : failed ? `Couldn't complete the simulated sync. ${state.pendingRecords} records pending.`
    : syncing ? `Synchronizing demo records… ${state.pendingRecords} pending.`
    : `Sync finished. Last simulated sync: ${lastSynced}.`;

  const titles: Record<typeof state.status, string> = {
    'up-to-date': 'All demo data is up to date',
    offline: 'Offline – Changes Pending',
    failed: 'Sync Failed',
    syncing: 'Syncing Your Data…',
    complete: 'Sync Complete!',
  };

  async function synchronize() {
    if (locked.current || service.syncState(owner!.id).status === 'syncing') return;
    locked.current = true;
    setNotice('');
    try {
      const result = await service.synchronize(owner!);
      if (!mounted.current) return;
      if (result.ok) setToast({ title: 'Sync complete.', message: 'The simulated sync is complete.', expiresAt: Date.now() + 15000 });
      else setNotice(result.message);
    } catch {
      if (mounted.current) setNotice('The simulated sync failed. Please try again.');
    } finally { locked.current = false; }
  }

  async function clear() {
    if (locked.current || !owner) return;
    if (!eligible) { setDialog(false); setNotice('Sync pending records before clearing cached data.'); return; }
    locked.current = true;
    setClearing(true);
    setNotice('');
    try {
      const result = await service.clearCache(owner);
      if (!mounted.current) return;
      if (result.ok) {
        setDialog(false);
        setToast({ title: 'Cache clearing complete', message: 'Simulated only. No files or business records were removed.', expiresAt: Date.now() + 15000 });
      } else setNotice(result.message);
    } catch {
      if (mounted.current) setNotice('The cache-clearing simulation failed. Please try again.');
    } finally {
      locked.current = false;
      if (mounted.current) setClearing(false);
    }
  }

  return <SettingsFrame title="Data Management" parent={settingsParent}>
    <SettingsDescription>Manage data synchronization and device storage.</SettingsDescription>
    <Text className="mb-5 type-micro-caption leading-4 text-text-secondary">Demo only. Sync and cache clearing are simulated. No backend or durable offline storage is connected.</Text>
    {toast.expiresAt && <RegistrationToast {...toast} onDismiss={dismissToast} />}
    <SettingsSection>DATA SYNC</SettingsSection>
    <MotionContent changeKey={state.status}>
      <View accessibilityLiveRegion="polite" className="mb-5 gap-3 rounded-control p-4"
        style={{ backgroundColor: good ? tokens.color.successTint : failed ? tokens.color.errorTint : tokens.color.iceContainer }}>
        <View className="flex-row items-center gap-3">
          <PosIcon name={good ? 'checkCircle' : failed ? 'alert' : state.status === 'offline' ? 'wifiOff' : 'refresh'} color={good ? tokens.color.successBase : failed ? tokens.color.errorBase : tokens.color.darkNavy} />
          <Text accessibilityRole="header" className="flex-1 type-button-cta leading-[21px]"
            style={{ color: good ? tokens.color.successBase : failed ? tokens.color.errorBase : tokens.color.darkNavy }}>{titles[state.status]}</Text>
        </View>
        <Text className=" type-micro-caption leading-[18px]" style={{ color: failed ? tokens.color.errorBase : tokens.color.textSecondary }}>{description}</Text>
        {syncing && <View accessibilityRole="progressbar" accessibilityLabel="Simulated synchronization"
          accessibilityValue={{ min: 0, max: 100, now: state.progress }} className="gap-2">
          <View className="h-[6px] overflow-hidden rounded-pill bg-white">
            <View className="h-full rounded-pill bg-action" style={{ width: `${state.progress}%` }} />
          </View>
          <Text className=" type-micro-caption text-brand">Synchronizing demo records… {state.progress}%</Text>
        </View>}
      </View>
    </MotionContent>
    <Button loading={syncing} disabled={clearing} onPress={() => void synchronize()}>
      {failed ? 'Retry Sync' : state.status === 'offline' ? 'Try Again' : 'Sync Now'}
    </Button>
    {!dialog && notice ? <SettingsNotice error>{notice}</SettingsNotice> : null}
    <View className="h-6" />
    <SettingsSection>DEVICE STORAGE</SettingsSection>
    <View className="mb-5 gap-2 rounded-control bg-accent-soft p-4">
      <Text className=" type-label-nav leading-[18px] text-brand">Clear Local Cache</Text>
      <Text className=" type-micro-caption leading-[18px] text-text-secondary">
        {eligible ? 'Remove temporary files from this device. Business records are retained.' : 'Sync pending records before clearing cached data.'}
      </Text>
    </View>
    <Button variant="secondary" disabled={!eligible} onPress={() => {
      if (eligible && !locked.current) { setNotice(''); setDialog(true); }
    }}>
      {clearing ? 'Clearing…' : eligible ? 'Clear Local Cache' : 'Sync Required Before Clearing'}
    </Button>
    <MotionModal visible={dialog} onRequestClose={() => { if (!locked.current) setDialog(false); }} statusBarTranslucent navigationBarTranslucent>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        {clearing
          ? <View accessibilityViewIsModal accessibilityRole="alert" accessibilityLiveRegion="polite" className="w-full max-w-[412px] gap-4 self-center rounded-control bg-white p-6">
            <ActivityIndicator color={tokens.color.royalBlue} />
            <Text className="text-center type-list-financial text-brand">Simulating cache clearing…</Text>
          </View>
          : <View onAccessibilityEscape={() => { if (!locked.current) setDialog(false); }} className="w-full max-w-[412px] self-center">
            <ConfirmationContent title="Clear Local Cache?"
              message="This will remove temporary files stored on your device. Your saved business records will not be deleted. In this demo, no files are removed."
              cancelLabel="Cancel" confirmLabel="Clear Cache"
              onCancel={() => { if (!locked.current) setDialog(false); }}
              onConfirm={() => void clear()} />
            {notice ? <View className="mt-3 rounded-control bg-white px-4"><SettingsNotice error>{notice}</SettingsNotice></View> : null}
          </View>}
      </ScrollView>
    </MotionModal>
  </SettingsFrame>;
}
