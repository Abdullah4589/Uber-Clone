import { useRef, useState } from 'react';

/**
 * Swipe-right-to-confirm slider for destructive actions (cancel ride).
 * A tap does nothing — the thumb must travel ≥80% of the track.
 */
export function SwipeToConfirm({
  label,
  onConfirm,
  disabled = false,
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const drag = useRef<{ startX: number; max: number } | null>(null);

  const THUMB = 48;
  const PAD = 4;

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || confirming) return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = { startX: e.clientX - x, max: track.clientWidth - THUMB - PAD * 2 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setX(Math.max(0, Math.min(d.max, e.clientX - d.startX)));
  };

  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (x >= d.max * 0.8) {
      setX(d.max);
      setConfirming(true);
      onConfirm();
    } else {
      setX(0);
    }
  };

  const progress = drag.current ? x / Math.max(1, drag.current.max) : 0;

  return (
    <div
      ref={trackRef}
      className={`relative h-14 select-none overflow-hidden rounded-2xl border border-danger/40 bg-danger/10 ${disabled ? 'opacity-40' : ''}`}
    >
      <span
        className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-danger"
        style={{ opacity: 1 - progress * 1.4 }}
      >
        {confirming ? 'Cancelling…' : label} →
      </span>
      <div
        className="absolute flex items-center justify-center rounded-xl bg-danger text-lg text-white shadow-lg"
        style={{
          width: THUMB,
          height: THUMB,
          top: PAD,
          left: PAD,
          transform: `translateX(${x}px)`,
          transition: drag.current ? 'none' : 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        ✕
      </div>
    </div>
  );
}
