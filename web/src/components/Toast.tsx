import { useEffect, useState } from 'react';

type Kind = 'info' | 'success' | 'error';
interface ToastMsg {
  id: number;
  text: string;
  kind: Kind;
}

let nextId = 1;
let push: ((t: ToastMsg) => void) | null = null;

/** Fire-and-forget toast, e.g. toast('Ride booked', 'success'). */
export function toast(text: string, kind: Kind = 'info') {
  push?.({ id: nextId++, text, kind });
}

const tone: Record<Kind, string> = {
  info: 'border-neela/40 text-body',
  success: 'border-success/40 text-body',
  error: 'border-danger/50 text-body',
};
const dot: Record<Kind, string> = {
  info: 'bg-neela',
  success: 'bg-success',
  error: 'bg-danger',
};

/** Mount once near the app root. Toasts slide in from the top, safe-area aware. */
export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);

  useEffect(() => {
    push = (t) => {
      setItems((prev) => [...prev.slice(-2), t]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== t.id)), 3200);
    };
    return () => {
      push = null;
    };
  }, []);

  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[3000] flex flex-col items-center gap-2 p-3 pt-[calc(12px+env(safe-area-inset-top))]">
      {items.map((t) => (
        <div
          key={t.id}
          className={`flex w-full max-w-sm animate-slide-down-in items-center gap-2.5 rounded-2xl border bg-surface/95 px-4 py-3 text-sm font-medium shadow-xl backdrop-blur ${tone[t.kind]}`}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${dot[t.kind]}`} />
          {t.text}
        </div>
      ))}
    </div>
  );
}
