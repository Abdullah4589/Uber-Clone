import type { Ride } from '@uber-clone/shared';
import { TIERS } from '@uber-clone/shared';
import { Takeover } from '../../components/Takeover';
import { BarButton } from '../../components/BarButton';
import { FareTicket, FareAmount } from '../../components/FareTicket';
import { FareStepper } from '../../components/FareStepper';
import { RingCountdown } from '../../components/RingCountdown';
import { Avatar } from '../../components/ui';
import { formatSchedule } from '../../lib/format';

export type NegoEntry = { amount: number; state: 'idle' | 'sent' | 'declined' };

/**
 * Full-screen incoming ride request: fare huge, ring countdown, one-thumb
 * Accept bar, plus the gulabi counter-offer block.
 */
export function RequestTakeover({
  req,
  entry,
  queued,
  onAccept,
  onDismiss,
  onExpire,
  onSetAmount,
  onSendOffer,
}: {
  req: Ride;
  entry: NegoEntry;
  queued: number;
  onAccept: () => void;
  onDismiss: () => void;
  onExpire: () => void;
  onSetAmount: (v: number) => void;
  onSendOffer: () => void;
}) {
  const recommended = req.recommendedFare || req.fare;
  const schedule = formatSchedule(req.scheduledAt);

  return (
    <Takeover
      tone="surface"
      footer={
        <div className="space-y-2">
          <BarButton onClick={onAccept}>
            Accept for Rs {req.fare.toLocaleString()}
          </BarButton>
          <BarButton variant="secondary" onClick={onDismiss}>
            Dismiss
          </BarButton>
        </div>
      }
    >
      <div className="mx-auto max-w-md space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">New ride request</h2>
            {queued > 0 && (
              <p className="mt-0.5 text-xs text-muted">
                +{queued} more waiting after this one
              </p>
            )}
          </div>
          {/* The 10s response window (paused visually once an offer is sent). */}
          {entry.state === 'idle' ? (
            <RingCountdown durationMs={10_000} size={56} onExpire={onExpire} />
          ) : (
            <span className="rounded-full bg-gulabi/15 px-3 py-1.5 text-xs font-semibold text-gulabi">
              {entry.state === 'sent' ? 'Offer sent' : 'Declined'}
            </span>
          )}
        </div>

        <FareTicket
          stubHeight={68}
          stub={
            <div className="flex w-full items-center justify-between">
              <span className="text-sm text-muted">rider’s offer</span>
              <FareAmount value={req.fare} className="text-3xl text-kesar" />
            </div>
          }
        >
          <div className="flex items-center gap-3">
            <Avatar name={req.rider?.name ?? 'Rider'} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{req.rider?.name}</div>
              <div className="text-xs text-muted">
                {req.rider?.avgRating != null && <>★ {req.rider.avgRating} · </>}
                {req.distanceKm} km · {TIERS[req.tier]?.emoji}{' '}
                {TIERS[req.tier]?.label ?? req.tier}
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2 border-t border-hairline pt-3 text-sm">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-kesar" />
              <span className="truncate">{req.pickupLabel}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-neela" />
              <span className="truncate">{req.dropLabel}</span>
            </div>
            {schedule && (
              <div className="flex items-center gap-2.5 text-warn">
                <span aria-hidden>🗓️</span>
                <span>Scheduled pickup: {schedule}</span>
              </div>
            )}
          </div>
        </FareTicket>

        {/* Counter-offer — the gulabi bargaining moment */}
        <div className="rounded-2xl border border-gulabi/30 bg-gulabi/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gulabi">Counter-offer</h3>
            {entry.state === 'sent' && (
              <span className="text-xs text-muted">⏳ waiting for the rider…</span>
            )}
            {entry.state === 'declined' && (
              <span className="text-xs text-warn">Rider declined — adjust and retry</span>
            )}
          </div>
          <FareStepper
            compact
            tone="gulabi"
            value={entry.amount}
            recommended={recommended}
            onChange={onSetAmount}
          />
          <BarButton variant="gulabi" className="mt-3 !h-12 !text-[15px]" onClick={onSendOffer}>
            {entry.state === 'sent'
              ? `Update offer · Rs ${entry.amount.toLocaleString()}`
              : `Offer your fare · Rs ${entry.amount.toLocaleString()}`}
          </BarButton>
        </div>
      </div>
    </Takeover>
  );
}
