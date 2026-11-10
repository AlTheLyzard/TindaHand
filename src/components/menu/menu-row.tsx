import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useId } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type DerivedValue } from 'react-native-reanimated';
import { MenuIcon } from '@/components/menu/menu-icon';
import type { MenuDescriptionFrame, OwnerTool } from '@/types/menu';

function DescriptionCharacter({ character, index, optionIndex, frame }: {
  character: string; index: number; optionIndex: number; frame: DerivedValue<MenuDescriptionFrame>;
}) {
  const ink = useAnimatedStyle(() => ({
    color: index < frame.value.characters[optionIndex] ? '#4A607A' : 'transparent',
  }));
  // Keep every glyph in text layout; only its ink changes, directly on the UI thread.
  return <Animated.Text style={[styles.description, ink]}>{character}</Animated.Text>;
}

export function MenuRow({ tool, selected = false, onPress, optionIndex, frame, preparing }: {
  tool: OwnerTool; selected?: boolean; onPress: () => void; optionIndex: number; frame: DerivedValue<MenuDescriptionFrame>; preparing: boolean;
}) {
  const descriptionHeight = useSharedValue(0);
  const hasDescription = !!tool.subtitle;
  // Center the title within its existing text block while keeping the full block in layout.
  const titleStyle = useAnimatedStyle(() => ({ transform: [{ translateY: hasDescription
    ? frame.value.titleProgress * (descriptionHeight.value + 4) / 2 : 0 }] }));
  const hintId = useId();
  const hint = `${tool.subtitle ? `${tool.subtitle}. ` : ''}${tool.temporaryMessage ? 'Opens a temporary destination. This feature is not fully available yet.' : `Opens ${tool.label}.`}`;
  return <Pressable testID={`menu-option-${tool.id}`} accessibilityRole="button" accessibilityLabel={tool.label}
    accessibilityHint={hint} accessibilityState={{ selected }} aria-selected={selected} {...(Platform.OS === 'web' ? { 'aria-describedby': hintId } : {})}
    onPress={onPress} className="min-h-[72px] flex-row items-center gap-3 rounded-surface px-3 py-3" style={{ backgroundColor: selected ? '#B8CCE4' : '#FFFFFF' }}>
    <MenuIcon name={tool.icon} />
    <View className="min-w-0 flex-1 gap-1">
      <Animated.Text testID={`menu-title-${tool.id}`} style={[styles.title, titleStyle]}>{tool.label}</Animated.Text>
      {tool.subtitle && <View testID={`menu-description-${tool.id}`} pointerEvents="none" accessible={false}
        onLayout={event => descriptionHeight.set(event.nativeEvent.layout.height)}
        accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
        style={preparing ? styles.preparing : undefined}>
        <Text style={styles.description}>
          {Array.from(tool.subtitle).map((character, index) => <DescriptionCharacter key={index}
            character={character} index={index} optionIndex={optionIndex} frame={frame} />)}
        </Text>
      </View>}
    </View>
    {tool.id !== 'settings' && <MenuIcon name="chevronRight" />}
    {Platform.OS === 'web' && <Text nativeID={hintId} style={{ display: 'none' }}>{hint}</Text>}
  </Pressable>;
}

const styles = StyleSheet.create({
  title: { fontFamily: 'Poppins_400Regular', fontSize: 16, lineHeight: 24, color: '#102342' },
  description: { fontFamily: 'Poppins_400Regular', fontSize: 10, lineHeight: 15, color: 'transparent' },
  // Mask retained native text until the new opening has reset its UI-thread clock.
  preparing: { opacity: 0 },
});
