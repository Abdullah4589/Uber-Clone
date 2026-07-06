import type { RideStatus } from '@uber-clone/shared';

const STEPS: { label: string; match: RideStatus[] }[] = [
  { label: 'Booked', match: ['SEARCHING'] },
  { label: 'Driver', match: ['DRIVER_ASSIGNED', 'EN_ROUTE_TO_PICKUP'] },
  { label: 'Arrived', match: ['ARRIVED'] },
  { label: 'On trip', match: ['IN_PROGRESS'] },
  { label: 'Done', match: ['COMPLETED'] },
];

/** Compact horizontal lifecycle stepper: SEARCHING → … → COMPLETED. */
export function RideStepper({ status }: { status: RideStatus }) {
  if (status === 'CANCELLED') return null;
  const current = STEPS.findIndex((s) => s.match.includes(status));

  return (
    <div className="flex items-center" aria-label={`Ride progress: step ${current + 1} of 5`}>
      {STEPS.map((s, i) => (
        <div key={s.label} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
          {i > 0 && (
            <div
              className={`h-0.5 flex-1 rounded ${i <= current ? 'bg-kesar' : 'bg-hairline'}`}
            />
          )}
          <div className="flex flex-col items-center gap-1 px-1">
            <span className="relative flex h-2.5 w-2.5">
              {i === current && status !== 'COMPLETED' && (
                <span className="absolute inline-flex h-full w-full animate-ping-dot rounded-full bg-kesar/70" />
              )}
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  i <= current ? 'bg-kesar' : 'bg-hairline'
                }`}
              />
            </span>
            <span
              className={`text-[10px] font-semibold ${i <= current ? 'text-kesar' : 'text-muted'}`}
            >
              {s.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
