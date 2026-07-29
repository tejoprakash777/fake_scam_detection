import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';
export interface Toast { id: number; type: ToastType; message: string; }

let listeners: ((t: Toast) => void)[] = [];
let counter = 0;

export function toast(type: ToastType, message: string) {
  const t: Toast = { id: ++counter, type, message };
  listeners.forEach((l) => l(t));
}

export function NotificationHost() {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setItems((cur) => cur.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const listener = (t: Toast) => {
      setItems((cur) => [...cur, t]);
      setTimeout(() => remove(t.id), 4200);
    };
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  }, [remove]);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm">
      {items.map((t) => (
        <div
          key={t.id}
          className={`animate-slide-in-right flex items-start gap-3 rounded-xl border px-4 py-3 shadow-card backdrop-blur ${
            t.type === 'success' ? 'bg-success-50 border-success-200 text-success-800'
            : t.type === 'warning' ? 'bg-warning-50 border-warning-200 text-warning-800'
            : t.type === 'error' ? 'bg-danger-50 border-danger-200 text-danger-800'
            : 'bg-primary-50 border-primary-200 text-primary-800'
          }`}
        >
          {t.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          : t.type === 'warning' ? <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          : t.type === 'error' ? <XCircle size={18} className="mt-0.5 shrink-0" />
          : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
          <p className="text-sm font-medium leading-snug flex-1">{t.message}</p>
          <button onClick={() => remove(t.id)} className="text-current/60 hover:text-current transition">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
