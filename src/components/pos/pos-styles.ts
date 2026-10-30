import { StyleSheet } from 'react-native';

import tokens from '@/constants/design-tokens.json';

export const posStyles = StyleSheet.create({
  action: {
    minHeight: tokens.size.touchTarget,
    borderRadius: tokens.radius.control,
    borderWidth: 1,
    boxShadow: '0 2px 4px rgba(17, 47, 111, 0.28)',
  },
});
