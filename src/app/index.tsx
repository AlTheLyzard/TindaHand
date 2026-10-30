import { router } from 'expo-router';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';

function handleGetStarted() {
  router.navigate('/register');
}

function handleExistingAccount() {
  router.navigate('/choose-account');
}

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F8FF' }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-[480px] flex-1 self-center px-5 pb-4 pt-12" style={{ minHeight: 660 }}>
          <Text className="max-w-[340px] self-center text-center font-poppins text-[16px] leading-6 text-action">
            Manage inventory, track sales, and grow your business with ease.
          </Text>

          <View className="flex-1 items-center justify-center py-10">
            <Image
              source={require('@/assets/images/brand/tindahand-mark.png')}
              style={{ width: 180, height: 180, maxWidth: '100%', aspectRatio: 1 }}
              resizeMode="contain"
              accessible={false}
              importantForAccessibility="no"
            />
            <Text
              accessibilityRole="header"
              className="mt-7 text-center font-poppins-bold text-[32px] leading-[44px] text-brand">
              TindaHand
            </Text>
            <Text className="mt-1 text-center font-poppins-bold text-[16px] leading-6 text-brand">
              Your sari-sari store, made easier.
            </Text>
          </View>

          <View className="gap-2">
            <Button
              onPress={handleGetStarted}
              accessibilityHint="Opens the Create May-Ari Account form.">
              Get Started
            </Button>
            <Button
              variant="secondary"
              onPress={handleExistingAccount}
              accessibilityLabel="I Have an Account"
              accessibilityHint="Opens account selection for May-Ari or Kahera login.">
              I have an account
            </Button>
          </View>
          <Text className="mt-6 text-center font-poppins text-[12px] leading-[18px] text-text-secondary">
            TindaHand - Para sa iyong tindahan.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
