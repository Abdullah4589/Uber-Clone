import type { FareEstimate, RideTier } from '@uber-clone/shared';
import { TIERS, estimateFare } from '@uber-clone/shared';
import type { GeoPlace } from '../../lib/geo';
import { FareStepper } from '../../components/FareStepper';
import { FareTicket, FareAmount } from '../../components/FareTicket';
import { SwitchRow } from '../../components/ui';

/** Booking sheet content: greeting → where-to → trip setup. */
export function HomeSheet({
  firstName,
  pickup,
  drop,
  locating,
  locError,
  tier,
  setTier,
  estimate,
  offeredFare,
  setOfferedFare,
  autoAccept,
  onToggleAutoAccept,
  driversOnline,
  recents,
  onPickRecent,
  onOpenSearch,
  scheduleOn,
  setScheduleOn,
  date,
  setDate,
  time,
  setTime,
  minDate,
  scheduleInPast,
}: {
  firstName: string;
  pickup: GeoPlace | null;
  drop: GeoPlace | null;
  locating: boolean;
  locError: string | null;
  tier: RideTier;
  setTier: (t: RideTier) => void;
  estimate: FareEstimate | null;
  offeredFare: number | null;
  setOfferedFare: (v: number) => void;
  autoAccept: boolean;
  onToggleAutoAccept: () => void;
  driversOnline: number | null;
  recents: GeoPlace[];
  onPickRecent: (p: GeoPlace) => void;
  onOpenSearch: (target: 'pickup' | 'drop') => void;
  scheduleOn: boolean;
  setScheduleOn: (v: boolean) => void;
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  minDate: string;
  scheduleInPast: boolean;
}) {
  return (
    <div className="space-y-4 pb-24">
      <h2 className="font-display text-xl font-bold">
        Salam, {firstName} <span aria-hidden>👋</span>
      </h2>

      {/* Where-to search pill */}
      <button
        onClick={() => onOpenSearch('drop')}
        className="flex w-full items-center gap-3 rounded-2xl border border-hairline bg-surface2 px-4 py-4 text-left transition active:scale-[0.99]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neela/15 text-neela">
          🔎
        </span>
        {drop ? (
          <span className="min-w-0 flex-1 truncate font-semibold">{drop.label}</span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-muted">
            Kahan jana hai? <span className="opacity-60">/ Where to?</span>
          </span>
        )}
        {drop && <span className="text-xs font-semibold text-neela">Change</span>}
      </button>

      {/* Recent destinations */}
      {!drop && recents.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {recents.map((r, i) => (
            <button
              key={`${r.label}-${i}`}
              onClick={() => onPickRecent(r)}
              className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-surface2 px-3.5 text-sm font-medium transition active:scale-[0.96]"
            >
              <span className="text-neela" aria-hidden>
                🕐
              </span>
              <span className="max-w-[160px] truncate">{r.label.split(',')[0]}</span>
            </button>
          ))}
        </div>
      )}

      {drop && (
        <>
          {/* Pickup row */}
          <div className="rounded-2xl border border-hairline bg-surface2">
            <button
              onClick={() => onOpenSearch('pickup')}
              className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-kesar" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted">Pickup</span>
                <span className="block truncate text-sm font-medium">
                  {locating ? 'Locating…' : (pickup?.label ?? 'Set your pickup point')}
                </span>
              </span>
              <span className="text-xs font-semibold text-kesar">Edit</span>
            </button>
            {locError && (
              <p className="px-4 pb-3 text-xs text-warn">
                {locError} — tap Edit to search or drop a pin instead.
              </p>
            )}
          </div>

          {/* Now / Later segmented control */}
          <div className="flex rounded-xl bg-surface2 p-1 text-sm font-semibold">
            <button
              className={`min-h-[40px] flex-1 rounded-lg transition ${
                !scheduleOn ? 'bg-kesar text-[#1B0E03]' : 'text-muted'
              }`}
              onClick={() => setScheduleOn(false)}
            >
              ⚡ Abhi — now
            </button>
            <button
              className={`min-h-[40px] flex-1 rounded-lg transition ${
                scheduleOn ? 'bg-kesar text-[#1B0E03]' : 'text-muted'
              }`}
              onClick={() => setScheduleOn(true)}
            >
              🗓️ Later
            </button>
          </div>
          {scheduleOn && (
            <div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Pickup date</span>
                  <input
                    type="date"
                    className="input"
                    value={date}
                    min={minDate}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Pickup time</span>
                  <input
                    type="time"
                    className="input"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
              </div>
              {scheduleInPast && (
                <p className="mt-1.5 text-xs text-warn">
                  That time has already passed — pick a future time.
                </p>
              )}
            </div>
          )}

          {/* Tier picker — horizontal snap-scroll mini fare-tickets */}
          {pickup && (
            <div className="no-scrollbar snap-x-mandatory -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 pt-1">
              {(Object.keys(TIERS) as RideTier[]).map((t) => {
                const est = estimateFare(pickup, drop, t);
                const active = tier === t;
                return (
                  <div key={t} className="snap-start-item w-[8.5rem] shrink-0">
                    <FareTicket
                      selected={active}
                      onClick={() => setTier(t)}
                      stubHeight={40}
                      className={active ? '-translate-y-0.5' : ''}
                      stub={
                        <div className="flex w-full items-baseline justify-between">
                          <FareAmount value={est.fare} className="text-[15px]" />
                          <span className="text-[10px] text-muted">~{est.durationMin}m</span>
                        </div>
                      }
                    >
                      <div className="text-2xl leading-none">{TIERS[t].emoji}</div>
                      <div className={`mt-1.5 text-sm font-bold ${active ? 'text-kesar' : ''}`}>
                        {TIERS[t].label}
                      </div>
                      <div className="truncate text-[10px] text-muted">{TIERS[t].blurb}</div>
                    </FareTicket>
                  </div>
                );
              })}
            </div>
          )}

          {/* Your fare offer */}
          {estimate && offeredFare != null && (
            <FareTicket
              stubHeight={40}
              stub={
                <div className="flex w-full items-center justify-between text-xs text-muted">
                  <span>Your fare offer</span>
                  <span>
                    {estimate.distanceKm} km · ~{estimate.durationMin} min
                  </span>
                </div>
              }
            >
              <FareStepper
                value={offeredFare}
                recommended={estimate.fare}
                onChange={setOfferedFare}
              />
            </FareTicket>
          )}

          <SwitchRow
            label="Auto-accept drivers"
            hint={
              autoAccept
                ? 'First driver who agrees to your fare is booked instantly'
                : 'Off — you approve every driver, even at your fare'
            }
            on={autoAccept}
            onToggle={onToggleAutoAccept}
          />

          {driversOnline != null && (
            <p className={`text-xs ${driversOnline > 0 ? 'text-muted' : 'text-warn'}`}>
              {driversOnline > 0 ? (
                <>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-success" />
                  {driversOnline} driver{driversOnline === 1 ? '' : 's'} online near you
                </>
              ) : (
                'No drivers online right now — your request may take a while.'
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
