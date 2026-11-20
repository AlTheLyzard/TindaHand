import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastOverlayContextValue = {
  registerToast: (id: string, content: ReactNode) => void;
  unregisterToast: (id: string) => void;
};

const ToastOverlayContext = createContext<ToastOverlayContextValue | null>(null);

export function ToastOverlayProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ReadonlyMap<string, ReactNode>>(() => new Map());
  const registerToast = useCallback((id: string, content: ReactNode) => {
    setToasts(current => new Map(current).set(id, content));
  }, []);
  const unregisterToast = useCallback((id: string) => {
    setToasts(current => {
      if (!current.has(id)) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);
  const context = useMemo(() => ({ registerToast, unregisterToast }), [registerToast, unregisterToast]);

  return <ToastOverlayContext.Provider value={context}>
    <View style={{ flex: 1 }}>
      {children}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, elevation: 24 }}>
        {toasts.size > 0 && <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 56, left: 20, right: 20, alignItems: 'center' }}>
          <View pointerEvents="box-none" style={{ width: '100%', maxWidth: 460, gap: 8 }}>
            {Array.from(toasts, ([id, content]) => <View key={id} pointerEvents="box-none" style={{ zIndex: 1001, elevation: 8 }}>{content}</View>)}
          </View>
        </View>}
      </View>
    </View>
  </ToastOverlayContext.Provider>;
}

export function useToastOverlay() {
  const context = useContext(ToastOverlayContext);
  if (!context) throw new Error('ToastOverlayProvider is missing from the app root.');
  return context;
}
