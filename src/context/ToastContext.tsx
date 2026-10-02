import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration: number = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, message, type, title, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
            error: <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
            info: <Info className="w-5 h-5 text-[#164A36] shrink-0 mt-0.5" />,
          };

          const borders = {
            success: 'border-emerald-200 bg-white shadow-md',
            error: 'border-rose-200 bg-white shadow-md',
            warning: 'border-amber-200 bg-white shadow-md',
            info: 'border-[#D5E6DB] bg-white shadow-md',
          };

          return (
            <div
              key={toast.id}
              role="alert"
              className={cn(
                'pointer-events-auto p-4 rounded-xl border flex items-start gap-3 transition-all duration-200 animate-fade-in',
                borders[toast.type]
              )}
            >
              {icons[toast.type]}
              <div className="flex-1 text-sm">
                {toast.title && (
                  <h4 className="font-bold text-[#111827] text-xs uppercase tracking-wide mb-0.5">
                    {toast.title}
                  </h4>
                )}
                <p className="text-[#374151] leading-relaxed text-xs sm:text-sm">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded-md transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
