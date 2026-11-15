import type { ComponentProps } from 'react';
import { IconButton } from '@/components/ui/button';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';
import { useTranslation } from '@/i18n/use-translation';

type Props = Pick<ComponentProps<typeof IconButton>, 'onPress' | 'disabled' | 'style'> & {
  accessibilityLabel?: string;
};

/** Fixed geometry prevents a stretched header or sheet from stretching press feedback. */
export function BackButton({ accessibilityLabel, disabled, style, ...props }: Props) {
  const { t } = useTranslation();
  return <IconButton {...props} accessibilityLabel={accessibilityLabel ?? t('common.back')} disabled={disabled}
    interactionBackgroundColor={tokens.color.accentContainer}
    style={[style, { width: tokens.size.touchTarget, height: tokens.size.touchTarget,
      minWidth: tokens.size.touchTarget, minHeight: tokens.size.touchTarget,
      flexGrow: 0, flexShrink: 0, alignSelf: 'flex-start', padding: 0,
      borderRadius: tokens.radius.pill, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }]}
    icon={() => <PosIcon name="back" size={24} color={disabled ? tokens.button.primary.disabledText : tokens.button.primary.default} />} />;
}
