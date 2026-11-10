import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, type ViewInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { motion } from '@/constants/motion';
import tokens from '@/constants/design-tokens.json';
import { useTranslation } from '@/i18n/use-translation';
import { useMotionReduced } from '@/state/motion';
import { alphabetIndexAtOffset } from '@/utils/alphabet-index';

export const alphabetIndexWidth = 44;

export function AlphabetIndex({ letters, active, onPick, gridStart, scrollY, viewportHeight }: {
  letters: readonly string[]; active: string | null; onPick: (letter: string | null, dragging?: boolean) => void;
  gridStart: SharedValue<number>; scrollY: SharedValue<number>; viewportHeight: SharedValue<number>;
}) {
  const { t } = useTranslation();
  const reduced = useMotionReduced();
  const entries = [null, ...letters];
  const track = useRef<ViewInstance>(null);
  const touch = useRef({ down: false, ready: false, pageY: 0, top: 0, height: 0, index: -1 });
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [interacting, setInteracting] = useState(false);
  const emphasis = useSharedValue(0);
  const frozen = useSharedValue(false);
  const frozenTop = useSharedValue(0);
  const frozenHeight = useSharedValue(0);
  useEffect(() => () => { if (releaseTimer.current) clearTimeout(releaseTimer.current); }, []);

  const position = useAnimatedStyle(() => {
    const top = frozen.value ? frozenTop.value : Math.min(viewportHeight.value, Math.max(0, gridStart.value - scrollY.value));
    const available = frozen.value ? frozenHeight.value : Math.max(0, viewportHeight.value - top);
    // On a very short viewport, reveal the rail once the grid has scrolled into view.
    const visible = gridStart.value > 0 && available >= Math.min(entries.length * 24, viewportHeight.value);
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
    beginEmphasis(letter);
    onPick(letter, dragging);
  }
  function begin(pageY: number) {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    const top = Math.min(viewportHeight.value, Math.max(0, gridStart.value - scrollY.value));
    frozenTop.set(top);
    frozenHeight.set(Math.max(0, viewportHeight.value - top));
    frozen.set(true);
    touch.current = { down: true, ready: false, pageY, top: 0, height: 0, index: -1 };
    setInteracting(true);
    track.current?.measureInWindow((_x, y, _width, height) => {
      if (!touch.current.down) return;
      touch.current.top = y;
      touch.current.height = height;
      touch.current.ready = true;
      seek(false);
    });
  }
  if (!letters.length) return null;
  return <Animated.View testID="alphabet-index" style={[{ position: 'absolute', right: 0, width: alphabetIndexWidth, overflow: 'hidden', justifyContent: 'center' }, position]}>
    <View ref={track} testID="alphabet-index-track" collapsable={false}
      style={{ flex: 1, maxHeight: entries.length * 44, width: alphabetIndexWidth, touchAction: 'none' }}
      onStartShouldSetResponderCapture={() => true} onMoveShouldSetResponderCapture={() => true}
      onResponderGrant={event => begin(event.nativeEvent.pageY)}
      onResponderMove={event => { touch.current.pageY = event.nativeEvent.pageY; seek(true); }}
      onResponderRelease={finish} onResponderTerminate={finish} onResponderTerminationRequest={() => false}>
      {entries.map(letter => <Pressable key={letter ?? 'all'} testID={`alphabet-index-${letter ?? 'all'}`}
        accessibilityRole="button" accessibilityLabel={letter ? t('pos.jumpLetter', { letter }) : t('pos.indexTop')}
        accessibilityState={{ selected: (interacting ? highlighted : active) === letter }}
        onPress={() => { setHighlighted(letter); emphasis.set(1); onPick(letter, false); finish(); }}
        style={{ flex: 1, maxHeight: 44, width: alphabetIndexWidth, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: letter ? 10 : 8, lineHeight: 14, color: active === letter ? '#245399' : '#4A607A', opacity: 0.65 }}>{letter ?? t('pos.all')}</Text>
        <IndexIndicator letter={letter ?? t('pos.all')} selected={(interacting ? highlighted : active) === letter} emphasis={emphasis} />
      </Pressable>)}
    </View>
  </Animated.View>;
}

function IndexIndicator({ letter, selected, emphasis }: { letter: string; selected: boolean; emphasis: SharedValue<number> }) {
  const reduced = useMotionReduced();
  const appearance = useAnimatedStyle(() => ({ opacity: selected ? 1 : 0, transform: [{ scale: reduced ? 1 : 1 + emphasis.value * 0.08 }] }));
  return <Animated.View testID={`alphabet-index-indicator-${letter}`} pointerEvents="none" accessible={false}
    style={[{ position: 'absolute', minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.accentBase }, appearance]}>
    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, lineHeight: 16, color: tokens.color.surfaceCard }}>{letter}</Text>
  </Animated.View>;
}
