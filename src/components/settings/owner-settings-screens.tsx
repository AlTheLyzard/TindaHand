import tokens from '@/constants/design-tokens.json';
import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { MotionModal } from '@/components/ui/motion-modal';
import { PosIcon } from '@/components/pos/pos-icon';
import { ReplayWalkthroughIllustration } from '@/components/settings/replay-walkthrough-illustration';
import { SettingsCard, SettingsDescription } from '@/components/settings/settings-ui';
import { SettingsFrame, settingsRoot } from '@/components/settings/settings-frame';

const ownerGuideCards = [
  {
    title: 'Dashboard & Quick Add',
    description: 'Review sales, stock health, and recent activity, then use Quick Add to start common store tasks.',
  },
  {
    title: 'Point of Sale (POS)',
    description: 'Select products, manage your cart, choose a payment method, and confirm customer purchases.',
  },
  {
    title: 'Inventory & Asset Management',
    description: 'Monitor stock and expiration dates, update products, and manage store assets.',
  },
  {
    title: 'Debts, Expenses & Reports',
    description: 'Record customer and store debts and payments, add expenses, and review transactions and financial statements.',
  },
  {
    title: 'Profile & Settings',
    description: 'Manage your profile, Operator access and permissions, and the available app settings.',
  },
] as const;

export function OwnerAppGuideScreen() {
  return <SettingsFrame title="App Guide & Tutorial" parent={settingsRoot}>
    <SettingsDescription>
      Welcome to TindaHand! This quick guide will help you understand the Owner module&apos;s main features and how to use them.
    </SettingsDescription>
    <View className="gap-4">
      {ownerGuideCards.map(card => <SettingsCard key={card.title}>
        <View className="gap-3">
          <Text accessibilityRole="header" className=" type-list-financial leading-6 text-brand">{card.title}</Text>
          <Text className=" type-micro-financial-rate leading-[22px] text-text-secondary">{card.description}</Text>
        </View>
      </SettingsCard>)}
    </View>
  </SettingsFrame>;
}

export function OwnerReplayWalkthroughScreen() {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const close = () => setConfirmationOpen(false);
  return <>
    <SettingsFrame title="Replay App Walkthrough" parent={settingsRoot}>
      <View className="items-center">
        <ReplayWalkthroughIllustration />
        <Text accessibilityRole="header" className="mt-2 text-center type-title-accent leading-[30px] text-brand">
          Take a Quick Tour Again!
        </Text>
        <Text className="mt-3 text-center type-micro-financial-rate leading-[22px] text-text-secondary">
          Want to get familiar with TindaHand again? Replay the Owner walkthrough to revisit the app&apos;s main features and how they work.
        </Text>
        <Text className="mt-5 text-center type-micro-caption leading-[18px] text-text-secondary">
          You can exit the walkthrough anytime.
        </Text>
        <Button className="mt-4" onPress={() => setConfirmationOpen(true)}>Start Walkthrough</Button>
      </View>
    </SettingsFrame>
    <MotionModal visible={confirmationOpen} onRequestClose={close} backdropColor={tokens.overlay.navy}>
      <View className="flex-1 justify-center px-6 py-8" onAccessibilityEscape={close}>
        <ConfirmationContent title="Replay Walkthrough?" titleColor={tokens.color.darkNavy}
          leadingIcon={<View className="h-8 w-8 items-center justify-center rounded-pill bg-brand"><PosIcon name="history" size={20} color={tokens.color.surfaceCard} /></View>}
          message="Would you like to go through the TindaHand Owner introduction again?" cancelLabel="Cancel" confirmLabel="Start"
          destructive={false} cancelVariant="secondary" onCancel={close} onConfirm={() => {
            close();
            router.push('/owner-menu/settings/walkthrough');
          }} />
      </View>
    </MotionModal>
  </>;
}

export function OwnerWalkthroughScreen() {
  const [step, setStep] = useState(0);
  const current = ownerGuideCards[step];
  function finish() {
    router.dismissTo(settingsRoot);
  }
  return <SettingsFrame title={current.title} parent={settingsRoot}>
    <Text className="mb-5 type-micro-caption leading-[18px] text-text-secondary">Step {step + 1} of {ownerGuideCards.length}</Text>
    <SettingsCard>
      <Text className=" type-micro-financial-rate leading-[22px] text-text-secondary">{current.description}</Text>
    </SettingsCard>
    <View className="mt-6 flex-row gap-3">
      {step > 0 && <Button fullWidth={false} variant="secondary" style={{ flex: 1 }} onPress={() => setStep(index => index - 1)}>Previous</Button>}
      <Button fullWidth={false} style={{ flex: 1 }} onPress={() => {
        if (step < ownerGuideCards.length - 1) setStep(index => index + 1);
        else finish();
      }}>{step < ownerGuideCards.length - 1 ? 'Next' : 'Finish'}</Button>
    </View>
    <Button className="mt-3" variant="text" onPress={finish}>Exit Walkthrough</Button>
  </SettingsFrame>;
}
