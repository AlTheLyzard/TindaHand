import { cssInterop } from 'nativewind';
import { createContext, useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput, View, type KeyboardAvoidingViewProps,
  type KeyboardEvent, type ScrollViewInstance, type ScrollViewProps, type TextInputInstance, type TextInputProps, type ViewInstance, type ViewProps } from 'react-native';
import { MotionLayout } from '@/components/ui/motion-content';
import { focusedFieldScroll } from '@/utils/keyboard';

type Focused = { input: TextInputInstance; region: ViewInstance | TextInputInstance; scrollAfter?: number };
type Controller = { focus: (field: Focused) => void; blur: (input: TextInputInstance) => void; update: () => void };
const ScrollContext = createContext<Controller | null>(null);
const FieldContext = createContext<{ region: { current: ViewInstance | null }; scrollAfter: number } | null>(null);

/** Measure the screen-to-viewport distance once, including custom headers and
 * safe areas. Explicit caller offsets (POS) win; never stack the two values. */
export function KeyboardViewport({ keyboardVerticalOffset, behavior, ...props }: KeyboardAvoidingViewProps) {
  const host = useRef<ViewInstance>(null);
  const [top, setTop] = useState(0);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  return <View ref={host} collapsable={false} style={{ flex: 1, minHeight: 0 }}
    onLayout={() => host.current?.measureInWindow((_x, y) => { if (live.current) setTop(previous => Math.abs(previous - y) > 1 ? y : previous); })}>
    {/* NativeWind emits flex longhands that override height avoidance's flex: 0.
        Padding keeps the Android scroll viewport bounded above the IME. */}
    <KeyboardAvoidingView {...props} behavior={Platform.OS === 'android' && behavior === 'height' ? 'padding' : behavior}
      keyboardVerticalOffset={keyboardVerticalOffset ?? top} />
  </View>;
}
cssInterop(KeyboardViewport, { className: 'style', contentContainerClassName: 'contentContainerStyle' });

/** Complements the host's existing KeyboardAvoidingView. It adds no offsets or
 * padding, and never focuses an input. Horizontal scrollers keep the outer scope. */
export function KeyboardAwareScrollView({ ref, keyboardScrollEnabled = true, onLayout, onScroll,
  onContentSizeChange, children, ...props }: ScrollViewProps & { ref?: Ref<ScrollViewInstance>; keyboardScrollEnabled?: boolean }) {
  const scroll = useRef<ScrollViewInstance>(null);
  useImperativeHandle(ref, () => scroll.current!, []);
  const parent = useContext(ScrollContext);
  const focused = useRef<Focused | null>(null);
  const offset = useRef(0);
  const contentHeight = useRef<number | undefined>(undefined);
  const keyboardTop = useRef(Infinity);
  const frame = useRef<number | null>(null);
  const settled = useRef<ReturnType<typeof setTimeout> | null>(null);
  const live = useRef(false);
  const enabled = keyboardScrollEnabled && !props.horizontal;
  const canScroll = useRef(enabled);
  const measurement = useRef(0);
  const invalidateMeasurement = useCallback(() => { measurement.current++; }, []);
  useLayoutEffect(() => { canScroll.current = enabled; invalidateMeasurement(); }, [enabled, invalidateMeasurement]);
  const measure = useCallback(() => {
    const version = measurement.current;
    const field = focused.current;
    const host = scroll.current;
    if (!live.current || !enabled || !host || !field?.input.isFocused()) return;
    host.measureInWindow((_x, top, width, height) => {
      if (width <= 0 || height <= 0) return;
      field.region.measureInWindow((_fx, fieldTop, _fw, fieldHeight) => {
        field.input.measureInWindow((_ix, inputTop, _iw, inputHeight) => {
          if (!live.current || !canScroll.current || version !== measurement.current || focused.current !== field || !field.input.isFocused()) return;
          const next = focusedFieldScroll({ viewport: { top, height }, field: { top: fieldTop, height: fieldHeight },
            input: { top: inputTop, height: inputHeight }, offset: offset.current, keyboardTop: keyboardTop.current,
            contentHeight: contentHeight.current, scrollAfter: field.scrollAfter ?? 0 });
          if (Math.abs(next - offset.current) > 1) {
            invalidateMeasurement();
            offset.current = next;
            host.scrollTo({ y: next, animated: false });
          }
        });
      });
    });
  }, [enabled, invalidateMeasurement]);
  const update = useCallback(() => {
    if (!live.current || !enabled || !focused.current) return;
    invalidateMeasurement();
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => { frame.current = null; measure(); });
    // Native keyboard/layout animations can finish after the first measurement.
    if (settled.current !== null) clearTimeout(settled.current);
    settled.current = setTimeout(measure, 260);
  }, [enabled, invalidateMeasurement, measure]);
  useEffect(() => {
    if (props.horizontal) return;
    live.current = true;
    const changed = (event: KeyboardEvent) => { keyboardTop.current = event.endCoordinates.screenY; update(); };
    const hidden = () => { keyboardTop.current = Infinity; update(); };
    const names = Platform.OS === 'ios' ? ['keyboardWillChangeFrame', 'keyboardDidChangeFrame', 'keyboardDidShow'] as const : ['keyboardDidShow'] as const;
    const subscriptions = names.map(name => Keyboard.addListener(name, changed));
    subscriptions.push(Keyboard.addListener('keyboardDidHide', hidden));
    const metrics = Keyboard.metrics?.();
    keyboardTop.current = metrics?.screenY ?? Infinity;
    update();
    return () => {
      live.current = false;
      invalidateMeasurement();
      subscriptions.forEach(subscription => subscription.remove());
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (settled.current !== null) clearTimeout(settled.current);
    };
  }, [invalidateMeasurement, props.horizontal, update]);
  const controller = useMemo<Controller>(() => ({
    focus(field) { focused.current = field; update(); },
    blur(input) { if (focused.current?.input === input) { focused.current = null; invalidateMeasurement(); } },
    update,
  }), [invalidateMeasurement, update]);
  return <ScrollContext.Provider value={props.horizontal ? parent : controller}>
    <ScrollView {...props} testID={props.testID ?? 'keyboard-scroll'} ref={scroll} automaticallyAdjustKeyboardInsets={false}
      keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? 'handled'} scrollEventThrottle={props.scrollEventThrottle ?? 16}
      // RN Web's on-drag implementation dismisses on *every* scroll event,
      // including scrollTo. Dismiss only actual touch drags in the browser.
      keyboardDismissMode={Platform.OS === 'web' && props.keyboardDismissMode === 'on-drag' ? 'none' : props.keyboardDismissMode}
      onTouchMove={event => { props.onTouchMove?.(event); if (Platform.OS === 'web' && props.keyboardDismissMode === 'on-drag') Keyboard.dismiss(); }}
      onLayout={event => { onLayout?.(event); update(); }}
      onContentSizeChange={(width, height) => { contentHeight.current = height; onContentSizeChange?.(width, height); update(); }}
      onScroll={event => {
        invalidateMeasurement();
        offset.current = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
        // Native focus/IME scrolling can invalidate in-flight measurements.
        // Reconcile after its last scroll event instead of losing that update.
        if (focused.current && keyboardTop.current !== Infinity) {
          if (settled.current !== null) clearTimeout(settled.current);
          settled.current = setTimeout(measure, 120);
        }
      }}>
      {children}
    </ScrollView>
  </ScrollContext.Provider>;
}
cssInterop(KeyboardAwareScrollView, { className: 'style', contentContainerClassName: 'contentContainerStyle' });

/** Same layout wrapper as existing fields; includes their label/help/error. */
export function KeyboardField({ scrollAfter = 0, onLayout, ...props }: ViewProps & { scrollAfter?: number }) {
  const region = useRef<ViewInstance>(null);
  const controller = useContext(ScrollContext);
  const fieldContext = useMemo(() => ({ region, scrollAfter }), [scrollAfter]);
  return <FieldContext.Provider value={fieldContext}>
    <MotionLayout testID="keyboard-field" {...props} ref={region} onLayout={event => { onLayout?.(event); controller?.update(); }} />
  </FieldContext.Provider>;
}
cssInterop(KeyboardField, { className: 'style' });

/** Controlled TextInput adapter: values, refs, selection and caller events stay native. */
export function KeyboardInput({ ref, onFocus, onBlur, onContentSizeChange, onLayout, onSelectionChange, ...props }: TextInputProps & { ref?: Ref<TextInputInstance> }) {
  const input = useRef<TextInputInstance>(null);
  useImperativeHandle(ref, () => input.current!, []);
  const controller = useContext(ScrollContext);
  const field = useContext(FieldContext);
  return <TextInput {...props} ref={input}
    onFocus={event => {
      onFocus?.(event);
      if (input.current) controller?.focus({ input: input.current, region: field?.region.current ?? input.current, scrollAfter: field?.scrollAfter ?? 0 });
    }}
    onBlur={event => { if (input.current) controller?.blur(input.current); onBlur?.(event); }}
    onLayout={event => { onLayout?.(event); if (input.current?.isFocused()) controller?.update(); }}
    onSelectionChange={event => { onSelectionChange?.(event); if (input.current?.isFocused()) controller?.update(); }}
    onContentSizeChange={event => { onContentSizeChange?.(event); controller?.update(); }} />;
}
cssInterop(KeyboardInput, { className: 'style' });
