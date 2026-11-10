import { ScrollView, Text, View } from 'react-native';
import { AccountRoleCard, accountOptions } from './account-role-card';
import { AuthBackground } from './auth-background';
import { AuthHeader } from './auth-header';
import { useAuthFlow } from '@/state/auth-flow';
import type { AccountRole } from '@/types/auth';

export function AccountChoiceScreen({ onBack, onSelect }: { onBack: () => void; onSelect: (role: AccountRole) => void }) {
  const { selectedRole, setSelectedRole } = useAuthFlow();
  return <AuthBackground headerWave><ScrollView contentContainerStyle={{ flexGrow: 1 }}>
    <View className="w-full max-w-[460px] flex-1 self-center px-5 pb-5 pt-5">
      <AuthHeader onBack={onBack} />
      <Text className="mt-8 font-poppins-bold text-[22px] text-[#2D6DCF]">Welcome Back!</Text>
      <Text accessibilityRole="header" className="mt-12 font-poppins-bold text-[28px] leading-[40px] text-brand">Choose your Account</Text>
      <Text className="mt-1 font-poppins text-[10px] leading-[15px] text-black">Select your role and enter your credentials.</Text>
      <View className="mt-6 gap-7">{accountOptions.map(option => <AccountRoleCard key={option.role} option={option} selected={selectedRole === option.role} onPress={role => { setSelectedRole(role); onSelect(role); }} />)}</View>
      <Text className="mt-4 text-center font-poppins text-[10px] leading-[15px] text-brand">Owners use a password on new devices and a PIN to unlock an authenticated device. Operators use the store’s Owner ID and their assigned PIN.</Text>
      <View className="min-h-24 flex-1" />
    </View>
  </ScrollView></AuthBackground>;
}
