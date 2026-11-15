import { cssInterop } from 'nativewind';
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from 'react';
import { Platform, type TextInputInstance, type TextInputProps } from 'react-native';
import { KeyboardInput } from './keyboard-aware-scroll-view';
import { editMoneyInput, formatMoneyInput, type MoneySelection } from '@/utils/money-input';

/** Presentation adapter only. Field-specific validation and limits remain with callers. */
export function MoneyInput({ value = '', onChangeText, onBlur, onFocus, onSelectionChange, ref, ...props }: TextInputProps & { ref?: Ref<TextInputInstance> }) {
  const input = useRef<TextInputInstance>(null);
  useImperativeHandle(ref, () => input.current!, []);
  const [editing, setEditing] = useState({ canonical: value, text: formatMoneyInput(value, true) });
  // Native change/blur events can arrive before React commits the previous edit.
  // Keep the latest draft synchronously; a stale value prop must never erase it.
  const draft = useRef(editing);
  const [receivedValue, setReceivedValue] = useState(value);
  const [restored, setRestored] = useState<MoneySelection>();
  const selection = useRef<MoneySelection>({ start: editing.text.length, end: editing.text.length });
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // RN Web reports onSelect after a paste. Capture the pre-edit range as well,
    // including selection replacement that shares a prefix with the old amount.
    const remember = () => {
      const node = input.current;
      if ((node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) && document.activeElement === node) {
        selection.current = { start: node.selectionStart ?? 0, end: node.selectionEnd ?? 0 };
      }
    };
    document.addEventListener('selectionchange', remember);
    return () => document.removeEventListener('selectionchange', remember);
  }, []);
  // External Clear/Quick Amount actions replace the presentation as well as the value.
  const text = receivedValue !== value && editing.canonical !== value ? formatMoneyInput(value, true) : editing.text;
  if (receivedValue !== value) {
    setReceivedValue(value);
    if (editing.canonical !== value) {
      setEditing({ canonical: value, text }); setRestored(undefined);
    }
  }
  useLayoutEffect(() => { draft.current = editing; }, [editing]);
  return <KeyboardInput {...props} ref={input} value={text} keyboardType="decimal-pad" inputMode="decimal"
    selection={restored} onSelectionChange={event => {
      selection.current = event.nativeEvent.selection;
      if (restored?.start === selection.current.start && restored.end === selection.current.end) setRestored(undefined);
      onSelectionChange?.(event);
    }}
    onFocus={event => { setRestored(undefined); onFocus?.(event); }}
    onChangeText={proposed => {
      const next = editMoneyInput(draft.current.text, proposed, selection.current);
      if (!next) {
        setEditing({ ...draft.current }); setRestored({ ...selection.current });
        return;
      }
      draft.current = { canonical: next.canonical, text: next.text };
      setEditing(draft.current);
      selection.current = next.selection; setRestored(next.selection);
      // Backend boundary: emit ungrouped decimal-peso strings only. Existing
      // services still validate/convert these to exact integer centavos.
      onChangeText?.(next.canonical);
    }}
    onBlur={event => {
      setRestored(undefined);
      draft.current = { canonical: draft.current.canonical, text: formatMoneyInput(draft.current.canonical, true) };
      setEditing(draft.current);
      onBlur?.(event);
    }} />;
}
cssInterop(MoneyInput, { className: 'style' });
