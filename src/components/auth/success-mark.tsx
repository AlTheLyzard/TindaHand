import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Text, View } from 'react-native';

export function SuccessMark({ small = false, animate = false }: { small?: boolean; animate?: boolean }) {
  const [first] = useState(() => new Animated.Value(animate ? 0 : 16));
  const [second] = useState(() => new Animated.Value(animate ? 0 : 28));

  useEffect(() => {
    if (!animate || small) return;
    let active = true;
    let finished = false;
    const drawing = Animated.sequence([
      Animated.timing(first, { toValue: 16, duration: 160, useNativeDriver: false }),
      Animated.timing(second, { toValue: 28, duration: 240, useNativeDriver: false }),
    ]);
    const reveal = () => {
      finished = true;
      drawing.stop();
      first.setValue(16);
      second.setValue(28);
    };
    // Wait for the preference before starting; changes to Reduce Motion stop the drawing.
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      if (reduced) reveal();
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || finished) return;
      if (reduced) reveal();
      else drawing.start(() => { finished = true; });
    }).catch(() => { if (active) reveal(); });
    return () => { active = false; subscription.remove(); drawing.stop(); };
  }, [animate, small, first, second]);

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{
      width: small ? 22 : 52, height: small ? 22 : 52, borderRadius: 30,
      backgroundColor: '#BCD1B7', borderWidth: small ? 2 : 3,
      borderColor: '#2B7434', alignItems: 'center', justifyContent: 'center',
    }}>
      {small ? <Text style={{ color: '#28652F', fontSize: 15, lineHeight: 18 }}>✓</Text> : (
        <View style={{ width: 28, height: 16, transform: [{ translateY: -3 }, { rotate: '-45deg' }] }}>
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 4, height: first, borderRadius: 2, backgroundColor: '#28652F' }} />
          <Animated.View style={{ position: 'absolute', left: 0, bottom: 0, width: second, height: 4, borderRadius: 2, backgroundColor: '#28652F' }} />
        </View>
      )}
    </View>
  );
}
