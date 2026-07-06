import { useEffect, useState } from 'react';
import type { Ride } from '@uber-clone/shared';
import { api } from '../../lib/api';
import { FareAmount } from '../../components/FareTicket';

const sum = (list: Ride[]) => Math.round(list.reduce((n, r) => n + r.fare, 0));

/** Earnings tab: PKR headline cards + completed trips grouped by day. */
export function EarningsPanel() {
  const [rides, setRides] = useState<Ride[] | null>(null);

  useEffect(() => {
    api.get('/rides/history').then((r) => setRides(r.data));
  }, []);

  if (!rides)
    return (
      <div className="mx-auto max-w-md space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
    );

  const completed = rides.filter((r) => r.status === 'COMPLETED');
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todays = completed.filter(
    (r) => new Date(r.completedAt ?? r.createdAt).getTime() >= startOfToday.getTime()
  );

  // Group by calendar day, newest first.
  const groups = new Map<string, Ride[]>();
  for (const r of completed) {
    const key = new Date(r.completedAt ?? r.createdAt).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <div className="mx-auto max-w-md space-y-5 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-xs text-muted">Today</div>
          <FareAmount value={sum(todays)} className="mt-1 block text-3xl text-kesar" />
          <div className="mt-0.5 text-xs text-muted">
            {todays.length} trip{todays.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-muted">All time</div>
          <FareAmount value={sum(completed)} className="mt-1 block text-3xl" />
          <div className="mt-0.5 text-xs text-muted">
            {completed.length} trip{completed.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {completed.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="text-4xl" aria-hidden>
            💰
          </span>
          <p className="font-display text-lg font-bold">Nothing earned yet</p>
          <p className="text-sm text-muted">
            Go online and accept a request — completed trips land here.
          </p>
        </div>
      ) : (
        [...groups.entries()].map(([day, list]) => (
          <section key={day}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="text-sm font-bold">{day}</h3>
              <FareAmount value={sum(list)} className="text-sm text-muted" />
            </div>
            <div className="space-y-2">
              {list.map((r) => (
                <div key={r.id} className="card flex items-center justify-between gap-3 p-3.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {r.pickupLabel.split(',')[0]} → {r.dropLabel.split(',')[0]}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {new Date(r.completedAt ?? r.createdAt).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      · {r.distanceKm} km
                    </div>
                  </div>
                  <FareAmount value={r.fare} className="shrink-0 text-lg" />
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
