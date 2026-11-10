import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Shared decorative assets only; all controls and content remain live native UI. */
export function AuthBackground({ children, headerWave = false }: { children: ReactNode; headerWave?: boolean }) {
  return <View style={{ flex: 1, backgroundColor: '#F0F8FF' }}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Image source={require('@/assets/images/auth/background.png')} resizeMode="stretch" style={{ width: '100%', height: '100%' }} />
      {headerWave && <Image source={require('@/assets/images/auth/header-background.png')} resizeMode="stretch" style={{ position: 'absolute', top: 0, width: '100%', height: 200 }} />}
    </View>
    <SafeAreaView style={{ flex: 1 }}>{children}</SafeAreaView>
  </View>;
}
