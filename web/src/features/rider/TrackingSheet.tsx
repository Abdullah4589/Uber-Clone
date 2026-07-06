import type { Offer, Ride } from '@uber-clone/shared';
import { TIERS } from '@uber-clone/shared';
import { Avatar, PlateChip } from '../../components/ui';
import { FareTicket, FareAmount } from '../../components/FareTicket';
import { RingCountdown } from '../../components/RingCountdown';
import { RideStepper } from '../../components/RideStepper';
import { toast } from '../../components/Toast';
import { formatSchedule } from '../../lib/format';

// Driver counter-offers go stale after this long, then quietly dismiss.
const OFFER_TTL_MS = 45_000;

function RouteRows({ ride }: { ride: Ride }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-kesar" />
        <span className="truncate">{ride.pickupLabel}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-neela" />
        <span className="truncate">{ride.dropLabel}</span>
      </div>
      {formatSchedule(ride.scheduledAt) && (
        <div className="flex items-center gap-2.5 text-muted">
          <span aria-hidden>🗓️</span>
          <span>Scheduled: {formatSchedule(ride.scheduledAt)}</span>
        </div>
      )}
    </div>
  );
}

/** A driver's counter-offer — the gulabi negotiation moment. */
function OfferTicket({
  offer,
  ride,
  onAccept,
  onDecline,
}: {
  offer: Offer;
  ride: Ride;
  onAccept: (o: Offer) => void;
  onDecline: (o: Offer) => void;
}) {
  const diff = offer.amount - ride.fare;
  return (
    <FareTicket className="!border-gulabi/40" stubHeight={64}
      stub={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="min-w-0">
            <FareAmount value={offer.amount} className="text-xl text-gulabi" />
            <div
              className={`text-[11px] font-medium ${
                diff === 0 ? 'text-success' : diff > 0 ? 'text-warn' : 'text-success'
              }`}
            >
              {diff === 0
                ? '✓ your fare'
                : `${diff > 0 ? '+' : '−'} Rs ${Math.abs(diff).toLocaleString()} vs your offer`}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              className="h-11 rounded-xl bg-surface2 px-4 text-sm font-semibold transition active:scale-[0.96]"
              onClick={() => onDecline(offer)}
            >
              Decline
            </button>
            <button
              className="h-11 rounded-xl bg-gulabi px-5 text-sm font-bold text-white transition hover:bg-gulabi-dark active:scale-[0.96]"
              onClick={() => onAccept(offer)}
            >
              Accept
            </button>
          </div>
        </div>
      }
    >
      <div className="flex items-center gap-3">
        <RingCountdown durationMs={OFFER_TTL_MS} size={46} onExpire={() => onDecline(offer)} />
        <Avatar name={offer.driver?.name ?? 'Driver'} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{offer.driver?.name}</div>
          <div className="truncate text-xs text-muted">
            {offer.driver?.vehicle}
            {offer.driver?.avgRating != null && ` · ★ ${offer.driver.avgRating}`}
          </div>
        </div>
      </div>
    </FareTicket>
  );
}

/** Sheet content while a ride is live: searching+offers, then live tracking. */
export function TrackingSheet({
  ride,
  offers,
  onAcceptOffer,
  onDeclineOffer,
}: {
  ride: Ride;
  offers: Offer[];
  onAcceptOffer: (o: Offer) => void;
  onDeclineOffer: (o: Offer) => void;
}) {
  const searching = ride.status === 'SEARCHING';
  const driver = ride.driver;
  const [vehicleName, plate] = (driver?.vehicle ?? '').split('·').map((s) => s.trim());

  return (
    <div className="space-y-4 pb-28">
      {searching ? (
        <>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping-dot rounded-full bg-kesar/70" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-kesar" />
            </span>
            <p className="text-sm text-muted">
              {offers.length > 0
                ? 'Drivers are offering fares — pick one.'
                : ride.autoAccept
                  ? 'Contacting drivers — first to accept your fare gets booked.'
                  : 'Contacting drivers — you approve every offer.'}
            </p>
          </div>

          {offers.length === 0 && (
            <FareTicket
              stubHeight={40}
              stub={
                <div className="flex w-full items-center justify-between text-xs text-muted">
                  <span>
                    {TIERS[ride.tier]?.emoji} {TIERS[ride.tier]?.label}
                  </span>
                  <span>
                    {ride.distanceKm} km · ~{ride.durationMin} min
                  </span>
                </div>
              }
            >
              <div className="text-xs text-muted">Your offer</div>
              <FareAmount value={ride.fare} className="text-3xl" />
            </FareTicket>
          )}

          {offers.length > 0 && (
            <div className="space-y-2.5">
              {offers.map((o) => (
                <OfferTicket
                  key={o.id}
                  offer={o}
                  ride={ride}
                  onAccept={onAcceptOffer}
                  onDecline={onDeclineOffer}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        driver && (
          <div className="flex items-center gap-3">
            <Avatar name={driver.name} size={52} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-display text-[17px] font-bold">{driver.name}</span>
                {driver.avgRating != null && (
                  <span className="shrink-0 text-xs font-semibold text-warn">
                    ★ {driver.avgRating}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-muted">
                <span className="truncate">{vehicleName || driver.vehicle}</span>
                {plate && <PlateChip text={plate} />}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full bg-surface2 transition active:scale-[0.92]"
                aria-label="Call driver"
                onClick={() => toast('Calling is mocked in this prototype')}
              >
                📞
              </button>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full bg-surface2 transition active:scale-[0.92]"
                aria-label="Message driver"
                onClick={() => toast('Messaging is mocked in this prototype')}
              >
                💬
              </button>
            </div>
          </div>
        )
      )}

      {!searching && (
        <div className="rounded-2xl border border-hairline bg-surface2/60 px-3 py-3">
          <RideStepper status={ride.status} />
        </div>
      )}

      <div className="border-t border-dashed border-hairline pt-3.5">
        <RouteRows ride={ride} />
      </div>
    </div>
  );
}
