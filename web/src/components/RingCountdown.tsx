import { ReactNode, useEffect, useRef, useState } from 'react';

/**
 * Circular countdown ring. Counts down `durationMs`, shifting from kesar to
 * danger as time runs out, then fires `onExpire` once. Children render in
 * the center; by default the remaining seconds are shown.
 */
export function RingCountdown({
  durationMs,
  onExpire,
  size = 56,
  stroke = 4,
  children,
}: {
  durationMs: number;
  onExpire?: () => void;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const [remaining, setRemaining] = useState(durationMs);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let fired = false;
    const tick = () => {
      const left = Math.max(0, durationMs - (performance.now() - start));
      setRemaining(left);
      if (left <= 0) {
        if (!fired) {
          fired = true;
          expireRef.current?.();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = remaining / durationMs;
  const color = frac > 0.5 ? '#FF7A1A' : frac > 0.25 ? '#FBBF24' : '#F4534A';
  const secs = Math.ceil(remaining / 1000);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#2E3843"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold tabular-nums">
        {children ?? `${secs}`}
      </div>
    </div>
  );
}
