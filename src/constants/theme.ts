import '@/global.css';
import tokens from '@/constants/design-tokens.json';
import { Platform } from 'react-native';

/** The updated specification defines a single shared light surface palette. */
const lightColors = {
  text: tokens.color.textPrimary,
  background: tokens.color.appBackground,
  backgroundElement: tokens.color.surfaceCard,
  backgroundSelected: tokens.color.accentContainer,
  textSecondary: tokens.color.textSecondary,
  textPlaceholder: tokens.color.textPlaceholder,
  textDisabled: tokens.color.textDisabled,
  textInverse: tokens.color.textInverse,
  appBackground: tokens.color.appBackground,
  surfaceCard: tokens.color.surfaceCard,
  surfaceSubtle: tokens.color.surfaceSubtle,
  darkNavy: tokens.color.darkNavy,
  royalBlue: tokens.color.royalBlue,
  deepRoyalBlue: tokens.color.deepRoyalBlue,
  brightBlue: tokens.color.brightBlue,
  softBlue: tokens.color.softBlue,
  accentBase: tokens.color.accentBase,
  accentContainer: tokens.color.accentContainer,
  black: tokens.color.black,
  mutedSage: tokens.color.mutedSage,
  primaryDisabled: tokens.color.primaryDisabled,
  iceContainer: tokens.color.iceContainer,
  borderOutline: tokens.color.borderOutline,
  navigationSurface: tokens.color.navigationSurface,
  navigationBorder: tokens.color.navigationBorder,
  mainNavigationSurface: tokens.color.mainNavigationSurface,
  mainNavigationBorder: tokens.color.mainNavigationBorder,
  success: tokens.color.successBase,
  successHover: tokens.color.successHover,
  successPressed: tokens.color.successPressed,
  successTint: tokens.color.successTint,
  warning: tokens.color.warningBase,
  warningText: tokens.color.warningText,
  warningTint: tokens.color.warningTint,
  error: tokens.color.errorBase,
  errorHover: tokens.color.errorHover,
  errorPressed: tokens.color.errorPressed,
  errorTint: tokens.color.errorTint,
  destructive: tokens.button.destructive.default,
  destructiveHover: tokens.button.destructive.hover,
  destructivePressed: tokens.button.destructive.pressed,
  positive: tokens.button.positive.default,
  positiveHover: tokens.button.positive.hover,
  positivePressed: tokens.button.positive.pressed,
  destructiveOutline: tokens.button.destructiveOutline.default,
  destructiveOutlineHover: tokens.button.destructiveOutline.hover,
  destructiveOutlinePressed: tokens.button.destructiveOutline.pressed,
  primaryHover: tokens.button.primary.hover,
  primaryPressed: tokens.button.primary.pressed,
} as const;

export const Colors = {
  light: lightColors,
  dark: lightColors,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  sans: tokens.typography.weights.regular,
  serif: tokens.typography.weights.regular,
  rounded: tokens.typography.weights.regular,
  mono: 'monospace',
} as const;

export const Spacing = tokens.spacing;
export const BorderRadius = tokens.radius;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
