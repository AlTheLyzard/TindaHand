import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useId } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type DerivedValue } from 'react-native-reanimated';
import { MenuIcon } from '@/components/menu/menu-icon';
import tokens from '@/constants/design-tokens.json';
import type { MenuDescriptionFrame, OwnerTool } from '@/types/menu';

export function MenuRow({ tool, selected = false, onPress, optionIndex, frame, characters, preparing }: {
  tool: OwnerTool; selected?: boolean; onPress: () => void; optionIndex: number; frame: DerivedValue<MenuDescriptionFrame>; characters: number; preparing: boolean;
}) {
  const descriptionHeight = useSharedValue(0);
  const descriptionStyle = useAnimatedStyle(() => ({
    // Collapse only after the last backspace. Normal row layout centers the title
    // as this space disappears; no independent transform can cross the subtitle.
    height: descriptionHeight.value > 0 ? descriptionHeight.value * (1 - frame.value.titleProgress) : undefined,
    display: frame.value.titleProgress === 1 ? 'none' : 'flex',
    // Hide on the UI thread too, even if an RN text update is still queued.
    opacity: preparing || frame.value.characters[optionIndex] === 0 ? 0 : 1,
  }));
  const hintId = useId();
  const hint = `${tool.subtitle ? `${tool.subtitle}. ` : ''}${tool.temporaryMessage ? 'Opens a temporary destination. This feature is not fully available yet.' : `Opens ${tool.label}.`}`;
  return <Pressable testID={`menu-option-${tool.id}`} accessibilityRole="button" accessibilityLabel={tool.label}
    accessibilityHint={hint} accessibilityState={{ selected }} aria-selected={selected} {...(Platform.OS === 'web' ? { 'aria-describedby': hintId } : {})}
    onPress={onPress} className="min-h-[72px] flex-row items-center gap-3 rounded-surface px-3 py-3" style={{ backgroundColor: selected ? tokens.color.primaryDisabled : tokens.color.surfaceCard }}>
    <MenuIcon name={tool.icon} />
    <View className="min-w-0 flex-1">
      <Text testID={`menu-title-${tool.id}`} style={styles.title}>{tool.label}</Text>
      {tool.subtitle && <Animated.View testID={`menu-description-${tool.id}`} pointerEvents="none" accessible={false}
        accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
        style={[styles.descriptionClip, descriptionStyle]}>
        <View onLayout={event => descriptionHeight.set(event.nativeEvent.layout.height)} style={styles.descriptionContent}>
          {/* Reserve the full wrapping height while typing and erasing. */}
          <Text style={[styles.description, styles.measurement]}>{tool.subtitle}</Text>
          {characters > 0 && <Text testID={`menu-description-text-${tool.id}`} style={[styles.description, styles.descriptionText]}>
            {Array.from(tool.subtitle).slice(0, characters).join('')}
          </Text>}
        </View>
      </Animated.View>}
    </View>
    {tool.id !== 'settings' && <MenuIcon name="chevronRight" />}
    {Platform.OS === 'web' && <Text nativeID={hintId} style={{ display: 'none' }}>{hint}</Text>}
  </Pressable>;
}

const styles = StyleSheet.create({
  title: { fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.bodyPrimary.fontSize, lineHeight: 24, color: tokens.color.textPrimary },
  description: { fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.helper.fontSize, lineHeight: 15, color: tokens.color.textSecondary },
  descriptionClip: { overflow: 'hidden' },
  descriptionContent: { paddingTop: tokens.spacing.one },
  measurement: { opacity: 0 },
  descriptionText: { position: 'absolute', top: tokens.spacing.one, left: 0, right: 0 },
});
