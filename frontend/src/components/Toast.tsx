import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { Toast as ToastType } from '../types';

interface ToastProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

const colors = {
  error: 'border-red-500/40 bg-red-500/10 text-red-300',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  info: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
};

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 6s
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, onDismiss]);

  const Icon = icons[toast.type];

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl
        transition-all duration-300 max-w-sm w-full
        ${colors[toast.type]}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <p className="text-sm leading-snug flex-1">{toast.message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
        className="text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// Hook
let toastIdCounter = 0;
export function useToast() {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const addToast = (type: ToastType['type'], message: string) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, dismiss };
}
