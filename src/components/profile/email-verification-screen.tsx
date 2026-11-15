import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useOwnerProfile } from '@/hooks/use-owner-profile';
import { authenticationService } from '@/services/authentication';
import { Button } from '@/components/ui/button';
import { ProfileFrame } from './profile-frame';
import { ProfileError, ProfileNotice, ProfileText, ProfileUnavailable } from './profile-ui';
import { ProfileSuccess } from './profile-screen';

export function EmailVerificationScreen() {
  const { profile, loading, error, reload } = useOwnerProfile();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  async function action(kind: Parameters<typeof authenticationService.profile.email>[0]) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setFailure(''); setMessage('');
    try {
      const result = await authenticationService.profile.email(kind);
      if (!result.ok) setFailure(result.message);
      else setMessage(kind === 'cancel' ? 'Pending email change cancelled. Your registered email is unchanged.' : kind === 'simulate-verified' ? 'Development verification completed. Your registered email is now updated.' : kind === 'resend' ? 'Development verification renewed. No real email was sent.' : 'Verification is still pending. Your registered email is unchanged.');
    } catch { setFailure('Unable to check verification. Please retry.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <ProfileFrame title="Email Verification" subtitle="Your registered email stays active until the new address is verified." busy={busy}>
    {loading || error || !profile ? <ProfileUnavailable loading={loading} error={error} retry={reload} /> : <View className="gap-4">
      <ProfileNotice title="Registered email"><ProfileText>{profile.email}</ProfileText></ProfileNotice>
      {profile.pendingEmail ? <>
        <ProfileNotice title={`Verification ${profile.pendingEmail.status}`}>{profile.pendingEmail.address}</ProfileNotice>
        {authenticationService.profile.developmentMock && <ProfileNotice title="Development mock · no email sent">This demonstration does not send email or prove address ownership. Use Simulate Verified Email to exercise a successful response. Requests expire after 15 minutes.</ProfileNotice>}
        {profile.pendingEmail.status !== 'pending' && <ProfileError message="Verification failed or expired. Request verification again or cancel this change." />}
        <Button loading={busy} onPress={() => void action('check')}>Check Verification Status</Button>
        <Button variant="secondary" disabled={busy} onPress={() => void action('resend')}>Request Verification Again</Button>
        <ProfileText small>Verification requests have a 30-second resend cooldown.</ProfileText>
        {authenticationService.profile.developmentMock && profile.pendingEmail.status === 'pending' && <Button variant="secondary" disabled={busy} onPress={() => void action('simulate-verified')}>Simulate Verified Email (Development)</Button>}
        <Button variant="destructiveOutline" disabled={busy} onPress={() => void action('cancel')}>Cancel Email Change</Button>
      </> : <ProfileNotice title="No pending email change">Your registered email is active.</ProfileNotice>}
      {!!failure && <ProfileError message={failure} retry={() => void action('check')} />}
      {!!message && <ProfileSuccess key={message} message={message} />}
    </View>}
  </ProfileFrame>;
}
