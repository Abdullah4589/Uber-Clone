import type { RideStatus } from '@uber-clone/shared';
import { RIDE_STATUS_LABELS } from '@uber-clone/shared';

export function StatusBadge({ status }: { status: RideStatus }) {
  const color: Record<RideStatus, string> = {
    SEARCHING: 'bg-warn/15 text-warn',
    DRIVER_ASSIGNED: 'bg-neela/15 text-neela',
    EN_ROUTE_TO_PICKUP: 'bg-neela/15 text-neela',
    ARRIVED: 'bg-kesar/15 text-kesar',
    IN_PROGRESS: 'bg-kesar/15 text-kesar',
    COMPLETED: 'bg-success/15 text-success',
    CANCELLED: 'bg-danger/15 text-danger',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${color[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {RIDE_STATUS_LABELS[status]}
    </span>
  );
}

export function Stars({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={`transition ${onChange ? 'min-h-[44px] min-w-[44px] active:scale-[0.9]' : 'cursor-default'}`}
          style={{ fontSize: size, lineHeight: 1 }}
          aria-label={`${n} stars`}
        >
          <span className={n <= value ? 'text-warn' : 'text-hairline'}>★</span>
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-kesar/30 bg-gradient-to-br from-kesar/25 to-gulabi/20 font-display font-bold text-kesar"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

/** Vehicle plate in a bordered chip, e.g. "LEA-4823". */
export function PlateChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-body/40 bg-raat px-2 py-0.5 font-display text-xs font-bold tracking-widest">
      {text}
    </span>
  );
}

/** Row-style toggle switch with a label + hint, 44px+ touch target. */
export function SwitchRow({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface2 px-4 py-3 text-left"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
      </div>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition-colors ${
          on ? 'bg-kesar' : 'bg-hairline'
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  );
}
