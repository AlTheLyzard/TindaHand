import { useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type TextInputInstance, type TextInputProps, type ViewStyle } from 'react-native';
import { KeyboardInput } from '@/components/ui/keyboard-aware-scroll-view';
import { IconButton } from '@/components/ui/button';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';

type SearchBarProps = Omit<TextInputProps, 'style'> & {
  inputRef?: Ref<TextInputInstance>;
  label: string;
  results?: ReactNode;
  onClear?: () => void;
  clearLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Shared search field with an optional floating autocomplete result list. */
export function SearchBar({ inputRef, label, results, onClear, clearLabel = 'Clear search', containerStyle, onFocus, onBlur, ...props }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const { fontScale } = useWindowDimensions();
  const inputLineHeight = tokens.typography.bodyPrimary.lineHeight * fontScale;
  const inputHeight = Math.max(tokens.size.touchTarget, inputLineHeight + tokens.spacing.two);
  return <View style={[styles.root, containerStyle]}>
    <View style={[styles.field, { borderColor: focused ? tokens.color.brightBlue : tokens.color.borderOutline }]}>
      <View accessible={false} style={styles.searchIcon}><PosIcon name="search" size={20} color={tokens.color.textSecondary} /></View>
      <KeyboardInput {...props} ref={inputRef} accessibilityLabel={label}
        placeholderTextColor={props.placeholderTextColor ?? tokens.color.textPlaceholder}
        autoCorrect={false} autoCapitalize="none" returnKeyType={props.returnKeyType ?? 'search'}
        onFocus={event => { setFocused(true); onFocus?.(event); }}
        onBlur={event => { setFocused(false); onBlur?.(event); }}
        className="min-w-0 flex-1 type-body-primary text-text-primary web:focus:outline-none"
        style={{ minWidth: 0, flex: 1, height: inputHeight, paddingVertical: 0, paddingHorizontal: 0, textAlignVertical: 'center', includeFontPadding: false,
          fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.bodyPrimary.fontSize, lineHeight: inputLineHeight, color: tokens.color.textPrimary }} />
      {!!props.value && onClear && <IconButton accessibilityLabel={clearLabel} onPress={onClear} icon={({ color, size }) => <PosIcon name="close" color={color} size={size} />} />}
    </View>
    {!!results && <View style={styles.results}>{results}</View>}
  </View>;
}

const styles = StyleSheet.create({
  root: { position: 'relative', zIndex: 20 },
  field: {
    minHeight: tokens.size.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.two,
    borderWidth: 1,
    borderRadius: tokens.radius.control,
    backgroundColor: tokens.color.surfaceCard,
    paddingHorizontal: tokens.spacing.two,
  },
  searchIcon: { width: 20, height: 20, marginHorizontal: 2, justifyContent: 'center' },
  results: {
    position: 'absolute',
    top: tokens.size.touchTarget + tokens.spacing.one,
    left: 0,
    right: 0,
    zIndex: 30,
    borderRadius: tokens.radius.control,
    borderWidth: 1,
    borderColor: tokens.color.iceContainer,
    backgroundColor: tokens.color.surfaceCard,
    overflow: 'hidden',
  },
});
