import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  message: string;
  kind: ToastKind;
  isLeaving?: boolean;
};

type ToastContextValue = {
  addToast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const COLORS: Record<ToastKind, { border: string; text: string; icon: string; bg: string }> = {
  success: {
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    icon: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  error: {
    border: 'border-rose-200',
    text: 'text-rose-900',
    icon: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  info: {
    border: 'border-slate-200',
    text: 'text-slate-900',
    icon: 'text-slate-600',
    bg: 'bg-white',
  },
};

const ICONS: Record<ToastKind, JSX.Element> = {
  success: (
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <path fill="currentColor" d="M9.5 16.2 5.8 12.5l1.4-1.4 2.3 2.3 7.3-7.3 1.4 1.4z" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <path fill="currentColor" d="M12 2 2 22h20L12 2zm0 6 1 7h-2l1-7zm0 11.3c-.7 0-1.3-.6-1.3-1.3S11.3 16.7 12 16.7s1.3.6 1.3 1.3-.6 1.3-1.3 1.3z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <path fill="currentColor" d="M11 9h2V7h-2v2zm0 8h2v-6h-2v6zm1-15C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
    </svg>
  ),
};

const KEYFRAMES = `
@keyframes toast-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes toast-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(6px); }
}
`;

const DISPLAY_MS = 3500;
const FADE_MS = 250;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string, immediate = false) => {
    if (immediate) {
      setToasts((current) => current.filter((t) => t.id !== id));
      return;
    }
    setToasts((current) =>
      current.map((t) => (t.id === id ? { ...t, isLeaving: true } : t))
    );
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, FADE_MS);
  }, []);

  const addToast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current, { id, message, kind }]);
      setTimeout(() => removeToast(id), DISPLAY_MS - FADE_MS);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <style>{KEYFRAMES}</style>
      <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
        {toasts.map((toast) => {
          const palette = COLORS[toast.kind];
          return (
            <div
              key={toast.id}
              className={`min-w-[280px] max-w-sm px-4 py-3 rounded border ${palette.border} ${palette.bg} shadow-lg shadow-slate-200/50 transition transform ${
                toast.isLeaving ? 'animate-[toast-out_200ms_ease-in_forwards]' : 'animate-[toast-in_220ms_ease-out]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 ${palette.icon}`}>{ICONS[toast.kind]}</span>
                <div className={`text-sm leading-relaxed ${palette.text}`}>{toast.message}</div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="ml-auto text-slate-400 hover:text-slate-700 transition"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback to avoid crashing if a view is rendered without the provider (e.g., in isolation/tests).
    return () => {};
  }
  return ctx.addToast;
};
