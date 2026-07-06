import { useAuth } from '../lib/auth';
import { Avatar, PlateChip } from './ui';
import { BarButton } from './BarButton';

const ROLE_LABEL: Record<string, string> = {
  RIDER: 'Rider',
  DRIVER: 'Driver',
  ADMIN: 'Agency owner',
};

/** Shared Profile tab for rider & driver apps. */
export function ProfileScreen() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const [vehicleName, plate] = (user.vehicle ?? '').split('·').map((s) => s.trim());

  return (
    <div className="mx-auto flex h-full max-w-md flex-col overflow-y-auto p-4">
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Avatar name={user.name} size={84} />
        <div>
          <h2 className="font-display text-2xl font-bold">{user.name}</h2>
          <p className="mt-0.5 text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-neela/15 px-3 py-1 text-xs font-semibold text-neela">
            {ROLE_LABEL[user.role] ?? user.role}
          </span>
          {user.avgRating != null && (
            <span className="rounded-full bg-warn/15 px-3 py-1 text-xs font-semibold text-warn">
              ★ {user.avgRating}
            </span>
          )}
        </div>
      </div>

      {user.vehicle && (
        <div className="card mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted">Vehicle</div>
            <div className="mt-0.5 font-semibold">{vehicleName || user.vehicle}</div>
          </div>
          {plate && <PlateChip text={plate} />}
        </div>
      )}

      <div className="card mb-3 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">Payment</span>
          <span>JazzCash •••• 4242 (mock)</span>
        </div>
        <div className="flex items-center justify-between border-t border-hairline pt-3">
          <span className="text-muted">City</span>
          <span>Pakistan-wide</span>
        </div>
      </div>

      <div className="mt-auto space-y-3 pb-2">
        <BarButton variant="outline" className="!text-danger" onClick={logout}>
          Sign out
        </BarButton>
        <p className="text-center text-xs text-muted">
          RideShare PK · <span className="font-display font-semibold text-kesar">Safar</span>{' '}
          prototype
        </p>
      </div>
    </div>
  );
}
