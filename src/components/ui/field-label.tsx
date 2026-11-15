import { Text, useWindowDimensions, type TextProps } from 'react-native';
import tokens from '@/constants/design-tokens.json';

/** Legacy label suffixes are presentation only; validation stays with each form. */
export function fieldLabel(label: string) {
  return label.replace(/\s*\((?:Required|Optional)\)/gi, '').replace(/\s*\*\s*$/, '').trim();
}

export function FieldLabel({ label, required = /\(Required\)|\*\s*$/i.test(label), style, ...props }: TextProps & { label: string; required?: boolean }) {
  const { fontScale } = useWindowDimensions();
  return <Text {...props} accessibilityLabel={`${fieldLabel(label)}${required ? ', required' : ''}`}
    style={[{ fontFamily: 'Poppins_600SemiBold', fontSize: 12, lineHeight: 18 * fontScale, color: tokens.color.textPrimary }, style]}>
    {fieldLabel(label)}{required && <Text style={{ color: '#B42318' }}> *</Text>}
  </Text>;
}
