import { useEffect, useState } from 'react';
import type { Ride, AdminStats, AdminUserRow } from '@uber-clone/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { TabBar } from '../../components/TabBar';
import { StatusBadge, Avatar } from '../../components/ui';
import { FareAmount } from '../../components/FareTicket';
import { formatSchedule } from '../../lib/format';

type Tab = 'dashboard' | 'rides' | 'drivers';

const TABS = [
  { key: 'dashboard' as Tab, label: 'Dashboard', icon: '📊' },
  { key: 'rides' as Tab, label: 'Rides', icon: '🧾' },
  { key: 'drivers' as Tab, label: 'Drivers', icon: '🚕' },
];

export function AdminApp() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-hairline bg-surface px-4 py-3 pt-[calc(12px+env(safe-area-inset-top))]">
        <div>
          <div className="font-display text-lg font-bold leading-tight">
            RideShare <span className="text-kesar">PK</span>
          </div>
          <div className="text-xs text-muted">Agency HQ · {user?.name}</div>
        </div>
        <button
          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-surface2 px-3 text-sm font-semibold transition active:scale-[0.96]"
          onClick={logout}
        >
          Sign out
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'rides' && <RidesLedger />}
        {tab === 'drivers' && <People />}
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />
    </div>
  );
}

// ---- Dashboard (KPIs) ----

function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`card ${accent ? 'border-kesar/40 bg-kesar/5' : ''}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    const load = () => api.get('/admin/stats').then((r) => setStats(r.data));
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  if (!stats)
    return (
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
        <div className="skeleton h-56" />
      </div>
    );

  const finished = stats.completedRides + stats.cancelledRides;
  const cancelRate = finished === 0 ? 0 : Math.round((stats.cancelledRides / finished) * 100);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          accent
          label="Revenue (completed)"
          value={<FareAmount value={stats.revenue} className="text-kesar" />}
        />
        <StatCard label="Active rides" value={String(stats.activeRides)} />
        <StatCard
          label="Drivers online"
          value={
            <>
              {stats.driversOnline}
              <span className="text-base text-muted"> / {stats.drivers}</span>
            </>
          }
        />
        <StatCard
          label="Cancel rate"
          value={`${cancelRate}%`}
          hint={`${stats.cancelledRides} of ${finished || '—'} finished`}
        />
        <StatCard label="Riders" value={String(stats.riders)} />
        <StatCard label="Completed rides" value={String(stats.completedRides)} />
      </div>

      <div className="card">
        <h3 className="mb-3 font-display font-bold">Rides by status</h3>
        <div className="space-y-2.5">
          {Object.entries(stats.ridesByStatus).map(([status, count]) => (
            <div key={status} className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <StatusBadge status={status as Ride['status']} />
              </div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-kesar to-gulabi"
                  style={{ width: `${barWidth(count, stats.ridesByStatus)}%` }}
                />
              </div>
              <div className="w-8 shrink-0 text-right text-sm tabular-nums">{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function barWidth(count: number, all: Record<string, number>) {
  const max = Math.max(1, ...Object.values(all));
  return Math.round((count / max) * 100);
}

// ---- Rides ledger (the agency owner's record book) ----

type Filter = 'all' | 'pending' | 'completed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
];

function fmt(iso: string | null | undefined): string {
  return formatSchedule(iso) ?? '—';
}

function RidesLedger() {
  const [filter, setFilter] = useState<Filter>('all');
  const [rides, setRides] = useState<Ride[] | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const load = (f: Filter) => api.get(`/admin/rides?filter=${f}`).then((r) => setRides(r.data));

  useEffect(() => {
    setRides(null);
    load(filter);
    // Pending/all update live; completed changes rarely but refreshing is cheap.
    const id = setInterval(() => load(filter), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const cancel = async (id: string) => {
    await api.post(`/admin/rides/${id}/cancel`);
    setConfirmCancel(null);
    load(filter);
  };
  const canCancel = (s: Ride['status']) => s !== 'COMPLETED' && s !== 'CANCELLED';

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      {/* Filter chips */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold transition active:scale-[0.96] ${
                filter === f.key
                  ? 'border-kesar bg-kesar/15 text-kesar'
                  : 'border-hairline bg-surface2 text-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="hidden text-xs text-muted sm:block">Auto-refreshes every 5s</span>
      </div>

      {rides == null ? (
        <div className="space-y-3">
          <div className="skeleton h-36" />
          <div className="skeleton h-36" />
        </div>
      ) : rides.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl" aria-hidden>
            🛣️
          </span>
          <p className="font-display font-bold">No rides to show</p>
          <p className="text-sm text-muted">Rides appear here the moment a rider books.</p>
        </div>
      ) : (
        <>
          {/* Card list on mobile */}
          <div className="space-y-3 md:hidden">
            {rides.map((ride) => (
              <div key={ride.id} className="card p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    {ride.rider?.name ?? '—'}
                    <span className="text-muted"> → </span>
                    {ride.driver?.name ?? 'Unassigned'}
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
                  {formatSchedule(ride.scheduledAt) && (
                    <div className="text-xs text-warn">
                      🗓️ Scheduled: {formatSchedule(ride.scheduledAt)}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-hairline pt-3">
                  <span className="text-xs text-muted">
                    {fmt(ride.startedAt)} → {fmt(ride.completedAt)}
                  </span>
                  <FareAmount value={ride.fare} className="text-lg" />
                </div>
                {canCancel(ride.status) && (
                  <button
                    className={`mt-3 min-h-[44px] w-full rounded-xl border text-sm font-semibold transition active:scale-[0.98] ${
                      confirmCancel === ride.id
                        ? 'border-danger bg-danger text-white'
                        : 'border-danger/40 text-danger'
                    }`}
                    onClick={() =>
                      confirmCancel === ride.id ? cancel(ride.id) : setConfirmCancel(ride.id)
                    }
                  >
                    {confirmCancel === ride.id ? 'Tap again to confirm' : 'Force cancel'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Real table on ≥768px */}
          <div className="card hidden overflow-x-auto p-0 md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-hairline text-muted">
                <tr>
                  <th className="px-3 py-3">Rider</th>
                  <th className="px-3 py-3">Driver</th>
                  <th className="px-3 py-3">Pickup</th>
                  <th className="px-3 py-3">Drop-off</th>
                  <th className="px-3 py-3">Started</th>
                  <th className="px-3 py-3">Finished</th>
                  <th className="px-3 py-3 text-right">Fare</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride) => (
                  <tr key={ride.id} className="border-b border-hairline/50 align-top last:border-0">
                    <td className="px-3 py-3 font-medium">{ride.rider?.name ?? '—'}</td>
                    <td className="px-3 py-3">{ride.driver?.name ?? 'Unassigned'}</td>
                    <td className="px-3 py-3 text-muted">{ride.pickupLabel}</td>
                    <td className="px-3 py-3 text-muted">{ride.dropLabel}</td>
                    <td className="whitespace-nowrap px-3 py-3">{fmt(ride.startedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{fmt(ride.completedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                      Rs {ride.fare.toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={ride.status} />
                        {formatSchedule(ride.scheduledAt) && (
                          <span className="text-xs text-warn">
                            🗓️ {formatSchedule(ride.scheduledAt)}
                          </span>
                        )}
                        {canCancel(ride.status) && (
                          <button
                            className={`text-xs hover:underline ${
                              confirmCancel === ride.id ? 'font-bold text-danger' : 'text-danger/80'
                            }`}
                            onClick={() =>
                              confirmCancel === ride.id
                                ? cancel(ride.id)
                                : setConfirmCancel(ride.id)
                            }
                          >
                            {confirmCancel === ride.id ? 'Confirm force cancel?' : 'Force cancel'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ---- People (drivers first, then riders) ----

function People() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);

  useEffect(() => {
    api.get('/admin/users').then((r) => setUsers(r.data));
  }, []);

  if (!users)
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
      </div>
    );

  const drivers = users.filter((u) => u.role === 'DRIVER');
  const riders = users.filter((u) => u.role === 'RIDER');

  const PersonCard = ({ u }: { u: AdminUserRow }) => (
    <div className="card flex items-center gap-3 p-3.5">
      <div className="relative shrink-0">
        <Avatar name={u.name} size={44} />
        {u.role === 'DRIVER' && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface ${
              u.isOnline ? 'bg-success' : 'bg-hairline'
            }`}
            title={u.isOnline ? 'Online' : 'Offline'}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{u.name}</div>
        <div className="truncate text-xs text-muted">
          {u.email}
          {u.vehicle && ` · ${u.vehicle}`}
        </div>
      </div>
      <div className="shrink-0 text-right text-xs">
        <div className="font-semibold text-warn">
          {u.avgRating != null ? `★ ${u.avgRating}` : '—'}
        </div>
        <div className="mt-0.5 text-muted">
          {u.rideCount} ride{u.rideCount === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h3 className="font-display font-bold">Drivers</h3>
          <span className="text-xs text-muted">
            {drivers.filter((d) => d.isOnline).length} online / {drivers.length}
          </span>
        </div>
        <div className="space-y-2">
          {drivers.map((u) => (
            <PersonCard key={u.id} u={u} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h3 className="font-display font-bold">Riders</h3>
          <span className="text-xs text-muted">{riders.length}</span>
        </div>
        <div className="space-y-2">
          {riders.map((u) => (
            <PersonCard key={u.id} u={u} />
          ))}
        </div>
      </section>
    </div>
  );
}
