import { fareBounds, fareStep, clampFare } from '@uber-clone/shared';
import { FareAmount } from './FareTicket';

/**
 * InDrive-style fare stepper: big −/+ touch targets around the amount,
 * clamped to the allowed band around the recommended fare. `tone="gulabi"`
 * is the negotiation accent — reserved for counter-offer moments.
 */
export function FareStepper({
  value,
  recommended,
  onChange,
  compact = false,
  tone = 'kesar',
}: {
  value: number;
  recommended: number;
  onChange: (v: number) => void;
  compact?: boolean;
  tone?: 'kesar' | 'gulabi';
}) {
  const { min, max } = fareBounds(recommended);
  const step = fareStep(recommended);
  const bump = (dir: 1 | -1) => onChange(clampFare(value + dir * step, recommended));

  const accent =
    tone === 'gulabi'
      ? 'border-gulabi/40 text-gulabi active:bg-gulabi/15'
      : 'border-kesar/40 text-kesar active:bg-kesar/15';
  const btn =
    `flex items-center justify-center rounded-full border-2 bg-surface2 font-display font-bold transition active:scale-[0.9] disabled:opacity-30 ${accent} ` +
    (compact ? 'h-11 w-11 text-xl' : 'h-14 w-14 text-2xl');

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" className={btn} onClick={() => bump(-1)} disabled={value <= min} aria-label="Lower fare">
          −
        </button>
        <div className="text-center">
          <FareAmount value={value} className={compact ? 'text-2xl' : 'text-3xl'} />
          <div className="text-xs text-muted">
            {value !== recommended
              ? `Recommended: Rs ${recommended.toLocaleString()}`
              : 'Recommended fare'}
          </div>
        </div>
        <button type="button" className={btn} onClick={() => bump(1)} disabled={value >= max} aria-label="Raise fare">
          +
        </button>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>min Rs {min.toLocaleString()}</span>
        <span>max Rs {max.toLocaleString()}</span>
      </div>
    </div>
  );
}
