import { router } from 'expo-router';
import { Image, ScrollView, Text, View } from 'react-native';
import { AuthBackground } from '@/components/auth/auth-background';

import { Button } from '@/components/ui/button';

function handleGetStarted() {
  router.navigate('/register');
}

function handleExistingAccount() {
  router.navigate('/choose-account');
}

export default function WelcomeScreen() {
  return (
    <AuthBackground headerWave>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-[480px] flex-1 self-center px-5 pb-32 pt-8" style={{ minHeight: 660 }}>
          <View className="flex-1 items-center justify-center py-10">
            <Image
              source={require('@/assets/images/brand/tindahand-mark.png')}
              style={{ width: 200, height: 200, maxWidth: '100%', aspectRatio: 1 }}
              resizeMode="contain"
              accessible={false}
              importantForAccessibility="no"
            />
            <Text
              accessibilityRole="header"
              className="mt-7 text-center type-h1-display leading-[44px] text-brand">
              TindaHand
            </Text>
            <Text className="mt-1 text-center type-list-financial leading-6 text-brand">
              Your sari-sari store, made easier.
            </Text>
          </View>

          <View className="gap-2">
            <Button
              onPress={handleGetStarted}
              accessibilityHint="Opens the Create May-Ari Account form.">
              Get started
            </Button>
            <Button
              variant="secondary"
              onPress={handleExistingAccount}
              accessibilityLabel="I Have an Account"
              accessibilityHint="Opens account selection for May-Ari or Kahera login.">
              I have an account
            </Button>
          </View>
        </View>
      </ScrollView>
    </AuthBackground>
  );
}
