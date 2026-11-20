import type { ColorValue } from 'react-native';

export type FormFieldMaskStateInput = {
  password?: boolean;
  passwordIndicators?: boolean;
  pin?: boolean;
  pinIndicators?: boolean;
  pinVisibilityToggle?: boolean;
  value?: string;
  caretHidden?: boolean;
  selectionColor?: ColorValue;
  accentColor: ColorValue;
  visible: boolean;
};

export function getFormFieldMaskState({ password, passwordIndicators, pin, pinIndicators, pinVisibilityToggle, value, caretHidden, selectionColor, accentColor, visible }: FormFieldMaskStateInput) {
  const hasValue = (value?.length ?? 0) > 0;
  const showPinIndicators = Boolean(pin && pinIndicators && !visible);
  const showPasswordIndicators = Boolean(password && passwordIndicators && !visible && hasValue);
  const showMaskIndicators = showPinIndicators || showPasswordIndicators;
  return {
    hasValue,
    showPinIndicators,
    showPasswordIndicators,
    showMaskIndicators,
    textColor: showMaskIndicators ? 'transparent' : undefined,
    hidePlaceholder: showPinIndicators || Boolean(password && hasValue),
    secureTextEntry: Boolean((pin && !(pinVisibilityToggle && visible)) || (password && !visible)),
    caretHidden: showPinIndicators || (showPasswordIndicators ? false : caretHidden),
    selectionColor: showPinIndicators ? 'transparent' : showPasswordIndicators ? accentColor : selectionColor,
  };
}
