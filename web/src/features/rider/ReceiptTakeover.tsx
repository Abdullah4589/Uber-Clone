import type { Ride } from '@uber-clone/shared';
import { TIERS, fareBreakdown } from '@uber-clone/shared';
import { Takeover } from '../../components/Takeover';
import { BarButton } from '../../components/BarButton';
import { FareTicket, FareAmount } from '../../components/FareTicket';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/** Completed-trip receipt with the full fare-ticket treatment. */
export function ReceiptTakeover({ ride, onDone }: { ride: Ride; onDone: () => void }) {
  const b = fareBreakdown(ride.distanceKm, ride.durationMin, ride.tier);
  const tierInfo = TIERS[ride.tier];
  const adjustment = Math.round(ride.fare - b.total);

  return (
    <Takeover
      tone="raat"
      footer={<BarButton onClick={onDone}>Done</BarButton>}
    >
      <div className="mx-auto max-w-md space-y-5 pt-6">
        <div className="text-center">
          <div className="text-5xl" aria-hidden>
            ✅
          </div>
          <h3 className="mt-2 font-display text-2xl font-bold">Safar complete</h3>
          {ride.driver && (
            <p className="mt-1 text-sm text-muted">
              {ride.driver.name} · {ride.driver.vehicle}
            </p>
          )}
        </div>

        <FareTicket
          stubHeight={72}
          stub={
            <div className="flex w-full items-center justify-between">
              <span className="font-semibold">Total charged</span>
              <FareAmount value={ride.fare} className="text-3xl text-kesar" />
            </div>
          }
        >
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-kesar" />
              <span className="truncate">{ride.pickupLabel}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-neela" />
              <span className="truncate">{ride.dropLabel}</span>
            </div>
            <div className="pb-1 text-xs text-muted">
              {ride.distanceKm} km · ~{ride.durationMin} min · {tierInfo?.emoji}{' '}
              {tierInfo?.label ?? ride.tier}
            </div>
          </div>

          <div className="mt-2 space-y-2 border-t border-hairline pt-3">
            <Row label="Base fare" value={`Rs ${b.base.toLocaleString()}`} />
            <Row
              label={`Distance (${ride.distanceKm} km)`}
              value={`Rs ${b.distanceCost.toLocaleString()}`}
            />
            <Row
              label={`Time (${ride.durationMin} min)`}
              value={`Rs ${b.timeCost.toLocaleString()}`}
            />
            {b.multiplier !== 1 && (
              <Row label={`${tierInfo?.label ?? ride.tier} rate`} value={`× ${b.multiplier}`} />
            )}
            {adjustment !== 0 && (
              <Row
                label="Negotiated fare adjustment"
                value={`${adjustment > 0 ? '+' : '−'} Rs ${Math.abs(adjustment).toLocaleString()}`}
              />
            )}
          </div>
        </FareTicket>

        <p className="text-center text-xs text-muted">
          JazzCash •••• 4242 · Payments are mocked — no real card is charged.
        </p>
      </div>
    </Takeover>
  );
}
