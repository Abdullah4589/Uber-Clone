import { useEffect, useState } from 'react';
import type { Ride } from '@uber-clone/shared';
import { TIERS } from '@uber-clone/shared';
import { api } from '../lib/api';
import { StatusBadge } from './ui';
import { FareAmount } from './FareTicket';

type HistoryRide = Ride & { ratedByMe: boolean };

export function HistoryList({ role }: { role: 'RIDER' | 'DRIVER' }) {
  const [rides, setRides] = useState<HistoryRide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/rides/history')
      .then((r) => setRides(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="space-y-3 p-4">
        <div className="skeleton h-32" />
        <div className="skeleton h-32" />
        <div className="skeleton h-32" />
      </div>
    );

  if (!rides.length)
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <span className="text-4xl" aria-hidden>
          🛺
        </span>
        <p className="font-display text-lg font-bold">No rides yet</p>
        <p className="text-sm text-muted">
          {role === 'RIDER'
            ? 'Book your first safar and it will show up here.'
            : 'Go online and accept a request — your trips will show up here.'}
        </p>
      </div>
    );

  return (
    <div className="mx-auto max-w-md space-y-3 p-4">
      {rides.map((ride) => {
        const other = role === 'RIDER' ? ride.driver : ride.rider;
        return (
          <div key={ride.id} className="card p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">
                {new Date(ride.createdAt).toLocaleString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              <StatusBadge status={ride.status} />
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-kesar" />
                <span className="truncate">{ride.pickupLabel}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-neela" />
                <span className="truncate">{ride.dropLabel}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-hairline pt-3 text-sm">
              <span className="truncate text-muted">
                {other ? other.name : 'Unmatched'} · {ride.distanceKm} km ·{' '}
                {TIERS[ride.tier]?.emoji} {TIERS[ride.tier]?.label ?? ride.tier}
              </span>
              <FareAmount value={ride.fare} className="text-lg" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
