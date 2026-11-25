import tokens from '@/constants/design-tokens.json';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { MotionModal } from '@/components/ui/motion-modal';
import { PosIcon } from '@/components/pos/pos-icon';
import { ReplayWalkthroughIllustration } from '@/components/settings/replay-walkthrough-illustration';
import { SettingsCard, SettingsDescription, SettingsRow, SettingsSection } from '@/components/settings/settings-ui';
import { SettingsFrame } from '@/components/settings/settings-frame';
import { LanguageScreen } from '@/components/settings/preferences-screens';
import { useState } from 'react';

export const operatorSettingsHref = {
  pathname: '/operator-more',
  params: { section: 'settings' },
} as const;

export function OperatorSettingsLandingScreen() {
  return <SettingsFrame title="Settings" landing parent="/operator-pos" navigationRole="operator" showBack={false} storefrontArtwork={false}>
    <View className="mb-3"><SettingsDescription>Make TindaHand work for your store</SettingsDescription></View>
    <SettingsSection>PREFERENCES</SettingsSection>
    <SettingsRow title="Language" description="English" icon="language"
      onPress={() => router.navigate('/operator-settings/language')} />

    <View className="h-1" />
    <SettingsSection>STORE TOOLS</SettingsSection>
    <SettingsRow title="Data Management" description="Data synchronization and device storage." icon="data"
      onPress={() => router.navigate('/operator-settings/data')} />

    <View className="h-1" />
    <SettingsSection>HELP & SUPPORT</SettingsSection>
    <SettingsRow title="App Guide & Tutorial" description="Learn how to use TindaHand" icon="help"
      onPress={() => router.navigate('/operator-settings/guide')} />
    <SettingsRow title="Replay App Walkthrough" description="View the introduction again" icon="replay"
      onPress={() => router.navigate('/operator-settings/replay')} />
  </SettingsFrame>;
}

export function OperatorLanguageScreen() {
  return <LanguageScreen parent={operatorSettingsHref} />;
}

const operatorGuideCards = [
  {
    title: 'Point of Sale (POS)',
    description: 'Select products, manage your cart, and process customer payments to complete transactions.',
  },
  {
    title: 'Inventory & Asset Management',
    description: 'Update product stock quantities, monitor expiration dates, and view store assets.',
  },
  {
    title: 'More Tools',
    description: 'Access your transaction history, manage settings, and other available store tools.',
  },
] as const;

export function OperatorAppGuideScreen() {
  return <SettingsFrame title="App Guide & Tutorial" parent={operatorSettingsHref}>
    <SettingsDescription>
      Welcome to TindaHand! This quick guide will help you understand the app&apos;s main features and how to use them.
    </SettingsDescription>
    <View className="gap-5">
      {operatorGuideCards.map(card => <SettingsCard key={card.title}>
        <View className="gap-4">
          <Text accessibilityRole="header" className="type-h3-heading leading-[27px] text-brand">{card.title}</Text>
          <Text className=" type-micro-financial-rate leading-[22px] text-text-secondary">{card.description}</Text>
        </View>
      </SettingsCard>)}
    </View>
  </SettingsFrame>;
}

export function OperatorReplayWalkthroughScreen() {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const close = () => setConfirmationOpen(false);
  return <>
    <SettingsFrame title="Replay App Walkthrough" parent={operatorSettingsHref}>
      <View className="items-center">
        <View className="mt-8 w-full items-center">
          <ReplayWalkthroughIllustration />
        </View>
        <Text accessibilityRole="header" className="mt-2 text-center type-title-accent leading-[30px] text-brand">
          Take a Quick Tour Again!
        </Text>
        <Text className="mt-3 text-center type-micro-financial-rate leading-[22px] text-text-secondary">
          Want to get familiar with TindaHand again? Replay the walkthrough to revisit the app&apos;s main features and how they work.
        </Text>
        <Button className="mt-8" onPress={() => setConfirmationOpen(true)}>Start Walkthrough</Button>
      </View>
    </SettingsFrame>
    <MotionModal visible={confirmationOpen} onRequestClose={close} backdropColor={tokens.overlay.navy}>
      <View className="flex-1 justify-center px-6 py-8" onAccessibilityEscape={close}>
        <ConfirmationContent title="Replay Walkthrough?" titleColor={tokens.color.darkNavy}
          leadingIcon={<View className="h-8 w-8 items-center justify-center rounded-pill bg-brand"><PosIcon name="history" size={20} color={tokens.color.surfaceCard} /></View>}
          message="Would you like to go through the TindaHand introduction again?" cancelLabel="Cancel" confirmLabel="Start"
          destructive={false} cancelVariant="secondary" onCancel={close} onConfirm={() => {
            close();
            router.push('/operator-settings/walkthrough');
          }} />
      </View>
    </MotionModal>
  </>;
}

export function OperatorWalkthroughScreen() {
  const [step, setStep] = useState(0);
  const current = operatorGuideCards[step];
  function finish() {
    router.dismissTo(operatorSettingsHref);
  }
  return <SettingsFrame title={current.title} parent={operatorSettingsHref}>
    <Text className="mb-5 type-micro-caption leading-[18px] text-text-secondary">Step {step + 1} of {operatorGuideCards.length}</Text>
    <SettingsCard>
      <Text className=" type-micro-financial-rate leading-[22px] text-text-secondary">{current.description}</Text>
    </SettingsCard>
    <View className="mt-6 flex-row gap-3">
      {step > 0 && <Button fullWidth={false} variant="secondary" style={{ flex: 1 }} onPress={() => setStep(index => index - 1)}>Previous</Button>}
      <Button fullWidth={false} style={{ flex: 1 }} onPress={() => {
        if (step < operatorGuideCards.length - 1) setStep(index => index + 1);
        else finish();
      }}>{step < operatorGuideCards.length - 1 ? 'Next' : 'Finish'}</Button>
    </View>
    <Button className="mt-3" variant="text" onPress={finish}>Exit Walkthrough</Button>
  </SettingsFrame>;
}
