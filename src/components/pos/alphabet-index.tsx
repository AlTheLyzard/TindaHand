import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, type ViewInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { motion } from '@/constants/motion';
import tokens from '@/constants/design-tokens.json';
import { useTranslation } from '@/i18n/use-translation';
import { useMotionReduced } from '@/state/motion';
import { alphabetIndexAtOffset } from '@/utils/alphabet-index';

export const alphabetIndexWidth = 44;
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function AlphabetIndex({ letters, active, onPick, gridStart, scrollY, viewportHeight }: {
  letters: readonly string[]; active: string | null; onPick: (letter: string | null, dragging?: boolean) => void;
  gridStart: SharedValue<number>; scrollY: SharedValue<number>; viewportHeight: SharedValue<number>;
}) {
  const { t } = useTranslation();
  const reduced = useMotionReduced();
  const entries = alphabet;
  const enabled = (letter: string) => letters.includes(letter);
  const track = useRef<ViewInstance>(null);
  const touch = useRef({ down: false, ready: false, pageY: 0, top: 0, height: 0, index: -1 });
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [interacting, setInteracting] = useState(false);
  const emphasis = useSharedValue(0);
  const frozen = useSharedValue(false);
  const frozenTop = useSharedValue(0);
  const frozenHeight = useSharedValue(0);
  const railTop = () => {
    'worklet';
    // Use the list's full height on short screens; never cover the cart sheet.
    return Math.min(Math.max(0, gridStart.value - scrollY.value), Math.max(0, viewportHeight.value - entries.length * 12));
  };
  useEffect(() => () => { if (releaseTimer.current) clearTimeout(releaseTimer.current); }, []);

  const position = useAnimatedStyle(() => {
    const top = frozen.value ? frozenTop.value : railTop();
    const available = frozen.value ? frozenHeight.value : Math.max(0, viewportHeight.value - top);
    const visible = viewportHeight.value > 0;
    return { top, height: visible ? available : 0, opacity: visible ? 1 : 0 };
  });

  function beginEmphasis(letter: string | null) {
    setHighlighted(letter);
    emphasis.set(reduced ? 1 : withTiming(1, { duration: motion.press, easing: motion.ease }));
  }
  function finish() {
    touch.current.down = false;
    touch.current.ready = false;
    setInteracting(false);
    emphasis.set(reduced ? 0 : withTiming(0, { duration: motion.state, easing: motion.ease }));
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    if (reduced) frozen.set(false);
    else releaseTimer.current = setTimeout(() => { frozen.set(false); releaseTimer.current = null; }, motion.state);
  }
  function seek(dragging: boolean) {
    const current = touch.current;
    if (!current.down || !current.ready) return;
    const index = alphabetIndexAtOffset(current.pageY - current.top, current.height, entries.length, current.index);
    if (index < 0 || current.index === index) return;
    current.index = index;
    const letter = entries[index];
    if (!enabled(letter)) return;
    beginEmphasis(letter);
    onPick(letter, dragging);
  }
  function begin(pageY: number) {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    const top = railTop();
    frozenTop.set(top);
    frozenHeight.set(Math.max(0, viewportHeight.value - top));
    frozen.set(true);
    touch.current = { down: true, ready: false, pageY, top: 0, height: 0, index: -1 };
    setHighlighted(active);
    setInteracting(true);
    track.current?.measureInWindow((_x, y, _width, height) => {
      if (!touch.current.down) return;
      touch.current.top = y;
      touch.current.height = height;
      touch.current.ready = true;
      seek(false);
    });
  }
  return <Animated.View testID="alphabet-index" style={[{ position: 'absolute', right: 0, width: alphabetIndexWidth, overflow: 'hidden', justifyContent: 'center' }, position]}>
    <View ref={track} testID="alphabet-index-track" collapsable={false}
      style={{ flex: 1, maxHeight: entries.length * 18, width: alphabetIndexWidth, touchAction: 'none' }}
      onStartShouldSetResponderCapture={() => true} onMoveShouldSetResponderCapture={() => true}
      onResponderGrant={event => begin(event.nativeEvent.pageY)}
      onResponderMove={event => { touch.current.pageY = event.nativeEvent.pageY; seek(true); }}
      onResponderRelease={finish} onResponderTerminate={finish} onResponderTerminationRequest={() => false}>
      {entries.map(letter => <Pressable key={letter} testID={`alphabet-index-${letter}`}
        accessibilityRole="button" accessibilityLabel={t('pos.jumpLetter', { letter })}
        disabled={!enabled(letter)} accessibilityHint={enabled(letter) ? undefined : 'No matching products'}
        accessibilityState={{ disabled: !enabled(letter), selected: enabled(letter) && (interacting ? highlighted : active) === letter }}
        onPress={() => { setHighlighted(letter); emphasis.set(1); onPick(letter, false); finish(); }}
        style={{ flex: 1, minHeight: 0, maxHeight: 18, width: alphabetIndexWidth, alignItems: 'center', justifyContent: 'center' }}>
        <Text maxFontSizeMultiplier={1} style={{ fontFamily: 'Poppins_400Regular', fontSize: 8, lineHeight: 9, color: tokens.color.textSecondary, opacity: enabled(letter) ? 1 : 0.35 }}>{letter}</Text>
        <IndexIndicator letter={letter} selected={enabled(letter) && (interacting ? highlighted : active) === letter} emphasis={emphasis} />
      </Pressable>)}
    </View>
  </Animated.View>;
}

function IndexIndicator({ letter, selected, emphasis }: { letter: string; selected: boolean; emphasis: SharedValue<number> }) {
  const reduced = useMotionReduced();
  const appearance = useAnimatedStyle(() => ({ opacity: selected ? 1 : 0, transform: [{ scaleX: reduced ? 1 : 1 + emphasis.value * 0.08 }] }));
  return <Animated.View testID={`alphabet-index-indicator-${letter}`} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
    style={[{ position: 'absolute', minWidth: 20, height: '100%', maxHeight: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.accentBase }, appearance]}>
    <Text maxFontSizeMultiplier={1} style={{ fontFamily: 'Poppins_700Bold', fontSize: 8, lineHeight: 9, color: tokens.color.surfaceCard }}>{letter}</Text>
  </Animated.View>;
}
