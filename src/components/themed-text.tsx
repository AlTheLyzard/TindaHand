import { StyleSheet, Text, type TextProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import tokens from '@/constants/design-tokens.json';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'], fontFamily: tokens.typography.weights.regular },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: tokens.typography.microCaption.fontSize,
    lineHeight: tokens.typography.microCaption.lineHeight,
    fontFamily: tokens.typography.weights.regular,
  },
  smallBold: {
    fontSize: tokens.typography.labelNav.fontSize,
    lineHeight: tokens.typography.labelNav.lineHeight,
    fontFamily: tokens.typography.weights.semibold,
  },
  default: {
    fontSize: tokens.typography.bodyPrimary.fontSize,
    lineHeight: tokens.typography.bodyPrimary.lineHeight,
    fontFamily: tokens.typography.weights.regular,
  },
  title: {
    fontSize: tokens.typography.h1Display.fontSize,
    fontFamily: tokens.typography.weights.bold,
    lineHeight: tokens.typography.h1Display.lineHeight,
  },
  subtitle: {
    fontSize: tokens.typography.h2Section.fontSize,
    lineHeight: tokens.typography.h2Section.lineHeight,
    fontFamily: tokens.typography.weights.semibold,
  },
  link: {
    lineHeight: tokens.typography.buttonCta.lineHeight,
    fontSize: tokens.typography.buttonCta.fontSize,
  },
  linkPrimary: {
    lineHeight: tokens.typography.buttonCta.lineHeight,
    fontSize: tokens.typography.buttonCta.fontSize,
    color: tokens.color.brightBlue,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: tokens.typography.microCaption.fontSize,
  },
});
