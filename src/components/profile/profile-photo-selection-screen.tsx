import { useState } from 'react';
import { View } from 'react-native';
import { avatarPickerOrder } from '@/constants/profile-avatars';
import { useAvatarSnapshot } from '@/hooks/use-owner-profile';
import { avatarInUse } from '@/services/avatars';
import type { AvatarId } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { SettingsCard } from '@/components/settings/settings-ui';
import { AvatarOption } from './avatar-option';
import { ProfileFrame } from './profile-frame';
import { ProfileAvatar } from './profile-avatar';
import { ProfileError } from './profile-ui';

export function ProfilePhotoSelectionScreen({ storeId, accountId, currentAvatarId, failure = '', busy = false, onApply, onCancel, onNavigate, onSelectionChange }: {
  storeId: string;
  accountId: string;
  currentAvatarId: AvatarId;
  failure?: string;
  busy?: boolean;
  onApply: (avatarId: AvatarId) => void;
  onCancel: () => void;
  onNavigate?: (action: () => void) => void;
  onSelectionChange?: () => void;
}) {
  const avatars = useAvatarSnapshot();
  const [preview, setPreview] = useState<AvatarId>(currentAvatarId);
  const previewInUse = avatarInUse(avatars, storeId, accountId, preview);
  return <ProfileFrame title="Select Profile Photo" subtitle="Choose a photo to personalize your profile." onBack={onCancel} onNavigate={onNavigate} busy={busy}>
    <View className="mb-5 items-center"><ProfileAvatar size={104} avatarId={preview} /></View>
    <SettingsCard><View className="flex-row flex-wrap" accessibilityRole="radiogroup" accessibilityLabel="Preset profile avatars">
      {avatarPickerOrder.map((id, index) => <View key={id} testID={`avatar-cell-${id}`} style={{ width: '33.333%', alignItems: 'center', paddingVertical: 8 }}>
        <AvatarOption id={id} index={index} selected={preview === id} inUse={avatarInUse(avatars, storeId, accountId, id)} disabled={busy}
          onSelect={() => { setPreview(id); onSelectionChange?.(); }} />
      </View>)}
    </View></SettingsCard>
    {!!failure && <ProfileError message={failure} />}
    <View className="min-h-8 flex-1" />
    <View className="gap-3 pt-6">
      <Button loading={busy} disabled={!preview || previewInUse || busy} onPress={() => onApply(preview)}>Apply</Button>
      <Button variant="secondary" disabled={busy} onPress={onCancel}>Cancel</Button>
    </View>
  </ProfileFrame>;
}
